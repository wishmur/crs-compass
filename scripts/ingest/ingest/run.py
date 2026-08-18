"""Entry point for the daily ingest job.

Run:
    python -m ingest.run              # real ingest
    python -m ingest.run --dry-run    # fetch + parse, no DB writes
"""

from __future__ import annotations

import hashlib
import sys
from datetime import datetime, timezone

from .fetch import HttpError, ShapeMismatchError, fetch_ircc_feed
from .normalize import normalize
from .upsert import (
    IngestRunRecord,
    last_ok_payload_sha,
    make_client,
    record_run,
    upsert_draws,
    upsert_pool_snapshot,
)


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    dry_run = "--dry-run" in argv

    started_at = datetime.now(timezone.utc)
    started_iso = started_at.isoformat()
    print(f"[ingest] starting at {started_iso}{' (dry run)' if dry_run else ''}")

    try:
        fetched = fetch_ircc_feed()
        sha = hashlib.sha256(fetched.body_text.encode("utf-8")).hexdigest()
        print(
            f"[ingest] fetched {len(fetched.feed.rounds)} rounds, "
            f"sha256={sha[:12]}…"
        )

        normalized = normalize(fetched.feed)
        pool = normalized.pool_snapshot
        pool_msg = (
            f", pool snapshot for {pool.as_of_date} with {len(pool.bands)} bands"
            if pool
            else ", no pool snapshot"
        )
        print(f"[ingest] normalized {len(normalized.draws)} draws{pool_msg}")

        if dry_run:
            print("[ingest] dry run — skipping DB writes")
            for d in normalized.draws[:3]:
                print(f"  {d.round_number} {d.draw_date} {d.round_type:<16} "
                      f"{d.program or '-':<4} {d.category or '-':<20} "
                      f"cutoff={d.cutoff_score:<4} invites={d.invitations_issued}")
            if pool:
                print(f"  pool: {pool.as_of_date} bands={len(pool.bands)}")
            return 0

        db = make_client()

        # Short-circuit: if the payload hash matches the last successful run,
        # skip the write pass. Keeps fetched_at accurate by not touching rows.
        if last_ok_payload_sha(db) == sha:
            finished_iso = datetime.now(timezone.utc).isoformat()
            record_run(
                db,
                IngestRunRecord(
                    started_at=started_iso,
                    finished_at=finished_iso,
                    status="skipped_unchanged",
                    draws_seen=len(normalized.draws),
                    pool_rows_seen=len(pool.bands) if pool else 0,
                    payload_sha256=sha,
                    notes="payload hash matches last successful run",
                ),
            )
            print("[ingest] payload unchanged since last run — skipping upserts")
            return 0

        drawn = upsert_draws(db, normalized.draws, started_at)
        pool_rows = upsert_pool_snapshot(db, pool)

        finished_at = datetime.now(timezone.utc)
        record_run(
            db,
            IngestRunRecord(
                started_at=started_iso,
                finished_at=finished_at.isoformat(),
                status="ok",
                draws_seen=len(normalized.draws),
                draws_upserted=drawn,
                pool_rows_seen=pool_rows,
                payload_sha256=sha,
            ),
        )
        elapsed = (finished_at - started_at).total_seconds()
        print(
            f"[ingest] wrote {drawn} draws + {pool_rows} pool rows "
            f"in {elapsed:.1f}s"
        )
        return 0

    except ShapeMismatchError as e:
        return _fail("shape_mismatch", started_iso, e)
    except HttpError as e:
        return _fail("http_error", started_iso, e)
    except Exception as e:  # noqa: BLE001 — surface anything else as db_error
        return _fail("db_error", started_iso, e)


def _fail(status: str, started_iso: str, err: Exception) -> int:
    finished_iso = datetime.now(timezone.utc).isoformat()
    notes = f"{type(err).__name__}: {err}"
    try:
        db = make_client()
        record_run(
            db,
            IngestRunRecord(
                started_at=started_iso,
                finished_at=finished_iso,
                status=status,  # type: ignore[arg-type]
                notes=notes,
            ),
        )
    except Exception:
        pass
    print(f"[ingest] FAILED ({status}): {notes}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
