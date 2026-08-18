"""Unit tests for the normalizer against a captured IRCC snapshot."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ingest.normalize import (
    normalize,
    parse_ircc_date,
    parse_ircc_timestamp,
)
from ingest.schema import parse_feed

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "ee_rounds.sample.json"


@pytest.fixture(scope="module")
def feed():
    payload = json.loads(FIXTURE.read_text())
    return parse_feed(payload)


@pytest.fixture(scope="module")
def normalized(feed):
    return normalize(feed)


# ---------------------------------------------------------------------------
# Shape + volume
# ---------------------------------------------------------------------------
def test_fixture_parses_cleanly(feed):
    assert len(feed.rounds) > 400, "expected >400 historical rounds"


def test_round_numbers_are_nonempty_and_unique(normalized):
    seen: set[str] = set()
    for d in normalized.draws:
        assert isinstance(d.round_number, str)
        assert d.round_number, "empty round_number"
        assert d.round_number not in seen, f"duplicate round_number {d.round_number}"
        seen.add(d.round_number)


def test_round_number_accepts_letter_suffixes(normalized):
    """IRCC uses "91a"/"91b" for multi-round days. Assert those survive."""
    numbers = {d.round_number for d in normalized.draws}
    # Not asserting exact set — just that at least one non-numeric slipped through.
    non_numeric = [n for n in numbers if not n.isdigit()]
    assert non_numeric, "expected at least one round_number with a letter suffix"


def test_cutoff_within_bounds(normalized):
    for d in normalized.draws:
        assert 0 <= d.cutoff_score <= 1200, (
            f"bad cutoff on round {d.round_number}"
        )


def test_numeric_parsing_handles_comma_thousands(normalized):
    largest = max(normalized.draws, key=lambda d: d.invitations_issued)
    assert isinstance(largest.invitations_issued, int)
    assert largest.invitations_issued > 1000, "expected some rounds >1000 invitations"


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------
def test_program_specific_rounds(normalized):
    cec = [d for d in normalized.draws if d.program == "CEC"]
    pnp = [d for d in normalized.draws if d.program == "PNP"]

    assert cec, "expected at least one CEC draw"
    assert pnp, "expected at least one PNP draw"

    for d in cec + pnp:
        assert d.round_type == "program_specific"
        assert d.category is None


def test_general_rounds(normalized):
    generals = [d for d in normalized.draws if d.round_type == "general"]
    assert generals, "expected at least one general round"
    for d in generals:
        assert d.program is None
        assert d.category is None


def test_category_families_collapse_versioning(normalized):
    french = [d for d in normalized.draws if d.category == "French language"]
    healthcare = [d for d in normalized.draws if d.category == "Healthcare"]
    # both categories should have accumulated draws across multiple version
    # labels ("Version 1", "2026-Version 2", "2026-Version 3", ...)
    assert len(french) >= 30
    assert len(healthcare) >= 10


def test_pnp_rounds_are_always_program_pnp(feed, normalized):
    """The PNP trap: if a round's raw drawName is 'Provincial Nominee Program',
    it MUST be classified program='PNP' — because those cutoffs include the
    600-point nomination bonus and would break any chart that mixed them with
    CEC or category-based rounds. Test both directions: every raw PNP row is
    tagged, and every tagged PNP row came from a raw PNP row."""
    raw_pnp_numbers = {r.drawNumber for r in feed.rounds
                       if r.drawName.strip() == "Provincial Nominee Program"}
    tagged_pnp_numbers = {d.round_number for d in normalized.draws
                          if d.program == "PNP"}
    assert raw_pnp_numbers == tagged_pnp_numbers
    assert raw_pnp_numbers, "expected at least one PNP round in the fixture"

    # Modern PNP cutoffs live in the 700s+ because of the 600-pt bonus. Sanity
    # check the pattern exists so a future test-tightening catches drift.
    modern_pnp = [d for d in normalized.draws
                  if d.program == "PNP" and d.draw_date >= "2023-01-01"]
    if modern_pnp:
        avg = sum(d.cutoff_score for d in modern_pnp) / len(modern_pnp)
        assert avg > 650, f"modern PNP cutoffs average {avg}, expected >650"


# ---------------------------------------------------------------------------
# Pool snapshot
# ---------------------------------------------------------------------------
def test_pool_snapshot_has_leaf_bands_no_overlap(normalized):
    snap = normalized.pool_snapshot
    assert snap is not None
    assert len(snap.bands) >= 10

    sorted_bands = sorted(snap.bands, key=lambda b: b.band_low)
    for prev, curr in zip(sorted_bands, sorted_bands[1:]):
        assert curr.band_low > prev.band_high, (
            f"bands overlap: {prev.band_low}-{prev.band_high} then "
            f"{curr.band_low}-{curr.band_high}"
        )


def test_pool_leaves_sum_to_dd18_total(feed, normalized):
    """Sanity check that our leaf selection actually covers the whole pool."""
    snap = normalized.pool_snapshot
    assert snap is not None

    latest = max(feed.rounds, key=lambda r: r.drawDate)
    dd18_total = int((latest.dd18 or "0").replace(",", ""))
    leaves_total = sum(b.candidate_count for b in snap.bands)
    assert leaves_total == dd18_total, (
        f"leaves sum to {leaves_total}, dd18 total is {dd18_total} — "
        "band map may be wrong"
    )


# ---------------------------------------------------------------------------
# Datetime helpers
# ---------------------------------------------------------------------------
def test_parse_ircc_timestamp():
    assert parse_ircc_timestamp("August 17, 2026 at 22:09:00 UTC") == (
        "2026-08-17T22:09:00+00:00"
    )
    assert parse_ircc_timestamp(None) is None
    assert parse_ircc_timestamp("") is None


def test_parse_ircc_date():
    assert parse_ircc_date("August 16, 2026") == "2026-08-16"
    assert parse_ircc_date(None) is None
