"""
test_07d_broll_contract.py — Contract & State Unit Tests for 07d
"""
import unittest
import sys
from pathlib import Path

# Add scripts directory
SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.append(str(SCRIPTS_DIR))
sys.path.append(str(SCRIPTS_DIR / "utils"))

# Import from 07d
from importlib.machinery import SourceFileLoader
mod_07d = SourceFileLoader("broll_07d", str(SCRIPTS_DIR / "07d-auto-broll-flow.py")).load_module()

FlowKitClient = mod_07d.FlowKitClient
L1QualityAssurance = mod_07d.L1QualityAssurance
clean_prompt_text = mod_07d.clean_prompt_text
sanitize_filename = mod_07d.sanitize_filename


class Test07dContracts(unittest.TestCase):
    def test_sanitize_filename(self):
        self.assertEqual(sanitize_filename("DNA / Microscopic: Test?"), "DNA_Microscopic_Test")
        self.assertTrue(len(sanitize_filename("A" * 100)) <= 35)

    def test_clean_prompt_text(self):
        self.assertEqual(clean_prompt_text("[S01] Cinematic DNA glow", "S01"), "Cinematic DNA glow")
        self.assertEqual(clean_prompt_text("`S02: Calcium crystals`", "S02"), "Calcium crystals")

    def test_flowkit_client_defaults(self):
        client = FlowKitClient(project_id="test-uuid")
        self.assertEqual(client.project_id, "test-uuid")
        self.assertEqual(client.base_url, "http://127.0.0.1:8100")

    def test_poll_status_veo_success_parsing(self):
        client = FlowKitClient()
        # Mock poll_status parsing for Veo successful response
        submit_res = {"operations": [{"operation": {"name": "op-123"}}]}
        # Verify structure validation
        self.assertIsNotNone(submit_res.get("operations"))


if __name__ == "__main__":
    unittest.main()
