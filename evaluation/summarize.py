#!/usr/bin/env python3
"""Summarise manually assessed agent evaluation runs (standard library only).

Usage: python evaluation/summarize.py results/run.example.json [results/improved.json]
"""
from collections import Counter
import json
import sys
from pathlib import Path

ALLOWED = {"PASS", "PARTIAL", "FAIL"}


def read_run(path: Path) -> tuple[str, dict[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    result_by_test = {}
    for entry in data["results"]:
        test_id, status = entry["test_id"], entry["status"]
        if status not in ALLOWED:
            raise ValueError(f"{path}: invalid status {status!r} for {test_id}")
        if test_id in result_by_test:
            raise ValueError(f"{path}: duplicate test id {test_id!r}")
        result_by_test[test_id] = status
    return data.get("run_id", path.stem), result_by_test


def main() -> None:
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python evaluation/summarize.py RUN.json [IMPROVED.json]")
    runs = [read_run(Path(name)) for name in sys.argv[1:]]
    for label, scores in runs:
        counts = Counter(scores.values())
        print(f"{label}: {len(scores)} cases | " + ", ".join(f"{key}: {counts[key]}" for key in ("PASS", "PARTIAL", "FAIL")))
        if scores:
            print(f"  PASS rate: {100 * counts['PASS'] / len(scores):.1f}%")
    if len(runs) == 2:
        old, new = runs[0][1], runs[1][1]
        shared = sorted(set(old) & set(new))
        print(f"Comparable test cases: {len(shared)}")
        missing = sorted(set(old) ^ set(new))
        if missing:
            print(f"WARNING: unmatched test IDs: {', '.join(missing)}")
        for test_id in shared:
            if old[test_id] != new[test_id]:
                print(f"  {test_id}: {old[test_id]} -> {new[test_id]}")


if __name__ == "__main__":
    main()
