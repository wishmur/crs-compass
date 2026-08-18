"""Supabase writes and the ingest_runs audit trail."""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Literal

from supabase import Client, create_client

from .normalize import Draw, PoolSnapshot

Status = Literal[
    "ok", "shape_mismatch", "http_error", "db_error", "skipped_unchanged"
]


def make_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url:
        raise RuntimeError("SUPABASE_URL is not set")
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not set")
    return create_client(url, key)


def upsert_draws(db: Client, draws: list[Draw], now: datetime) -> int:
    """Chunked upsert of draws. Returns the number of rows sent."""
    chunk_size = 200
    total = 0
    fetched_at = now.isoformat()
    for i in range(0, len(draws), chunk_size):
        chunk = [
            {
                "round_number":        d.round_number,
                "draw_date":           d.draw_date,
                "round_type":          d.round_type,
                "program":             d.program,
                "category":            d.category,
                "invitations_issued":  d.invitations_issued,
                "cutoff_score":        d.cutoff_score,
                "tie_break_timestamp": d.tie_break_timestamp,
                "source_url":          d.source_url,
                "fetched_at":          fetched_at,
                "raw_payload":         d.raw_payload,
            }
            for d in draws[i : i + chunk_size]
        ]
        resp = db.table("draws").upsert(chunk, on_conflict="round_number").execute()
        if getattr(resp, "error", None):
            raise RuntimeError(f"upsert draws failed at offset {i}: {resp.error}")
        total += len(chunk)
    return total


def upsert_pool_snapshot(db: Client, snapshot: PoolSnapshot | None) -> int:
    if snapshot is None:
        return 0
    rows = [
        {
            "as_of_date":      snapshot.as_of_date,
            "band_low":        b.band_low,
            "band_high":       b.band_high,
            "candidate_count": b.candidate_count,
        }
        for b in snapshot.bands
    ]
    resp = (
        db.table("pool_snapshots")
        .upsert(rows, on_conflict="as_of_date,band_low")
        .execute()
    )
    if getattr(resp, "error", None):
        raise RuntimeError(f"upsert pool_snapshots failed: {resp.error}")
    return len(rows)


@dataclass
class IngestRunRecord:
    started_at: str
    finished_at: str
    status: Status
    draws_seen: int | None = None
    draws_upserted: int | None = None
    pool_rows_seen: int | None = None
    payload_sha256: str | None = None
    notes: str | None = None


def record_run(db: Client, row: IngestRunRecord) -> None:
    try:
        db.table("ingest_runs").insert(asdict(row)).execute()
    except Exception as e:
        # Never let audit-log failure clobber the primary error.
        print(f"[ingest_runs] insert failed: {e}")


def last_ok_payload_sha(db: Client) -> str | None:
    resp = (
        db.table("ingest_runs")
        .select("payload_sha256")
        .eq("status", "ok")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    data: list[dict[str, Any]] = getattr(resp, "data", []) or []
    if not data:
        return None
    return data[0].get("payload_sha256")
