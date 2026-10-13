"""Load the organizer sources and split them into cited sections.

The sources were converted from PDF, so every heading is `##` and many "headings" are really
bullets or generic labels ("Requirements in addition to basic requirements", "A. North Wing").
We rebuild a breadcrumb per section from heading patterns so a citation reads like
"Source01 · FOR INCOMING FRESHMAN › Partial Entrance Token Exemption Grant › Requirements ...".
"""

import re
from pathlib import Path

from langchain_core.documents import Document

UNIVERSITY_WIDE = "University-wide"

# Scope tags from docs/product/02-prd.md section 3.
SOURCE_TENANTS = {
    "Source01": UNIVERSITY_WIDE,
    "Source02": "CCIS",
    "Source03": UNIVERSITY_WIDE,
    "Source04": UNIVERSITY_WIDE,
}
SOURCE_TOPICS = {
    "Source01": "Scholarships",
    "Source02": "CCIS admission requirements",
    "Source03": "Campus map",
    "Source04": "Offices and services",
}
# Sections that apply to everyone even though their file is college-specific.
SECTION_TENANT_OVERRIDES = {"OTHER COLLEGES AVAILABLE": UNIVERSITY_WIDE}

# College codes from Source02 "OTHER COLLEGES AVAILABLE".
COLLEGES = {
    "CCAPS": "College of Continuing, Advanced and Professional Studies",
    "IAD": "Institute of Arts and Design",
    "CBA": "College of Business Administration",
    "IOA": "Institute of Accountancy",
    "CCIS": "College of Computing and Information Science",
    "CHK": "College of Human Kinetics",
    "CGPP": "College of Governance and Public Policy",
    "ION": "Institute of Nursing",
    "IIHS": "Institute of Imaging Health Sciences",
    "CITE": "College of Innovative Teachers Education",
    "COS": "College of Science",
    "CTHM": "College of Tourism and Hospitality Management",
    "IDEM": "Institute for Disaster and Emergency Management",
    "CET": "College of Engineering and Technology",
    "LAW": "School of Law",
}

# All-caps headings that are items, not groups (PEP SQUAD is a scholarship type).
_CAPS_TITLES = {"PEP SQUAD"}

_HEADING = re.compile(r"^#{1,6}\s+(.*\S)\s*$")
_BULLET = re.compile(r"^[●○➢•\-\*]")
_FLOOR = re.compile(r"(floor|basement|mez+an+ine|level|roof ?deck)$", re.IGNORECASE)
_CHILD = re.compile(
    r"^([A-Z]\.\s|requirements\b|program requirements|step \d|for (undergraduate|graduate) "
    r"students|to cancel)",
    re.IGNORECASE,
)


def heading_level(title: str) -> int | None:
    """Breadcrumb depth for a heading, or None when the heading is really body text."""
    if _BULLET.match(title):
        return None
    letters = [c for c in title if c.isalpha()]
    if len(letters) > 3 and title == title.upper() and title not in _CAPS_TITLES:
        return 1
    if _CHILD.match(title):
        return 4
    if _FLOOR.search(title):
        return 3
    return 2


def split_source(name: str, text: str) -> list[Document]:
    sections: list[Document] = []
    stack: list[tuple[int, str]] = []
    body: list[str] = []

    def flush() -> None:
        content = "\n".join(body).strip()
        body.clear()
        if not content:
            return
        crumbs = [title for _, title in stack] or [SOURCE_TOPICS.get(name, name)]
        tenant = SOURCE_TENANTS.get(name, UNIVERSITY_WIDE)
        for title in crumbs:
            tenant = SECTION_TENANT_OVERRIDES.get(title, tenant)
        sections.append(
            Document(
                page_content=content,
                metadata={
                    "id": f"{name}-s{len(sections) + 1:03d}",
                    "source": name,
                    "section": " › ".join(crumbs),
                    "tenant": tenant,
                    "topic": SOURCE_TOPICS.get(name, ""),
                },
            )
        )

    for line in text.splitlines():
        match = _HEADING.match(line)
        level = heading_level(match.group(1)) if match else None
        if match and level is None:
            body.append(match.group(1))
            continue
        if not match:
            body.append(line)
            continue
        flush()
        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, match.group(1)))
    flush()
    return sections


def load_sections(kb_dir: Path) -> list[Document]:
    files = sorted(kb_dir.glob("Source*.md"))
    if not files:
        raise FileNotFoundError(f"No Source*.md files in {kb_dir}")
    sections: list[Document] = []
    for path in files:
        sections.extend(split_source(path.stem, path.read_text(encoding="utf-8")))
    return sections


def in_scope(section: Document, college: str | None) -> bool:
    if college is None:
        return True
    return section.metadata["tenant"] in (UNIVERSITY_WIDE, college)


def normalize_college(college: str | None) -> str | None:
    if not college:
        return None
    code = college.strip().upper()
    return code if code in COLLEGES else None
