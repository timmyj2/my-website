(function () {
  const { areas, homes } = window.PORCH;
  const HUNT = ["champions-forest", "cypress", "bridgeland", "nottingham"];
  const CLOSE = [
    "oak-forest",
    "garden-oaks",
    "timbergrove",
    "heights",
    "spring-branch",
    "westbury",
    "meyerland",
    "eastwood",
    "midtown",
  ];
  const INSURANCE = 340;
  const KEY = "porch-belt-v1";

  const byId = (id) => areas.find((area) => area.id === id);

  function starter() {
    return {
      priceMin: 300000,
      priceMax: 400000,
      beds: 4,
      baths: 2,
      sqftMin: 1800,
      stories: "any",
      townhomes: false,
      areaIds: HUNT.slice(),
      floodOnlyX: true,
      fenced: true,
      pool: false,
      garage2: false,
      kitchen: false,
      primaryDown: false,
      noHoa: false,
      sort: "price-asc",
      rate: 6.5,
      down: 10,
      savedOnly: false,
    };
  }

  const presets = [
    { id: "starter", name: "This hunt", make: starter },
    { id: "one", name: "One story", make: () => ({ ...starter(), stories: "1" }) },
    { id: "cap", name: "Raise the cap", make: () => ({ ...starter(), priceMax: 480000 }) },
    {
      id: "close",
      name: "Closer in",
      make: () => ({
        ...starter(),
        priceMin: 350000,
        priceMax: 700000,
        sqftMin: 1400,
        floodOnlyX: false,
        areaIds: CLOSE.slice(),
        townhomes: true,
      }),
    },
  ];

  let state = starter();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") state = { ...starter(), ...saved };
    if (!Array.isArray(state.areaIds)) state.areaIds = HUNT.slice();
  } catch {
    state = starter();
  }
  let favs = new Set();
  try {
    favs = new Set(JSON.parse(localStorage.getItem(KEY + "-favs") || "[]"));
  } catch {
    favs = new Set();
  }

  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const num = (n) => new Intl.NumberFormat("en-US").format(n);

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(KEY + "-favs", JSON.stringify([...favs]));
  }

  function monthlyPI(price) {
    const principal = price * (1 - Number(state.down) / 100);
    const r = Number(state.rate) / 100 / 12;
    const n = 360;
    if (principal <= 0) return 0;
    if (r === 0) return principal / n;
    const factor = (1 + r) ** n;
    return (principal * r * factor) / (factor - 1);
  }

  function payment(home) {
    const area = byId(home.areaId);
    const mortgage = monthlyPI(home.price);
    const tax = (home.price * area.taxRate) / 12;
    const flood = home.flood === "AE" ? 175 : home.flood === "X500" ? 70 : 0;
    const hoa = home.hoa || 0;
    return { mortgage, tax, insurance: INSURANCE, flood, hoa, total: mortgage + tax + INSURANCE + flood + hoa };
  }

  function matches(home) {
    const lo = Math.min(state.priceMin, state.priceMax);
    const hi = Math.max(state.priceMin, state.priceMax);
    if (home.price < lo || home.price > hi) return false;
    if (home.beds < state.beds) return false;
    if (home.baths < state.baths) return false;
    if (home.sqft < state.sqftMin) return false;
    if (state.stories === "1" && home.stories !== 1) return false;
    if (state.stories === "2+" && home.stories < 2) return false;
    if (!state.townhomes && home.kind === "townhome") return false;
    if (state.areaIds.length && !state.areaIds.includes(home.areaId)) return false;
    if (state.floodOnlyX && home.flood !== "X") return false;
    if (state.fenced && !home.fenced) return false;
    if (state.pool && !home.pool) return false;
    if (state.garage2 && home.garage < 2) return false;
    if (state.kitchen && !home.kitchen) return false;
    if (state.primaryDown && !home.primaryDown) return false;
    if (state.noHoa && home.hoa > 0) return false;
    if (state.savedOnly && !favs.has(home.id)) return false;
    return true;
  }

  function results() {
    const list = homes.filter(matches);
    const area = (home) => byId(home.areaId);
    list.sort((a, b) => {
      if (state.sort === "price-desc") return b.price - a.price;
      if (state.sort === "sqft") return b.sqft - a.sqft;
      if (state.sort === "lot") return b.lot - a.lot;
      if (state.sort === "year") return b.year - a.year;
      if (state.sort === "commute") return area(a).commute - area(b).commute;
      return a.price - b.price;
    });
    return list;
  }

  function floodShort(zone) {
    if (zone === "X") return "Zone X";
    if (zone === "X500") return "500-year";
    return "Floodplain";
  }

  function redfinUrl() {
    const lo = Math.min(state.priceMin, state.priceMax);
    const hi = Math.max(state.priceMin, state.priceMax);
    const parts = ["include=forsale"];
    parts.push(state.townhomes ? "property-type=house+townhouse" : "property-type=house");
    if (lo > 0) parts.push("min-price=" + Math.round(lo / 1000) + "k");
    if (hi > 0 && hi < 1500000) parts.push("max-price=" + Math.round(hi / 1000) + "k");
    if (state.beds > 0) parts.push("min-beds=" + state.beds);
    if (state.baths > 0) parts.push("min-baths=" + Math.floor(state.baths));
    if (state.sqftMin > 0) parts.push("min-sqft=" + state.sqftMin + "-sqft");
    if (state.stories === "1") parts.push("max-stories=1");
    return "https://www.redfin.com/city/8903/TX/Houston/filter/" + parts.join(",");
  }

  function harUrl(name) {
    return "https://www.har.com/search/dosearch?for_sale=1&quicksearch=" + encodeURIComponent(name + " Houston TX");
  }

  function line() {
    const lo = Math.min(state.priceMin, state.priceMax);
    const hi = Math.max(state.priceMin, state.priceMax);
    const bits = [money(lo) + "–" + money(hi)];
    if (state.beds) bits.push(state.beds + "+ bd");
    if (state.baths) bits.push(state.baths + "+ ba");
    if (state.stories === "1") bits.push("1 story");
    if (state.floodOnlyX) bits.push("Zone X");
    if (state.fenced) bits.push("fenced yard");
    if (!state.townhomes) bits.push("houses only");
    if (state.savedOnly) bits.push("saved");
    return bits.join(" · ");
  }

  function signature(source) {
    const copy = { ...source, rate: 0, down: 0, savedOnly: false, sort: "" };
    copy.areaIds = source.areaIds.slice().sort();
    return JSON.stringify(copy);
  }

  function bindNumber(id, key) {
    const input = $(id);
    input.addEventListener("input", () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      state[key] = value;
      persist();
      paint();
    });
  }

  function bindCheck(id, key) {
    $(id).addEventListener("change", () => {
      state[key] = $(id).checked;
      persist();
      paint();
    });
  }

  function areaBox(area) {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.area = area.id;
    input.addEventListener("change", () => {
      const set = new Set(state.areaIds);
      if (input.checked) set.add(area.id);
      else set.delete(area.id);
      state.areaIds = [...set];
      persist();
      paint();
    });
    label.append(input, document.createTextNode(area.name));
    return label;
  }

  function sync() {
    $("priceMin").value = state.priceMin;
    $("priceMax").value = state.priceMax;
    $("beds").value = state.beds;
    $("baths").value = state.baths;
    $("sqft").value = state.sqftMin;
    $("stories").value = state.stories;
    $("sort").value = state.sort;
    $("rate").value = state.rate;
    $("down").value = state.down;
    $("floodOnlyX").checked = state.floodOnlyX;
    $("fenced").checked = state.fenced;
    $("townhomes").checked = state.townhomes;
    $("pool").checked = state.pool;
    $("garage2").checked = state.garage2;
    $("kitchen").checked = state.kitchen;
    $("primaryDown").checked = state.primaryDown;
    $("noHoa").checked = state.noHoa;
    document.querySelectorAll("[data-area]").forEach((input) => {
      input.checked = state.areaIds.includes(input.dataset.area);
    });
    if (state.areaIds.some((id) => !HUNT.includes(id))) {
      $("moreAreas").hidden = false;
      $("moreAreasBtn").textContent = "Hide other pockets";
    }
    const current = signature(state);
    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.sig === current ? "true" : "false");
    });
    $("savedBtn").textContent = state.savedOnly ? "Saved · on" : "Saved" + (favs.size ? " " + favs.size : "");
    $("savedBtn").setAttribute("aria-pressed", state.savedOnly ? "true" : "false");
  }

  function card(home) {
    const area = byId(home.areaId);
    const pay = payment(home);
    const article = document.createElement("article");
    article.className = "card";
    article.tabIndex = 0;
    const photo = document.createElement("div");
    photo.className = "photo";
    const img = document.createElement("img");
    img.src = home.image;
    img.alt = home.name + " in " + area.name;
    photo.append(img);
    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = "heart" + (favs.has(home.id) ? " on" : "");
    heart.setAttribute("aria-label", favs.has(home.id) ? "Remove saved home" : "Save home");
    heart.textContent = "♥";
    heart.addEventListener("click", (event) => {
      event.stopPropagation();
      if (favs.has(home.id)) favs.delete(home.id);
      else favs.add(home.id);
      persist();
      paint();
    });
    photo.append(heart);
    const body = document.createElement("div");
    body.className = "card-body";
    const kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = area.name + " · " + area.district;
    const title = document.createElement("h3");
    title.textContent = home.name;
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = money(home.price);
    const mo = document.createElement("p");
    mo.className = "mo";
    mo.textContent = "about " + money(pay.total) + " / mo";
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent =
      home.beds +
      " bd · " +
      home.baths +
      " ba · " +
      num(home.sqft) +
      " sqft · " +
      floodShort(home.flood);
    body.append(kicker, title, price, mo, meta);
    article.append(photo, body);
    const open = () => openHome(home.id);
    article.addEventListener("click", open);
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    return article;
  }

  function paint() {
    const list = results();
    $("count").textContent = list.length + (list.length === 1 ? " example home" : " example homes");
    $("line").textContent = line();
    const href = redfinUrl();
    $("redfin").href = href;
    $("redfinDock").href = href;
    const root = $("results");
    root.replaceChildren();
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      const title = document.createElement("h3");
      title.textContent = state.savedOnly ? "Nothing saved in this hunt." : "Nothing matches these rules.";
      const copy = document.createElement("p");
      copy.textContent = state.savedOnly
        ? "Hearts stay on this phone. Turn Saved off to see the hunt again."
        : "Raise the cap if you want the usual Bridgeland 4-bedroom, or ease one rule.";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "solid";
      button.style.marginTop = "12px";
      button.textContent = "Raise the cap";
      button.addEventListener("click", () => applyPreset(presets[2]));
      empty.append(title, copy, button);
      root.append(empty);
    } else {
      list.forEach((home) => root.append(card(home)));
    }
    const pockets = $("pockets");
    pockets.replaceChildren();
    const shown = state.areaIds.length ? state.areaIds : HUNT;
    shown.forEach((id) => {
      const area = byId(id);
      if (!area) return;
      const box = document.createElement("article");
      box.className = "pocket";
      const title = document.createElement("h3");
      title.textContent = area.name;
      const fit = document.createElement("p");
      fit.textContent = area.fit;
      const watch = document.createElement("p");
      watch.className = "watch";
      watch.textContent = area.watch;
      const link = document.createElement("a");
      link.href = harUrl(area.name);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Search " + area.name + " on HAR";
      link.style.display = "inline-block";
      link.style.marginTop = "8px";
      box.append(title, fit, watch, link);
      pockets.append(box);
    });
    sync();
  }

  function row(label, value) {
    const div = document.createElement("div");
    const a = document.createElement("span");
    a.textContent = label;
    const b = document.createElement("span");
    b.textContent = value;
    div.append(a, b);
    return div;
  }

  function openHome(id) {
    const home = homes.find((item) => item.id === id);
    if (!home) return;
    const area = byId(home.areaId);
    const pay = payment(home);
    const body = $("detailBody");
    body.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "detail";
    const img = document.createElement("img");
    img.src = home.image;
    img.alt = "";
    const inner = document.createElement("div");
    inner.className = "detail-body";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "ghost";
    close.textContent = "Close";
    close.addEventListener("click", () => $("detail").close());
    const kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = area.name + " · " + area.district + " · about " + area.commute + " min downtown";
    const title = document.createElement("h2");
    title.textContent = home.name;
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = money(home.price);
    const facts = document.createElement("p");
    facts.className = "meta";
    facts.textContent =
      home.beds +
      " bd · " +
      home.baths +
      " ba · " +
      num(home.sqft) +
      " sqft · " +
      num(home.lot) +
      " sqft lot · " +
      home.year +
      " · " +
      (home.stories === 1 ? "one story" : home.stories + " stories");
    const summary = document.createElement("p");
    summary.textContent = home.summary;
    const watch = document.createElement("p");
    watch.className = "watch";
    watch.textContent = home.watch;
    const payBox = document.createElement("div");
    payBox.className = "pay";
    payBox.append(
      row("Principal & interest", money(pay.mortgage)),
      row("Taxes", money(pay.tax)),
      row("Insurance", money(pay.insurance)),
    );
    if (pay.flood) payBox.append(row("Flood insurance", money(pay.flood)));
    if (pay.hoa) payBox.append(row("HOA", money(pay.hoa)));
    const total = row("Estimated monthly", money(pay.total));
    total.className = "total";
    payBox.append(total);
    const assume = document.createElement("p");
    assume.className = "meta";
    assume.textContent =
      state.rate +
      "% and " +
      state.down +
      "% down, " +
      Math.round(area.taxRate * 1000) / 10 +
      "% tax, $340 insurance. A planning number, not a loan quote.";
    const actions = document.createElement("div");
    actions.className = "actions";
    const live = document.createElement("a");
    live.className = "solid";
    live.href = harUrl(area.name);
    live.target = "_blank";
    live.rel = "noopener noreferrer";
    live.textContent = "Search this pocket";
    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = "ghost";
    heart.textContent = favs.has(home.id) ? "Saved" : "Save";
    heart.addEventListener("click", () => {
      if (favs.has(home.id)) favs.delete(home.id);
      else favs.add(home.id);
      persist();
      paint();
      openHome(home.id);
    });
    actions.append(live, heart, close);
    inner.append(close, kicker, title, price, facts, summary, watch, payBox, assume, actions);
    wrap.append(img, inner);
    body.append(wrap);
    const dialog = $("detail");
    if (!dialog.open) dialog.showModal();
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  }

  function applyPreset(preset) {
    const next = preset.make();
    next.rate = state.rate;
    next.down = state.down;
    state = next;
    persist();
    paint();
    $("panel").classList.remove("open");
  }

  function boot() {
    const hunt = $("huntAreas");
    const more = $("moreAreas");
    areas.forEach((area) => {
      (HUNT.includes(area.id) ? hunt : more).append(areaBox(area));
    });
    const row = $("presets");
    presets.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.dataset.preset = preset.id;
      button.dataset.sig = signature(preset.make());
      button.textContent = preset.name;
      button.addEventListener("click", () => applyPreset(preset));
      row.append(button);
    });
    bindNumber("priceMin", "priceMin");
    bindNumber("priceMax", "priceMax");
    bindNumber("beds", "beds");
    bindNumber("baths", "baths");
    bindNumber("sqft", "sqftMin");
    bindNumber("rate", "rate");
    bindNumber("down", "down");
    $("stories").addEventListener("change", () => {
      state.stories = $("stories").value;
      persist();
      paint();
    });
    $("sort").addEventListener("change", () => {
      state.sort = $("sort").value;
      persist();
      paint();
    });
    ["floodOnlyX", "fenced", "townhomes", "pool", "garage2", "kitchen", "primaryDown", "noHoa"].forEach((id) =>
      bindCheck(id, id),
    );
    $("moreAreasBtn").addEventListener("click", () => {
      const box = $("moreAreas");
      const open = box.hidden;
      box.hidden = !open;
      $("moreAreasBtn").textContent = open ? "Hide other pockets" : "Other pockets";
    });
    $("savedBtn").addEventListener("click", () => {
      state.savedOnly = !state.savedOnly;
      persist();
      paint();
    });
    const panel = $("panel");
    const showPanel = () => {
      panel.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const hidePanel = () => {
      panel.classList.remove("open");
      document.body.style.overflow = "";
    };
    $("editBtn").addEventListener("click", showPanel);
    $("closePanel").addEventListener("click", hidePanel);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("open")) hidePanel();
    });
    const top = $("top");
    const onScroll = () => top.classList.toggle("stuck", window.scrollY > 4);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    $("detail").addEventListener("close", () => {
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    });
    paint();
    const hash = location.hash.slice(1);
    if (hash && homes.some((home) => home.id === hash)) openHome(hash);
  }

  boot();
})();
