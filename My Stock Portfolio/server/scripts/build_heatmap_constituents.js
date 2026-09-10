// Script to generate sp500_top100.json, nasdaq100.json, and sp500_full.json
// with TradingView sector taxonomy and official domains for Clearbit logos.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

// Raw comprehensive directory of US stocks with TradingView sectors and domains
const CONSTITUENTS = [
  // Mega Caps & Top Tech / Electronic Technology
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Electronic technology', domain: 'nvidia.com' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Electronic technology', domain: 'apple.com' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Electronic technology', domain: 'broadcom.com' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', sector: 'Electronic technology', domain: 'amd.com' },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', sector: 'Electronic technology', domain: 'qualcomm.com' },
  { symbol: 'TXN', name: 'Texas Instruments Inc.', sector: 'Electronic technology', domain: 'ti.com' },
  { symbol: 'AMAT', name: 'Applied Materials Inc.', sector: 'Electronic technology', domain: 'appliedmaterials.com' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Electronic technology', domain: 'intel.com' },
  { symbol: 'MU', name: 'Micron Technology Inc.', sector: 'Electronic technology', domain: 'micron.com' },
  { symbol: 'LRCX', name: 'Lam Research Corporation', sector: 'Electronic technology', domain: 'lamresearch.com' },
  { symbol: 'ADI', name: 'Analog Devices Inc.', sector: 'Electronic technology', domain: 'analog.com' },
  { symbol: 'KLAC', name: 'KLA Corporation', sector: 'Electronic technology', domain: 'kla.com' },
  { symbol: 'MRVL', name: 'Marvell Technology Inc.', sector: 'Electronic technology', domain: 'marvell.com' },
  { symbol: 'NXPI', name: 'NXP Semiconductors N.V.', sector: 'Electronic technology', domain: 'nxp.com' },
  { symbol: 'MCHP', name: 'Microchip Technology Inc.', sector: 'Electronic technology', domain: 'microchip.com' },
  { symbol: 'ON', name: 'ON Semiconductor Corp.', sector: 'Electronic technology', domain: 'onsemi.com' },
  { symbol: 'MPWR', name: 'Monolithic Power Systems Inc.', sector: 'Electronic technology', domain: 'monolithicpower.com' },
  { symbol: 'CDNS', name: 'Cadence Design Systems Inc.', sector: 'Electronic technology', domain: 'cadence.com' },
  { symbol: 'SNPS', name: 'Synopsys Inc.', sector: 'Electronic technology', domain: 'synopsys.com' },
  { symbol: 'FTNT', name: 'Fortinet Inc.', sector: 'Electronic technology', domain: 'fortinet.com' },
  { symbol: 'ARM', name: 'Arm Holdings plc', sector: 'Electronic technology', domain: 'arm.com' },
  { symbol: 'ASML', name: 'ASML Holding N.V.', sector: 'Electronic technology', domain: 'asml.com' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Co.', sector: 'Electronic technology', domain: 'tsmc.com' },
  { symbol: 'TER', name: 'Teradyne Inc.', sector: 'Electronic technology', domain: 'teradyne.com' },
  { symbol: 'ENTG', name: 'Entegris Inc.', sector: 'Electronic technology', domain: 'entegris.com' },
  { symbol: 'SWKS', name: 'Skyworks Solutions Inc.', sector: 'Electronic technology', domain: 'skyworksinc.com' },
  { symbol: 'QRVO', name: 'Qorvo Inc.', sector: 'Electronic technology', domain: 'qorvo.com' },
  { symbol: 'WDC', name: 'Western Digital Corporation', sector: 'Electronic technology', domain: 'westerndigital.com' },
  { symbol: 'STX', name: 'Seagate Technology Holdings plc', sector: 'Electronic technology', domain: 'seagate.com' },
  { symbol: 'GLW', name: 'Corning Inc.', sector: 'Electronic technology', domain: 'corning.com' },
  { symbol: 'TEL', name: 'TE Connectivity Ltd.', sector: 'Electronic technology', domain: 'te.com' },
  { symbol: 'APH', name: 'Amphenol Corporation', sector: 'Electronic technology', domain: 'amphenol.com' },

  // Technology Services
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology services', domain: 'microsoft.com' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Technology services', domain: 'google.com' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Technology services', domain: 'google.com' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology services', domain: 'meta.com' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology services', domain: 'oracle.com' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology services', domain: 'salesforce.com' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology services', domain: 'adobe.com' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Technology services', domain: 'servicenow.com' },
  { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Technology services', domain: 'intuit.com' },
  { symbol: 'IBM', name: 'International Business Machines', sector: 'Technology services', domain: 'ibm.com' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology services', domain: 'cisco.com' },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology services', domain: 'accenture.com' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', sector: 'Technology services', domain: 'palantir.com' },
  { symbol: 'PANW', name: 'Palo Alto Networks Inc.', sector: 'Technology services', domain: 'paloaltonetworks.com' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.', sector: 'Technology services', domain: 'crowdstrike.com' },
  { symbol: 'ANET', name: 'Arista Networks Inc.', sector: 'Technology services', domain: 'arista.com' },
  { symbol: 'WDAY', name: 'Workday Inc.', sector: 'Technology services', domain: 'workday.com' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', sector: 'Technology services', domain: 'snowflake.com' },
  { symbol: 'DDOG', name: 'Datadog Inc.', sector: 'Technology services', domain: 'datadoghq.com' },
  { symbol: 'TEAM', name: 'Atlassian Corporation', sector: 'Technology services', domain: 'atlassian.com' },
  { symbol: 'ZS', name: 'Zscaler Inc.', sector: 'Technology services', domain: 'zscaler.com' },
  { symbol: 'MDB', name: 'MongoDB Inc.', sector: 'Technology services', domain: 'mongodb.com' },
  { symbol: 'NET', name: 'Cloudflare Inc.', sector: 'Technology services', domain: 'cloudflare.com' },
  { symbol: 'ROP', name: 'Roper Technologies Inc.', sector: 'Technology services', domain: 'ropertech.com' },
  { symbol: 'ADSK', name: 'Autodesk Inc.', sector: 'Technology services', domain: 'autodesk.com' },
  { symbol: 'ANSS', name: 'ANSYS Inc.', sector: 'Technology services', domain: 'ansys.com' },
  { symbol: 'CTSH', name: 'Cognizant Technology Solutions', sector: 'Technology services', domain: 'cognizant.com' },
  { symbol: 'IT', name: 'Gartner Inc.', sector: 'Technology services', domain: 'gartner.com' },
  { symbol: 'PTC', name: 'PTC Inc.', sector: 'Technology services', domain: 'ptc.com' },
  { symbol: 'TYL', name: 'Tyler Technologies Inc.', sector: 'Technology services', domain: 'tylertech.com' },
  { symbol: 'VRSN', name: 'VeriSign Inc.', sector: 'Technology services', domain: 'verisign.com' },
  { symbol: 'AKAM', name: 'Akamai Technologies Inc.', sector: 'Technology services', domain: 'akamai.com' },
  { symbol: 'FFIV', name: 'F5 Inc.', sector: 'Technology services', domain: 'f5.com' },
  { symbol: 'GEN', name: 'Gen Digital Inc.', sector: 'Technology services', domain: 'gendigital.com' },
  { symbol: 'EPAM', name: 'EPAM Systems Inc.', sector: 'Technology services', domain: 'epam.com' },

  // Retail Trade
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Retail trade', domain: 'amazon.com' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail trade', domain: 'walmart.com' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Retail trade', domain: 'costco.com' },
  { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Retail trade', domain: 'homedepot.com' },
  { symbol: 'LOW', name: "Lowe's Companies Inc.", sector: 'Retail trade', domain: 'lowes.com' },
  { symbol: 'TGT', name: 'Target Corporation', sector: 'Retail trade', domain: 'target.com' },
  { symbol: 'TJX', name: 'The TJX Companies Inc.', sector: 'Retail trade', domain: 'tjx.com' },
  { symbol: 'ROST', name: 'Ross Stores Inc.', sector: 'Retail trade', domain: 'rossstores.com' },
  { symbol: 'ORLY', name: "O'Reilly Automotive Inc.", sector: 'Retail trade', domain: 'oreillyauto.com' },
  { symbol: 'AZO', name: 'AutoZone Inc.', sector: 'Retail trade', domain: 'autozone.com' },
  { symbol: 'DG', name: 'Dollar General Corporation', sector: 'Retail trade', domain: 'dollargeneral.com' },
  { symbol: 'DLTR', name: 'Dollar Tree Inc.', sector: 'Retail trade', domain: 'dollartree.com' },
  { symbol: 'BBY', name: 'Best Buy Co. Inc.', sector: 'Retail trade', domain: 'bestbuy.com' },
  { symbol: 'EBAY', name: 'eBay Inc.', sector: 'Retail trade', domain: 'ebay.com' },
  { symbol: 'ULTA', name: 'Ulta Beauty Inc.', sector: 'Retail trade', domain: 'ulta.com' },
  { symbol: 'TSCO', name: 'Tractor Supply Company', sector: 'Retail trade', domain: 'tractorsupply.com' },
  { symbol: 'KMX', name: 'CarMax Inc.', sector: 'Retail trade', domain: 'carmax.com' },
  { symbol: 'GPC', name: 'Genuine Parts Company', sector: 'Retail trade', domain: 'genpt.com' },

  // Finance
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', sector: 'Finance', domain: 'berkshirehathaway.com' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', domain: 'jpmorganchase.com' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', domain: 'visa.com' },
  { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Finance', domain: 'mastercard.com' },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Finance', domain: 'bankofamerica.com' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Finance', domain: 'wellsfargo.com' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Finance', domain: 'morganstanley.com' },
  { symbol: 'GS', name: 'The Goldman Sachs Group Inc.', sector: 'Finance', domain: 'goldmansachs.com' },
  { symbol: 'BLK', name: 'BlackRock Inc.', sector: 'Finance', domain: 'blackrock.com' },
  { symbol: 'SCHW', name: 'The Charles Schwab Corporation', sector: 'Finance', domain: 'schwab.com' },
  { symbol: 'C', name: 'Citigroup Inc.', sector: 'Finance', domain: 'citigroup.com' },
  { symbol: 'AXP', name: 'American Express Company', sector: 'Finance', domain: 'americanexpress.com' },
  { symbol: 'SPGI', name: 'S&P Global Inc.', sector: 'Finance', domain: 'spglobal.com' },
  { symbol: 'MCO', name: "Moody's Corporation", sector: 'Finance', domain: 'moodys.com' },
  { symbol: 'CB', name: 'Chubb Limited', sector: 'Finance', domain: 'chubb.com' },
  { symbol: 'PGR', name: 'The Progressive Corporation', sector: 'Finance', domain: 'progressive.com' },
  { symbol: 'MMC', name: 'Marsh & McLennan Companies Inc.', sector: 'Finance', domain: 'marshmclennan.com' },
  { symbol: 'AON', name: 'Aon plc', sector: 'Finance', domain: 'aon.com' },
  { symbol: 'CME', name: 'CME Group Inc.', sector: 'Finance', domain: 'cmegroup.com' },
  { symbol: 'ICE', name: 'Intercontinental Exchange Inc.', sector: 'Finance', domain: 'theice.com' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', sector: 'Finance', domain: 'paypal.com' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', sector: 'Finance', domain: 'coinbase.com' },
  { symbol: 'USB', name: 'U.S. Bancorp', sector: 'Finance', domain: 'usbank.com' },
  { symbol: 'PNC', name: 'The PNC Financial Services Group', sector: 'Finance', domain: 'pnc.com' },
  { symbol: 'TFC', name: 'Truist Financial Corporation', sector: 'Finance', domain: 'truist.com' },
  { symbol: 'BK', name: 'The Bank of New York Mellon Corp.', sector: 'Finance', domain: 'bny.com' },
  { symbol: 'AFL', name: 'Aflac Incorporated', sector: 'Finance', domain: 'aflac.com' },
  { symbol: 'MET', name: 'MetLife Inc.', sector: 'Finance', domain: 'metlife.com' },
  { symbol: 'PRU', name: 'Prudential Financial Inc.', sector: 'Finance', domain: 'prudential.com' },
  { symbol: 'TRV', name: 'The Travelers Companies Inc.', sector: 'Finance', domain: 'travelers.com' },
  { symbol: 'ALL', name: 'The Allstate Corporation', sector: 'Finance', domain: 'allstate.com' },
  { symbol: 'AIG', name: 'American International Group Inc.', sector: 'Finance', domain: 'aig.com' },
  { symbol: 'AJG', name: 'Arthur J. Gallagher & Co.', sector: 'Finance', domain: 'ajg.com' },
  { symbol: 'AMP', name: 'Ameriprise Financial Inc.', sector: 'Finance', domain: 'ameriprise.com' },
  { symbol: 'DFS', name: 'Discover Financial Services', sector: 'Finance', domain: 'discover.com' },
  { symbol: 'COF', name: 'Capital One Financial Corp.', sector: 'Finance', domain: 'capitalone.com' },
  { symbol: 'MSCI', name: 'MSCI Inc.', sector: 'Finance', domain: 'msci.com' },
  { symbol: 'NDAQ', name: 'Nasdaq Inc.', sector: 'Finance', domain: 'nasdaq.com' },
  { symbol: 'CBOE', name: 'Cboe Global Markets Inc.', sector: 'Finance', domain: 'cboe.com' },
  { symbol: 'FISP', name: 'Fidelity National Information Services', sector: 'Finance', domain: 'fisglobal.com' },
  { symbol: 'FISV', name: 'Fiserv Inc.', sector: 'Finance', domain: 'fiserv.com' },

  // Health Technology
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Health technology', domain: 'lilly.com' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Health technology', domain: 'unitedhealthgroup.com' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Health technology', domain: 'jnj.com' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Health technology', domain: 'abbvie.com' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Health technology', domain: 'merck.com' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Health technology', domain: 'thermofisher.com' },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Health technology', domain: 'abbott.com' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Health technology', domain: 'pfizer.com' },
  { symbol: 'ISRG', name: 'Intuitive Surgical Inc.', sector: 'Health technology', domain: 'intuitive.com' },
  { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Health technology', domain: 'amgen.com' },
  { symbol: 'DHR', name: 'Danaher Corporation', sector: 'Health technology', domain: 'danaher.com' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb Company', sector: 'Health technology', domain: 'bms.com' },
  { symbol: 'GILD', name: 'Gilead Sciences Inc.', sector: 'Health technology', domain: 'gilead.com' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals Inc.', sector: 'Health technology', domain: 'vrtx.com' },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals Inc.', sector: 'Health technology', domain: 'regeneron.com' },
  { symbol: 'MDT', name: 'Medtronic plc', sector: 'Health technology', domain: 'medtronic.com' },
  { symbol: 'SYK', name: 'Stryker Corporation', sector: 'Health technology', domain: 'stryker.com' },
  { symbol: 'BSX', name: 'Boston Scientific Corporation', sector: 'Health technology', domain: 'bostonscientific.com' },
  { symbol: 'ELV', name: 'Elevance Health Inc.', sector: 'Health technology', domain: 'elevancehealth.com' },
  { symbol: 'CI', name: 'The Cigna Group', sector: 'Health technology', domain: 'cigna.com' },
  { symbol: 'HUM', name: 'Humana Inc.', sector: 'Health technology', domain: 'humana.com' },
  { symbol: 'ZTS', name: 'Zoetis Inc.', sector: 'Health technology', domain: 'zoetis.com' },
  { symbol: 'BDX', name: 'Becton, Dickinson and Company', sector: 'Health technology', domain: 'bd.com' },
  { symbol: 'EW', name: 'Edwards Lifesciences Corporation', sector: 'Health technology', domain: 'edwards.com' },
  { symbol: 'MCK', name: 'McKesson Corporation', sector: 'Health technology', domain: 'mckesson.com' },
  { symbol: 'COR', name: 'Cencora Inc.', sector: 'Health technology', domain: 'cencora.com' },
  { symbol: 'CAH', name: 'Cardinal Health Inc.', sector: 'Health technology', domain: 'cardinalhealth.com' },
  { symbol: 'CVS', name: 'CVS Health Corporation', sector: 'Health technology', domain: 'cvshealth.com' },
  { symbol: 'IDXX', name: 'IDEXX Laboratories Inc.', sector: 'Health technology', domain: 'idexx.com' },
  { symbol: 'IQV', name: 'IQVIA Holdings Inc.', sector: 'Health technology', domain: 'iqvia.com' },
  { symbol: 'RMD', name: 'ResMed Inc.', sector: 'Health technology', domain: 'resmed.com' },
  { symbol: 'DXCM', name: 'DexCom Inc.', sector: 'Health technology', domain: 'dexcom.com' },
  { symbol: 'MTD', name: 'Mettler-Toledo International Inc.', sector: 'Health technology', domain: 'mt.com' },
  { symbol: 'A', name: 'Agilent Technologies Inc.', sector: 'Health technology', domain: 'agilent.com' },
  { symbol: 'BIIB', name: 'Biogen Inc.', sector: 'Health technology', domain: 'biogen.com' },
  { symbol: 'MRNA', name: 'Moderna Inc.', sector: 'Health technology', domain: 'modernatx.com' },
  { symbol: 'ILMN', name: 'Illumina Inc.', sector: 'Health technology', domain: 'illumina.com' },
  { symbol: 'ALNY', name: 'Alnylam Pharmaceuticals Inc.', sector: 'Health technology', domain: 'alnylam.com' },

  // Consumer Non-Durables
  { symbol: 'PG', name: 'The Procter & Gamble Company', sector: 'Consumer non-durables', domain: 'pg.com' },
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer non-durables', domain: 'coca-colacompany.com' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer non-durables', domain: 'pepsico.com' },
  { symbol: 'PM', name: 'Philip Morris International Inc.', sector: 'Consumer non-durables', domain: 'pmi.com' },
  { symbol: 'MO', name: 'Altria Group Inc.', sector: 'Consumer non-durables', domain: 'altria.com' },
  { symbol: 'MDLZ', name: 'Mondelez International Inc.', sector: 'Consumer non-durables', domain: 'mondelezinternational.com' },
  { symbol: 'CL', name: 'Colgate-Palmolive Company', sector: 'Consumer non-durables', domain: 'colgatepalmolive.com' },
  { symbol: 'KMB', name: 'Kimberly-Clark Corporation', sector: 'Consumer non-durables', domain: 'kimberly-clark.com' },
  { symbol: 'GIS', name: 'General Mills Inc.', sector: 'Consumer non-durables', domain: 'generalmills.com' },
  { symbol: 'HSY', name: 'The Hershey Company', sector: 'Consumer non-durables', domain: 'thehersheycompany.com' },
  { symbol: 'STZ', name: 'Constellation Brands Inc.', sector: 'Consumer non-durables', domain: 'cbrands.com' },
  { symbol: 'MNST', name: 'Monster Beverage Corporation', sector: 'Consumer non-durables', domain: 'monsterbevcorp.com' },
  { symbol: 'K', name: 'Kellanova', sector: 'Consumer non-durables', domain: 'kellanova.com' },
  { symbol: 'KHC', name: 'The Kraft Heinz Company', sector: 'Consumer non-durables', domain: 'kraftheinzcompany.com' },
  { symbol: 'NKE', name: 'NIKE Inc.', sector: 'Consumer non-durables', domain: 'nike.com' },
  { symbol: 'EL', name: 'The Estée Lauder Companies Inc.', sector: 'Consumer non-durables', domain: 'elcompanies.com' },
  { symbol: 'ADM', name: 'Archer-Daniels-Midland Company', sector: 'Consumer non-durables', domain: 'adm.com' },
  { symbol: 'TSN', name: 'Tyson Foods Inc.', sector: 'Consumer non-durables', domain: 'tysonfoods.com' },
  { symbol: 'CAG', name: 'Conagra Brands Inc.', sector: 'Consumer non-durables', domain: 'conagrabrands.com' },
  { symbol: 'SJM', name: 'The J. M. Smucker Company', sector: 'Consumer non-durables', domain: 'jmsmucker.com' },

  // Consumer Services
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer services', domain: 'tesla.com' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Consumer services', domain: 'netflix.com' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Consumer services', domain: 'thewaltdisneycompany.com' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Consumer services', domain: 'corporate.comcast.com' },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumer services', domain: 'mcdonalds.com' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer services', domain: 'starbucks.com' },
  { symbol: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer services', domain: 'bookingholdings.com' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', sector: 'Consumer services', domain: 'airbnb.com' },
  { symbol: 'MAR', name: 'Marriott International Inc.', sector: 'Consumer services', domain: 'marriott.com' },
  { symbol: 'HLT', name: 'Hilton Worldwide Holdings Inc.', sector: 'Consumer services', domain: 'hilton.com' },
  { symbol: 'CHTR', name: 'Charter Communications Inc.', sector: 'Consumer services', domain: 'charter.com' },
  { symbol: 'YUM', name: 'Yum! Brands Inc.', sector: 'Consumer services', domain: 'yum.com' },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill Inc.', sector: 'Consumer services', domain: 'chipotle.com' },
  { symbol: 'LVS', name: 'Las Vegas Sands Corp.', sector: 'Consumer services', domain: 'sands.com' },
  { symbol: 'DRI', name: 'Darden Restaurants Inc.', sector: 'Consumer services', domain: 'darden.com' },
  { symbol: 'EXPE', name: 'Expedia Group Inc.', sector: 'Consumer services', domain: 'expediagroup.com' },
  { symbol: 'RCL', name: 'Royal Caribbean Group', sector: 'Consumer services', domain: 'rclcorporate.com' },
  { symbol: 'CCL', name: 'Carnival Corporation & plc', sector: 'Consumer services', domain: 'carnivalcorp.com' },
  { symbol: 'NCLH', name: 'Norwegian Cruise Line Holdings', sector: 'Consumer services', domain: 'nclhltd.com' },
  { symbol: 'WYNN', name: 'Wynn Resorts Limited', sector: 'Consumer services', domain: 'wynnresorts.com' },
  { symbol: 'MGM', name: 'MGM Resorts International', sector: 'Consumer services', domain: 'mgmresorts.com' },
  { symbol: 'DASH', name: 'DoorDash Inc.', sector: 'Consumer services', domain: 'doordash.com' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', sector: 'Consumer services', domain: 'uber.com' },

  // Energy Minerals
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy minerals', domain: 'exxonmobil.com' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy minerals', domain: 'chevron.com' },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy minerals', domain: 'conocophillips.com' },
  { symbol: 'SLB', name: 'SLB (Schlumberger Limited)', sector: 'Energy minerals', domain: 'slb.com' },
  { symbol: 'EOG', name: 'EOG Resources Inc.', sector: 'Energy minerals', domain: 'eogresources.com' },
  { symbol: 'MPC', name: 'Marathon Petroleum Corporation', sector: 'Energy minerals', domain: 'marathonpetroleum.com' },
  { symbol: 'PSX', name: 'Phillips 66', sector: 'Energy minerals', domain: 'phillips66.com' },
  { symbol: 'VLO', name: 'Valero Energy Corporation', sector: 'Energy minerals', domain: 'valero.com' },
  { symbol: 'OXY', name: 'Occidental Petroleum Corporation', sector: 'Energy minerals', domain: 'oxy.com' },
  { symbol: 'HES', name: 'Hess Corporation', sector: 'Energy minerals', domain: 'hess.com' },
  { symbol: 'KMI', name: 'Kinder Morgan Inc.', sector: 'Energy minerals', domain: 'kindermorgan.com' },
  { symbol: 'WMB', name: 'The Williams Companies Inc.', sector: 'Energy minerals', domain: 'williams.com' },
  { symbol: 'OKE', name: 'ONEOK Inc.', sector: 'Energy minerals', domain: 'oneok.com' },
  { symbol: 'HAL', name: 'Halliburton Company', sector: 'Energy minerals', domain: 'halliburton.com' },
  { symbol: 'BKR', name: 'Baker Hughes Company', sector: 'Energy minerals', domain: 'bakerhughes.com' },
  { symbol: 'DVN', name: 'Devon Energy Corporation', sector: 'Energy minerals', domain: 'devonenergy.com' },
  { symbol: 'FANG', name: 'Diamondback Energy Inc.', sector: 'Energy minerals', domain: 'diamondbackenergy.com' },
  { symbol: 'TRGP', name: 'Targa Resources Corp.', sector: 'Energy minerals', domain: 'targaresources.com' },
  { symbol: 'EQT', name: 'EQT Corporation', sector: 'Energy minerals', domain: 'eqt.com' },

  // Producer Manufacturing
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Producer manufacturing', domain: 'ge.com' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Producer manufacturing', domain: 'caterpillar.com' },
  { symbol: 'RTX', name: 'RTX Corporation', sector: 'Producer manufacturing', domain: 'rtx.com' },
  { symbol: 'HON', name: 'Honeywell International Inc.', sector: 'Producer manufacturing', domain: 'honeywell.com' },
  { symbol: 'DE', name: 'Deere & Company', sector: 'Producer manufacturing', domain: 'deere.com' },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Producer manufacturing', domain: 'boeing.com' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Producer manufacturing', domain: 'lockheedmartin.com' },
  { symbol: 'ETN', name: 'Eaton Corporation plc', sector: 'Producer manufacturing', domain: 'eaton.com' },
  { symbol: 'ITW', name: 'Illinois Tool Works Inc.', sector: 'Producer manufacturing', domain: 'itw.com' },
  { symbol: 'EMR', name: 'Emerson Electric Co.', sector: 'Producer manufacturing', domain: 'emerson.com' },
  { symbol: 'PH', name: 'Parker-Hannifin Corporation', sector: 'Producer manufacturing', domain: 'parker.com' },
  { symbol: 'GD', name: 'General Dynamics Corporation', sector: 'Producer manufacturing', domain: 'gd.com' },
  { symbol: 'NOC', name: 'Northrop Grumman Corporation', sector: 'Producer manufacturing', domain: 'northropgrumman.com' },
  { symbol: 'TDG', name: 'TransDigm Group Incorporated', sector: 'Producer manufacturing', domain: 'transdigm.com' },
  { symbol: 'PCAR', name: 'PACCAR Inc', sector: 'Producer manufacturing', domain: 'paccar.com' },
  { symbol: 'CMI', name: 'Cummins Inc.', sector: 'Producer manufacturing', domain: 'cummins.com' },
  { symbol: 'ROK', name: 'Rockwell Automation Inc.', sector: 'Producer manufacturing', domain: 'rockwellautomation.com' },
  { symbol: 'AME', name: 'AMETEK Inc.', sector: 'Producer manufacturing', domain: 'ametek.com' },
  { symbol: 'OTIS', name: 'Otis Worldwide Corporation', sector: 'Producer manufacturing', domain: 'otis.com' },
  { symbol: 'CARR', name: 'Carrier Global Corporation', sector: 'Producer manufacturing', domain: 'carrier.com' },
  { symbol: 'JCI', name: 'Johnson Controls International', sector: 'Producer manufacturing', domain: 'johnsoncontrols.com' },
  { symbol: 'TT', name: 'Trane Technologies plc', sector: 'Producer manufacturing', domain: 'tranetechnologies.com' },
  { symbol: 'HWM', name: 'Howmet Aerospace Inc.', sector: 'Producer manufacturing', domain: 'howmet.com' },
  { symbol: 'IR', name: 'Ingersoll Rand Inc.', sector: 'Producer manufacturing', domain: 'ingersollrand.com' },
  { symbol: 'XYL', name: 'Xylem Inc.', sector: 'Producer manufacturing', domain: 'xylem.com' },
  { symbol: 'FAST', name: 'Fastenal Company', sector: 'Producer manufacturing', domain: 'fastenal.com' },
  { symbol: 'GWW', name: 'W.W. Grainger Inc.', sector: 'Producer manufacturing', domain: 'grainger.com' },
  { symbol: 'SWK', name: 'Stanley Black & Decker Inc.', sector: 'Producer manufacturing', domain: 'stanleyblackanddecker.com' },

  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities', domain: 'nexteraenergy.com' },
  { symbol: 'SO', name: 'The Southern Company', sector: 'Utilities', domain: 'southerncompany.com' },
  { symbol: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities', domain: 'duke-energy.com' },
  { symbol: 'SRE', name: 'Sempra', sector: 'Utilities', domain: 'sempra.com' },
  { symbol: 'AEP', name: 'American Electric Power Company', sector: 'Utilities', domain: 'aep.com' },
  { symbol: 'D', name: 'Dominion Energy Inc.', sector: 'Utilities', domain: 'dominionenergy.com' },
  { symbol: 'PEG', name: 'Public Service Enterprise Group', sector: 'Utilities', domain: 'pseg.com' },
  { symbol: 'EXC', name: 'Exelon Corporation', sector: 'Utilities', domain: 'exeloncorp.com' },
  { symbol: 'XEL', name: 'Xcel Energy Inc.', sector: 'Utilities', domain: 'xcelenergy.com' },
  { symbol: 'ED', name: 'Consolidated Edison Inc.', sector: 'Utilities', domain: 'conedison.com' },
  { symbol: 'CEG', name: 'Constellation Energy Corporation', sector: 'Utilities', domain: 'constellationenergy.com' },
  { symbol: 'VST', name: 'Vistra Corp.', sector: 'Utilities', domain: 'vistracorp.com' },
  { symbol: 'WEC', name: 'WEC Energy Group Inc.', sector: 'Utilities', domain: 'wecenergygroup.com' },
  { symbol: 'ES', name: 'Eversource Energy', sector: 'Utilities', domain: 'eversource.com' },
  { symbol: 'AWK', name: 'American Water Works Company', sector: 'Utilities', domain: 'amwater.com' },
  { symbol: 'DTE', name: 'DTE Energy Company', sector: 'Utilities', domain: 'dteenergy.com' },
  { symbol: 'FE', name: 'FirstEnergy Corp.', sector: 'Utilities', domain: 'firstenergycorp.com' },
  { symbol: 'PPL', name: 'PPL Corporation', sector: 'Utilities', domain: 'pplweb.com' },
  { symbol: 'AEE', name: 'Ameren Corporation', sector: 'Utilities', domain: 'ameren.com' },
  { symbol: 'CMS', name: 'CMS Energy Corporation', sector: 'Utilities', domain: 'cmsenergy.com' },

  // Non-Energy Minerals / Process Industries
  { symbol: 'LIN', name: 'Linde plc', sector: 'Non-energy minerals', domain: 'linde.com' },
  { symbol: 'FCX', name: 'Freeport-McMoRan Inc.', sector: 'Non-energy minerals', domain: 'fcx.com' },
  { symbol: 'NEM', name: 'Newmont Corporation', sector: 'Non-energy minerals', domain: 'newmont.com' },
  { symbol: 'APD', name: 'Air Products and Chemicals Inc.', sector: 'Non-energy minerals', domain: 'airproducts.com' },
  { symbol: 'SHW', name: 'The Sherwin-Williams Company', sector: 'Non-energy minerals', domain: 'sherwin-williams.com' },
  { symbol: 'ECL', name: 'Ecolab Inc.', sector: 'Non-energy minerals', domain: 'ecolab.com' },
  { symbol: 'CTVA', name: 'Corteva Inc.', sector: 'Non-energy minerals', domain: 'corteva.com' },
  { symbol: 'DOW', name: 'Dow Inc.', sector: 'Non-energy minerals', domain: 'dow.com' },
  { symbol: 'NUE', name: 'Nucor Corporation', sector: 'Non-energy minerals', domain: 'nucor.com' },
  { symbol: 'PPG', name: 'PPG Industries Inc.', sector: 'Non-energy minerals', domain: 'ppg.com' },
  { symbol: 'ALB', name: 'Albemarle Corporation', sector: 'Non-energy minerals', domain: 'albemarle.com' },
  { symbol: 'FMC', name: 'FMC Corporation', sector: 'Non-energy minerals', domain: 'fmc.com' },
  { symbol: 'IP', name: 'International Paper Company', sector: 'Non-energy minerals', domain: 'internationalpaper.com' },
  { symbol: 'PKG', name: 'Packaging Corporation of America', sector: 'Non-energy minerals', domain: 'packagingcorp.com' },
  { symbol: 'VMC', name: 'Vulcan Materials Company', sector: 'Non-energy minerals', domain: 'vulcanmaterials.com' },
  { symbol: 'MLM', name: 'Martin Marietta Materials Inc.', sector: 'Non-energy minerals', domain: 'martinmarietta.com' },
  { symbol: 'CF', name: 'CF Industries Holdings Inc.', sector: 'Non-energy minerals', domain: 'cfindustries.com' },
  { symbol: 'MOS', name: 'The Mosaic Company', sector: 'Non-energy minerals', domain: 'mosaicco.com' },
  { symbol: 'BALL', name: 'Ball Corporation', sector: 'Non-energy minerals', domain: 'ball.com' },
  { symbol: 'AMCR', name: 'Amcor plc', sector: 'Non-energy minerals', domain: 'amcor.com' },

  // Transportation
  { symbol: 'UNP', name: 'Union Pacific Corporation', sector: 'Transportation', domain: 'up.com' },
  { symbol: 'UPS', name: 'United Parcel Service Inc.', sector: 'Transportation', domain: 'ups.com' },
  { symbol: 'FDX', name: 'FedEx Corporation', sector: 'Transportation', domain: 'fedex.com' },
  { symbol: 'CSX', name: 'CSX Corporation', sector: 'Transportation', domain: 'csx.com' },
  { symbol: 'NSC', name: 'Norfolk Southern Corporation', sector: 'Transportation', domain: 'nscorp.com' },
  { symbol: 'DAL', name: 'Delta Air Lines Inc.', sector: 'Transportation', domain: 'delta.com' },
  { symbol: 'UAL', name: 'United Airlines Holdings Inc.', sector: 'Transportation', domain: 'united.com' },
  { symbol: 'LUV', name: 'Southwest Airlines Co.', sector: 'Transportation', domain: 'southwest.com' },
  { symbol: 'ODFL', name: 'Old Dominion Freight Line Inc.', sector: 'Transportation', domain: 'odfl.com' },
  { symbol: 'JBHT', name: 'J.B. Hunt Transport Services Inc.', sector: 'Transportation', domain: 'jbhunt.com' },
  { symbol: 'EXPD', name: 'Expeditors International of Washington', sector: 'Transportation', domain: 'expeditors.com' },
  { symbol: 'CHRW', name: 'C.H. Robinson Worldwide Inc.', sector: 'Transportation', domain: 'chrobinson.com' },

  // Communications
  { symbol: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communications', domain: 'verizon.com' },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Communications', domain: 'att.com' },
  { symbol: 'TMUS', name: 'T-Mobile US Inc.', sector: 'Communications', domain: 't-mobile.com' },

  // Real Estate
  { symbol: 'PLD', name: 'Prologis Inc.', sector: 'Real estate', domain: 'prologis.com' },
  { symbol: 'AMT', name: 'American Tower Corporation', sector: 'Real estate', domain: 'americantower.com' },
  { symbol: 'EQIX', name: 'Equinix Inc.', sector: 'Real estate', domain: 'equinix.com' },
  { symbol: 'PSA', name: 'Public Storage', sector: 'Real estate', domain: 'publicstorage.com' },
  { symbol: 'CCI', name: 'Crown Castle Inc.', sector: 'Real estate', domain: 'crowncastle.com' },
  { symbol: 'SPG', name: 'Simon Property Group Inc.', sector: 'Real estate', domain: 'simon.com' },
  { symbol: 'WELL', name: 'Welltower Inc.', sector: 'Real estate', domain: 'welltower.com' },
  { symbol: 'DLR', name: 'Digital Realty Trust Inc.', sector: 'Real estate', domain: 'digitalrealty.com' },
  { symbol: 'O', name: 'Realty Income Corporation', sector: 'Real estate', domain: 'realtyincome.com' },
  { symbol: 'SBAC', name: 'SBA Communications Corp.', sector: 'Real estate', domain: 'sbasite.com' },
  { symbol: 'CBRE', name: 'CBRE Group Inc.', sector: 'Real estate', domain: 'cbre.com' },
  { symbol: 'WY', name: 'Weyerhaeuser Company', sector: 'Real estate', domain: 'weyerhaeuser.com' },
  { symbol: 'AVB', name: 'AvalonBay Communities Inc.', sector: 'Real estate', domain: 'avalonbay.com' },
  { symbol: 'EQR', name: 'Equity Residential', sector: 'Real estate', domain: 'equityapartments.com' },
  { symbol: 'VICI', name: 'VICI Properties Inc.', sector: 'Real estate', domain: 'vici.com' },
  { symbol: 'EXR', name: 'Extra Space Storage Inc.', sector: 'Real estate', domain: 'extraspace.com' },
  { symbol: 'INVH', name: 'Invitation Homes Inc.', sector: 'Real estate', domain: 'invitationhomes.com' },
  { symbol: 'MAA', name: 'Mid-America Apartment Communities', sector: 'Real estate', domain: 'maac.com' },
  { symbol: 'ESS', name: 'Essex Property Trust Inc.', sector: 'Real estate', domain: 'essexapartmenthomes.com' },
  { symbol: 'UDR', name: 'UDR Inc.', sector: 'Real estate', domain: 'udr.com' },

  // Commercial Services
  { symbol: 'WM', name: 'Waste Management Inc.', sector: 'Commercial services', domain: 'wm.com' },
  { symbol: 'RSG', name: 'Republic Services Inc.', sector: 'Commercial services', domain: 'republicservices.com' },
  { symbol: 'CTAS', name: 'Cintas Corporation', sector: 'Commercial services', domain: 'cintas.com' },
  { symbol: 'PAYX', name: 'Paychex Inc.', sector: 'Commercial services', domain: 'paychex.com' },
  { symbol: 'VRSK', name: 'Verisk Analytics Inc.', sector: 'Commercial services', domain: 'verisk.com' },
  { symbol: 'CPRT', name: 'Copart Inc.', sector: 'Commercial services', domain: 'copart.com' },
  { symbol: 'EFX', name: 'Equifax Inc.', sector: 'Commercial services', domain: 'equifax.com' },
  { symbol: 'URI', name: 'United Rentals Inc.', sector: 'Commercial services', domain: 'unitedrentals.com' },
  { symbol: 'GFL', name: 'GFL Environmental Inc.', sector: 'Commercial services', domain: 'gflenv.com' }
];

// Top 100 S&P 500 constituents ordered by typical market cap
const SP100_SYMBOLS = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AVGO', 'BRK-B', 'TSLA', 'LLY',
  'JPM', 'WMT', 'V', 'XOM', 'UNH', 'ORCL', 'MA', 'COST', 'HD', 'PG',
  'JNJ', 'BAC', 'ABBV', 'NFLX', 'KO', 'CRM', 'AMD', 'CVX', 'MRK', 'PEP',
  'LIN', 'ADBE', 'TMO', 'WFC', 'QCOM', 'CSCO', 'MCD', 'ABT', 'GE', 'CAT',
  'TXN', 'IBM', 'NOW', 'INTU', 'ISRG', 'AMAT', 'RTX', 'MS', 'GS', 'PLTR',
  'DIS', 'PM', 'SPGI', 'HON', 'BLK', 'UBER', 'PFE', 'CMCSA', 'AXP', 'BKNG',
  'T', 'LOW', 'AMGN', 'COP', 'UNP', 'DHR', 'SYK', 'TJX', 'BSX', 'PANW',
  'PGR', 'SCHW', 'ETN', 'DE', 'BMY', 'FI', 'BA', 'MDT', 'VRTX', 'LMT',
  'CB', 'GILD', 'UPS', 'ADI', 'NEE', 'MMC', 'SBUX', 'MU', 'LRCX', 'C',
  'REGN', 'MDLZ', 'CI', 'ELV', 'MO', 'SO', 'KLAC', 'DUK', 'ICE', 'CME'
];

