"""Stdlib tests for the local MYCA harness — no network, no secrets."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from launchpad_myca_harness.hmac_client import build_agent_signature
from launchpad_myca_harness.sanitizer import (
    assert_cloud_safe,
    filename_looks_dangerous,
    proposal_to_cloud_result,
    scan_text_blocked,
)
from launchpad_myca_harness.subagents.base import Proposal
from launchpad_myca_harness.subagents.radar import rank_local, run_radar


class HmacTests(unittest.TestCase):
    def test_matches_node_contract(self) -> None:
        # Same construction as lib/launchpad/agent/hmac.ts buildAgentSignature
        sig = build_agent_signature("test-hmac-key", 1700000000, '{"results":[]}')
        self.assertEqual(sig, "afa6157694d23e0a75f13dd4d71d3091e5c9e914f9fa270fcf8aec2b09e9fe1e")
        other = build_agent_signature("test-hmac-key", 1700000001, '{"results":[]}')
        self.assertNotEqual(sig, other)


class SanitizerTests(unittest.TestCase):
    def test_blocks_cui_and_sf86(self) -> None:
        self.assertTrue(scan_text_blocked("CUI//SP-CTI packet"))
        self.assertTrue(scan_text_blocked("employee SF-86 form"))
        self.assertTrue(scan_text_blocked("e-QIP login"))
        self.assertTrue(scan_text_blocked("sk-ant-abcdefghijklmnopqrstuvwxyz"))
        self.assertFalse(scan_text_blocked("Host firewall is on."))

    def test_filename_guard(self) -> None:
        self.assertTrue(filename_looks_dangerous("employee-sf-86.pdf"))
        self.assertTrue(filename_looks_dangerous("capture.pcap"))
        self.assertFalse(filename_looks_dangerous("bitlocker-status.txt"))

    def test_rejects_raw_keys(self) -> None:
        with self.assertRaises(ValueError):
            assert_cloud_safe(
                {
                    "results": [
                        {
                            "check_id": "x",
                            "observed_at": "2026-08-13T00:00:00Z",
                            "result": "pass",
                            "summary": "ok",
                            "raw": "syslog dump",
                        }
                    ]
                }
            )

    def test_proposal_never_flips(self) -> None:
        p = Proposal(
            subagent="readiness",
            check_id="myca.readiness.suggestion",
            summary="Suggestion for 3.13.16. Human must confirm; agent cannot set implemented.",
            result="indeterminate",
            mapped_controls=["3.13.16"],
            control_flip=True,
            local_detail={"syslog": "this stays local"},
        )
        self.assertFalse(p.control_flip)
        cloud = proposal_to_cloud_result(p)
        assert cloud is not None
        d = cloud.as_dict()
        self.assertNotIn("raw", d)
        self.assertNotIn("logs", d)
        self.assertNotIn("local_detail", d)
        self.assertEqual(d["result"], "indeterminate")
        payload = assert_cloud_safe({"results": [d]})
        self.assertEqual(len(payload["results"]), 1)


class RadarTests(unittest.TestCase):
    def test_no_mock_when_empty(self) -> None:
        props = run_radar([], {}, "SAM not configured / no federal source connected. No mock awards.")
        self.assertEqual(props[0].result, "not_applicable")
        self.assertIn("mock", props[0].summary.lower() + json.dumps(props[0].local_detail))
        self.assertFalse(props[0].local_detail.get("mock"))

    def test_rank_uses_real_rows_only(self) -> None:
        opps = [
            {"id": "1", "title": "Real notice", "naics": ["541715"], "psc": []},
            {"id": "2", "title": "Other", "naics": ["000000"], "psc": []},
        ]
        ranked = rank_local(opps, {"naics": ["541715"], "psc": []})
        self.assertEqual(ranked[0]["id"], "1")
        self.assertGreater(ranked[0]["fit"], ranked[1]["fit"])


if __name__ == "__main__":
    unittest.main()
