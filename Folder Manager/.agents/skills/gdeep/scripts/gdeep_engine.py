import os
import sys
import json
import re
import urllib.request
import urllib.parse
import time
from datetime import datetime

# ============================================================
# GDeep Engine v3.0 — Super Saiyan Blue
# Changelog v3.0:
#   - INNO-2: Ancestor Mining — fetch references from Review/SR papers
#   - INNO-3: Recency Sweep — auto-trigger when papers 2022+ < 40%
#   - INNO-4: Review Paper Priority Boost (Tier 2, weight 2)
#   - INNO-5: Auto-Recency Report (year distribution histogram)
# Changelog v2.3:
#   - BUG-6 FIX: Drug Name Collision Filter (exclude_terms CLI arg 6)
# Changelog v2.1:
#   - BUG-2 FIX: Full-Text uses PMC ID (not PMID)
#   - BUG-1 FIX: data_completeness scoring, empty abstract warning
#   - BUG-3 FIX: Generalized AUTO-STOP for all tiers
#   - BUG-4 FIX: Branded keyword extraction for relevance filter
#   - BUG-5 FIX: Composite sort (influence + recency_bonus)
#   - OPT-1: Batch Europe PMC enrichment (25/call)
#   - OPT-3: Smart Full-Text per facet (1 per facet, not top 5 overall)
# ============================================================

# Endpoints
EUTILS_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={}&retmax={}&retmode=json&sort=relevance"
EUTILS_SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={}&retmode=json"
EUPMC_SEARCH_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={}&format=json&resultType=core&pageSize={}"
EUPMC_FULLTEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest/{}/fullTextXML"
EUPMC_REFERENCES = "https://www.ebi.ac.uk/europepmc/webservices/rest/MED/{}/references?format=json&pageSize=100"

# ============================================================
# Evidence Hierarchy — Tiers
# ============================================================
EVIDENCE_TIERS = [
    {
        "tier": 1,
        "label": "Human Gold (MA/SR)",
        "suffix": " AND (meta-analysis[pt] OR systematic review[pt])",
        "weight": 4,
        "min_target": 15,    # If we get >= this many, skip lower tiers
    },
    {
        "tier": 2,
        "label": "Human Strong (RCT)",
        "suffix": " AND randomized controlled trial[pt]",
        "weight": 3,
        "min_target": 25,    # Cumulative target with Tier 1
    },
    {
        "tier": 3,
        "label": "Human Other (Cohort/Clinical)",
        "suffix": " AND (clinical trial[pt] OR observational study[pt] OR cohort study[MeSH])",
        "weight": 1.5,
        "min_target": 35,
    },
    {
        "tier": 4,
        "label": "Animal / In Vivo",
        "suffix": " AND (animal[MeSH] OR in vivo[tiab])",
        "weight": 0.5,
        "min_target": 10,    # Only used as fallback
    },
    {
        "tier": 5,
        "label": "In Vitro / Cell",
        "suffix": " AND (in vitro[tiab] OR cell culture[tiab])",
        "weight": 0.2,
        "min_target": 5,
    },
]

# Budget cap — maximum total unique papers to collect
BUDGET_CAP = 200

# Current year for recency scoring
CURRENT_YEAR = datetime.now().year


def safe_request(url, retries=2):
    req = urllib.request.Request(url, headers={'User-Agent': 'GDeepAgent/3.0'})
    for attempt in range(retries + 1):
        try:
            time.sleep(0.4)  # NCBI rate limit compliant
            with urllib.request.urlopen(req, timeout=15) as response:
                return response.read()
        except Exception as e:
            if attempt < retries:
                time.sleep(1)
            else:
                print(f"Error requesting {url}: {e}")
                return None


def fetch_pmids(query, limit=20):
    encoded = urllib.parse.quote(query)
    url = EUTILS_SEARCH.format(encoded, limit)
    res = safe_request(url)
    if res:
        data = json.loads(res.decode('utf-8'))
        return data.get('esearchresult', {}).get('idlist', [])
    return []


def get_pubmed_metadata(pmids):
    if not pmids:
        return {}
    url = EUTILS_SUMMARY.format(",".join(pmids))
    res = safe_request(url)
    if res:
        data = json.loads(res.decode('utf-8'))
        return data.get('result', {})
    return {}


# ============================================================
# OPT-1: Batch Europe PMC Enrichment (25 per call instead of 1-by-1)
# ============================================================
def enrich_batch_europe_pmc(pmids):
    """Batch enrich up to 25 PMIDs at once via Europe PMC OR query.
    Returns dict: {pmid_str: eu_meta_dict}
    """
    if not pmids:
        return {}

    results = {}
    # Process in chunks of 25
    for i in range(0, len(pmids), 25):
        chunk = pmids[i:i+25]
        query_parts = [f"ext_id:{pmid}" for pmid in chunk]
        query_str = " OR ".join(query_parts)
        encoded = urllib.parse.quote(query_str)
        url = EUPMC_SEARCH_BASE.format(encoded, len(chunk))
        res = safe_request(url)
        if res:
            data = json.loads(res.decode('utf-8'))
            for item in data.get('resultList', {}).get('result', []):
                pmid = str(item.get('pmid', ''))
                if pmid:
                    results[pmid] = item
        print(f"    [Batch {i//25 + 1}] Enriched {len(chunk)} PMIDs, got {len([p for p in chunk if p in results])} matches")
    return results


