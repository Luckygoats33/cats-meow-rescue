(function () {
  var root = document.getElementById("psc-totals");
  if (!root) return;
  var loading = root.querySelector("[data-psc-loading]");
  var body = root.querySelector("[data-psc-body]");
  var error = root.querySelector("[data-psc-error]");

  function showError() {
    if (loading) loading.hidden = true;
    if (body) body.hidden = true;
    if (error) error.hidden = false;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("en-US");
  }

  function formatFetched(iso) {
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function nawLabel(label) {
    var known = {
      "Spring NAW Total": "Spring NAW",
      "Summer NAW Total": "Summer NAW",
      "Fall NAW Total": "Fall NAW",
    };
    return known[label] || label;
  }

  function renderYear(payload, row, detail) {
    detail.replaceChildren();

    var card = el("article", "psc-card");
    card.appendChild(el("p", "psc-id", "Adoption Partner #" + payload.partnerId));
    card.appendChild(el("h3", "psc-year", String(row.year)));

    var total = el("p", "psc-total");
    total.appendChild(document.createTextNode(formatNumber(row.adoptionTotal)));
    if (row.approximate) {
      total.appendChild(el("sup", null, "*"));
      total.appendChild(el("span", "psc-sr", ", approximate"));
    }
    card.appendChild(total);
    card.appendChild(el("p", "psc-total-label", "Adoption Total"));
    detail.appendChild(card);

    if (row.breakdown && row.breakdown.length) {
      var naw = el("div", "psc-naw");
      naw.setAttribute("aria-label", "National Adoption Week totals");
      row.breakdown.forEach(function (item) {
        var cell = el("div", "psc-naw-item");
        cell.appendChild(el("strong", null, formatNumber(item.value)));
        cell.appendChild(el("span", null, nawLabel(item.label)));
        naw.appendChild(cell);
      });
      detail.appendChild(naw);
      detail.appendChild(
        el(
          "p",
          "psc-meta",
          "NAW is National Adoption Week. PetSmart Charities publishes those week counts separately from the adoption total."
        )
      );
    }

    var checked = formatFetched(payload.fetchedAt);
    var through = payload.currentThrough ? " PetSmart Charities listed them as current through " + payload.currentThrough + "." : "";
    var when = checked ? " Last checked " + checked + "." : "";
    detail.appendChild(
      el(
        "p",
        "psc-meta",
        "Figures come from the PetSmart Charities look-up and refresh on this site every Monday." + when + through + (row.approximate ? " The asterisk is PetSmart Charities’ own mark on the adoption total." : "")
      )
    );
  }

  function render(payload) {
    if (!payload || String(payload.partnerId) !== "9426" || !Array.isArray(payload.years) || !payload.years.length) {
      showError();
      return;
    }
    var years = payload.years.slice().sort(function (a, b) { return b.year - a.year; });
    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    body.hidden = false;
    body.replaceChildren();

    var switcher = el("div", "psc-years");
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Year");
    var detail = el("div", "psc-detail");
    var buttons = years.map(function (row) {
      var button = el("button", "pill", String(row.year));
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        buttons.forEach(function (other) {
          var on = other === button;
          other.classList.toggle("active", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderYear(payload, row, detail);
      });
      switcher.appendChild(button);
      return button;
    });
    body.appendChild(switcher);
    body.appendChild(detail);
    buttons[0].classList.add("active");
    buttons[0].setAttribute("aria-pressed", "true");
    renderYear(payload, years[0], detail);
  }

  fetch("data/petsmart-adoption-totals.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(render)
    .catch(showError);
})();
