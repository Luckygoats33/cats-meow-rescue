#!/usr/bin/env python3
"""Refresh PetSmart Charities adoption totals for Cat's Meow partner 9426.

PetSmart Charities does not publish a public JSON API for this look-up.
The public Adoption Partner Look Up page is a Drupal view. This script calls
the same view the look-up form uses and writes a small JSON file the static
site can read. GitHub Pages cannot fetch petsmartcharities.org from the
browser: that host does not send Access-Control-Allow-Origin.

PetSmart Charities says the totals are updated weekly. The GitHub Actions
workflow runs this script every Monday and commits the JSON when it changes.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

PARTNER_ID = "9426"
LOOKUP_PAGE = (
    "https://petsmartcharities.org/pro/resources/adoption-partner/"
    "adoption-partner-look-up"
)
USER_AGENT = (
    "CatsMeowCatRescue-totals-sync/1.0 "
    "(+https://luckygoats33.github.io/cats-meow-rescue/; public look-up sync)"
)
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "petsmart-adoption-totals.json"

ITEM_RE = re.compile(
    r'<div class="adoption_total__item[^"]*">\s*<h3>([^<]+)</h3>\s*<div>(.*?)</div>',
    re.IGNORECASE | re.DOTALL,
)
OPTION_RE = re.compile(r'<option value="(20\d\d)"', re.IGNORECASE)
CURRENT_THROUGH_RE = re.compile(
    r"Adoption totals are current through\s+([^.<]+)",
    re.IGNORECASE,
)
NO_RESULTS = "Sorry no results were found"


class LookupError(RuntimeError):
    """The public look-up could not be read safely."""


def fetch(url: str, data: bytes | None = None, accept: str = "*/*") -> tuple[bytes, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": accept,
        "Referer": LOOKUP_PAGE,
    }
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["X-Requested-With"] = "XMLHttpRequest"
    request = urllib.request.Request(url, data=data, headers=headers)
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                body = response.read()
                content_type = response.headers.get("content-type", "")
                return body, content_type
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise LookupError(f"Request failed for {url}: {last_error}") from last_error


def discover_view(page_html: str) -> dict:
    match = re.search(
        r'<script type="application/json" data-drupal-selector="drupal-settings-json">(.*?)</script>',
        page_html,
        re.DOTALL,
    )
    if not match:
        raise LookupError("PetSmart look-up page did not include Drupal view settings.")
    settings = json.loads(match.group(1))
    views = settings.get("views") or {}
    ajax_views = views.get("ajaxViews") or {}
    block = None
    for view in ajax_views.values():
        if (
            view.get("view_name") == "adoption_partner_lookup"
            and view.get("view_display_id") == "block_1"
        ):
            block = view
            break
    if not block:
        raise LookupError("Adoption partner look-up view block_1 was not on the page.")
    ajax_path = views.get("ajax_path")
    if not ajax_path:
        raise LookupError("Drupal views ajax_path was missing.")
    years = sorted({int(year) for year in OPTION_RE.findall(page_html)}, reverse=True)
    if not years:
        raise LookupError("No year options were found on the look-up page.")
    current = CURRENT_THROUGH_RE.search(page_html)
    return {
        "ajax_path": ajax_path,
        "view": block,
        "years": years,
        "current_through": current.group(1).strip() if current else None,
    }


def parse_number(raw: str) -> tuple[int, bool]:
    approximate = "*" in raw or "<sup" in raw.lower()
    text = unescape(re.sub(r"<[^>]+>", "", raw))
    digits = re.sub(r"[^\d]", "", text)
    if not digits:
        raise LookupError(f"Could not read a number from {raw!r}.")
    return int(digits), approximate


def parse_lookup_html(html: str, expected_partner: str = PARTNER_ID) -> dict | None:
    """Parse one look-up result.

    Returns None when PetSmart explicitly reports no rows for that year.
    Raises LookupError when the response is neither a result nor that message,
    so a markup change cannot be saved as an empty year.
    """
    items = []
    for label, raw_value in ITEM_RE.findall(html):
        label = unescape(re.sub(r"\s+", " ", label)).strip()
        number, approximate = parse_number(raw_value)
        items.append({"label": label, "value": number, "approximate": approximate})
    if not items:
        if NO_RESULTS in html:
            return None
        raise LookupError("Look-up HTML had neither totals nor the no-results message.")

    partner = next((item for item in items if item["label"] == "Adoption Partner ID"), None)
    total = next((item for item in items if item["label"] == "Adoption Total"), None)
    if partner is None or total is None:
        raise LookupError("Look-up HTML did not include partner ID and adoption total.")
    partner_id = str(partner["value"])
    if partner_id != str(expected_partner):
        raise LookupError(
            f"Look-up returned partner {partner_id}, expected {expected_partner}."
        )
    breakdown = [
        {"label": item["label"], "value": item["value"]}
        for item in items
        if item["label"] not in {"Adoption Partner ID", "Adoption Total"}
    ]
    return {
        "partnerId": partner_id,
        "adoptionTotal": total["value"],
        "approximate": bool(total["approximate"]),
        "breakdown": breakdown,
    }


def fetch_year(ajax_path: str, view: dict, year: int, partner: str) -> str:
    query = urllib.parse.urlencode(
        {"field_year_value": str(year), "field_awo_id_value": partner}
    )
    payload = {
        "view_name": view.get("view_name", ""),
        "view_display_id": view.get("view_display_id", ""),
        "view_args": view.get("view_args", "") or "",
        "view_path": view.get("view_path", ""),
        "view_base_path": view.get("view_base_path", ""),
        "view_dom_id": view.get("view_dom_id") or "cats-meow-sync",
        "pager_element": str(view.get("pager_element", 0)),
        "_drupal_ajax": "1",
        "field_year_value": str(year),
        "field_awo_id_value": partner,
    }
    body, content_type = fetch(
        ajax_path + "?" + query,
        data=urllib.parse.urlencode(payload).encode(),
        accept="application/json",
    )
    if "json" not in content_type:
        raise LookupError(f"Views response for {year} was not JSON ({content_type}).")
    commands = json.loads(body.decode("utf-8", "replace"))
    if not isinstance(commands, list):
        raise LookupError(f"Views response for {year} was not a command list.")
    for command in commands:
        if command.get("command") == "insert" and command.get("data"):
            return command["data"]
    raise LookupError(f"Views response for {year} did not include result HTML.")


def build_payload(page_html: str, year_html: dict[int, str], partner: str = PARTNER_ID) -> dict:
    discovered = discover_view(page_html)
    years = []
    empty_years = []
    for year in discovered["years"]:
        html = year_html[year]
        parsed = parse_lookup_html(html, partner)
        if parsed is None:
            empty_years.append(year)
            continue
        years.append({"year": year, **parsed})
    if not years:
        raise LookupError("No adoption totals were returned for any listed year.")
    return {
        "partnerId": partner,
        "organization": "Cat's Meow Cat Rescue",
        "sourceName": "PetSmart Charities Adoption Partner Look Up",
        "sourceUrl": LOOKUP_PAGE,
        "fetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "currentThrough": discovered["current_through"],
        "refresh": (
            "GitHub Actions runs scripts/sync_petsmart_totals.py every Monday "
            "at 15:00 UTC and commits this file when the numbers change. "
            "PetSmart Charities says these totals are updated weekly. "
            "There is no public JSON API, and the look-up host does not allow "
            "browser requests from GitHub Pages."
        ),
        "years": years,
        "emptyYears": empty_years,
    }


def sync(partner: str = PARTNER_ID, output: Path = OUTPUT, pause: float = 0.4) -> dict:
    page_bytes, _ = fetch(LOOKUP_PAGE, accept="text/html")
    page_html = page_bytes.decode("utf-8", "replace")
    discovered = discover_view(page_html)
    year_html: dict[int, str] = {}
    for index, year in enumerate(discovered["years"]):
        if index:
            time.sleep(pause)
        year_html[year] = fetch_year(
            discovered["ajax_path"], discovered["view"], year, partner
        )
    payload = build_payload(page_html, year_html, partner)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def main() -> int:
    try:
        payload = sync()
    except LookupError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(
        f"Wrote {OUTPUT.relative_to(ROOT)} "
        f"({len(payload['years'])} years, current through {payload['currentThrough']})"
    )
    for row in payload["years"]:
        extra = ", ".join(f"{item['label']} {item['value']}" for item in row["breakdown"])
        suffix = f"; {extra}" if extra else ""
        print(f"  {row['year']}: {row['adoptionTotal']}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