# ============================================================
# INNO-1: Citation Network Graph (Find "Child" Papers)
# ============================================================
def fetch_cited_by_pmids_eupmc(pmid, limit=10):
    """
    Fetch PMIDs of papers that cite the given PMID.
    Sorted by citation count descending to get the most influential children.
    """
    query_str = f"cites:{pmid}_MED"
    encoded = urllib.parse.quote(query_str)
    # Using sort=cited desc
    url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={encoded}&format=json&resultType=lite&pageSize={limit}&sort=cited%20desc"
    res = safe_request(url)
    child_pmids = []
    if res:
        try:
            data = json.loads(res.decode('utf-8'))
            for item in data.get('resultList', {}).get('result', []):
                child_pmid = str(item.get('pmid', ''))
                if child_pmid:
                    child_pmids.append(child_pmid)
        except Exception as e:
            print(f"Error parsing cited-by for {pmid}: {e}")
    return child_pmids


# ============================================================
# INNO-2: Ancestor Mining — Fetch references FROM a paper
# ============================================================
def fetch_references_eupmc(pmid, limit=100):
    """
    Fetch PMIDs of papers that are REFERENCED BY the given PMID.
    These are the paper's bibliography — the "ancestors".
    Only returns MED (PubMed) source references.
    """
    url = EUPMC_REFERENCES.format(pmid)
    res = safe_request(url)
    ref_pmids = []
    if res:
        try:
            data = json.loads(res.decode('utf-8'))
            for item in data.get('referenceList', {}).get('reference', []):
                if item.get('source') == 'MED':
                    ref_id = str(item.get('id', ''))
                    if ref_id:
                        ref_pmids.append(ref_id)
                if len(ref_pmids) >= limit:
                    break
        except Exception as e:
            print(f"Error parsing references for {pmid}: {e}")
    return ref_pmids

# ============================================================
# BUG-2 FIX: Full-Text download using PMC ID (not PMID!)
# ============================================================
def download_fulltext_xml(pmcid, save_dir):
    """Download full-text XML using PMC ID (e.g. 'PMC1234567')."""
    if not pmcid:
        return False, None
    url = EUPMC_FULLTEXT.format(pmcid)
    res = safe_request(url)
    if res:
        content = res.decode('utf-8')
        if "<?xml" in content or "<article" in content:
            filepath = os.path.join(save_dir, f"fulltext_{pmcid}.xml")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return True, filepath
    return False, None


def get_evidence_tier_info(pubtypes):
    """Classify a paper into an evidence tier based on its publication types."""
    pubtypes_lower = [str(pt).lower() for pt in pubtypes]

    if any("network meta-analysis" in pt for pt in pubtypes_lower) or any("umbrella" in pt for pt in pubtypes_lower):
        return 1, "Network MA / Umbrella Review", 5
    if any("meta-analysis" in pt for pt in pubtypes_lower):
        return 1, "Meta-Analysis", 4
    if any("systematic review" in pt for pt in pubtypes_lower):
        return 1, "Systematic Review", 3.5
    if any("randomized controlled trial" in pt for pt in pubtypes_lower):
        return 2, "RCT", 3
    # INNO-4: Review Paper Priority Boost — Reviews get Tier 2 (weight 2)
    if any("review" in pt for pt in pubtypes_lower):
        return 2, "Narrative/Scoping Review", 2
    if any("clinical trial" in pt for pt in pubtypes_lower) or any("cohort" in pt for pt in pubtypes_lower) or any("observational" in pt for pt in pubtypes_lower):
        return 3, "Clinical/Cohort/Observational", 1.5
    if any("animal" in pt for pt in pubtypes_lower) or any("in vivo" in pt for pt in pubtypes_lower):
        return 4, "Animal / In Vivo", 0.5
    if any("in vitro" in pt for pt in pubtypes_lower):
        return 5, "In Vitro", 0.2

    return 3, "Other Human Study", 1  # Default: assume human-level


# ============================================================
# BUG-5 FIX: Recency bonus for composite sorting
# ============================================================
def calc_recency_bonus(year_str):
    """Calculate recency bonus based on publication year."""
    try:
        year = int(year_str)
        age = CURRENT_YEAR - year
        if age <= 3:
            return 100
        elif age <= 5:
            return 50
        elif age <= 10:
            return 25
        else:
            return 0
    except (ValueError, TypeError):
        return 0


# ============================================================
# BUG-1 FIX: Data completeness scoring
# ============================================================
def calc_data_completeness(paper):
    """Calculate data completeness score (0-100)."""
    score = 0
    if paper.get("title"):
        score += 15
    if paper.get("abstract"):
        score += 30
    if paper.get("authors"):
        score += 10
    if paper.get("journal"):
        score += 10
    if paper.get("year"):
        score += 10
    if paper.get("doi"):
        score += 10
    if paper.get("citations", 0) > 0:
        score += 10
    if paper.get("is_oa"):
        score += 5
    return score


