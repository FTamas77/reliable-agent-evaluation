#!/usr/bin/env python3
"""Check the shape and provenance of draft evaluation cases.

Does not validate BKK factual accuracy or run tests against Agentplace.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / "tests"
MODEL = ROOT / "case_studies" / "bkk" / "knowledge" / "rules.json"
SOURCES = ROOT / "case_studies" / "bkk" / "sources.csv"


def load(name: str) -> dict:
    return json.loads((TEST_DIR / name).read_text(encoding="utf-8"))


def main() -> None:
    rules = {rule["id"]: rule for rule in json.loads(MODEL.read_text(encoding="utf-8"))["rules"]}
    with SOURCES.open(encoding="utf-8", newline="") as fh:
        sources = {line["source_id"] for line in csv.DictReader(fh)}
    total_ids = set()

    for filename, expected_count in (("baseline-cases.json", 20), ("heldout-cases.json", 5)):
        suite = load(filename)
        cases = suite["scenarios"]
        assert len(cases) == expected_count == suite["count"], filename
        assert suite["status"] == "DRAFT_NOT_FROZEN", filename
        for case in cases:
            cid = case["id"]
            assert cid not in total_ids, f"Duplicate case: {cid}"
            total_ids.add(cid)
            assert len(case["user_turns"]) >= 2, f"Not multi-turn: {cid}"
            assert all(isinstance(t, str) and t.strip() for t in case["user_turns"]), cid
            assert case["expected_behaviour"] and case["critical_failures"], cid
            assert case["score"] is None and case["observed_transcript"] is None, f"Invented observation: {cid}"
            expected_sources = set()
            for rid in case["rule_ids"]:
                assert rid in rules, f"{cid}: missing rule {rid}"
                expected_sources.update(rules[rid]["source_ids"])
            assert expected_sources == set(case["source_ids"]), f"{cid}: source provenance mismatch"
            assert set(case["source_ids"]).issubset(sources), f"{cid}: invalid source"
        print(f"PASS: {filename} ({len(cases)} multi-turn scenarios)")
    print(f"PASS: {len(total_ids)} unique cases; source references verified structurally.")
    print("NOTE: This does not verify current fares, judge agent answers, or freeze the suites.")


if __name__ == "__main__":
    main()
