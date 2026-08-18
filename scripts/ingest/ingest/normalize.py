"""Turn a validated IRCC feed into the rows Supabase expects.

Two outputs:
    * A list of Draw dicts, one per round.
    * A single PoolSnapshot dict extracted from the latest round's denormalized
      distribution.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from .schema import RawFeed, RawRound

RoundType = Literal["general", "program_specific", "category_based"]
Program = Literal["CEC", "FSW", "FST", "PNP"]


@dataclass
class Draw:
    round_number: str             # text: IRCC uses suffixes like "91a"/"91b" for multi-round days
    draw_date: str                # YYYY-MM-DD
    round_type: RoundType
    program: Program | None
    category: str | None          # normalized family name (e.g. "Healthcare")
    invitations_issued: int
    cutoff_score: int
    tie_break_timestamp: str | None   # ISO 8601 or None
    source_url: str | None
    raw_payload: dict[str, Any]


@dataclass
class PoolBand:
    band_low: int
    band_high: int
    candidate_count: int


@dataclass
class PoolSnapshot:
    as_of_date: str               # YYYY-MM-DD
    bands: list[PoolBand]


# ---------------------------------------------------------------------------
# Pool distribution layout — verified against the live feed. dd3 and dd9 are
# rollup subtotals; dd18 is the grand total. We store only the leaves so the
# pool_snapshots table has no overlapping rows.
#
#   dd1:   601–1200
#   dd2:   501–600
#   dd3:   451–500   [rollup of dd4..dd8]  — skipped
#   dd4:   491–500
#   dd5:   481–490
#   dd6:   471–480
#   dd7:   461–470
#   dd8:   451–460
#   dd9:   401–450   [rollup of dd10..dd14] — skipped
#   dd10:  441–450
#   dd11:  431–440
#   dd12:  421–430
#   dd13:  411–420
#   dd14:  401–410
#   dd15:  351–400
#   dd16:  301–350
#   dd17:    0–300
#   dd18:  TOTAL     — skipped
# ---------------------------------------------------------------------------
POOL_LEAVES: list[tuple[str, int, int]] = [
    ("dd1",  601, 1200),
    ("dd2",  501,  600),
    ("dd4",  491,  500),
    ("dd5",  481,  490),
    ("dd6",  471,  480),
    ("dd7",  461,  470),
    ("dd8",  451,  460),
    ("dd10", 441,  450),
    ("dd11", 431,  440),
    ("dd12", 421,  430),
    ("dd13", 411,  420),
    ("dd14", 401,  410),
    ("dd15", 351,  400),
    ("dd16", 301,  350),
    ("dd17",   0,  300),
]


# ---------------------------------------------------------------------------
# drawName classification.
# ---------------------------------------------------------------------------
def classify_draw_name(raw_name: str) -> tuple[RoundType, Program | None, str | None]:
    name = raw_name.strip()
    lower = name.lower()

    if lower == "canadian experience class":
        return "program_specific", "CEC", None
    if lower == "federal skilled worker":
        return "program_specific", "FSW", None
    if lower == "federal skilled trades":
        return "program_specific", "FST", None
    if lower == "provincial nominee program":
        return "program_specific", "PNP", None

    if lower in ("general", "no program specified"):
        return "general", None, None

    return "category_based", None, _normalize_category_family(name)


def _normalize_category_family(raw_name: str) -> str:
    """
    Collapse the many wording/version drifts of a category into a stable family
    name shown in filters. Example transforms:

        "French language proficiency (Version 1)"          -> "French language"
        "French-Language proficiency 2026-Version 2"       -> "French language"
        "Healthcare and Social Services Occupations, 2026-Version 3"
                                                            -> "Healthcare"
        "STEM occupations (Version 1)"                     -> "STEM"
    """
    s = re.sub(r"\s*\(version\s*\d+\)", "", raw_name, flags=re.IGNORECASE)
    s = re.sub(r",?\s*\d{4}[-\s]version\s*\d+", "", s, flags=re.IGNORECASE)
    s = s.strip()
    lower = s.lower()

    if lower.startswith("french"):        return "French language"
    if lower.startswith("healthcare"):    return "Healthcare"
    if lower.startswith("trade"):         return "Trades"      # covers "Trade" and "Trades"
    if lower.startswith("stem"):          return "STEM"
    if lower.startswith("transport"):     return "Transport"
    if lower.startswith("agriculture"):   return "Agriculture"
    if lower.startswith("education"):     return "Education"
    if lower.startswith("senior manager"):return "Senior managers"
    if lower.startswith("physician"):     return "Physicians"
    if lower.startswith("skilled military"): return "Military"

    # Unknown category — surface the cleaned name rather than dropping it.
    return s


# ---------------------------------------------------------------------------
# Numeric / date parsing helpers.
# ---------------------------------------------------------------------------
def _parse_int_comma(s: str | None, field: str) -> int:
    if s is None or s == "":
        raise ValueError(f"missing required numeric field: {field}")
    cleaned = s.replace(",", "").strip()
    try:
        return int(cleaned)
    except ValueError as e:
        raise ValueError(f"bad integer for {field}: {s!r}") from e


def _parse_int_comma_optional(s: str | None) -> int | None:
    if s is None or s == "" or s.lower() == "n/a":
        return None
    cleaned = s.replace(",", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return None


_IRCC_TS_FORMATS = (
    # "August 17, 2026 at 22:09:00 UTC" — normalized to "August 17, 2026 22:09:00 UTC"
    "%B %d, %Y %H:%M:%S %Z",
    "%B %d, %Y %H:%M:%S UTC",
)


def parse_ircc_timestamp(s: str | None) -> str | None:
    """"August 17, 2026 at 22:09:00 UTC" -> "2026-08-17T22:09:00+00:00"."""
    if not s:
        return None
    cleaned = re.sub(r"\s+at\s+", " ", s).strip()
    for fmt in _IRCC_TS_FORMATS:
        try:
            dt = datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
        # strptime with %Z on "UTC" returns naive; treat as UTC explicitly.
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return None


def parse_ircc_date(s: str | None) -> str | None:
    """"August 16, 2026" -> "2026-08-16"."""
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%B %d, %Y").date().isoformat()
    except ValueError:
        return None


_HREF_RE = re.compile(r"""href=['"]([^'"]+)['"]""")


def _extract_source_url(row: RawRound) -> str | None:
    html = row.drawNumberURL or row.mitext or row.DrawText1 or ""
    m = _HREF_RE.search(html)
    if not m:
        return None
    href = m.group(1)
    if href.startswith("http"):
        return href
    # IRCC uses paths like "/content/canadasite/en/..." — strip the CMS prefix.
    path = re.sub(r"^/content/canadasite/", "/", href)
    if not path.startswith("/"):
        path = "/" + path
    return "https://www.canada.ca" + path


# ---------------------------------------------------------------------------
# Public entry point.
# ---------------------------------------------------------------------------
@dataclass
class NormalizeResult:
    draws: list[Draw]
    pool_snapshot: PoolSnapshot | None


def normalize(feed: RawFeed) -> NormalizeResult:
    draws = [_normalize_round(r) for r in feed.rounds]
    snap = _extract_pool_snapshot(feed)
    return NormalizeResult(draws=draws, pool_snapshot=snap)


def _normalize_round(row: RawRound) -> Draw:
    round_type, program, category = classify_draw_name(row.drawName)
    round_number = row.drawNumber.strip()
    if not round_number:
        raise ValueError("empty drawNumber")
    return Draw(
        round_number=round_number,
        draw_date=row.drawDate,
        round_type=round_type,
        program=program,
        category=category,
        invitations_issued=_parse_int_comma(row.drawSize, "drawSize"),
        cutoff_score=_parse_int_comma(row.drawCRS, "drawCRS"),
        tie_break_timestamp=parse_ircc_timestamp(row.drawCutOff),
        source_url=_extract_source_url(row),
        raw_payload=row.raw_dict(),
    )


def _extract_pool_snapshot(feed: RawFeed) -> PoolSnapshot | None:
    if not feed.rounds:
        return None
    latest = max(feed.rounds, key=lambda r: r.drawDate)
    as_of = parse_ircc_date(latest.drawDistributionAsOn)
    if not as_of:
        return None
    bands: list[PoolBand] = []
    for key, low, high in POOL_LEAVES:
        raw = getattr(latest, key, None)
        count = _parse_int_comma_optional(raw)
        if count is None:
            continue
        bands.append(PoolBand(band_low=low, band_high=high, candidate_count=count))
    if not bands:
        return None
    return PoolSnapshot(as_of_date=as_of, bands=bands)