# ============================================================
# BUG-3 FIX: Generalized AUTO-STOP for all tiers
# ============================================================
def search_tiered(base_query, retmax_per_tier=20, existing_pmids=None):
    """
    Waterfall search: Start from Tier 1 (strongest evidence), 
    only descend to lower tiers if not enough papers found.
    Generalized AUTO-STOP: checks cumulative after every tier.
    """
    if existing_pmids is None:
        existing_pmids = set()

    collected = []
    tier_stats = {}

    for tier_info in EVIDENCE_TIERS:
        tier_num = tier_info["tier"]
        tier_label = tier_info["label"]
        tier_suffix = tier_info["suffix"]
        min_target = tier_info["min_target"]

        # Check if we already have enough from higher tiers
        total_so_far = len(collected) + len(existing_pmids)
        if total_so_far >= min_target and tier_num >= 3:
            print(f"      [Tier {tier_num}] Skipped -- already have {total_so_far} papers (target: {min_target})")
            tier_stats[tier_num] = {"label": tier_label, "found": 0, "skipped": True}
            continue

        # Tier 4-5 only if human data is scarce
        if tier_num >= 4 and total_so_far >= 10:
            print(f"      [Tier {tier_num}] Skipped -- enough human data ({total_so_far} papers)")
            tier_stats[tier_num] = {"label": tier_label, "found": 0, "skipped": True}
            continue

        # Build tiered query
        tiered_query = base_query + tier_suffix
        pmids = fetch_pmids(tiered_query, retmax_per_tier)

        # Remove duplicates
        new_pmids = [p for p in pmids if p not in existing_pmids]
        existing_pmids.update(new_pmids)
        collected.extend(new_pmids)

        tier_stats[tier_num] = {
            "label": tier_label,
            "found": len(new_pmids),
            "raw": len(pmids),
            "skipped": False
        }
        print(f"      [Tier {tier_num} -- {tier_label}] Found: {len(pmids)} raw, {len(new_pmids)} new")

        # Budget cap check
        if len(existing_pmids) >= BUDGET_CAP:
            print(f"      [BUDGET CAP] Reached {len(existing_pmids)} papers, stopping tiers")
            break

        # Generalized AUTO-STOP: check cumulative for this facet vs min_target
        cumulative = len(collected)
        if cumulative >= min_target:
            print(f"      [AUTO-STOP] Cumulative {cumulative} papers >= {min_target} target, skipping lower tiers")
            break

    return collected, tier_stats


