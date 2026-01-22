(function () {
  const App = {};
  const $ = (id) => document.getElementById(id);

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return await res.json();
  }
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";
    return await res.text();
  }

  function normalize(str) {
    return (str || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[m]));
  }

  function setActiveNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav a").forEach(a => {
      const href = a.getAttribute("href");
      if (href === path) a.classList.add("active");
    });
  }
  function setYear() {
    const el = $("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  async function loadSiteSettings() {
    try { return await fetchJson("data/site.json"); }
    catch { return {}; }
  }
  function applyBranding(site) {
    const titleEls = document.querySelectorAll("[data-site-title]");
    titleEls.forEach(el => el.textContent = site.short_title || site.site_title || "Portal");
    const subEls = document.querySelectorAll("[data-site-sub]");
    subEls.forEach(el => el.textContent = site.description ? site.description : "Guides • Events • Tips");
    if (site.site_title) document.title = document.title.replace("{{SITE_TITLE}}", site.site_title);
  }

  // Search index
  const Search = {
    ready: false,
    items: [],
    async build() {
      if (this.ready) return;
      const [articles, places, faq, hotels, restaurants, music, events] = await Promise.all([
        fetchJson("data/articles.json"),
        fetchJson("data/places.json"),
        fetchJson("data/faq.json"),
        fetchJson("data/hotels.json"),
        fetchJson("data/restaurants.json"),
        fetchJson("data/music.json"),
        fetchJson("data/events.json"),
      ]);

      const items = [];

      for (const a of (articles.articles || [])) {
        const mdUrl = `posts/${a.slug}.md`;
        const md = await fetchText(mdUrl);
        items.push({
          type: "Article",
          title: a.title,
          url: `post.html?slug=${encodeURIComponent(a.slug)}`,
          text: normalize([a.title, a.excerpt, a.category, (a.tags || []).join(" "), md].join(" ")),
          featured: !!a.featured,
          priority: Number(a.priority || 0),
          snippet: a.excerpt || ""
        });
      }

      for (const p of (places.places || [])) {
        const mdUrl = `posts/${p.slug}.md`;
        const md = await fetchText(mdUrl);
        items.push({
          type: "Place",
          title: p.title,
          url: `post.html?slug=${encodeURIComponent(p.slug)}`,
          text: normalize([p.title, p.excerpt, p.distance, p.category, (p.tags || []).join(" "), md].join(" ")),
          featured: !!p.featured,
          priority: Number(p.priority || 0),
          snippet: p.excerpt || ""
        });
      }

      for (const f of (faq.faq || [])) {
        items.push({
          type: "FAQ",
          title: f.q,
          url: `faq.html#${encodeURIComponent(f.id || "")}`,
          text: normalize([f.q, f.a, (f.tags || []).join(" ")].join(" ")),
          featured: !!f.featured,
          priority: Number(f.priority || 0),
          snippet: (f.a || "").slice(0, 140)
        });
      }

      for (const h of (hotels.hotels || [])) {
        items.push({
          type: "Hotel",
          title: h.name,
          url: `hotels.html#${encodeURIComponent(h.id || "")}`,
          text: normalize([h.name, h.type, h.price, h.area, (h.tags || []).join(" ")].join(" ")),
          featured: !!h.featured,
          priority: Number(h.priority || 0),
          snippet: `${h.type || "Hotel"} • ${h.area || ""} • ${h.price || ""}`
        });
      }

      for (const r of (restaurants.restaurants || [])) {
        items.push({
          type: "Restaurant",
          title: r.name,
          url: `restaurants.html#${encodeURIComponent(r.id || "")}`,
          text: normalize([r.name, r.type, r.price, r.area, (r.tags || []).join(" ")].join(" ")),
          featured: !!r.featured,
          priority: Number(r.priority || 0),
          snippet: `${r.type || "Food"} • ${r.area || ""} • ${r.price || ""}`
        });
      }

      for (const m of (music.music || [])) {
        items.push({
          type: "Music",
          title: m.place,
          url: `music.html#${encodeURIComponent(m.id || "")}`,
          text: normalize([m.place, m.genre, (m.tags || []).join(" ")].join(" ")),
          featured: !!m.featured,
          priority: Number(m.priority || 0),
          snippet: m.genre || ""
        });
      }

      for (const e of (events.events || [])) {
        items.push({
          type: "Event",
          title: e.title,
          url: `event.html?id=${encodeURIComponent(e.id)}`,
          text: normalize([e.title, e.description, e.category, e.venue, e.address, e.date, e.time, (e.tags || []).join(" ")].join(" ")),
          featured: !!e.featured,
          priority: Number(e.priority || 0),
          snippet: `${e.date} • ${e.time || "TBA"} • ${e.venue || ""}`
        });
      }

      items.sort((a, b) => (b.featured - a.featured) || (b.priority - a.priority) || a.title.localeCompare(b.title));
      this.items = items;
      this.ready = true;
    },

    query(q, limit=20) {
      const qq = normalize(q);
      if (!qq) return [];
      const parts = qq.split(" ").filter(Boolean);
      const scored = [];
      for (const it of this.items) {
        let score = 0;
        for (const p of parts) {
          if (it.text.includes(p)) score += 2;
          if (normalize(it.title).includes(p)) score += 3;
        }
        if (it.featured) score += 1;
        score += Math.min(2, (it.priority || 0) / 10);
        if (score > 0) scored.push({ it, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(x => x.it);
    },

    featured(limit=8) {
      return this.items.filter(x => x.featured).slice(0, limit);
    }
  };

  function renderSearchResults(container, results) {
    container.innerHTML = "";
    if (!results.length) {
      container.innerHTML = `<div class="muted small" style="padding:12px;">No results.</div>`;
      return;
    }
    for (const r of results) {
      const el = document.createElement("div");
      el.className = "result";
      el.innerHTML = `
        <div class="type">${escapeHtml(r.type)}</div>
        <div class="title"><a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a></div>
        <div class="snippet">${escapeHtml(r.snippet || "")}</div>
      `;
      container.appendChild(el);
    }
  }

  // Markdown renderer
  async function renderMarkdownInto(containerEl, mdUrl) {
    const md = await fetchText(mdUrl);
    if (!md) {
      containerEl.innerHTML = `<h1>Not found</h1><p class="muted">Missing file: <code>${escapeHtml(mdUrl)}</code></p>`;
      return { title: "Not found", md: "" };
    }
    const html = (window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`);
    containerEl.innerHTML = html;
    const h1 = containerEl.querySelector("h1");
    return { title: h1 ? h1.textContent : "Post", md };
  }

  // Public inits
  App.initSite = async function () {
    setActiveNav();
    setYear();
    const site = await loadSiteSettings();
    applyBranding(site);
    // footer links
    const ig = $("igLink"); if (ig && site.instagram_url) ig.href = site.instagram_url;
  };

  App.initHome = async function () {
    await App.initSite();
    const site = await loadSiteSettings();
    await Search.build();

    const submitLink = $("submitLink");
    if (submitLink) submitLink.href = "submit.html";

    const joinLink = $("communityLink");
    if (joinLink && site.telegram_url) joinLink.href = site.telegram_url;

    const featuredBox = $("featuredList");
    if (featuredBox) renderSearchResults(featuredBox, Search.featured(8));

    const input = $("globalSearch");
    const out = $("globalResults");

    function apply() {
      const results = Search.query(input.value, 20);
      renderSearchResults(out, results);
    }
    input.addEventListener("input", apply);

    // quick CTA
    const igBtn = $("igBtn");
    if (igBtn && site.instagram_url) igBtn.href = site.instagram_url;
  };

  App.initListPage = async function ({ dataset, searchInputId, listId, renderItem }) {
    await App.initSite();
    const data = await fetchJson(dataset);
    const items = (Object.values(data)[0] || []).slice();

    const input = $(searchInputId);
    const list = $(listId);

    function apply() {
      const q = normalize(input.value);
      const filtered = !q ? items : items.filter(it => {
        const hay = normalize(JSON.stringify(it));
        return q.split(" ").filter(Boolean).every(p => hay.includes(p));
      });
      list.innerHTML = "";
      for (const it of filtered) list.appendChild(renderItem(it));
      if (!filtered.length) list.innerHTML = `<div class="muted small" style="padding:12px;">No results.</div>`;
    }

    input.addEventListener("input", apply);
    apply();
  };

  App.initFAQ = async function () {
    await App.initSite();
    const data = await fetchJson("data/faq.json");
    const items = (data.faq || []).slice();

    const input = $("faqSearch");
    const list = $("faqList");

    function render(it) {
      const wrap = document.createElement("div");
      wrap.className = "item";
      wrap.id = it.id || "";
      wrap.innerHTML = `
        <div>
          <h3 style="margin:0 0 6px 0;">${escapeHtml(it.q)}</h3>
          <div class="muted small">${escapeHtml(it.a)}</div>
          <div class="badges">
            ${(it.tags || []).slice(0, 4).map(t => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
            ${it.featured ? `<span class="badge accent">Featured</span>` : ""}
          </div>
        </div>
      `;
      return wrap;
    }

    function apply() {
      const q = normalize(input.value);
      const filtered = !q ? items : items.filter(it => {
        const hay = normalize([it.q, it.a, (it.tags || []).join(" ")].join(" "));
        return q.split(" ").filter(Boolean).every(p => hay.includes(p));
      });
      list.innerHTML = "";
      for (const it of filtered) list.appendChild(render(it));
      if (!filtered.length) list.innerHTML = `<div class="muted small" style="padding:12px;">No results.</div>`;
    }

    input.addEventListener("input", apply);
    apply();
  };

  App.initPost = async function () {
    await App.initSite();
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug") || "welcome";
    const container = $("postBody");
    const mdUrl = `posts/${slug}.md`;
    const { title } = await renderMarkdownInto(container, mdUrl);
    document.title = `${title} — ${document.title}`;
  };

  // Events (same as before)
  function parseISODate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, (m - 1), d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }
  function fmtDate(dateStr) {
    const dt = parseISODate(dateStr);
    return dt.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  }
  function isPaid(e) {
    if (e.price === 0) return false;
    if (typeof e.price === "string" && normalize(e.price) === "free") return false;
    return true;
  }
  function matchesPriceFilter(e, priceFilter) {
    if (!priceFilter) return true;
    if (priceFilter === "free") return !isPaid(e);
    if (priceFilter === "paid") return isPaid(e);
    return true;
  }
  function matchesQueryEvent(e, q) {
    if (!q) return true;
    const hay = [e.title, e.description, e.venue, e.address, e.category, (e.tags || []).join(" ")].join(" ");
    return normalize(hay).includes(normalize(q));
  }
  function eventCard(e) {
    const wrap = document.createElement("div");
    wrap.className = "item";
    const left = document.createElement("div");
    const right = document.createElement("div");
    right.style.display = "grid";
    right.style.placeItems = "center";

    left.innerHTML = `
      <h3>${escapeHtml(e.title)}</h3>
      <div class="meta">
        <span>🗓️ ${escapeHtml(fmtDate(e.date))}</span>
        <span>🕒 ${escapeHtml(e.time || "TBA")}</span>
        <span>📍 ${escapeHtml(e.venue || "TBA")}</span>
      </div>
      <div class="badges">
        <span class="badge accent">${escapeHtml(e.category || "General")}</span>
        <span class="badge purple">${escapeHtml(!isPaid(e) ? "Free" : (typeof e.price === "number" ? `$${e.price} MXN` : "Paid"))}</span>
        ${(e.tags || []).slice(0, 3).map(t => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
        ${e.featured ? `<span class="badge accent">Featured</span>` : ""}
      </div>
      ${e.description ? `<div class="muted small" style="margin-top:8px;">${escapeHtml(e.description.length > 160 ? e.description.slice(0, 160) + "…" : e.description)}</div>` : ""}
    `;
    right.innerHTML = `<a class="btn" href="event.html?id=${encodeURIComponent(e.id)}">Details</a>`;
    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
  }
  function renderEventList(container, events) {
    container.innerHTML = "";
    if (!events.length) {
      container.innerHTML = `<div class="muted small" style="padding:12px;">No events found for selected filters.</div>`;
      return;
    }
    for (const e of events) container.appendChild(eventCard(e));
  }

  App.initEventsPage = async function () {
    await App.initSite();
    const data = await fetchJson("data/events.json");
    const eventsAll = (data.events || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1));

    const q = $("q");
    const from = $("from");
    const to = $("to");
    const category = $("category");
    const price = $("price");
    const out = $("eventsAll");

    const cats = Array.from(new Set(eventsAll.map(e => e.category).filter(Boolean))).sort();
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      category.appendChild(opt);
    }

    function inRange(e) {
      const ev = parseISODate(e.date);
      if (from && from.value) {
        const f = parseISODate(from.value);
        if (ev < f) return false;
      }
      if (to && to.value) {
        const t = parseISODate(to.value);
        if (ev > t) return false;
      }
      return true;
    }

    function apply() {
      const qq = q ? q.value : "";
      const cat = category ? category.value : "";
      const p = price ? price.value : "";

      const filtered = eventsAll.filter(e =>
        inRange(e) &&
        (!cat || e.category === cat) &&
        matchesPriceFilter(e, p) &&
        matchesQueryEvent(e, qq)
      );
      renderEventList(out, filtered);
    }

    [q, from, to, category, price].forEach(el => {
      if (!el) return;
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });

    apply();
  };

  App.initEventDetails = async function () {
    await App.initSite();
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const data = await fetchJson("data/events.json");
    const e = (data.events || []).find(x => String(x.id) === String(id));
    const box = $("eventDetails");
    if (!box) return;
    if (!e) {
      box.innerHTML = `<h1>Event not found</h1><p class="muted">Wrong or missing event id.</p>`;
      return;
    }
    const priceText = (!isPaid(e)) ? "Free" : (typeof e.price === "number" ? `$${e.price} MXN` : "Paid");
    box.innerHTML = `
      <h1 style="margin:0;">${escapeHtml(e.title)}</h1>
      <div class="meta">
        <span>🗓️ ${escapeHtml(fmtDate(e.date))}</span>
        <span>🕒 ${escapeHtml(e.time || "TBA")}</span>
        <span>🏷️ ${escapeHtml(e.category || "General")}</span>
      </div>
      <div class="badges">
        <span class="badge accent">📍 ${escapeHtml(e.venue || "TBA")}</span>
        <span class="badge">🧭 ${escapeHtml(e.address || "Address not provided")}</span>
        <span class="badge purple">💰 ${escapeHtml(priceText)}</span>
        ${e.featured ? `<span class="badge accent">Featured</span>` : ""}
      </div>
      ${e.description ? `<div class="muted" style="margin-top:10px;">${escapeHtml(e.description).replace(/\\n/g, "<br/>")}</div>` : ""}
      <div class="filters" style="margin-top:12px;">
        ${e.contact ? `<div class="muted small">Contact: ${escapeHtml(e.contact)}</div>` : ""}
        ${e.source_url ? `<a class="btn ghost" href="${escapeHtml(e.source_url)}" target="_blank" rel="noreferrer">Source / flyer</a>` : ""}
      </div>
    `;
  };

  window.App = App;
})();