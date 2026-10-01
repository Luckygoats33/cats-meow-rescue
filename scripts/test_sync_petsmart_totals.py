#!/usr/bin/env python3
"""Parser tests for the PetSmart look-up sync. No network."""

import json
import unittest

from sync_petsmart_totals import (
    LookupError,
    build_payload,
    discover_view,
    parse_lookup_html,
    parse_number,
)

SETTINGS = {
    "views": {
        "ajax_path": "https://petsmartcharities.org/views/ajax",
        "ajaxViews": {
            "views_dom_id:abc": {
                "view_name": "adoption_partner_lookup",
                "view_display_id": "block_1",
                "view_args": "",
                "view_path": "/node/13856",
                "view_base_path": "adoption-partner-lookup",
                "view_dom_id": "abc",
                "pager_element": 0,
            }
        },
    }
}

PAGE = """
<script type="application/json" data-drupal-selector="drupal-settings-json">{settings}</script>
<select id="edit-field-year-value" name="field_year_value">
  <option value="2026" selected="selected">2026</option>
  <option value="2025">2025</option>
  <option value="2018">2018</option>
</select>
<p><strong>Adoption totals are current through September 27, 2026.</strong></p>
""".format(settings=json.dumps(SETTINGS))

RESULT_2026 = """
<div class="adoption_total__item awoid">
    <h3>Adoption Partner ID</h3>
    <div>9426</div>
</div>
<div class="adoption_total__item total">
    <h3>Adoption Total</h3>
    <div>314<sup>*</sup></div>
</div>
<div class="adoption_total__item total">
    <h3>Spring NAW Total</h3>
    <div>14</div>
</div>
<div class="adoption_total__item total">
    <h3>Summer NAW Total</h3>
    <div>1,066</div>
</div>
"""

EMPTY = """
<div class="view-empty">
  <p>Sorry no results were found, please make sure you have selected the year and correctly entered your Adoption Partner ID.</p>
</div>
"""


class ParserTests(unittest.TestCase):
    def test_parse_number_keeps_asterisk_and_commas(self):
        self.assertEqual(parse_number("314<sup>*</sup>"), (314, True))
        self.assertEqual(parse_number("1,066"), (1066, False))

    def test_parse_result_requires_expected_partner(self):
        parsed = parse_lookup_html(RESULT_2026)
        self.assertEqual(parsed["partnerId"], "9426")
        self.assertEqual(parsed["adoptionTotal"], 314)
        self.assertTrue(parsed["approximate"])
        self.assertEqual(
            parsed["breakdown"],
            [
                {"label": "Spring NAW Total", "value": 14},
                {"label": "Summer NAW Total", "value": 1066},
            ],
        )

    def test_empty_year_is_not_an_error(self):
        self.assertIsNone(parse_lookup_html(EMPTY))

    def test_unexpected_markup_is_an_error(self):
        with self.assertRaises(LookupError):
            parse_lookup_html("<div class='view-empty'></div>")

    def test_wrong_partner_is_an_error(self):
        html = RESULT_2026.replace("9426", "1111")
        with self.assertRaises(LookupError):
            parse_lookup_html(html)

    def test_discover_and_build_payload(self):
        discovered = discover_view(PAGE)
        self.assertEqual(discovered["years"], [2026, 2025, 2018])
        self.assertEqual(discovered["current_through"], "September 27, 2026")
        payload = build_payload(
            PAGE,
            {2026: RESULT_2026, 2025: RESULT_2026, 2018: EMPTY},
        )
        self.assertEqual([row["year"] for row in payload["years"]], [2026, 2025])
        self.assertEqual(payload["emptyYears"], [2018])
        self.assertEqual(payload["partnerId"], "9426")
        self.assertIn("every Monday", payload["refresh"])


if __name__ == "__main__":
    unittest.main()