def main():
    if len(sys.argv) < 3:
        print("Usage: python gdeep_engine.py <ingredient_name> <queries_json_path> [ingredient_folder_path] [aliases_comma_sep] [retmax_per_tier] [exclude_terms_comma_sep]")
        sys.exit(1)

    ingredient = sys.argv[1]
    queries_path = sys.argv[2]
    ingredient_dir = sys.argv[3] if len(sys.argv) > 3 else None
    aliases_str = sys.argv[4] if len(sys.argv) > 4 else ""
    retmax_per_tier = int(sys.argv[5]) if len(sys.argv) > 5 else 20
    exclude_str = sys.argv[6] if len(sys.argv) > 6 else ""
    exclude_terms = [t.strip().lower() for t in exclude_str.split(',') if t.strip()]

    # Parse aliases
    valid_keywords = [ingredient.lower()]
    if aliases_str:
        valid_keywords.extend([a.strip().lower() for a in aliases_str.split(',') if a.strip()])

    with open(queries_path, 'r', encoding='utf-8') as f:
        queries = json.load(f)

    # BUG-4 FIX: Extract branded/topic keywords from queries for relevance filter
    for q in queries:
        q_str = q.get("query", "") if isinstance(q, dict) else str(q)
        tiab_terms = re.findall(r'([\w][\w\s\-]*?)\[tiab\]', q_str, re.IGNORECASE)
        for term in tiab_terms:
            term_clean = term.strip().lower()
            if term_clean and term_clean not in valid_keywords and len(term_clean) > 3:
                valid_keywords.append(term_clean)

    print(f"[*] Running GDeep Engine v3.0 (Super Saiyan Blue) for: {ingredient}")
    print(f"[*] Found {len(queries)} queries. RetMax/Tier: {retmax_per_tier}. Budget Cap: {BUDGET_CAP}")
    print(f"[*] Relevance keywords ({len(valid_keywords)}): {valid_keywords[:15]}{'...' if len(valid_keywords) > 15 else ''}")
    if exclude_terms:
        print(f"[*] Drug Collision Filter ACTIVE — excluding titles containing: {exclude_terms}")
    print()

    all_pmids = set()
    all_tier_stats = {}
    query_facet_map = {}  # pmid -> facet label

    for qi, q in enumerate(queries):
        q_str = q.get("query", "") if isinstance(q, dict) else str(q)
        facet_label = q.get("description", f"Q{qi+1}") if isinstance(q, dict) else f"Q{qi+1}"

        # E-6: Query Length Warning — detect overly long queries
        word_count = len(q_str.split())
        if word_count > 8:
            print(f"  [{facet_label}] [!] WARNING: Query has {word_count} words (recommended <= 8). May return 0 results!")
        print(f"  [{facet_label}] Base: {q_str[:80]}...")

        new_pmids, tier_stats = search_tiered(q_str, retmax_per_tier, all_pmids)
        all_tier_stats[facet_label] = tier_stats

        # Tag each new PMID with its facet
        for pmid in new_pmids:
            if pmid not in query_facet_map:
                query_facet_map[pmid] = facet_label

        # Budget cap
        if len(all_pmids) >= BUDGET_CAP:
            print(f"\n  [GLOBAL BUDGET CAP] Reached {len(all_pmids)} unique PMIDs, stopping queries")
            break

    all_pmids_list = list(all_pmids)
    print(f"\n[*] Total unique PMIDs collected: {len(all_pmids_list)}")

    # ============================================================
    # Process PubMed metadata in chunks of 50
    # ============================================================
    pubmed_meta = {}
    for i in range(0, len(all_pmids_list), 50):
        chunk = all_pmids_list[i:i+50]
        meta = get_pubmed_metadata(chunk)
        pubmed_meta.update(meta)

    # ============================================================
    # OPT-1: Batch Europe PMC Enrichment (25 per call)
    # ============================================================
    print(f"\n[*] Batch-enriching {len(all_pmids_list)} papers via Europe PMC (25/call)...")
    eupmc_meta = enrich_batch_europe_pmc(all_pmids_list)
    print(f"[*] Europe PMC returned data for {len(eupmc_meta)}/{len(all_pmids_list)} papers")

    # ============================================================
    # Build paper objects
    # ============================================================
    papers = []
    empty_abstract_count = 0
    relevance_filtered = 0
    drug_collision_filtered = 0

    for pmid in all_pmids_list:
        if pmid not in pubmed_meta:
            continue
        paper_info = pubmed_meta[pmid]
        title = paper_info.get("title", "")
        pubtype_raw = paper_info.get("pubtype", [])
        if isinstance(pubtype_raw, list):
            pubtypes = [pt if isinstance(pt, str) else pt.get("value", "") for pt in pubtype_raw]
        else:
            pubtypes = []

        # Europe PMC data
        eu_meta = eupmc_meta.get(pmid, {})
        citations = eu_meta.get("citedByCount", 0)
        is_oa = eu_meta.get("isOpenAccess", "N") == "Y"
        doi = eu_meta.get("doi", "")
        abstract = eu_meta.get("abstractText", "")
        authors = eu_meta.get("authorString", "")
        year = eu_meta.get("pubYear", "")
        journal = eu_meta.get("journalInfo", {}).get("journal", {}).get("title", "")
        pmcid = eu_meta.get("pmcid", "")  # BUG-2 FIX: Extract PMC ID for full-text

        # Relevance Filter (BUG-4 FIX: valid_keywords now includes branded terms)
        search_text = (title + " " + abstract).lower()
        if not any(kw in search_text for kw in valid_keywords):
            relevance_filtered += 1
            continue

        # BUG-6 FIX: Drug Name Collision Filter
        if exclude_terms:
            title_lower = title.lower()
            if any(drug in title_lower for drug in exclude_terms):
                # Keep if the supplement name itself is also in the title
                ingredient_in_title = any(kw in title_lower for kw in valid_keywords)
                if not ingredient_in_title:
                    drug_collision_filtered += 1
                    continue

        # Evidence tier classification
        evidence_tier, evidence_label, weight = get_evidence_tier_info(pubtypes)
        influence = citations * weight

        # BUG-5 FIX: Recency bonus for composite sorting
        recency = calc_recency_bonus(year)
        composite_score = influence + recency

        paper = {
            "pmid": pmid,
            "pmcid": pmcid,
            "doi": doi,
            "title": title,
            "authors": authors,
            "journal": journal,
            "year": year,
            "pubtypes": pubtypes,
            "citations": citations,
            "evidence_tier": evidence_tier,
            "evidence_label": evidence_label,
            "evidence_weight": weight,
            "influence_score": influence,
            "recency_bonus": recency,
            "composite_score": composite_score,
            "is_oa": is_oa,
            "abstract": abstract,
            "query_facet": query_facet_map.get(pmid, "Unknown"),
            "data_completeness": 0,
            "fulltext_available": False,
            "fulltext_path": ""
        }

        # BUG-1 FIX: Data completeness scoring
        paper["data_completeness"] = calc_data_completeness(paper)
        if not abstract:
            empty_abstract_count += 1

        papers.append(paper)

    # BUG-5 FIX: Sort by composite score (influence + recency)
    papers.sort(key=lambda x: x["composite_score"], reverse=True)

    # ============================================================
    # INNO-1: Citation Network Graph (The "Third Eye")
    # Find highly-cited "children" of the top 3 most influential papers
    # ============================================================
    if len(papers) > 0:
        print(f"\n[*] INNO-1: Activating Citation Network Graph (Top 3 Papers)...")
        top_3_pmids = [p["pmid"] for p in papers[:3]]
        new_child_pmids = []
        child_parent_map = {}

        for parent_pmid in top_3_pmids:
            try:
                print(f"    -> Finding children for top paper PMID {parent_pmid}...", end="")
            except UnicodeEncodeError:
                print(f"    -> Finding children for top paper...", end="")
            children = fetch_cited_by_pmids_eupmc(parent_pmid, limit=5)
            print(f" Found {len(children)}")
            for child in children:
                if child not in all_pmids_list and child not in new_child_pmids:
                    new_child_pmids.append(child)
                    child_parent_map[child] = parent_pmid

        if new_child_pmids:
            print(f"[*] Found {len(new_child_pmids)} new high-impact child papers. Enriching...")
            # 1. Fetch PubMed Meta
            child_pubmed_meta = {}
            for i in range(0, len(new_child_pmids), 50):
                chunk = new_child_pmids[i:i+50]
                child_pubmed_meta.update(get_pubmed_metadata(chunk))
            
            # 2. Fetch Europe PMC Meta
            child_eupmc_meta = enrich_batch_europe_pmc(new_child_pmids)

            # 3. Build paper objects for children
            child_filtered = 0
            for child_pmid in new_child_pmids:
                if child_pmid not in child_pubmed_meta:
                    continue
                c_info = child_pubmed_meta[child_pmid]
                c_title = c_info.get("title", "")
                c_pubtype_raw = c_info.get("pubtype", [])
                c_pubtypes = [pt if isinstance(pt, str) else pt.get("value", "") for pt in c_pubtype_raw] if isinstance(c_pubtype_raw, list) else []
                
                c_eu = child_eupmc_meta.get(child_pmid, {})
                c_citations = c_eu.get("citedByCount", 0)
                c_is_oa = c_eu.get("isOpenAccess", "N") == "Y"
                c_doi = c_eu.get("doi", "")
                c_abstract = c_eu.get("abstractText", "")
                c_authors = c_eu.get("authorString", "")
                c_year = c_eu.get("pubYear", "")
                c_journal = c_eu.get("journalInfo", {}).get("journal", {}).get("title", "")
                c_pmcid = c_eu.get("pmcid", "")

                c_search_text = (c_title + " " + c_abstract).lower()
                if not any(kw in c_search_text for kw in valid_keywords):
                    child_filtered += 1
                    continue

                c_tier, c_label, c_weight = get_evidence_tier_info(c_pubtypes)
                c_influence = c_citations * c_weight
                c_recency = calc_recency_bonus(c_year)
                c_composite = c_influence + c_recency

                c_paper = {
                    "pmid": child_pmid,
                    "pmcid": c_pmcid,
                    "doi": c_doi,
                    "title": c_title,
                    "authors": c_authors,
                    "journal": c_journal,
                    "year": c_year,
                    "pubtypes": c_pubtypes,
                    "citations": c_citations,
                    "evidence_tier": c_tier,
                    "evidence_label": c_label,
                    "evidence_weight": c_weight,
                    "influence_score": c_influence,
                    "recency_bonus": c_recency,
                    "composite_score": c_composite,
                    "is_oa": c_is_oa,
                    "abstract": c_abstract,
                    "query_facet": f"Citation_Network (Child of {child_parent_map[child_pmid]})",
                    "data_completeness": 0,
                    "fulltext_available": False,
                    "fulltext_path": ""
                }
                c_paper["data_completeness"] = calc_data_completeness(c_paper)
                if not c_abstract:
                    empty_abstract_count += 1
                papers.append(c_paper)
                all_pmids_list.append(child_pmid)

            print(f"[*] Integrated {len(new_child_pmids) - child_filtered} child papers into the dataset (Filtered out: {child_filtered}).")
            # Re-sort because we added new papers
            papers.sort(key=lambda x: x["composite_score"], reverse=True)
        else:
            print(f"[*] No new unique child papers found.")

    print(f"\n[*] Papers after relevance filter: {len(papers)} (filtered out: {relevance_filtered})")
    if drug_collision_filtered > 0:
        print(f"[*] Drug Collision Filter removed: {drug_collision_filtered} papers (titles matched exclude_terms but not supplement name)")
    if empty_abstract_count > 0:
        print(f"[*] Warning: {empty_abstract_count} papers have empty abstracts (data_completeness < 50)")

    # ============================================================
    # INNO-2: Ancestor Mining — References from Review/SR papers
    # ============================================================
    review_papers = [p for p in papers if p.get('evidence_tier') <= 2 and
                     any('review' in str(pt).lower() for pt in p.get('pubtypes', []))]
    review_papers.sort(key=lambda x: x['composite_score'], reverse=True)
    ancestor_source_papers = review_papers[:5]  # Top 5 Review/SR papers

    if ancestor_source_papers:
        print(f"\n[*] INNO-2: Ancestor Mining — Extracting references from Top {len(ancestor_source_papers)} Review/SR papers...")
        ancestor_pmids = []
        ancestor_parent_map = {}
        INNO2_MAX_CHILDREN = 20  # max per review
        INNO2_BUDGET = 100      # total ancestor budget (quality gate filters downstream)

        for rev_paper in ancestor_source_papers:
            rev_pmid = rev_paper['pmid']
            try:
                print(f"    -> Mining ancestors from PMID {rev_pmid} ({rev_paper.get('evidence_label','?')}, Score: {rev_paper.get('composite_score',0)})...", end="")
            except UnicodeEncodeError:
                print(f"    -> Mining ancestors...", end="")
            refs = fetch_references_eupmc(rev_pmid, limit=INNO2_MAX_CHILDREN)
            new_refs = [r for r in refs if r not in all_pmids_list and r not in ancestor_pmids]
            print(f" Found {len(refs)} refs, {len(new_refs)} new")
            for r in new_refs:
                ancestor_pmids.append(r)
                ancestor_parent_map[r] = rev_pmid
            if len(ancestor_pmids) >= INNO2_BUDGET:
                ancestor_pmids = ancestor_pmids[:INNO2_BUDGET]
                break

        if ancestor_pmids:
            print(f"[*] Found {len(ancestor_pmids)} candidate ancestor papers. Enriching via Europe PMC...")
            anc_eupmc_meta = enrich_batch_europe_pmc(ancestor_pmids)

            anc_added = 0
            anc_filtered = 0
            for anc_pmid in ancestor_pmids:
                anc_eu = anc_eupmc_meta.get(anc_pmid, {})
                if not anc_eu:
                    anc_filtered += 1
                    continue

                anc_citations = anc_eu.get('citedByCount', 0)
                if anc_citations < 10:  # Quality gate: must have >= 10 citations
                    anc_filtered += 1
                    continue

                anc_title = anc_eu.get('title', '')
                anc_abstract = anc_eu.get('abstractText', '')
                anc_search_text = (anc_title + ' ' + anc_abstract).lower()
                if not any(kw in anc_search_text for kw in valid_keywords):
                    anc_filtered += 1
                    continue

                # Drug collision filter for ancestors too
                if exclude_terms:
                    anc_title_lower = anc_title.lower()
                    if any(drug in anc_title_lower for drug in exclude_terms):
                        if not any(kw in anc_title_lower for kw in valid_keywords):
                            anc_filtered += 1
                            continue

                anc_pubtypes_raw = anc_eu.get('pubTypeList', {}).get('pubType', [])
                anc_pubtypes = anc_pubtypes_raw if isinstance(anc_pubtypes_raw, list) else []
                anc_tier, anc_label, anc_weight = get_evidence_tier_info(anc_pubtypes)
                anc_influence = anc_citations * anc_weight
                anc_year = anc_eu.get('pubYear', '')
                anc_recency = calc_recency_bonus(anc_year)
                anc_composite = anc_influence + anc_recency

                anc_paper = {
                    'pmid': anc_pmid,
                    'pmcid': anc_eu.get('pmcid', ''),
                    'doi': anc_eu.get('doi', ''),
                    'title': anc_title,
                    'authors': anc_eu.get('authorString', ''),
                    'journal': anc_eu.get('journalInfo', {}).get('journal', {}).get('title', ''),
                    'year': anc_year,
                    'pubtypes': anc_pubtypes,
                    'citations': anc_citations,
                    'evidence_tier': anc_tier,
                    'evidence_label': anc_label,
                    'evidence_weight': anc_weight,
                    'influence_score': anc_influence,
                    'recency_bonus': anc_recency,
                    'composite_score': anc_composite,
                    'is_oa': anc_eu.get('isOpenAccess', 'N') == 'Y',
                    'abstract': anc_abstract,
                    'query_facet': f"Ancestor_Mining (Ref of {ancestor_parent_map[anc_pmid]})",
                    'data_completeness': 0,
                    'fulltext_available': False,
                    'fulltext_path': ''
                }
                anc_paper['data_completeness'] = calc_data_completeness(anc_paper)
                if not anc_abstract:
                    empty_abstract_count += 1
                papers.append(anc_paper)
                all_pmids_list.append(anc_pmid)
                anc_added += 1

            print(f"[*] INNO-2 Complete: Added {anc_added} ancestor papers (Filtered: {anc_filtered})")
            papers.sort(key=lambda x: x['composite_score'], reverse=True)
        else:
            print(f"[*] INNO-2: No new ancestor PMIDs found.")
    else:
        print(f"\n[*] INNO-2: No Review/SR papers found to mine ancestors from.")

    # ============================================================
    # INNO-5: Auto-Recency Report
    # ============================================================
    year_buckets = {'2025-2026': 0, '2023-2024': 0, '2020-2022': 0, '2015-2019': 0, '<2015': 0}
    years_list = []
    for p in papers:
        try:
            y = int(p.get('year', 0))
            if y > 0:
                years_list.append(y)
                if y >= 2025:
                    year_buckets['2025-2026'] += 1
                elif y >= 2023:
                    year_buckets['2023-2024'] += 1
                elif y >= 2020:
                    year_buckets['2020-2022'] += 1
                elif y >= 2015:
                    year_buckets['2015-2019'] += 1
                else:
                    year_buckets['<2015'] += 1
        except (ValueError, TypeError):
            pass

    median_year = sorted(years_list)[len(years_list)//2] if years_list else 0
    recent_count = len([y for y in years_list if y >= 2023])
    recent_ratio = recent_count / len(papers) if papers else 0

    print(f"\n[*] === YEAR DISTRIBUTION (INNO-5) ===")
    for bucket, count in year_buckets.items():
        pct = (count / len(papers) * 100) if papers else 0
        bar = '#' * min(int(pct), 50)
        try:
            print(f"  {bucket:12s}: {count:4d} papers ({pct:4.0f}%)  {bar}")
        except UnicodeEncodeError:
            print(f"  {bucket}: {count} papers ({pct:.0f}%)")
    print(f"  Median Year: {median_year}")
    print(f"  Recency Score: {recent_ratio:.0%} (papers 2023+)")

    # ============================================================
    # INNO-3: Recency Sweep (auto-trigger if papers 2023+ < 35%)
    # Evidence: Medical knowledge half-life ~18 months (2024-2025 estimates)
    # 2023 cutoff = ~2 half-lives back from 2026 = catches narrative shifts
    # 35% threshold = balanced for mature (Vit C) and emerging (NMN) ingredients
    # ============================================================
    RECENCY_THRESHOLD = 0.35
    if recent_ratio < RECENCY_THRESHOLD and len(papers) > 0:
        print(f"\n[*] INNO-3: Recency ratio {recent_ratio:.0%} < {RECENCY_THRESHOLD:.0%} threshold — Triggering Recency Sweep!")
        recency_new_pmids = []
        date_filter = ' AND ("2023"[Date - Publication] : "3000"[Date - Publication])'

        for q in queries:
            q_str = q.get('query', '') if isinstance(q, dict) else str(q)
            recency_query = q_str + date_filter
            recent_pmids = fetch_pmids(recency_query, limit=5)
            new_recent = [p for p in recent_pmids if p not in all_pmids_list and p not in recency_new_pmids]
            recency_new_pmids.extend(new_recent)

            q_desc = q.get('description', q_str[:50]) if isinstance(q, dict) else q_str[:50]
            try:
                print(f"    [{q_desc}] +{len(new_recent)} new recent papers")
            except UnicodeEncodeError:
                print(f"    [query] +{len(new_recent)} new recent papers")

        if recency_new_pmids:
            print(f"[*] Recency Sweep found {len(recency_new_pmids)} new papers (2022+). Enriching...")
            rec_eupmc_meta = enrich_batch_europe_pmc(recency_new_pmids)

            rec_added = 0
            for rec_pmid in recency_new_pmids:
                rec_eu = rec_eupmc_meta.get(rec_pmid, {})
                if not rec_eu:
                    continue

                rec_title = rec_eu.get('title', '')
                rec_abstract = rec_eu.get('abstractText', '')
                rec_search_text = (rec_title + ' ' + rec_abstract).lower()
                if not any(kw in rec_search_text for kw in valid_keywords):
                    continue

                if exclude_terms:
                    rec_title_lower = rec_title.lower()
                    if any(drug in rec_title_lower for drug in exclude_terms):
                        if not any(kw in rec_title_lower for kw in valid_keywords):
                            continue

                rec_pubtypes_raw = rec_eu.get('pubTypeList', {}).get('pubType', [])
                rec_pubtypes = rec_pubtypes_raw if isinstance(rec_pubtypes_raw, list) else []
                rec_tier, rec_label, rec_weight = get_evidence_tier_info(rec_pubtypes)
                rec_citations = rec_eu.get('citedByCount', 0)
                rec_influence = rec_citations * rec_weight
                rec_year = rec_eu.get('pubYear', '')
                rec_recency = calc_recency_bonus(rec_year)
                rec_composite = rec_influence + rec_recency

                rec_paper = {
                    'pmid': rec_pmid,
                    'pmcid': rec_eu.get('pmcid', ''),
                    'doi': rec_eu.get('doi', ''),
                    'title': rec_title,
                    'authors': rec_eu.get('authorString', ''),
                    'journal': rec_eu.get('journalInfo', {}).get('journal', {}).get('title', ''),
                    'year': rec_year,
                    'pubtypes': rec_pubtypes,
                    'citations': rec_citations,
                    'evidence_tier': rec_tier,
                    'evidence_label': rec_label,
                    'evidence_weight': rec_weight,
                    'influence_score': rec_influence,
                    'recency_bonus': rec_recency,
                    'composite_score': rec_composite,
                    'is_oa': rec_eu.get('isOpenAccess', 'N') == 'Y',
                    'abstract': rec_abstract,
                    'query_facet': 'Recency_Sweep_2022+',
                    'data_completeness': 0,
                    'fulltext_available': False,
                    'fulltext_path': ''
                }
                rec_paper['data_completeness'] = calc_data_completeness(rec_paper)
                if not rec_abstract:
                    empty_abstract_count += 1
                papers.append(rec_paper)
                all_pmids_list.append(rec_pmid)
                rec_added += 1

            print(f"[*] INNO-3 Complete: Added {rec_added} recent papers (2022+)")
            papers.sort(key=lambda x: x['composite_score'], reverse=True)
        else:
            print(f"[*] INNO-3: No new recent papers found.")
    elif recent_ratio >= RECENCY_THRESHOLD:
        print(f"\n[*] INNO-3: Recency ratio {recent_ratio:.0%} >= {RECENCY_THRESHOLD:.0%} — Sweep not needed.")

    # Recalculate recency stats after all INNOs (INNO-2 + INNO-3 may have changed the distribution)
    final_years = []
    for p in papers:
        try:
            y = int(p.get('year', 0))
            if y > 0:
                final_years.append(y)
        except (ValueError, TypeError):
            pass
    if final_years:
        median_year = sorted(final_years)[len(final_years)//2]
        recent_count = len([y for y in final_years if y >= 2023])
        recent_ratio = recent_count / len(papers) if papers else 0

    # ============================================================
    # Print Tier Summary
    # ============================================================
    tier_totals = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for p in papers:
        t = p.get("evidence_tier", 3)
        if t in tier_totals:
            tier_totals[t] += 1

    print(f"\n[*] === EVIDENCE TIER BREAKDOWN ===")
    tier_labels = {1: "Human Gold (MA/SR)", 2: "Human Strong (RCT)", 3: "Human Other", 4: "Animal", 5: "In Vitro"}
    for t in range(1, 6):
        count = tier_totals.get(t, 0)
        label = tier_labels.get(t, "?")
        bar = "#" * min(count, 50)
        try:
            print(f"  Tier {t} [{label:25s}]: {count:4d} papers  {bar}")
        except UnicodeEncodeError:
            print(f"  Tier {t} [{label}]: {count} papers")

    # ============================================================
    # Save files
    # ============================================================
    cache_dir = os.path.join(os.getcwd(), ".research-cache")
    os.makedirs(cache_dir, exist_ok=True)

    reference_dir = None
    if ingredient_dir:
        os.makedirs(ingredient_dir, exist_ok=True)
        reference_dir = ingredient_dir

    # Save ALL papers to Reference Dir as a single Master JSON
    if reference_dir:
        master_json_path = os.path.join(reference_dir, "papers_master.json")
        print(f"\n[*] Saving {len(papers)} papers to single master file: {master_json_path}")
        with open(master_json_path, "w", encoding="utf-8") as pf:
            json.dump(papers, pf, ensure_ascii=False, indent=2)

    # ============================================================
    # OPT-3: Smart Full-Text — Top 1 per Facet (not just Top 5 overall)
    # ============================================================
    facets_covered = set()
    fulltext_candidates = []
    for p in papers:
        facet = p.get("query_facet", "Unknown")
        if facet not in facets_covered and p.get("pmcid"):
            fulltext_candidates.append(p)
            facets_covered.add(facet)
        if len(fulltext_candidates) >= 7:
            break

    # Fallback: if too few candidates, add more OA papers with pmcid
    if len(fulltext_candidates) < 3:
        for p in papers:
            if p not in fulltext_candidates and p.get("pmcid"):
                fulltext_candidates.append(p)
            if len(fulltext_candidates) >= 5:
                break

    print(f"\n[*] Fetching Full-Text for {len(fulltext_candidates)} Key Papers (1 per facet)...")
    ft_success = 0
    for p in fulltext_candidates:
        pmcid = p.get("pmcid", "")
        try:
            print(f"   -> PMID {p['pmid']} (PMC: {pmcid}, Tier {p['evidence_tier']}, Score: {p['composite_score']}): ", end="")
        except UnicodeEncodeError:
            print(f"   -> PMID {p['pmid']}: ", end="")

        xml_save_dir = reference_dir if reference_dir else cache_dir

        if pmcid:
            success, path = download_fulltext_xml(pmcid, xml_save_dir)
            if success:
                p["fulltext_available"] = True
                p["fulltext_path"] = path
                ft_success += 1
                print("Downloaded XML")

                # Update master JSON with fulltext path
                if reference_dir:
                    master_json_path = os.path.join(reference_dir, "papers_master.json")
                    with open(master_json_path, "w", encoding="utf-8") as pf:
                        json.dump(papers, pf, ensure_ascii=False, indent=2)
            else:
                print("XML not available via PMC")
        else:
            print("No PMC ID (requires PMC deposit)")

    # Save master JSON
    safe_ingredient = "".join([c if c.isalnum() else "_" for c in ingredient])
    output_path = os.path.join(cache_dir, f"raw_papers_{safe_ingredient}.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    print(f"\n[*] Complete! {len(papers)} papers saved to {output_path}")
    print(f"[*] Tier breakdown: T1={tier_totals[1]}, T2={tier_totals[2]}, T3={tier_totals[3]}, T4={tier_totals[4]}, T5={tier_totals[5]}")
    print(f"[*] Full-Text XMLs: {ft_success}/{len(fulltext_candidates)}, Empty Abstracts: {empty_abstract_count}")
    if exclude_terms:
        print(f"[*] Drug Collision Filter: excluded {drug_collision_filtered} papers matching {exclude_terms}")
    print(f"[*] Median Year: {median_year}, Recency: {recent_ratio:.0%} (2023+)")
    print(f"[*] Sort: composite_score = influence + recency_bonus")


if __name__ == "__main__":
    main()
