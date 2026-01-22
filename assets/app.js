(function () {
  const App = {};

  const $ = (id) => document.getElementById(id);

  function isoNowDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

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

  function withinDays(eventDateISO, daysAhead) {
    const start = isoNowDate();
    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);
    const ev = parseISODate(eventDateISO);
    return ev >= start && ev <= end;
  }

  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load: ${url}`);
    return await res.json();
  }

  function setYear() {
    const y = new Date().getFullYear();
    const el = $("year");
    if (el) el.textContent = String(y);
  }

  function buildCategoryOptions(selectEl, events) {
    const cats = Array.from(new Set(events.map(e => e.category).filter(Boolean))).sort();
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      selectEl.appendChild(opt);
    }
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

  function matchesQuery(e, q) {
    if (!q) return true;
    const hay = [
      e.title, e.description, e.venue, e.address, e.category, (e.tags || []).join(" ")
    ].join(" ");
    return normalize(hay).includes(normalize(q));
  }

  function eventCard(e) {
    const right = document.createElement("div");
    right.style.display = "grid";
    right.style.placeItems = "center";
    right.style.gap = "10px";

    const link = document.createElement("a");
    link.className = "btn";
    link.href = `event.html?id=${encodeURIComponent(e.id)}`;
    link.textContent = "Details";

    right.appendChild(link);

    const wrap = document.createElement("div");
    wrap.className = "item";

    const left = document.createElement("div");

    const h3 = document.createElement("h3");
    h3.textContent = e.title;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <span>🗓️ ${fmtDate(e.date)}</span>
      <span>🕒 ${e.time || "TBA"}</span>
      <span>📍 ${e.venue || "TBA"}</span>
    `;

    const badges = document.createElement("div");
    badges.className = "badges";

    const b1 = document.createElement("span");
    b1.className = "badge accent";
    b1.textContent = e.category || "General";
    badges.appendChild(b1);

    const b2 = document.createElement("span");
    b2.className = "badge purple";
    b2.textContent = (!isPaid(e)) ? "Free" : (typeof e.price === "number" ? `$${e.price} MXN` : "Paid");
    badges.appendChild(b2);

    if (Array.isArray(e.tags)) {
      for (const t of e.tags.slice(0, 3)) {
        const bt = document.createElement("span");
        bt.className = "badge";
        bt.textContent = t;
        badges.appendChild(bt);
      }
    }

    const p = document.createElement("div");
    p.className = "muted small";
    p.textContent = e.description ? (e.description.length > 160 ? e.description.slice(0, 160) + "…" : e.description) : "";

    left.appendChild(h3);
    left.appendChild(meta);
    left.appendChild(badges);
    if (p.textContent) left.appendChild(p);

    wrap.appendChild(left);
    wrap.appendChild(right);
    return wrap;
  }

  function renderList(container, events) {
    container.innerHTML = "";
    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "12px";
      empty.textContent = "No events found for selected filters.";
      container.appendChild(empty);
      return;
    }
    for (const e of events) container.appendChild(eventCard(e));
  }

  App.initHome = async function ({ eventsUrl, daysAhead, submitUrl, communityUrl }) {
    setYear();

    const submitLink = $("submitLink");
    if (submitLink && submitUrl) submitLink.href = submitUrl;

    const communityLink = $("communityLink");
    if (communityLink && communityUrl) communityLink.href = communityUrl;

    const data = await fetchJson(eventsUrl);
    const events = (data.events || []).slice()
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .filter(e => withinDays(e.date, daysAhead));

    const catSel = $("categoryFilter");
    if (catSel) buildCategoryOptions(catSel, data.events || []);

    const list = $("eventsList");
    const priceSel = $("priceFilter");

    function apply() {
      const cat = catSel ? catSel.value : "";
      const price = priceSel ? priceSel.value : "";
      const filtered = events.filter(e =>
        (!cat || e.category === cat) &&
        matchesPriceFilter(e, price)
      );
      renderList(list, filtered);
    }

    if (catSel) catSel.addEventListener("change", apply);
    if (priceSel) priceSel.addEventListener("change", apply);

    apply();
  };

  App.initEventsPage = async function ({ eventsUrl }) {
    setYear();
    const data = await fetchJson(eventsUrl);
    const eventsAll = (data.events || []).slice().sort((a, b) => (a.date > b.date ? 1 : -1));

    const q = $("q");
    const from = $("from");
    const to = $("to");
    const category = $("category");
    const price = $("price");
    const out = $("eventsAll");

    if (category) buildCategoryOptions(category, eventsAll);

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
        matchesQuery(e, qq)
      );
      renderList(out, filtered);
    }

    [q, from, to, category, price].forEach(el => {
      if (!el) return;
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });

    apply();
  };

  App.initEventDetails = async function ({ eventsUrl }) {
    setYear();
    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const data = await fetchJson(eventsUrl);
    const events = data.events || [];
    const e = events.find(x => String(x.id) === String(id));

    const box = $("eventDetails");
    if (!box) return;

    if (!e) {
      box.innerHTML = `<h1>Event not found</h1><p class="muted">Wrong or missing event id.</p>`;
      return;
    }

    document.title = `${e.title} — Events San Cristóbal`;

    const priceText = (!isPaid(e)) ? "Free" : (typeof e.price === "number" ? `$${e.price} MXN` : "Paid");

    box.innerHTML = `
      <h1 style="margin:0;">${escapeHtml(e.title)}</h1>
      <div class="meta">
        <span>🗓️ ${fmtDate(e.date)}</span>
        <span>🕒 ${escapeHtml(e.time || "TBA")}</span>
        <span>🏷️ ${escapeHtml(e.category || "General")}</span>
      </div>
      <div class="badges">
        <span class="badge accent">📍 ${escapeHtml(e.venue || "TBA")}</span>
        <span class="badge">🧭 ${escapeHtml(e.address || "Address not provided")}</span>
        <span class="badge purple">💰 ${escapeHtml(priceText)}</span>
      </div>
      ${e.description ? `<div class="muted">${escapeHtml(e.description).replace(/\n/g, "<br/>")}</div>` : ""}
      <div class="stack" style="padding:0; margin-top:8px;">
        ${e.contact ? `<div class="muted small">Contact: ${escapeHtml(e.contact)}</div>` : ""}
        ${e.source_url ? `<a class="btn ghost" href="${escapeAttr(e.source_url)}" target="_blank" rel="noreferrer">Source / flyer</a>` : ""}
      </div>
    `;
  };

  App.initBlogList = async function ({ blogUrl }) {
    setYear();
    const data = await fetchJson(blogUrl);
    const posts = (data.posts || []).slice().sort((a, b) => (a.date > b.date ? -1 : 1));

    const out = $("blogList");
    out.innerHTML = "";

    if (!posts.length) {
      out.innerHTML = `<div class="muted small" style="padding:12px;">No posts yet.</div>`;
      return;
    }

    for (const p of posts) {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div>
          <h3 style="margin:0 0 4px 0;">${escapeHtml(p.title)}</h3>
          <div class="meta">
            <span>🗓️ ${escapeHtml(p.date)}</span>
            <span>🏷️ ${escapeHtml(p.category || "Guide")}</span>
          </div>
          <div class="muted small" style="margin-top:8px;">${escapeHtml(p.excerpt || "")}</div>
        </div>
        <div style="display:grid; place-items:center;">
          <a class="btn" href="post.html?slug=${encodeURIComponent(p.slug)}">Read</a>
        </div>
      `;
      out.appendChild(el);
    }
  };

  App.initPost = async function ({ defaultPost }) {
    setYear();
    const params = new URLSearchParams(location.search);
    const slug = params.get("slug") || defaultPost;

    const url = `posts/${slug}.md`;
    const res = await fetch(url, { cache: "no-store" });
    const body = $("postBody");

    if (!res.ok) {
      document.title = `Post not found — Events San Cristóbal`;
      body.innerHTML = `<h1>Post not found</h1><p class="muted">Missing file: <code>${escapeHtml(url)}</code></p>`;
      return;
    }

    const md = await res.text();
    const html = window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`;
    body.innerHTML = html;

    const h1 = body.querySelector("h1");
    if (h1) document.title = `${h1.textContent} — Events San Cristóbal`;
  };

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[m]));
  }
  function escapeAttr(str) {
    return String(str ?? "").replace(/"/g, "&quot;");
  }

  window.App = App;
})();