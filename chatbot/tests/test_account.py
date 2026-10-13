from pathlib import Path

import pytest
from conftest import grounded
from fastapi.testclient import TestClient

from heronsguide.account import SampleAccountProvider, account_sections
from heronsguide.api import app, get_accounts, get_bot
from heronsguide.pipeline import FALLBACK

SAMPLE = Path(__file__).resolve().parents[1] / "samples" / "sample_account.json"
PRIVATE = ["SAMPLE ONLY", "sample.student@example.edu", "K00000001"]


@pytest.fixture(scope="module")
def accounts():
    return SampleAccountProvider(SAMPLE, "demo-student")


@pytest.fixture(scope="module")
def record(accounts):
    return accounts.get("demo-student")


def test_only_the_demo_token_unlocks_the_sample(accounts):
    assert accounts.get("demo-student") is not None
    assert accounts.get("guess") is None
    assert accounts.get(None) is None


def test_account_sections_hold_academic_fields_only(record):
    text = "\n".join(d.page_content for d in account_sections(record))
    for secret in PRIVATE:
        assert secret not in text
    assert "THESIS1 CS Thesis Writing 1" in text
    assert "HPSB 606" in text
    assert "Assignment #3: Introduction to GitHub" in text
    assert "Total payable: PHP 0.00" in text
    assert {d.metadata["id"] for d in account_sections(record)} == {
        "Account-profile",
        "Account-classes",
        "Account-meet",
        "Account-deadlines",
        "Account-grades",
        "Account-assessment",
    }


def test_signed_in_answer_can_cite_account_records(make_bot, record):
    bot, stubs = make_bot(
        grounded(text="Quiz 4 for ELEC3 closes on 14 October.", citations=("Account-deadlines",)),
        query="What is due this week?",
    )
    result = bot.ask("what's due this week?", account=record)
    assert result.status == "answered"
    assert result.citations[0].source == "My TBL Hub account"
    prompt = stubs.answer.prompts[0]
    assert 'id="Account-deadlines"' in prompt
    assert "Today is Tuesday, 13 October 2026." in prompt
    assert "The student is from CCIS" in prompt  # college comes from the account
    for secret in PRIVATE:
        assert secret not in prompt


def test_guest_cannot_get_account_answers(make_bot):
    bot, stubs = make_bot(grounded(citations=("Account-deadlines",)))
    assert bot.ask("what's due this week?").answer == FALLBACK
    assert 'id="Account-' not in stubs.answer.prompts[0]


@pytest.fixture
def client(make_bot, accounts):
    bot, stubs = make_bot(grounded(citations=("Account-grades",)))
    app.dependency_overrides[get_bot] = lambda: bot
    app.dependency_overrides[get_accounts] = lambda: accounts
    client = TestClient(app)
    client.stubs = stubs
    yield client
    app.dependency_overrides.clear()


def test_account_me_requires_the_token(client):
    assert client.get("/account/me").status_code == 401
    assert client.get("/account/me", headers={"X-Student-Token": "nope"}).status_code == 401
    res = client.get("/account/me", headers={"X-Student-Token": "demo-student"})
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Ana Reyes"
    assert [d["course"] for d in body["deadlines"]][0] == "ELEC3"  # soonest first
    for secret in PRIVATE:
        assert secret not in res.text


def test_chat_uses_the_token_from_the_header(client):
    signed_in = client.post(
        "/chat", json={"question": "my grades?"}, headers={"X-Student-Token": "demo-student"}
    )
    assert signed_in.json()["status"] == "answered"
    guest = client.post("/chat", json={"question": "my grades?"})
    assert guest.json()["answer"] == FALLBACK


def test_meet_links_are_a_citable_section(record):
    meet = next(d for d in account_sections(record) if d.metadata["id"] == "Account-meet")
    assert "ELEC4 Elective 4: https://meet.google.com/elf-gwdc-bxu" in meet.page_content
    assert meet.page_content.count("https://meet.google.com/") == 6


def test_meet_link_answer_survives_only_if_the_link_is_unchanged(make_bot, record):
    link = "https://meet.google.com/elf-gwdc-bxu"
    answer = grounded(text=f"ELEC4 Google Meet: {link}", citations=("Account-meet",))
    bot, _ = make_bot(answer, reply=f"Here's your ELEC4 link! {link}")
    assert link in bot.ask("gmeet link for ELEC4?", account=record).answer
    bot, _ = make_bot(answer, reply="Here's your ELEC4 link! https://meet.google.com/elf-gwdc-bxx")
    assert bot.ask("gmeet link for ELEC4?", account=record).answer == f"ELEC4 Google Meet: {link}"


def test_only_meet_urls_are_accepted_as_class_links():
    from pydantic import ValidationError

    from heronsguide.account import Course

    with pytest.raises(ValidationError):
        Course(code="X", title="X", units=3, schedule=[], meet_link="https://evil.example/meet")
