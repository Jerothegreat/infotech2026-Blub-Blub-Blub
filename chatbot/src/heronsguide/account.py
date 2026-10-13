"""The signed-in student's own records, as TBL Hub (Moodle) would provide them.

Production: TBL Hub passes the widget a short-lived signed token for the logged-in user; the
server verifies it and reads that user's data through Moodle web services
(core_enrol_get_users_courses, mod_assign_get_assignments / mod_assign_get_submission_status,
gradereport_user_get_grade_items, core_calendar_get_action_events_by_timesort) plus the
registrar's COR. Demo: `SampleAccountProvider` serves one fictional student for a demo token.

Only academic fields become model context (`account_sections`). Address, guardian, birth date,
email and student number never leave this module (ADR 0002).
"""

import hmac
from datetime import date, datetime
from pathlib import Path
from typing import Protocol

from langchain_core.documents import Document
from pydantic import BaseModel, Field

ACCOUNT_TENANT = "Account"


class Profile(BaseModel):
    student_no: str
    first_name: str
    last_name: str
    college: str
    college_name: str
    program: str
    year_level: str
    section: str
    term: str
    address: str | None = None
    guardian: str | None = None
    birth_date: str | None = None
    email: str | None = None


class Meeting(BaseModel):
    days: str
    time: str
    room: str


class Course(BaseModel):
    code: str
    title: str
    units: float
    schedule: list[Meeting]
    meet_link: str | None = Field(default=None, pattern=r"^https://meet\.google\.com/[a-z-]+$")


class Amount(BaseModel):
    label: str
    amount: float


class Assessment(BaseModel):
    items: list[Amount]
    total: float
    less: list[Amount]
    token_fee: float
    total_payable: float


class Deadline(BaseModel):
    course: str
    title: str
    type: str
    due: datetime
    status: str


class Grade(BaseModel):
    course: str
    item: str
    score: float
    max: float


class StudentRecord(BaseModel):
    as_of: date
    profile: Profile
    courses: list[Course]
    assessment: Assessment
    deadlines: list[Deadline]
    grades: list[Grade]
    previous_term_gwa: str | None = None


class AccountView(BaseModel):
    """What the widget's "My account" tab shows. No address, guardian, birth date or email."""

    as_of: date
    name: str
    college: str
    program: str
    year_level: str
    section: str
    term: str
    courses: list[Course]
    deadlines: list[Deadline]
    grades: list[Grade]
    assessment: Assessment
    previous_term_gwa: str | None


class AccountProvider(Protocol):
    def get(self, token: str | None) -> StudentRecord | None: ...


class SampleAccountProvider:
    """Serves the fictional sample student for the demo token only."""

    def __init__(self, path: Path, demo_token: str):
        self.record = StudentRecord.model_validate_json(path.read_text(encoding="utf-8"))
        self.demo_token = demo_token

    def get(self, token: str | None) -> StudentRecord | None:
        if token and hmac.compare_digest(token, self.demo_token):
            return self.record
        return None


def account_view(r: StudentRecord) -> AccountView:
    p = r.profile
    return AccountView(
        as_of=r.as_of,
        name=f"{p.first_name} {p.last_name}",
        college=p.college,
        program=p.program,
        year_level=p.year_level,
        section=p.section,
        term=p.term,
        courses=r.courses,
        deadlines=sorted(r.deadlines, key=lambda d: d.due),
        grades=r.grades,
        assessment=r.assessment,
        previous_term_gwa=r.previous_term_gwa,
    )


def _money(v: float) -> str:
    return f"PHP {v:,.2f}"


def _doc(key: str, label: str, text: str) -> Document:
    return Document(
        page_content=text,
        metadata={
            "id": f"Account-{key}",
            "source": "My TBL Hub account",
            "section": label,
            "tenant": ACCOUNT_TENANT,
            "topic": "Student account",
        },
    )


def account_sections(r: StudentRecord) -> list[Document]:
    """The student's records as citable sections. Academic fields only (data minimization)."""
    p = r.profile
    profile = (
        f"Student: {p.first_name} {p.last_name}\nCollege: {p.college_name} ({p.college})\n"
        f"Program: {p.program}\nYear level: {p.year_level}\nSection: {p.section}\nTerm: {p.term}"
    )
    classes = "\n".join(
        f"- {c.code} {c.title} ({c.units:g} units): "
        + "; ".join(f"{m.days} {m.time}, {m.room}" for m in c.schedule)
        for c in r.courses
    )
    classes += f"\nTotal units: {sum(c.units for c in r.courses):g}"
    deadlines = "\n".join(
        f"- {d.course} {d.title} ({d.type}): due {d.due:%A, %d %B %Y %I:%M %p}; status: {d.status}"
        for d in sorted(r.deadlines, key=lambda d: d.due)
    )
    grades = "\n".join(f"- {g.course} {g.item}: {g.score:g}/{g.max:g}" for g in r.grades)
    if r.previous_term_gwa:
        grades += f"\nPrevious term GWA: {r.previous_term_gwa}"
    meet = (
        "\n".join(f"- {c.code} {c.title}: {c.meet_link}" for c in r.courses if c.meet_link)
        or "No Google Meet links are posted on the course pages."
    )
    a = r.assessment
    assessment = (
        "\n".join(f"- {i.label}: {_money(i.amount)}" for i in a.items)
        + f"\nTotal tuition fee: {_money(a.total)}\nLess:\n"
        + "\n".join(f"- {i.label}: {_money(i.amount)}" for i in a.less)
        + f"\nToken fee: {_money(a.token_fee)}\nTotal payable: {_money(a.total_payable)}"
    )
    return [
        _doc("profile", "Profile and enrollment", profile),
        _doc("classes", "Enrolled classes and schedule (COR)", classes),
        _doc("meet", "Class Google Meet links (TBL Hub course pages)", meet),
        _doc("deadlines", "Upcoming deadlines and submission status", deadlines),
        _doc("grades", "Grades so far", grades),
        _doc("assessment", "Assessment and scholarships (COR)", assessment),
    ]
