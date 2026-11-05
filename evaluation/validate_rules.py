#!/usr/bin/env python3
"""Validate source-backed BKK rule-model structure (not policy correctness)."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / "case_studies" / "bkk"


def main() -> None:
    sources_path = CASE / "sources.csv"
    with sources_path.open(encoding="utf-8", newline="") as handle:
        sources = list(csv.DictReader(handle))

    source_ids = [row["source_id"] for row in sources]
    assert source_ids and len(source_ids) == len(set(source_ids)), "Missing or duplicate source IDs"
    for source in sources:
        assert source["url"].startswith("https://bkk.hu/"), source
        assert source["reviewed_on"] and source["status"] == "reviewed", source

    model = json.loads((CASE / "knowledge" / "rules.json").read_text(encoding="utf-8"))
    assert model["case_study"] == "bkk-fare-advisor"
    assert model["rules"], "Rules must not be empty"
    rule_ids = []
    for rule in model["rules"]:
        for key in ("id", "topic", "summary", "when", "expected", "exceptions", "ask_if_missing", "source_ids", "status", "reviewed_on"):
            assert key in rule and rule[key], f"Missing {key} in {rule.get('id', 'unknown')}"
        assert isinstance(rule["when"], list) and all(rule["when"]), rule["id"]
        assert isinstance(rule["exceptions"], list) and all(rule["exceptions"]), rule["id"]
        assert isinstance(rule["ask_if_missing"], list) and all(rule["ask_if_missing"]), rule["id"]
        assert isinstance(rule["source_ids"], list), rule["id"]
        assert rule["status"] == "source_supported", rule["id"]
        for source_id in rule["source_ids"]:
            assert source_id in source_ids, f"Unknown source {source_id} in {rule['id']}"
        rule_ids.append(rule["id"])
    assert len(rule_ids) == len(set(rule_ids)), "Duplicate rule IDs"

    fares = json.loads((CASE / "fares.snapshot.json").read_text(encoding="utf-8"))
    assert fares["source_id"] in source_ids
    assert fares["currency"] == "HUF"
    assert fares["amounts"] and all(isinstance(v, int) and v > 0 for v in fares["amounts"].values())

    print(f"PASS: {len(sources)} sources, {len(rule_ids)} rules, {len(fares['amounts'])} dated fare entries.")
    print("Note: validation is structural only, not a check of current BKK policy.")


if __name__ == "__main__":
    main()
