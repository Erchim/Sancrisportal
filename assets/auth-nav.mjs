import { isConfigured, getUser, getMyProfile, signOut } from "./community.mjs?v=20.0";

function ensureLink(nav, href, text, { id = null, afterHref = null } = {}) {
  if (!nav) return null;
  if (id && nav.querySelector(`#${id}`)) return nav.querySelector(`#${id}`);
  const existing = [...nav.querySelectorAll("a")].find((a) => a.getAttribute("href") === href);
  if (existing) return existing;

  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  if (id) a.id = id;

  if (afterHref) {
    const after = [...nav.querySelectorAll("a")].find((x) => x.getAttribute("href") === afterHref);
    if (after && after.parentElement === nav) {
      after.insertAdjacentElement("afterend", a);
      return a;
    }
  }

  nav.appendChild(a);
  return a;
}

async function init() {
  const nav = document.getElementById("siteNav");
  if (!nav) return;

  // Always-present links (work even if Supabase isn't configured)
  // Place them after FAQ if possible.
  ensureLink(nav, "community.html", "Community", { afterHref: "faq.html" });
  ensureLink(nav, "forum.html", "Forum", { afterHref: "community.html" });
  ensureLink(nav, "businesses.html", "Businesses", { afterHref: "forum.html" });
  ensureLink(nav, "account.html", "Account", { afterHref: "businesses.html" });

  if (!isConfigured()) return;

  const user = await getUser().catch(() => null);
  const profile = user ? await getMyProfile().catch(() => null) : null;

  // Creation links (keep "Submit" page as a hub, but also add direct actions)
  ensureLink(nav, "submit-post.html", "Submit a post", { afterHref: "submit.html" });
  ensureLink(nav, "submit-thread.html", "Start a topic", { afterHref: "submit-post.html" });
  ensureLink(nav, "submit-business.html", "Add a business", { afterHref: "submit-thread.html" });

  if (profile && (profile.role === "owner" || profile.role === "staff")) {
    ensureLink(nav, "admin.html", "Admin");
  }

  // Logout (only meaningful when configured)
  const logout = ensureLink(nav, "#", "Log out", { id: "logoutLink" });
  if (logout) {
    logout.addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut();
      window.location.href = "index.html";
    });
  }
}

init();
