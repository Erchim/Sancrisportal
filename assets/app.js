(function(){const App={};const $=(id)=>document.getElementById(id);
async function fetchJson(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(url);return r.json();}
async function fetchText(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)return"";return r.text();}
const norm=(s)=>String(s||"").toLowerCase().replace(/\s+/g," ").trim();
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function setActiveNav(){const p=location.pathname.split("/").pop()||"index.html";document.querySelectorAll(".nav-panel a").forEach(a=>{if(a.getAttribute("href")===p)a.classList.add("active");});}
function setYear(){const y=$("year");if(y)y.textContent=String(new Date().getFullYear());}


function initMenu(){
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("siteNav");
  if(!btn || !nav) return;

  function close(){
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
  }
  function open(){
    nav.classList.add("open");
    btn.setAttribute("aria-expanded","true");
  }

  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    nav.classList.contains("open") ? close() : open();
  });

  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>close()));

  document.addEventListener("click", (e)=>{
    if(!nav.classList.contains("open")) return;
    if(nav.contains(e.target) || btn.contains(e.target)) return;
    close();
  });

  document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape") close();
  });
}

function initHeaderSearch(){
  const btn = document.getElementById("searchBtn");
  const panel = document.getElementById("searchPanel");
  const input = document.getElementById("headerSearchInput");
  if(!btn || !panel || !input) return;

  function close(){
    panel.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
  }
  function open(){
    panel.classList.add("open");
    btn.setAttribute("aria-expanded","true");
    setTimeout(()=>input.focus(), 50);
  }

  btn.addEventListener("click",(e)=>{
    e.preventDefault();
    panel.classList.contains("open") ? close() : open();
  });

  // close on outside click
  document.addEventListener("click",(e)=>{
    if(!panel.classList.contains("open")) return;
    if(panel.contains(e.target) || btn.contains(e.target)) return;
    close();
  });

  // ESC closes
  document.addEventListener("keydown",(e)=>{
    if(e.key==="Escape") close();
  });

  // If user presses Enter in the input while the panel is open, let the form submit normally
}