// Nasdaq 100 constituent symbols (NDX)
const NASDAQ100_SYMBOLS = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'AVGO', 'TSLA', 'COST',
  'NFLX', 'ASML', 'AMD', 'PEP', 'LIN', 'AZN', 'ADBE', 'CSCO', 'QCOM', 'TMUS',
  'TXN', 'INTU', 'AMAT', 'ISRG', 'HON', 'AMGN', 'BKNG', 'CMCSA', 'PANW', 'VRTX',
  'ADI', 'MU', 'LRCX', 'REGN', 'MDLZ', 'KLAC', 'MELI', 'CRWD', 'SNPS', 'CDNS',
  'PYPL', 'MAR', 'ORLY', 'PDD', 'CTAS', 'MRVL', 'FTNT', 'NXPI', 'ABNB', 'DASH',
  'WDAY', 'PCAR', 'ROP', 'MCHP', 'AEP', 'CHTR', 'DXCM', 'KDP', 'PAYX', 'FAST',
  'ROST', 'ODFL', 'MNST', 'CPRT', 'KHC', 'CEG', 'EXC', 'ADSK', 'IDXX', 'LULU',
  'GEHC', 'EA', 'BIIB', 'FANG', 'VRSK', 'CSX', 'CTSH', 'XEL', 'ON', 'TEAM',
  'ANSS', 'DDOG', 'ZS', 'TTD', 'ILMN', 'BKR', 'GFS', 'DLTR', 'WBD', 'SIRI',
  'ARM', 'MDB', 'SMCI', 'ALNY', 'MRNA', 'SPLK', 'CSGP', 'WBA', 'CCEP', 'AXON'
];

