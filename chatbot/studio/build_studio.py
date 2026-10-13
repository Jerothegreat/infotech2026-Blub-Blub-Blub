"""Build the HeronsGuide Studio artifact page: template + knowledge base + sample student.

Run: uv run python studio/build_studio.py   -> studio/dist/heronsguide-studio.html
The page is published as a claude.ai artifact (capability: sample). Rebuild after kb/, the
sample account, or the template changes. Only the fictional sample student is embedded.
"""

import json
from pathlib import Path

from heronsguide.account import SampleAccountProvider, account_sections, account_view
from heronsguide.config import get_settings
from heronsguide.kb import COLLEGES, load_sections

HERE = Path(__file__).parent


def _doc(d) -> dict:
    m = d.metadata
    return {
        "id": m["id"],
        "source": m["source"],
        "section": m["section"],
        "tenant": m["tenant"],
        "text": d.page_content,
    }


def main() -> None:
    settings = get_settings()
    sections = [_doc(d) for d in load_sections(settings.kb_dir)]
    record = SampleAccountProvider(settings.sample_account_path, "build").record
    kb = {
        "sections": sections,
        "colleges": [{"code": c, "name": n} for c, n in COLLEGES.items()],
        "account": {
            "view": account_view(record).model_dump(mode="json"),
            "sections": [_doc(d) for d in account_sections(record)],
            "today": record.as_of.strftime("%A, %d %B %Y"),
        },
    }
    data = json.dumps(kb, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    page = (HERE / "template.html").read_text(encoding="utf-8").replace("__KB_JSON__", data)
    out = HERE / "dist" / "heronsguide-studio.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"{out} ({len(sections)} sections + sample account)")


if __name__ == "__main__":
    main()