async function site(){try{return await fetchJson("data/site.json");}catch{return{};}}
function applyBrand(s){document.querySelectorAll("[data-site-title]").forEach(el=>el.textContent=s.short_title||s.site_title||"Portal");
document.querySelectorAll("[data-site-sub]").forEach(el=>el.textContent=(s.tagline||"Events • Guides • Tips"));
if(s.site_title)document.title=document.title.replace("{{SITE_TITLE}}",s.site_title);}
const Search={ready:false,items:[],async build(){if(this.ready)return;
const [A,P,F,H,R,M,E]=await Promise.all([fetchJson("data/articles.json"),fetchJson("data/places.json"),fetchJson("data/faq.json"),fetchJson("data/hotels.json"),fetchJson("data/restaurants.json"),fetchJson("data/music.json"),fetchJson("data/events.json")]);
const items=[];
for(const a of (A.articles||[])){const md=await fetchText(`posts/${a.slug}.md`);items.push({type:"Article",title:a.title,url:`post.html?slug=${encodeURIComponent(a.slug)}`,cover:a.cover||"assets/images/cover_default.jpg",text:norm([a.title,a.excerpt,a.description,a.category,(a.tags||[]).join(" "),md].join(" ")),featured:!!a.featured,priority:+(a.priority||0),snippet:(a.category||"Life"),snippet_long:(a.excerpt||a.description||"")});}
for(const p of (P.places||[])){const md=await fetchText(`posts/${p.slug}.md`);items.push({type:"Place",title:p.title,url:`post.html?slug=${encodeURIComponent(p.slug)}`,cover:p.cover||"assets/images/cover_default.jpg",text:norm([p.title,p.excerpt,p.description,p.distance,p.category,(p.tags||[]).join(" "),md].join(" ")),featured:!!p.featured,priority:+(p.priority||0),snippet:[p.distance,p.category].filter(Boolean).join(" • ")||"Nature",snippet_long:(p.excerpt||p.description||"")});}
for(const f of (F.faq||[])){items.push({type:"FAQ",title:f.q,url:`faq.html#${encodeURIComponent(f.id||"")}`,cover:"assets/images/cover_default.jpg",text:norm([f.q,f.a,(f.tags||[]).join(" ")].join(" ")),featured:!!f.featured,priority:+(f.priority||0),snippet:(f.a||"").slice(0,140)});}
for(const h of (H.hotels||[])){items.push({type:"Hotel",title:h.name,url:`item.html?type=hotels&id=${encodeURIComponent(h.id||"")}`,cover:h.cover||"assets/images/cover_default.jpg",text:norm([h.name,h.type,h.price,h.area,h.description,h.address,(h.tags||[]).join(" ")].join(" ")),featured:!!h.featured,priority:+(h.priority||0),snippet:[h.area,h.price].filter(Boolean).join(" • ")||"Hotel",snippet_long:(h.description||"")});}
for(const r of (R.restaurants||[])){items.push({type:"Restaurant",title:r.name,url:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`,cover:r.cover||"assets/images/cover_default.jpg",text:norm([r.name,r.type,r.price,r.area,r.description,r.address,(r.tags||[]).join(" ")].join(" ")),featured:!!r.featured,priority:+(r.priority||0),snippet:[r.type,r.price,r.area].filter(Boolean).join(" • ")||"Food",snippet_long:(r.description||"")});}
for(const m of (M.music||[])){items.push({type:"Music",title:m.place,url:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`,cover:m.cover||"assets/images/cover_default.jpg",text:norm([m.place,m.genre,m.description,m.address,(m.tags||[]).join(" ")].join(" ")),featured:!!m.featured,priority:+(m.priority||0),snippet:[m.genre,m.best_day].filter(Boolean).join(" • ")||"Music",snippet_long:(m.description||"")});}
for(const e of (E.events||[])){items.push({type:"Event",title:e.title,url:`event.html?id=${encodeURIComponent(e.id)}`,cover:e.cover||"assets/images/cover_default.jpg",text:norm([e.title,e.description,e.category,e.venue,e.address,e.date,e.time,(e.tags||[]).join(" ")].join(" ")),featured:!!e.featured,priority:+(e.priority||0),snippet:`${e.date} • ${e.time||"TBA"} • ${e.venue||""}`});}
items.sort((a,b)=>(b.featured-a.featured)||(b.priority-a.priority)||a.title.localeCompare(b.title));
this.items=items;this.ready=true;},
query(q,limit=30){const qq=norm(q);if(!qq)return[];const parts=qq.split(" ").filter(Boolean);const scored=[];
for(const it of this.items){let s=0;for(const p of parts){if(it.text.includes(p))s+=2;if(norm(it.title).includes(p))s+=3;}if(it.featured)s+=1;s+=Math.min(2,(it.priority||0)/10);if(s>0)scored.push({it,score:s});}
scored.sort((a,b)=>b.score-a.score);return scored.slice(0,limit).map(x=>x.it);},
featured(limit=10){return this.items.filter(x=>x.featured).slice(0,limit);} };
function renderResults(c,rs){c.innerHTML="";if(!rs.length){c.innerHTML=`<div class="muted small" style="padding:12px;">No results.</div>`;return;}
for(const r of rs){const el=document.createElement("div");el.className="result";el.innerHTML=`<div class="type">${esc(r.type)}</div><div class="title"><a href="${esc(r.url)}">${esc(r.title)}</a></div><div class="snippet">${esc(r.snippet||"")}</div>`;c.appendChild(el);}}
function bindSearch(input,btn,fn){if(!input)return;const run=()=>fn(input.value||"");input.addEventListener("input",run);
input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();run();}});if(btn)btn.addEventListener("click",e=>{e.preventDefault();run();});}
App.initSite=async function(){setActiveNav();setYear();initMenu();initHeaderSearch();const s=await site();applyBrand(s);const ig=$("igLink");if(ig&&s.instagram_url)ig.href=s.instagram_url;};
App.initHome=async function(){
  await App.initSite();
  const s=await site();
  await Search.build();
  const ig=$("igBtn");if(ig&&s.instagram_url)ig.href=s.instagram_url;
  const c=$("communityLink");if(c&&s.telegram_url)c.href=s.telegram_url;
  const f=$("featuredList");if(f)renderResults(f,Search.featured(10));
  const sh=$("scrollHint");
  if(sh){
    sh.addEventListener("click",()=>{
      const target=$("featuredSection");
      if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
    });
  }
};
App.initListPage=async function({dataset,searchInputId,searchBtnId,listId,renderItem}){await App.initSite();const data=await fetchJson(dataset);const items=(Object.values(data)[0]||[]).slice();
const input=$(searchInputId);const btn=searchBtnId?$(searchBtnId):null;const list=$(listId);
function apply(q){const qq=norm(q);const filtered=!qq?items:items.filter(it=>{const hay=norm(JSON.stringify(it));return qq.split(" ").filter(Boolean).every(p=>hay.includes(p));});
list.innerHTML="";for(const it of filtered)list.appendChild(renderItem(it));if(!filtered.length)list.innerHTML=`<div class="muted small" style="padding:12px;">No results.</div>`;}
bindSearch(input,btn,apply);apply("");};
App.initFAQ=async function(){await App.initSite();const data=await fetchJson("data/faq.json");const items=(data.faq||[]).slice();
const input=$("faqSearch");const btn=$("faqBtn");const list=$("faqList");
function render(it){const w=document.createElement("div");w.className="item";w.id=it.id||"";
w.innerHTML=`<div class="cover" style="background-image:url('assets/images/cover_default.jpg')"></div><div><h3 style="margin:0 0 6px 0;">${esc(it.q)}</h3><div class="muted small">${esc(it.a)}</div><div class="badges">${(it.tags||[]).slice(0,4).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}${it.featured?`<span class="badge accent">Featured</span>`:""}</div></div><div style="display:grid;place-items:center;"><span class="muted small">—</span></div>`;return w;}
function apply(q){const qq=norm(q);const filtered=!qq?items:items.filter(it=>{const hay=norm([it.q,it.a,(it.tags||[]).join(" ")].join(" "));return qq.split(" ").filter(Boolean).every(p=>hay.includes(p));});
list.innerHTML="";for(const it of filtered)list.appendChild(render(it));if(!filtered.length)list.innerHTML=`<div class="muted small" style="padding:12px;">No results.</div>`;}
bindSearch(input,btn,apply);apply("");};
async function renderMd(url){const md=await fetchText(url);if(!md)return{html:"",title:"Not found"};const html=(window.marked?window.marked.parse(md):`<pre>${esc(md)}</pre>`);const tmp=document.createElement("div");tmp.innerHTML=html;const h1=tmp.querySelector("h1");return{html,title:h1?h1.textContent:"Post"};}
App.initPost=async function(){await App.initSite();const params=new URLSearchParams(location.search);const slug=params.get("slug")||"welcome";
const [A,P]=await Promise.all([fetchJson("data/articles.json").catch(()=>({articles:[]})),fetchJson("data/places.json").catch(()=>({places:[]}))]);
const meta=[...(A.articles||[]),...(P.places||[])].find(x=>x.slug===slug);
const cover=(meta&&meta.cover)?meta.cover:"assets/images/cover_default.jpg";const desc=(meta&&meta.description)?meta.description:"";const tmeta=(meta&&meta.title)?meta.title:"";
const hero=$("detailHeroImg");const t=$("detailTitle");const d=$("detailDesc");const b=$("detailBody");
if(hero)hero.style.backgroundImage=`url('${cover}')`;const out=await renderMd(`posts/${slug}.md`);
if(t)t.textContent=tmeta||out.title;if(d)d.textContent=desc;if(b)b.innerHTML=out.html;document.title=`${tmeta||out.title} — ${document.title}`;};
App.initItem=async function(){await App.initSite();const params=new URLSearchParams(location.search);const type=params.get("type");const id=params.get("id");const box=$("itemBox");
const map={restaurants:{file:"data/restaurants.json",key:"restaurants",title:"Restaurants"},hotels:{file:"data/hotels.json",key:"hotels",title:"Hotels"},music:{file:"data/music.json",key:"music",title:"Music"}};
const spec=map[type];if(!spec||!id){box.innerHTML=`<div class="detail-wrap"><h1>Not found</h1><p class="muted">Missing type or id.</p></div>`;return;}
const data=await fetchJson(spec.file);const list=data[spec.key]||[];const it=list.find(x=>String(x.id)===String(id));
if(!it){box.innerHTML=`<div class="detail-wrap"><h1>Not found</h1><p class="muted">Wrong id.</p></div>`;return;}
const cover=it.cover||"assets/images/cover_default.jpg";const title=it.name||it.place||"Item";const desc=it.description||"";
const tags=(it.tags||[]).slice(0,8).map(t=>`<span class="badge">${esc(t)}</span>`).join("");
const meta=[];if(it.type)meta.push(`🏷️ ${esc(it.type)}`);if(it.genre)meta.push(`🎶 ${esc(it.genre)}`);if(it.price)meta.push(`💰 ${esc(it.price)}`);if(it.area)meta.push(`📍 ${esc(it.area)}`);
const details=[];
function add(label,val){if(val===undefined||val===null||String(val).trim()==="")return;details.push([label,String(val)]);}
if(type==="restaurants"){add("Cuisine / style", it.type);add("Price", it.price);add("Area", it.area);add("Address", it.address);add("Hours", it.hours);add("Phone", it.phone);add("Instagram", it.instagram);}
if(type==="hotels"){add("Price range", it.price_range||it.price);add("Vibe", it.vibe);add("Area", it.area);add("Address", it.address);add("WhatsApp", it.whatsapp);add("Phone", it.phone);add("Booking", it.booking_url);add("Website", it.link);}
if(type==="music"){add("Type", it.type);add("Best day", it.best_day);add("Genre", it.genre);add("Area", it.area);add("Address", it.address);add("Hours", it.hours);add("Cover", it.cover_charge);add("Instagram", it.instagram);}
const detailsHtml=details.length?`<div class="card" style="margin-top:14px;"><h2 style="margin:0 0 10px 0;font-size:1.1rem;">Details</h2><div class="kv">${details.map(([k,v])=>`<div class="kv-row"><div class="kv-k">${esc(k)}</div><div class="kv-v">${esc(v)}</div></div>`).join("")}</div></div>`:"";

const links=[];if(it.link)links.push(`<a class="btn" target="_blank" rel="noreferrer" href="${esc(it.link)}">Open link</a>`);if(it.map_url)links.push(`<a class="btn ghost" target="_blank" rel="noreferrer" href="${esc(it.map_url)}">Open map</a>`);
box.innerHTML=`<div class="detail-wrap"><img class="detail-photo" src="${esc(cover)}" alt="Cover" /><h1 class="detail-title">${esc(title)}</h1>${desc?`<p class="detail-desc">${esc(desc)}</p>`:""}<div class="meta">${meta.join(" • ")}</div><div class="badges" style="margin-top:10px;">${tags}${it.featured?`<span class="badge accent">Featured</span>`:""}</div>${detailsHtml}${it.address?`<div class="filters" style="margin-top:12px;"><span class="badge accent">🧭 ${esc(it.address)}</span></div>`:""}<div class="filters" style="margin-top:14px;">${links.join(" ")||""}<a class="btn ghost" href="${esc(type)}.html">Back to ${esc(spec.title)}</a></div></div>`;
document.title=`${title} — ${document.title}`;};
function parseISO(s){const [y,m,d]=s.split("-").map(Number);const dt=new Date(y,(m-1),d);dt.setHours(0,0,0,0);return dt;}
function fmtDate(s){const dt=parseISO(s);return dt.toLocaleDateString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"});}
function isPaid(e){if(e.price===0)return false;if(typeof e.price==="string"&&norm(e.price)==="free")return false;return true;}
function matchesPrice(e,f){if(!f)return true;if(f==="free")return !isPaid(e);if(f==="paid")return isPaid(e);return true;}
function matchesQ(e,q){if(!q)return true;const hay=[e.title,e.description,e.venue,e.address,e.category,(e.tags||[]).join(" ")].join(" ");return norm(hay).includes(norm(q));}
function eventCard(e){const w=document.createElement("div");w.className="item";const cover=e.cover||"assets/images/cover_default.jpg";
w.innerHTML=`<div class="cover" style="background-image:url('${cover}')"></div><div><h3>${esc(e.title)}</h3><div class="meta"><span>🗓️ ${esc(fmtDate(e.date))}</span><span>🕒 ${esc(e.time||"TBA")}</span><span>📍 ${esc(e.venue||"TBA")}</span></div><div class="badges"><span class="badge accent">${esc(e.category||"General")}</span><span class="badge purple">${esc(!isPaid(e)?"Free":(typeof e.price==="number"?`$${e.price} MXN`:"Paid"))}</span>${(e.tags||[]).slice(0,3).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}${e.featured?`<span class="badge accent">Featured</span>`:""}</div>${e.description?`<div class="muted small" style="margin-top:8px;">${esc(e.description.length>160?e.description.slice(0,160)+"…":e.description)}</div>`:""}</div><div style="display:grid;place-items:center;"><a class="btn" href="event.html?id=${encodeURIComponent(e.id)}">Details</a></div>`;
return w;}
function renderEvents(c,arr){c.innerHTML="";if(!arr.length){c.innerHTML=`<div class="muted small" style="padding:12px;">No events found for selected filters.</div>`;return;}for(const e of arr)c.appendChild(eventCard(e));}
App.initEventsPage=async function(){await App.initSite();const data=await fetchJson("data/events.json");const all=(data.events||[]).slice().sort((a,b)=>a.date>b.date?1:-1);
const q=$("q"),from=$("from"),to=$("to"),cat=$("category"),price=$("price"),out=$("eventsAll");
[...new Set(all.map(e=>e.category).filter(Boolean))].sort().forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;cat.appendChild(o);});
function inRange(e){const ev=parseISO(e.date);if(from&&from.value&&ev<parseISO(from.value))return false;if(to&&to.value&&ev>parseISO(to.value))return false;return true;}
function apply(){const qq=q?q.value:"";const cc=cat?cat.value:"";const pp=price?price.value:"";const filtered=all.filter(e=>inRange(e)&&(!cc||e.category===cc)&&matchesPrice(e,pp)&&matchesQ(e,qq));renderEvents(out,filtered);}
[q,from,to,cat,price].forEach(el=>{if(!el)return;el.addEventListener("input",apply);el.addEventListener("change",apply);el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();apply();}});});apply();};
App.initEventDetails=async function(){await App.initSite();const params=new URLSearchParams(location.search);const id=params.get("id");const data=await fetchJson("data/events.json");
const e=(data.events||[]).find(x=>String(x.id)===String(id));const hero=$("detailHero"),t=$("detailTitle"),d=$("detailDesc"),b=$("detailBody");
if(!e){t.textContent="Event not found";d.textContent="Wrong or missing event id.";return;}
const cover=e.cover||"assets/images/cover_default.jpg";if(hero)hero.style.backgroundImage=`url('${cover}')`;t.textContent=e.title;d.textContent=e.description||"";
const priceText=!isPaid(e)?"Free":(typeof e.price==="number"?`$${e.price} MXN`:"Paid");
b.innerHTML=`<div class="meta" style="margin-top:6px;"><span>🗓️ ${esc(fmtDate(e.date))}</span><span>🕒 ${esc(e.time||"TBA")}</span><span>🏷️ ${esc(e.category||"General")}</span></div>
<div class="badges" style="margin-top:10px;"><span class="badge accent">📍 ${esc(e.venue||"TBA")}</span><span class="badge">🧭 ${esc(e.address||"Address not provided")}</span><span class="badge purple">💰 ${esc(priceText)}</span>${(e.tags||[]).slice(0,6).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}${e.featured?`<span class="badge accent">Featured</span>`:""}</div>
${e.contact?`<div class="filters" style="margin-top:14px;"><span class="badge accent">Contact: ${esc(e.contact)}</span></div>`:""}
<div class="filters" style="margin-top:14px;">${e.source_url?`<a class="btn" target="_blank" rel="noreferrer" href="${esc(e.source_url)}">Source / flyer</a>`:""}<a class="btn ghost" href="events.html">Back to Events</a></div>`;
document.title=`${e.title} — ${document.title}`;};