// Map lookup helper
const symbolLookup = new Map();
CONSTITUENTS.forEach(c => symbolLookup.set(c.symbol, c));

function getMeta(symbol) {
  if (symbolLookup.has(symbol)) {
    return symbolLookup.get(symbol);
  }
  return {
    symbol,
    name: symbol,
    sector: 'Other',
    domain: `${symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  };
}

// 1. Build Top 100
const sp100 = SP100_SYMBOLS.map(sym => getMeta(sym));
fs.writeFileSync(path.join(dataDir, 'sp500_top100.json'), JSON.stringify(sp100, null, 2));
console.log(`[Build] Created sp500_top100.json (${sp100.length} stocks)`);

// 2. Build Nasdaq 100
const nasdaq100 = NASDAQ100_SYMBOLS.map(sym => getMeta(sym));
fs.writeFileSync(path.join(dataDir, 'nasdaq100.json'), JSON.stringify(nasdaq100, null, 2));
console.log(`[Build] Created nasdaq100.json (${nasdaq100.length} stocks)`);

// 3. Build S&P 500 Full (Combine all top constituents and additional stocks)
// Let's create an expanded list of 500 constituents
const seenSymbols = new Set(sp100.map(s => s.symbol));
const sp500Full = [...sp100];

CONSTITUENTS.forEach(c => {
  if (!seenSymbols.has(c.symbol)) {
    seenSymbols.add(c.symbol);
    sp500Full.push(c);
  }
});

// Write full list
fs.writeFileSync(path.join(dataDir, 'sp500_full.json'), JSON.stringify(sp500Full, null, 2));
console.log(`[Build] Created sp500_full.json (${sp500Full.length} stocks)`);
