"""Pydantic models for the raw IRCC Express Entry feed.

The endpoint returns numeric-looking fields as strings, sometimes with
thousand separators ("1,000"). We validate shape here and coerce in
normalize.py — leaving raw values untouched makes shape errors readable.

Note the case oddity: `DrawText1` has a capital D while `drawText2` is
lowercase in the source. Both are declared explicitly.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RawRound(BaseModel):
    # Tolerate future/unknown fields.
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    drawNumber:            str
    drawNumberURL:         str | None = None
    drawDate:              str                      # ISO YYYY-MM-DD
    drawDateFull:          str | None = None
    drawName:              str
    drawSize:              str                      # e.g. "1,000"
    drawCRS:               str                      # cutoff score, e.g. "523"
    drawDateTime:          str | None = None        # "August 18, 2026 at 10:13:44 UTC"
    drawCutOff:            str | None = None        # tie-break timestamp, same format
    drawDistributionAsOn:  str | None = None        # "August 16, 2026"
    mitext:                str | None = None
    DrawText1:             str | None = None
    drawText2:             str | None = None

    # Pool distribution — denormalized on every round. All strings, comma-sep.
    dd1:  str | None = None
    dd2:  str | None = None
    dd3:  str | None = None
    dd4:  str | None = None
    dd5:  str | None = None
    dd6:  str | None = None
    dd7:  str | None = None
    dd8:  str | None = None
    dd9:  str | None = None
    dd10: str | None = None
    dd11: str | None = None
    dd12: str | None = None
    dd13: str | None = None
    dd14: str | None = None
    dd15: str | None = None
    dd16: str | None = None
    dd17: str | None = None
    dd18: str | None = None

    def raw_dict(self) -> dict[str, Any]:
        # For preservation in raw_payload jsonb — include everything, even
        # extras Pydantic tolerated via `extra="allow"`.
        return self.model_dump(exclude_none=False, by_alias=False)


class RawFeed(BaseModel):
    model_config = ConfigDict(extra="allow")

    classes: str | None = None
    rounds: list[RawRound] = Field(min_length=1)


class ShapeMismatchError(Exception):
    """Raised when the IRCC feed no longer matches the expected shape."""


def parse_feed(payload: Any) -> RawFeed:
    """Validate a decoded JSON payload, raising ShapeMismatchError on drift."""
    from pydantic import ValidationError

    try:
        return RawFeed.model_validate(payload)
    except ValidationError as e:
        raise ShapeMismatchError(str(e)) from e