App.initSearchPage=async function(){
  await App.initSite();
  await Search.build();
  const params=new URLSearchParams(location.search);
  const q=params.get("q")||"";
  const input=document.getElementById("searchInput");
  const out=document.getElementById("searchResults");
  const qLabel=document.getElementById("queryLabel");
  if(input) input.value=q;
  if(qLabel) qLabel.textContent=q ? `Results for “${q}”` : "Search the portal";
  function renderCards(rs){
    if(!out) return;
    out.innerHTML="";
    if(!rs.length){
      out.innerHTML=`<div class="muted small" style="padding:12px;">No results.</div>`;
      return;
    }
    for(const r of rs){
      const kind=(r.type||"").toLowerCase();
      const el=document.createElement("a");
      el.className="result-card";
      el.href=r.url;
      el.setAttribute("data-kind", kind);
      const meta=r.snippet||"";
      el.innerHTML=`
        <div class="rc-cover" style="background-image:url('${esc(r.cover||"assets/images/cover_default.jpg")}')"></div>
        <div class="rc-body">
          <div class="rc-top">
            <span class="rc-badge">${esc(r.type)}</span>
            <span class="rc-meta">${esc(meta)}</span>
          </div>
          <div class="rc-title">${esc(r.title)}</div>
          <div class="rc-snippet">${esc(r.snippet_long||r.snippet||"")}</div>
        </div>`;
      out.appendChild(el);
    }
  }
  function run(query){
    const rs=Search.query(query,40);
    renderCards(rs);
  }
  if(input){
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){e.preventDefault(); run(input.value||"");}
    });
  }
  const form=document.getElementById("searchPageForm");
  if(form){
    form.addEventListener("submit",(e)=>{
      e.preventDefault();
      const v=(input&&input.value)||"";
      history.replaceState({}, "", v?`search.html?q=${encodeURIComponent(v)}`:"search.html");
      if(qLabel) qLabel.textContent=v ? `Results for “${v}”` : "Search the portal";
      run(v);
    });
  }
  run(q);
};

window.App=App;})();