"""Run the grounding test set against the real model and report SM-1..SM-3.

Run: uv run python evals/run_eval.py   (needs GOOGLE_API_KEY in chatbot/.env)
Writes evals/results.json (git-ignored) with every answer for manual review.
"""

import json
import sys
from pathlib import Path

import yaml

from heronsguide.pipeline import build_bot

HERE = Path(__file__).parent


def check(case: dict, result) -> tuple[bool, str]:
    expect = case["expect"]
    status = result.status
    if expect == "grounded":
        ok_status = status in ("answered", "conflict")
    else:
        ok_status = status == expect
    if not ok_status:
        return False, f"status {status}, expected {expect}"
    cited_sources = {c.source for c in result.citations}
    missing = [s for s in case.get("sources", []) if s not in cited_sources]
    if missing:
        return False, f"missing citation from {', '.join(missing)}"
    section = case.get("section")
    if section and not any(section in c.section for c in result.citations):
        return False, f"no citation in section containing '{section}'"
    return True, ""


def main() -> int:
    cases = yaml.safe_load((HERE / "questions.yaml").read_text(encoding="utf-8"))
    bot = build_bot()
    bot.log = None  # keep eval runs out of the admin query log
    rows, passed = [], 0
    for i, case in enumerate(cases, 1):
        result = bot.ask(case["q"], college=case.get("college"), channel="web")
        ok, why = check(case, result)
        passed += ok
        reason = f"  ({why})" if why else ""
        print(f"{'PASS' if ok else 'FAIL'} {i:2d}. {case['q'][:70]}{reason}")
        rows.append({**case, "ok": ok, "why": why, "result": result.model_dump()})

    answered = [r for r in rows if r["result"]["status"] != "not_in_sources"]
    sm1 = all(r["result"]["citations"] for r in answered)
    refusal_cases = [r for r in rows if r["expect"] == "not_in_sources"]
    sm2 = sum(r["ok"] for r in refusal_cases) / len(refusal_cases)
    grounded_cases = [r for r in rows if r["expect"] != "not_in_sources"]
    sm3 = sum(r["ok"] for r in grounded_cases) / len(grounded_cases)

    print(f"\n{passed}/{len(rows)} passed")
    print(f"SM-1 every answer cited: {'yes' if sm1 else 'NO'} ({len(answered)} answers)")
    print(f"SM-2 refusal accuracy:   {sm2:.0%} (target 95%+, {len(refusal_cases)} cases)")
    print(f"SM-3 retrieval accuracy: {sm3:.0%} (target 90%+, {len(grounded_cases)} cases)")
    out = HERE / "results.json"
    out.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Details: {out}")
    return 0 if passed == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
