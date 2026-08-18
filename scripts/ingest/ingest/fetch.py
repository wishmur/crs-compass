"""HTTP fetch for the IRCC Express Entry feed.

canada.ca sits behind Akamai and rejects unadorned requests. We identify as a
recent Chrome and include a stable UA suffix so IRCC operators can identify
this traffic if they ever need to.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import requests

from .schema import RawFeed, ShapeMismatchError, parse_feed

IRCC_FEED_URL = (
    "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"
)

_UA = (
    "Mozilla/5.0 (compatible; CRS-Compass-Ingester/0.1; +https://github.com/) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)

_REFERER = (
    "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/"
    "mandate/policies-operational-instructions-agreements/ministerial-instructions/"
    "express-entry-rounds.html"
)


class HttpError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(f"HTTP {status}: {message}")
        self.status = status


@dataclass
class FetchResult:
    feed: RawFeed
    body_text: str   # raw response text, for hashing


def fetch_ircc_feed(
    url: str = IRCC_FEED_URL,
    attempts: int = 3,
    timeout_seconds: float = 30.0,
) -> FetchResult:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return _fetch_once(url, timeout_seconds)
        except (HttpError, requests.RequestException, ValueError) as err:
            last_error = err
            if attempt < attempts:
                wait = 2 ** (attempt - 1)
                print(f"[fetch] attempt {attempt} failed ({err}); retrying in {wait}s")
                time.sleep(wait)
    assert last_error is not None
    raise last_error


def _fetch_once(url: str, timeout: float) -> FetchResult:
    resp = requests.get(
        url,
        headers={
            "User-Agent": _UA,
            "Accept": "application/json,*/*;q=0.9",
            "Accept-Language": "en-CA,en;q=0.9",
            "Referer": _REFERER,
        },
        timeout=timeout,
        allow_redirects=True,
    )
    if not resp.ok:
        raise HttpError(resp.status_code, resp.reason or "")
    body_text = resp.text
    try:
        parsed: Any = json.loads(body_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"response was not valid JSON ({e}); first 200 chars: {body_text[:200]!r}"
        ) from e
    feed = parse_feed(parsed)   # raises ShapeMismatchError on drift
    return FetchResult(feed=feed, body_text=body_text)


__all__ = [
    "fetch_ircc_feed",
    "FetchResult",
    "HttpError",
    "ShapeMismatchError",
    "IRCC_FEED_URL",
]
