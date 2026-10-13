from heronsguide.kb import (
    UNIVERSITY_WIDE,
    heading_level,
    in_scope,
    normalize_college,
    split_source,
)


def test_all_four_sources_load_with_unique_ids(sections):
    assert {s.metadata["source"] for s in sections} == {
        "Source01",
        "Source02",
        "Source03",
        "Source04",
    }
    ids = [s.metadata["id"] for s in sections]
    assert len(ids) == len(set(ids))
    assert all(s.page_content.strip() for s in sections)


def test_generic_headings_keep_their_parent_in_the_breadcrumb(sections):
    labels = {s.metadata["section"] for s in sections}
    assert (
        "FOR INCOMING FRESHMAN › Partial Entrance Token Exemption Grant › "
        "Requirements in addition to basic requirements"
    ) in labels
    assert "ADMIN BUILDING › Mezannine › B. South Wing" in labels
    assert "FOR UNDERGRADUATES / COLLEGE STUDENTS › Varsity Player" in labels


def test_bullet_headings_are_body_text():
    assert heading_level("● University Chaplain") is None
    assert heading_level("➢ N/A") is None
    docs = split_source("SourceX", "## Office\n## ● Services:\n## ○ Filing\n")
    assert len(docs) == 1
    assert "● Services:" in docs[0].page_content


def test_source02_is_ccis_scoped_except_the_college_list(sections):
    tenants = {
        s.metadata["section"]: s.metadata["tenant"]
        for s in sections
        if s.metadata["source"] == "Source02"
    }
    assert tenants["OTHER COLLEGES AVAILABLE"] == UNIVERSITY_WIDE
    assert tenants["COLLEGE REQUIREMENTS › Program Requirements:"] == "CCIS"


def test_scope_filter(sections):
    ccis = next(s for s in sections if s.metadata["tenant"] == "CCIS")
    shared = next(s for s in sections if s.metadata["tenant"] == UNIVERSITY_WIDE)
    assert in_scope(ccis, "CCIS") and in_scope(ccis, None)
    assert not in_scope(ccis, "CBA")
    assert in_scope(shared, "CBA")


def test_normalize_college():
    assert normalize_college(" ccis ") == "CCIS"
    assert normalize_college("not-a-college") is None
    assert normalize_college(None) is None
