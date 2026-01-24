// Community layer for Events San Cristobal (Supabase)
// v18 — clean module (no duplicate exports)

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// -------------------------
// Config
// -------------------------
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

let supabase = null;
function ensureClient() {
  if (!isConfigured()) return null;
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return supabase;
}

export function isConfigured() {
  const url = String(SUPABASE_URL || "").trim();
  const key = String(SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) return false;

  // Treat placeholder values as not configured (common during setup)
  const placeholderTokens = [
    "YOUR_PROJECT_REF",
    "YOUR_ANON_PUBLIC_KEY",
    "YOUR_",
  ];
  if (placeholderTokens.some((t) => url.includes(t) || key.includes(t))) return false;

  // Basic sanity: URL should look like https://*.supabase.co
  if (!/^https:\/\//i.test(url)) return false;
  return true;
}

function ensureConfiguredOrThrow() {
  if (!isConfigured()) throw new Error("Supabase is not configured. Edit assets/supabase-config.js");
  ensureClient();
}

// -------------------------
// Utils
// -------------------------
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

export function makeContentRef(kind, id) {
  return `${kind}:${id}`;
}

export function getAuthRedirectUrl() {
  // Works for GitHub Pages + most static hosts
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/") + "account.html";
}

// -------------------------
// Auth + Profile
// -------------------------
export async function getUser() {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient().auth.getUser();
  if (error) throw error;
  return data.user || null;
}

export async function getSession() {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient().auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function sendMagicLink(email) {
  ensureConfiguredOrThrow();
  const { error } = await ensureClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function signOut() {
  ensureConfiguredOrThrow();
  const { error } = await ensureClient().auth.signOut();
  if (error) throw error;
}

export async function getMyProfile() {
  ensureConfiguredOrThrow();
  const u = await getUser();
  if (!u) return null;
  const { data, error } = await ensureClient()
    .from("profiles")
    .select("id,email,display_name,phone,role,status,created_at")
    .eq("id", u.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateMyProfile({ display_name, phone }) {
  ensureConfiguredOrThrow();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const payload = {
    display_name: (display_name ?? "").toString().slice(0, 80),
    phone: (phone ?? "").toString().slice(0, 40),
    email: u.email,
  };
  const { error } = await ensureClient().from("profiles").update(payload).eq("id", u.id);
  if (error) throw error;
}

async function requireActiveUser() {
  const p = await getMyProfile();
  if (!p) throw new Error("Profile not found. Open Account page once.");
  if (p.status !== "active") throw new Error("Your account is pending approval.");
  return p;
}

// -------------------------
// Storage (covers)
// -------------------------
export async function uploadMediaImage(file) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();

  const ext = (file.name || "image").split(".").pop() || "jpg";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${prof.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

  const { error: upErr } = await ensureClient()
    .storage
    .from("media")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg" });
  if (upErr) throw upErr;

  const { data } = ensureClient().storage.from("media").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded, but public URL is missing.");
  return data.publicUrl;
}

// -------------------------
// Posts
// -------------------------
export async function createCommunityPost({ title, content_md, cover_url = null, post_type = "story", lang = "en", meta = {} }) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();

  const payload = {
    author_id: prof.id,
    title: (title || "").trim().slice(0, 140),
    content_md: (content_md || "").trim(),
    cover_url: cover_url || null,
    post_type,
    lang,
    status: "pending",
    meta: meta || {},
  };

  const { data, error } = await ensureClient().from("posts").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

export async function listCommunityPosts({ limit = 20, type = null, q = null } = {}) {
  ensureConfiguredOrThrow();
  let query = ensureClient()
    .from("posts")
    .select("id,title,cover_url,post_type,lang,created_at,author_id,profiles:author_id(id,display_name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("post_type", type);
  if (q) {
    const safe = String(q).slice(0, 80).replace(/%/g, "");
    query = query.or(`title.ilike.%${safe}%,content_md.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCommunityPost(id) {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("posts")
    .select("id,title,content_md,cover_url,post_type,lang,meta,created_at,updated_at,author_id,profiles:author_id(id,display_name)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// -------------------------
// Public profile + contributions
// -------------------------
export async function getPublicProfile(profile_id) {
  ensureConfiguredOrThrow();
  const id = String(profile_id || "").trim();
  if (!id) throw new Error("Missing profile id");

  // RLS: anon can read only active profiles
  const { data, error } = await ensureClient()
    .from("profiles")
    .select("id,display_name,created_at,role,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function listApprovedPostsByAuthor(author_id, limit = 30) {
  ensureConfiguredOrThrow();
  const id = String(author_id || "").trim();
  if (!id) return [];
  const { data, error } = await ensureClient()
    .from("posts")
    .select("id,title,cover_url,post_type,lang,created_at")
    .eq("author_id", id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(10, Number(limit) || 30)));
  if (error) throw error;
  return data || [];
}

export async function listApprovedBusinessesByOwner(owner_id, limit = 30) {
  ensureConfiguredOrThrow();
  const id = String(owner_id || "").trim();
  if (!id) return [];
  const { data, error } = await ensureClient()
    .from("business_profiles")
    .select("id,name,category,cover_url,created_at,description_md")
    .eq("owner_id", id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(10, Number(limit) || 30)));
  if (error) throw error;
  return data || [];
}

export async function listApprovedThreadsByAuthor(author_id, limit = 30) {
  ensureConfiguredOrThrow();
  const id = String(author_id || "").trim();
  if (!id) return [];
  const { data, error } = await ensureClient()
    .from("forum_threads")
    .select("id,title,created_at,forum_categories(slug,title)")
    .eq("author_id", id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(10, Number(limit) || 30)));
  if (error) throw error;
  return data || [];
}

// -------------------------
// Comments + ratings
// -------------------------
async function fetchApprovedComments(content_ref) {
  const { data, error } = await ensureClient()
    .from("comments")
    .select("id,author_id,body,created_at,profiles:author_id(id,display_name)")
    .eq("content_ref", content_ref)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

async function fetchApprovedRatings(content_ref) {
  const { data, error } = await ensureClient()
    .from("ratings")
    .select("rating")
    .eq("content_ref", content_ref)
    .eq("status", "approved")
    .limit(500);
  if (error) throw error;
  return data || [];
}

export async function submitComment(content_ref, body) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  const txt = (body || "").trim();
  if (txt.length < 3) throw new Error("Comment is too short.");

  const { error } = await ensureClient()
    .from("comments")
    .insert({ content_ref, author_id: prof.id, body: txt, status: "pending" });
  if (error) throw error;
}

export async function upsertMyRating(content_ref, rating) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  const n = Number(rating);
  if (!(n >= 1 && n <= 5)) throw new Error("Rating must be 1–5.");

  // Use upsert on (content_ref, author_id)
  const { error } = await ensureClient()
    .from("ratings")
    .upsert({ content_ref, author_id: prof.id, rating: n, status: "pending" }, { onConflict: "content_ref,author_id" });
  if (error) throw error;
}

// -------------------------
// Modal helpers (v20)
// -------------------------
function isElement(x) {
  return !!(x && typeof x === "object" && x.nodeType === 1);
}

function buildModalShell() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title" id="modalTitle">Modal</div>
        <button class="icon-btn" id="modalClose" aria-label="Close">✕</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
      <div class="modal-actions" id="modalActions"></div>
    </div>
  `;
  return overlay;
}

export async function openReportModal({
  title = "Report",
  targetLabel = "this content",
  reasons = [
    "Spam / advertising",
    "Scam / fraud",
    "Hate / harassment",
    "Adult / sexual",
    "Violence",
    "Wrong info",
    "Other",
  ],
} = {}) {
  return new Promise((resolve) => {
    const overlay = buildModalShell();
    const modal = overlay.querySelector(".modal");
    const titleEl = overlay.querySelector("#modalTitle");
    const bodyEl = overlay.querySelector("#modalBody");
    const actionsEl = overlay.querySelector("#modalActions");
    const closeBtn = overlay.querySelector("#modalClose");

    titleEl.textContent = title;
    bodyEl.innerHTML = `
      <p class="muted" style="margin-top:0;">Report ${escapeHtml(targetLabel)}. This is reviewed manually.</p>
      <label class="label" for="reportReason">Reason</label>
      <select class="input" id="reportReason">
        <option value="">Select…</option>
        ${reasons.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}
      </select>
      <label class="label" for="reportDetails" style="margin-top:10px;">Details (optional)</label>
      <textarea class="input" id="reportDetails" rows="4" placeholder="Links, context, why it matters…"></textarea>
      <div class="muted small" style="margin-top:8px;">Tip: include a link (Google Maps / Instagram) if it helps.</div>
    `;

    actionsEl.innerHTML = `
      <button class="btn ghost" type="button" id="reportCancel">Cancel</button>
      <button class="btn" type="button" id="reportSubmit" disabled>Submit</button>
    `;

    const reasonEl = overlay.querySelector("#reportReason");
    const detailsEl = overlay.querySelector("#reportDetails");
    const cancelBtn = overlay.querySelector("#reportCancel");
    const submitBtn = overlay.querySelector("#reportSubmit");

    const cleanup = () => {
      document.body.classList.remove("modal-open");
      overlay.remove();
    };

    const doResolve = (value) => {
      cleanup();
      resolve(value);
    };

    const update = () => {
      const ok = (reasonEl.value || "").trim().length >= 3;
      submitBtn.disabled = !ok;
    };

    reasonEl.addEventListener("change", update);
    detailsEl.addEventListener("input", update);

    cancelBtn.addEventListener("click", () => doResolve(null));
    closeBtn.addEventListener("click", () => doResolve(null));

    submitBtn.addEventListener("click", () => {
      const reason = (reasonEl.value || "").trim().slice(0, 120);
      const details = (detailsEl.value || "").trim().slice(0, 1000);
      if (!reason) return;
      doResolve({ reason, details });
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) doResolve(null);
    });

    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") doResolve(null);
      },
      { once: true }
    );

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    // Focus first field
    setTimeout(() => {
      reasonEl.focus();
      update();
    }, 0);
  });
}

export async function initCommentsWidget(containerOrOpts, contentRefMaybe) {
  // Backwards-compatible signature:
  //   initCommentsWidget(mountEl, content_ref)
  //   initCommentsWidget({ mountEl|mountId, content_ref, title })
  const opts =
    !isElement(containerOrOpts) &&
    containerOrOpts &&
    typeof containerOrOpts === "object" &&
    !Array.isArray(containerOrOpts)
      ? containerOrOpts
      : null;

  const el = opts
    ? opts.mountEl || (opts.mountId ? document.getElementById(opts.mountId) : null)
    : typeof containerOrOpts === "string"
      ? document.querySelector(containerOrOpts)
      : containerOrOpts;

  const content_ref = String(opts?.content_ref || contentRefMaybe || "").trim();
  const title = String(opts?.title || "Community").trim() || "Community";

  if (!el) return;
  if (!content_ref) {
    el.innerHTML = `<div class="notice"><div class="notice-title">Community widget</div><div class="notice-body">Missing content reference.</div></div>`;
    return;
  }

  if (!isConfigured()) {
    el.innerHTML = `
      <div class="notice">
        <div class="notice-title">Community features are disabled</div>
        <div class="notice-body">
          Connect Supabase to enable comments, ratings, and user posts.
          <div style="margin-top:8px;">Edit <span class="kbd">assets/supabase-config.js</span> and follow <span class="kbd">CONTENT_GUIDE.md</span> → “Community mode”.</div>
        </div>
      </div>
    `;
    return;
  }
  ensureClient();

  el.innerHTML = `
    <div class="community">
      <div class="row2">
        <div>
          <h3 class="k">${escapeHtml(title)}</h3>
          <div class="sub" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><span>Comments & ratings (moderated)</span><button class="link-btn" id="reportContentBtn" type="button" title="Report this content">Report</button></div>
        </div>
        <div>
          <div class="mini"><span id="ratingAvg">–</span> <span id="ratingCount"></span></div>
          <div class="stars" id="ratingControls" aria-label="Rating">
            <button class="star" data-star="1" aria-label="Rate 1">★</button>
            <button class="star" data-star="2" aria-label="Rate 2">★</button>
            <button class="star" data-star="3" aria-label="Rate 3">★</button>
            <button class="star" data-star="4" aria-label="Rate 4">★</button>
            <button class="star" data-star="5" aria-label="Rate 5">★</button>
          </div>
        </div>
      </div>

      <div style="margin-top:10px;">
        <textarea class="input" id="commentBody" rows="3" placeholder="Write a comment (requires approval)…"></textarea>
        <div class="filters" style="margin-top:10px; gap:10px;">
          <button class="btn" id="commentSendBtn" type="button">Send</button>
          <span class="muted small" id="commentHint"></span>
        </div>
      </div>

      <div class="divider" style="margin:14px 0;"></div>
      <div id="commentsList"></div>
    </div>
  `;

  const commentBody = el.querySelector("#commentBody");
  const commentSendBtn = el.querySelector("#commentSendBtn");
  const commentHint = el.querySelector("#commentHint");
  const commentsList = el.querySelector("#commentsList");
  const ratingAvg = el.querySelector("#ratingAvg");
  const ratingCount = el.querySelector("#ratingCount");
  const ratingControls = el.querySelector("#ratingControls");

  const prof = await getMyProfile().catch(() => null);
  const canReport = Boolean(prof && prof.status === "active");

  const renderComments = async () => {
    const items = await fetchApprovedComments(content_ref);
    commentsList.innerHTML = items.length
      ? items
          .map((c) => {
            const display = escapeHtml(c.profiles?.display_name || "Anonymous");
            const pid = c.profiles?.id || c.author_id;
            const name = pid ? `<a class="u-link" href="user.html?id=${encodeURIComponent(pid)}">${display}</a>` : display;
            const date = new Date(c.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
            return `
              <div class="comment">
                <div class="meta">${name} • ${escapeHtml(date)}</div>
                <div>${escapeHtml(c.body)}</div>
                ${canReport ? `<div class="comment-actions"><button class="link-btn" type="button" data-report-ref="comment:${c.id}">Report</button></div>` : ``}
              </div>
            `;
          })
          .join("")
      : `<div class="muted">No comments yet.</div>`;
  };

  const renderRatings = async () => {
    const rows = await fetchApprovedRatings(content_ref);
    if (!rows.length) {
      ratingAvg.textContent = "–";
      ratingCount.textContent = "";
      return;
    }
    const sum = rows.reduce((a, r) => a + Number(r.rating || 0), 0);
    const avg = sum / rows.length;
    ratingAvg.textContent = avg.toFixed(1);
    ratingCount.textContent = `(${rows.length})`;
  };

  await Promise.all([renderComments(), renderRatings()]);

  const reportContentBtn = el.querySelector("#reportContentBtn");
  if (reportContentBtn) {
    reportContentBtn.addEventListener("click", async () => {
      try {
        if (!canReport) return alert("You need an approved account to report content.");
        const p = await openReportModal({ title: "Report", targetLabel: "this page" });
        if (!p) return;
        await submitReport(content_ref, p.reason, p.details);
        alert("Report submitted. Thanks — we will review it.");
      } catch (e) {
        alert(e?.message || "Could not submit report");
      }
    });
  }

  commentsList?.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.("[data-report-ref]");
    if (!btn) return;
    try {
      if (!canReport) return alert("You need an approved account to report content.");
      const ref = btn.getAttribute("data-report-ref");
      const p = await openReportModal({ title: "Report", targetLabel: "this comment" });
      if (!p) return;
      await submitReport(ref, p.reason, p.details);
      alert("Report submitted. Thanks — we will review it.");
    } catch (err) {
      alert(err?.message || "Could not submit report");
    }
  });

  const markStars = (n) => {
    ratingControls.querySelectorAll(".star").forEach((b) => {
      const s = Number(b.getAttribute("data-star"));
      b.classList.toggle("active", s <= n);
    });
  };

  if (!prof) {
    commentHint.innerHTML = `Please <a href="account.html">sign in</a> to comment.`;
  } else if (prof.status !== "active") {
    commentHint.textContent = "Your account is pending approval.";
  } else {
    commentHint.textContent = "Your comment & rating will appear after approval.";
  }

  commentSendBtn?.addEventListener("click", async () => {
    try {
      const txt = (commentBody?.value || "").trim();
      if (txt.length < 3) return;
      await submitComment(content_ref, txt);
      commentBody.value = "";
      commentHint.textContent = "Sent for review. Thanks!";
    } catch (e) {
      commentHint.textContent = e?.message || "Could not send.";
    }
  });

  ratingControls?.addEventListener("click", async (e) => {
    const b = e.target?.closest?.("button.star");
    if (!b) return;
    const n = Number(b.getAttribute("data-star"));
    try {
      await upsertMyRating(content_ref, n);
      markStars(n);
      commentHint.textContent = "Rating sent for review.";
    } catch (err) {
      commentHint.textContent = err?.message || "Rating failed.";
    }
  });
}

// -------------------------
// Businesses
// -------------------------
export async function submitBusinessProfile(payload) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();

  const clean = {
    owner_id: prof.id,
    name: (payload?.name || "").trim().slice(0, 120),
    category: (payload?.category || "other").trim().slice(0, 40),
    description_md: (payload?.description_md || "").trim(),
    cover_url: payload?.cover_url || null,
    address: (payload?.address || "").trim().slice(0, 140),
    phone: (payload?.phone || "").trim().slice(0, 40),
    website: (payload?.website || "").trim().slice(0, 140),
    instagram: (payload?.instagram || "").trim().slice(0, 80),
    tags: Array.isArray(payload?.tags) ? payload.tags.slice(0, 12).map(t=>String(t).slice(0,30)) : [],
    status: "pending",
  };

  if (!clean.name) throw new Error("Business name is required.");

  const { data, error } = await ensureClient().from("business_profiles").insert(clean).select("id").single();
  if (error) throw error;
  return data;
}

export async function listBusinesses({ q = null, category = null, limit = 30, sort = "newest" } = {}) {
  ensureConfiguredOrThrow();

  const hardLimit = Math.max(30, Math.min(Number(limit) || 30, 200));
  let query = ensureClient()
    .from("business_profiles")
    .select("id,name,category,cover_url,created_at,description_md")
    .eq("status", "approved")
    .limit(sort === "top" ? Math.max(hardLimit, 120) : hardLimit);

  if (category) query = query.eq("category", category);

  if (q) {
    const safe = String(q).slice(0, 80).replace(/%/g, "");
    query = query.or(`name.ilike.%${safe}%,description_md.ilike.%${safe}%`);
  }

  if (sort === "az") query = query.order("name", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data || []).map((x) => ({ ...x }));

  // Attach rating summary (optional, depends on v19 SQL view)
  try {
    const { data: sums } = await ensureClient()
      .from("business_rating_summary")
      .select("business_id,avg_rating,rating_count")
      .limit(2000);

    const map = new Map((sums || []).map((s) => [s.business_id, s]));
    rows.forEach((b) => {
      const s = map.get(b.id);
      b.avg_rating = s?.avg_rating ?? null;
      b.rating_count = s?.rating_count ?? 0;
    });

    if (sort === "top") {
      rows.sort((a, b) => {
        const ar = Number(a.avg_rating || 0);
        const br = Number(b.avg_rating || 0);
        if (br !== ar) return br - ar;
        const ac = Number(a.rating_count || 0);
        const bc = Number(b.rating_count || 0);
        if (bc !== ac) return bc - ac;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
  } catch (_) {
    // If the view isn't installed yet, ignore.
  }

  return rows.slice(0, hardLimit);
}

export async function getBusiness(id) {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("business_profiles")
    .select("id,name,category,description_md,cover_url,address,phone,website,instagram,tags,created_at,profiles(display_name)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// -------------------------
// Forum
// -------------------------
export async function listForumCategories() {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("forum_categories")
    .select("id,slug,title,description,sort")
    .eq("status", "approved")
    .order("sort", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listForumThreads(category_id, { q = null, limit = 40 } = {}) {
  ensureConfiguredOrThrow();
  let query = ensureClient()
    .from("forum_threads")
    .select("id,category_id,title,created_at,profiles(display_name)")
    .eq("status", "approved")
    .eq("category_id", category_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const safe = String(q).slice(0, 80).replace(/%/g, "");
    query = query.or(`title.ilike.%${safe}%,body_md.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getForumThread(id) {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("forum_threads")
    .select("id,category_id,title,body_md,created_at,profiles(display_name),forum_categories(title,slug)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function listForumReplies(thread_id, { limit = 200 } = {}) {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("forum_replies")
    .select("id,body,created_at,profiles(display_name)")
    .eq("thread_id", thread_id)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function submitForumThread({ category_id, title, body_md }) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();

  const payload = {
    category_id,
    author_id: prof.id,
    title: (title || "").trim().slice(0, 140),
    body_md: (body_md || "").trim(),
    status: "pending",
  };

  if (!payload.title) throw new Error("Title is required.");
  if (!payload.body_md || payload.body_md.length < 10) throw new Error("Please write at least a short message.");

  const { data, error } = await ensureClient().from("forum_threads").insert(payload).select("id").single();
  if (error) throw error;
  return data;
}

export async function submitForumReply({ thread_id, body }) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();

  const txt = (body || "").trim();
  if (txt.length < 2) throw new Error("Reply is too short.");

  const { error } = await ensureClient()
    .from("forum_replies")
    .insert({ thread_id, author_id: prof.id, body: txt, status: "pending" });
  if (error) throw error;
}

// -------------------------
// Admin moderation
// -------------------------
export async function adminListPending() {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  if (!prof || !["owner", "staff"].includes(prof.role)) throw new Error("No access");

  const reqs = await Promise.all([
    ensureClient().from("profiles").select("id,email,display_name,phone,role,status,created_at").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("posts").select("id,title,post_type,status,created_at,profiles(display_name)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("comments").select("id,content_ref,body,status,created_at,profiles(display_name)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("ratings").select("id,content_ref,rating,status,created_at,profiles(display_name)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("business_profiles").select("id,name,category,description_md,status,created_at,profiles(display_name)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("forum_threads").select("id,title,body_md,category_id,status,created_at,profiles(display_name),forum_categories(title,slug)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("forum_replies").select("id,thread_id,body,status,created_at,profiles(display_name),forum_threads(title,id)").eq("status", "pending").order("created_at", { ascending: true }),
    ensureClient().from("reports").select("id,content_ref,reason,details,status,created_at,profiles(display_name,email)").eq("status", "pending").order("created_at", { ascending: true }),
  ]);

  const pick = (r) => {
    if (r.error) throw r.error;
    return r.data || [];
  };

  return {
    profiles: pick(reqs[0]),
    posts: pick(reqs[1]),
    comments: pick(reqs[2]),
    ratings: pick(reqs[3]),
    businesses: pick(reqs[4]),
    forum_threads: pick(reqs[5]),
    forum_replies: pick(reqs[6]),
    reports: pick(reqs[7]),
  };
}

async function adminSetStatus(table, id, status) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  if (!prof || !["owner", "staff"].includes(prof.role)) throw new Error("No access");
  const { error } = await ensureClient().from(table).update({ status }).eq("id", id);
  if (error) throw error;
}

export const adminApproveProfile = (id) => adminSetStatus("profiles", id, "active");
export const adminRejectProfile = (id) => adminSetStatus("profiles", id, "rejected");

export const adminApprovePost = (id) => adminSetStatus("posts", id, "approved");
export const adminRejectPost = (id) => adminSetStatus("posts", id, "rejected");

export const adminApproveComment = (id) => adminSetStatus("comments", id, "approved");
export const adminRejectComment = (id) => adminSetStatus("comments", id, "rejected");

export const adminApproveRating = (id) => adminSetStatus("ratings", id, "approved");
export const adminRejectRating = (id) => adminSetStatus("ratings", id, "rejected");

export const adminApproveBusiness = (id) => adminSetStatus("business_profiles", id, "approved");
export const adminRejectBusiness = (id) => adminSetStatus("business_profiles", id, "rejected");

export const adminApproveForumThread = (id) => adminSetStatus("forum_threads", id, "approved");
export const adminRejectForumThread = (id) => adminSetStatus("forum_threads", id, "rejected");

export const adminApproveForumReply = (id) => adminSetStatus("forum_replies", id, "approved");
export const adminRejectForumReply = (id) => adminSetStatus("forum_replies", id, "rejected");

// -------------------------
// Extras (v18)
// -------------------------
export async function listRecentForumThreads({ q = null, limit = 20 } = {}) {
  ensureConfiguredOrThrow();
  let query = ensureClient()
    .from("forum_threads")
    .select("id,title,created_at,forum_categories(slug,title),profiles(display_name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const safe = String(q).slice(0, 80).replace(/%/g, "");
    query = query.or(`title.ilike.%${safe}%,body_md.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getForumCategoryBySlug(slug) {
  ensureConfiguredOrThrow();
  const { data, error } = await ensureClient()
    .from("forum_categories")
    .select("id,slug,title,description,sort")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// -------------------------
// Reports (v19)
// -------------------------
export async function submitReport(content_ref, reason, details = "") {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  const r = String(reason || "").trim().slice(0, 120);
  const d = String(details || "").trim().slice(0, 1000);
  if (r.length < 3) throw new Error("Please write a short reason (3+ chars).");

  const { error } = await ensureClient()
    .from("reports")
    .insert({ reporter_id: prof.id, content_ref, reason: r, details: d, status: "pending" });
  if (error) throw error;
}

export async function adminApproveReport(id) {
  return adminSetReportStatus(id, "handled");
}
export async function adminRejectReport(id) {
  return adminSetReportStatus(id, "rejected");
}

async function adminSetReportStatus(id, status) {
  ensureConfiguredOrThrow();
  const prof = await requireActiveUser();
  if (!prof || !["owner", "staff"].includes(prof.role)) throw new Error("No access");
  const patch = { status };
  if (status !== "pending") patch.handled_at = new Date().toISOString();
  const { error } = await ensureClient().from("reports").update(patch).eq("id", id);
  if (error) throw error;
}

// -------------------------
// My dashboard (v19)
// -------------------------
export async function listMyDashboard() {
  ensureConfiguredOrThrow();
  const user = await getUser().catch(() => null);
  if (!user) return null;
  const prof = await getMyProfile().catch(() => null);
  if (!prof) return null;

  const reqs = await Promise.all([
    ensureClient().from("posts").select("id,title,post_type,status,created_at").eq("author_id", prof.id).order("created_at", { ascending: false }).limit(50),
    ensureClient().from("business_profiles").select("id,name,category,status,created_at").eq("owner_id", prof.id).order("created_at", { ascending: false }).limit(50),
    ensureClient().from("forum_threads").select("id,title,status,created_at,forum_categories(slug,title)").eq("author_id", prof.id).order("created_at", { ascending: false }).limit(50),
    ensureClient().from("forum_replies").select("id,thread_id,body,status,created_at,forum_threads(id,title)").eq("author_id", prof.id).order("created_at", { ascending: false }).limit(50),
    ensureClient().from("reports").select("id,content_ref,reason,status,created_at").eq("reporter_id", prof.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const pick = (r) => {
    if (r.error) throw r.error;
    return r.data || [];
  };

  return {
    profile: prof,
    posts: pick(reqs[0]),
    businesses: pick(reqs[1]),
    threads: pick(reqs[2]),
    replies: pick(reqs[3]),
    reports: pick(reqs[4]),
  };
}
