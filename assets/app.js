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

  const searchBtn = document.getElementById("searchBtn");
  const searchPanel = document.getElementById("searchPanel");

  const closeSearch = ()=>{
    if(!searchPanel || !searchBtn) return;
    searchPanel.classList.remove("open");
    searchPanel.hidden = true;
    searchBtn.setAttribute("aria-expanded","false");
  };

  function close(){
    nav.classList.remove("open");
    nav.hidden = true;
    btn.setAttribute("aria-expanded","false");
  }
  function open(){
    closeSearch();
    nav.hidden = false;
    nav.classList.add("open");
    btn.setAttribute("aria-expanded","true");
  }

  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    nav.classList.contains("open") ? close() : open();
  });

  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click", (e)=>{
    const action = a.getAttribute("data-action");
    if(action === "open-search"){
      e.preventDefault();
      close();
      // open header search panel
      if(searchPanel && searchBtn){
        searchPanel.hidden = false;
        searchPanel.classList.add("open");
        searchBtn.setAttribute("aria-expanded","true");
        const input = document.getElementById("headerSearchInput");
        if(input) setTimeout(()=>input.focus(), 50);
      } else {
        location.href = "search.html";
      }
      return;
    }
    close();
  }));

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
  const sugg = document.getElementById("headerSuggestions");
  if(!btn || !panel || !input) return;

  let built = false;
  const ensureIndex = async ()=>{
    if(built) return;
    try{ await Search.build(); }catch(e){}
    built = true;
  };

  function close(){
    panel.classList.remove("open");
    if(sugg){sugg.hidden=true; sugg.innerHTML="";}
    panel.hidden = true;
    btn.setAttribute("aria-expanded","false");
  }
  function open(){
    const nav=document.getElementById("siteNav");
    const mb=document.getElementById("menuBtn");
    if(nav&&mb){nav.classList.remove("open");nav.hidden=true; mb.setAttribute("aria-expanded","false");}
    panel.hidden = false;
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

  // Suggestions (typeahead) inside header search
  if(sugg){
    const render = (items)=>{
      if(!items.length){sugg.hidden=true; sugg.innerHTML=""; return;}
      sugg.hidden=false;
      sugg.innerHTML = items.map(it=>{
        const type = esc(it.type);
        const title = esc(it.title);
        const sub = esc(it.snippet||"");
        return `<a class="suggestion" href="${esc(it.url)}"><span class="t">${title}</span><span class="meta">${type}${sub?` • ${sub}`:""}</span></a>`;
      }).join("");
      // clicking a suggestion closes the panel
      sugg.querySelectorAll("a").forEach(a=>a.addEventListener("click", ()=>close()));
    };

    let t = null;
    input.addEventListener("input", ()=>{
      const q = input.value || "";
      if((q||"").trim().length < 2){ render([]); return; }
      clearTimeout(t);
      t = setTimeout(async ()=>{
        await ensureIndex();
        render(Search.query(q, 6));
      }, 120);
    });
  }

  // If user presses Enter in the input while the panel is open, let the form submit normally
}


async function site(){try{return await fetchJson("data/site.json");}catch{return{};}}
function applyBrand(s){document.querySelectorAll("[data-site-title]").forEach(el=>el.textContent=s.short_title||s.site_title||"Portal");
document.querySelectorAll("[data-site-sub]").forEach(el=>el.textContent=(s.tagline||"Events • Guides • Tips"));
if(s.site_title)document.title=document.title.replace("{{SITE_TITLE}}",s.site_title);}
const Search={ready:false,items:[],async build(){if(this.ready)return;
const [A,P,F,H,R,M,E]=await Promise.all([fetchJson("data/articles.json"),fetchJson("data/places.json"),fetchJson("data/faq.json"),fetchJson("data/hotels.json"),fetchJson("data/restaurants.json"),fetchJson("data/music.json"),fetchJson("data/events.json")]);
const items=[];
for(const a of (A.articles||[])){const md=await fetchText(`posts/${a.slug}.md`);items.push({type:"Article",title:a.title,url:`post.html?slug=${encodeURIComponent(a.slug)}`,cover:a.cover||"assets/images/cover_default.jpg",text:norm([a.title,a.excerpt,a.description,a.category,(a.tags||[]).join(" "),md].join(" ")),featured:!!a.featured,priority:+(a.priority||0),snippet:[a.date, (a.category||"Life")].filter(Boolean).join(" • ")||"Life",snippet_long:((a.excerpt||a.description||"")||"").slice(0,180)+(((a.excerpt||a.description||"")||"").length>180?"…":"")});}
for(const p of (P.places||[])){const md=await fetchText(`posts/${p.slug}.md`);items.push({type:"Place",title:p.title,url:`post.html?slug=${encodeURIComponent(p.slug)}`,cover:p.cover||"assets/images/cover_default.jpg",text:norm([p.title,p.excerpt,p.description,p.distance,p.category,(p.tags||[]).join(" "),md].join(" ")),featured:!!p.featured,priority:+(p.priority||0),snippet:[p.distance,p.duration,p.category].filter(Boolean).join(" • ")||"Nature",snippet_long:((p.excerpt||p.description||"")||"").slice(0,180)+(((p.excerpt||p.description||"")||"").length>180?"…":"")});}
for(const f of (F.faq||[])){items.push({type:"FAQ",title:f.q,url:`faq.html#${encodeURIComponent(f.id||"")}`,cover:"assets/images/cover_default.jpg",text:norm([f.q,f.a,(f.tags||[]).join(" ")].join(" ")),featured:!!f.featured,priority:+(f.priority||0),snippet:(f.a||"").slice(0,140)});}
for(const h of (H.hotels||[])){items.push({type:"Hotel",title:h.name,url:`item.html?type=hotels&id=${encodeURIComponent(h.id||"")}`,cover:h.cover||"assets/images/cover_default.jpg",text:norm([h.name,h.type,h.price,h.area,h.description,h.address,(h.tags||[]).join(" ")].join(" ")),featured:!!h.featured,priority:+(h.priority||0),snippet:[h.type,h.area,h.price].filter(Boolean).join(" • ")||"Hotel",snippet_long:((h.description||"") + (h.address?(" • "+h.address):"")).slice(0,180)+(((h.description||"") + (h.address?(" • "+h.address):"")).length>180?"…":"")});}
for(const r of (R.restaurants||[])){items.push({type:"Restaurant",title:r.name,url:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`,cover:r.cover||"assets/images/cover_default.jpg",text:norm([r.name,r.type,r.price,r.area,r.description,r.address,(r.tags||[]).join(" ")].join(" ")),featured:!!r.featured,priority:+(r.priority||0),snippet:[r.type,r.area,r.price].filter(Boolean).join(" • ")||"Food",snippet_long:((r.description||"") + (r.address?(" • "+r.address):"")).slice(0,180)+(((r.description||"") + (r.address?(" • "+r.address):"")).length>180?"…":"")});}
for(const m of (M.music||[])){items.push({type:"Music",title:m.place,url:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`,cover:m.cover||"assets/images/cover_default.jpg",text:norm([m.place,m.genre,m.description,m.address,(m.tags||[]).join(" ")].join(" ")),featured:!!m.featured,priority:+(m.priority||0),snippet:[m.genre,m.best_day,m.area].filter(Boolean).join(" • ")||"Music",snippet_long:((m.description||"") + (m.address?(" • "+m.address):"")).slice(0,180)+(((m.description||"") + (m.address?(" • "+m.address):"")).length>180?"…":"")});}
for(const e of (E.events||[])){items.push({type:"Event",title:e.title,url:`event.html?id=${encodeURIComponent(e.id)}`,cover:e.cover||"assets/images/cover_default.jpg",text:norm([e.title,e.description,e.category,e.venue,e.address,e.date,e.time,(e.tags||[]).join(" ")].join(" ")),featured:!!e.featured,priority:+(e.priority||0),snippet:[e.date, e.time||"TBA", e.category, e.venue].filter(Boolean).join(" • "),snippet_long:((e.description||"") + (e.address?(" • "+e.address):"")).slice(0,180)+(((e.description||"") + (e.address?(" • "+e.address):"")).length>180?"…":"")});}
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

function renderMiniCards(container, cards, opts={}){
  const emptyText=opts.emptyText||"Nothing here yet.";
  container.innerHTML="";
  if(!cards || !cards.length){
    container.innerHTML=`<div class="muted small" style="padding:12px;">${esc(emptyText)}</div>`;
    return;
  }
  for(const c of cards){
    const el=document.createElement("div");
    el.className="mini-card";
    el.setAttribute("data-kind", c.kind||"");
    const cover=c.cover||"assets/images/cover_default.jpg";
    const meta=c.meta||"";
    const desc=c.desc||"";
    const actions=(c.actions||[]).slice(0,2);
    const a0=actions[0]||{label:"Open",href:c.url};
    const a1=actions[1]||null;

    el.innerHTML = `
      <div class="mc-cover" style="background-image:url('${esc(cover)}')"></div>
      <div class="mc-body">
        <div class="mc-type"><span class="badge">${esc(c.kind||"")}</span></div>
        <div class="mc-title"><a href="${esc(c.url)}">${esc(c.title||"")}</a></div>
        ${meta?`<div class="mc-meta">${esc(meta)}</div>`:""}
        ${desc?`<div class="mc-desc">${esc(desc)}</div>`:""}
      </div>
      <div class="mc-actions">
        <a href="${esc(a0.href||c.url)}"${a0.external?` target="_blank" rel="noreferrer"`:""}>${esc(a0.label||"Open")}</a>
        ${a1?`<a href="${esc(a1.href)}"${a1.external?` target="_blank" rel="noreferrer"`:""}>${esc(a1.label||"More")}</a>`:"<span></span>"}
      </div>
    `;
    container.appendChild(el);
  }
}

App.initHome=async function(){
  await App.initSite();
  const s=await site();
  await Search.build();

  // Footer / links
  const ig=$("igBtn");if(ig&&s.instagram_url)ig.href=s.instagram_url;
  const c=$("communityLink");if(c&&s.telegram_url)c.href=s.telegram_url;

  // Featured (explicitly flagged)
  const f=$("featuredList");
  if(f){
    const mapKind=(t)=>({Restaurant:"Food",Hotel:"Hotel",Music:"Music",Event:"Event",Article:"Article",Place:"Place",FAQ:"FAQ"}[t]||t);
    const cards=Search.featured(10).map(r=>({
      kind:mapKind(r.type),
      title:r.title,
      url:r.url,
      cover:r.cover||"assets/images/cover_default.jpg",
      meta:r.snippet||"",
      desc:(r.snippet_long||"").slice(0,160)+((r.snippet_long||"").length>160?"…":""),
      actions:[{label:"Open",href:r.url}]
    }));
    renderMiniCards(f, cards, {emptyText:"No featured items yet."});
  }

  
  // Top today: 1–2 events + quick food & music
  const tt=$("topToday");
  if(tt){
    const [E,R,M]=await Promise.all([fetchJson("data/events.json"),fetchJson("data/restaurants.json"),fetchJson("data/music.json")]);
    const today=new Date(); today.setHours(0,0,0,0);
    const tomorrow=new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const parseDT=(e)=>{
      // Prefer ISO date
      let d=null;
      if(e && e.date){
        const iso = String(e.date).trim();
        const t = String(e.time||"00:00").trim();
        d = new Date(iso + "T" + t + ":00");
        if(isNaN(+d)){
          // fallback: try Date.parse
          const tryStr = iso + (e.time?(" "+e.time):"");
          const ms = Date.parse(tryStr);
          if(!isNaN(ms)) d = new Date(ms);
          else d = null;
        }
      }
      return d;
    };
    const fmtShort=(d)=>{try{return d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});}catch{return d.toISOString().slice(0,10);}};

    const all=(E.events||[]).map(e=>({e,dt:parseDT(e)})).filter(x=>x.dt);
    const todayEvents=all.filter(x=>x.dt>=today && x.dt<tomorrow).sort((a,b)=>a.dt-b.dt).slice(0,2);
    const upcoming=all.filter(x=>x.dt>=today).sort((a,b)=>a.dt-b.dt).slice(0,2);
    const chosen=(todayEvents.length?todayEvents:upcoming).map(({e,dt})=>{
      const venue=e.venue||"";
      const addr=e.address||"";
      const meta=[fmtShort(dt), e.time||"TBA", e.venue||e.category].filter(Boolean).join(" • ");
      const mapUrl=e.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((venue||e.title||"Event")+" "+addr).trim())}`;
      return {
        kind:"Event",
        title:e.title,
        url:`event.html?id=${encodeURIComponent(e.id)}`,
        cover:e.cover||"assets/images/cover_default.jpg",
        meta,
        desc:(e.description||"").slice(0,160)+((e.description||"").length>160?"…":""),
        actions:[
          {label:"Open", href:`event.html?id=${encodeURIComponent(e.id)}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      };
    });

    const pick=(arr,key="name")=> (arr||[]).slice().sort((a,b)=>(+!!b.featured-+!!a.featured)||((b.priority||0)-(a.priority||0))||String(a[key]||"").localeCompare(String(b[key]||"")))[0];
    const r=pick(R.restaurants,"name");
    const m=pick(M.music,"place");

    const cards=[...chosen];

    if(r){
      const mapUrl=r.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((r.name||"Restaurant")+" "+(r.address||"San Cristóbal de las Casas")).trim())}`;
      cards.push({
        kind:"Food",
        title:r.name,
        url:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`,
        cover:r.cover||"assets/images/cover_default.jpg",
        meta:[r.type,r.area,r.price].filter(Boolean).join(" • ")||"Food",
        desc:(r.description||"").slice(0,160)+((r.description||"").length>160?"…":""),
        actions:[
          {label:"Open", href:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      });
    }
    if(m){
      const mapUrl=m.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((m.place||"Music")+" "+(m.address||"San Cristóbal de las Casas")).trim())}`;
      cards.push({
        kind:"Music",
        title:m.place,
        url:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`,
        cover:m.cover||"assets/images/cover_default.jpg",
        meta:[m.genre,m.best_day,m.area].filter(Boolean).join(" • ")||"Music",
        desc:(m.description||"").slice(0,160)+((m.description||"").length>160?"…":""),
        actions:[
          {label:"Open", href:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      });
    }

    renderMiniCards(tt, cards, {emptyText:"Add events and featured places in data/*.json to show Top today."});
  }

// Upcoming events (next 7 days)
  const up=$("upcomingEvents");
  if(up){
    const E=await fetchJson("data/events.json");
    const today=new Date(); today.setHours(0,0,0,0);
    const end=new Date(today); end.setDate(end.getDate()+7);

    const parseDT=(e)=>{
      const d=new Date(e.date+"T"+(e.time||"00:00")+":00");
      return isNaN(+d)?null:d;
    };
    const fmtShort=(d)=>{
      try{
        return d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
      }catch{ return d.toISOString().slice(0,10); }
    };

    const list=(E.events||[])
      .map(e=>({e,dt:parseDT(e)}))
      .filter(x=>x.dt && x.dt>=today && x.dt<=end)
      .sort((a,b)=>a.dt-b.dt)
      .slice(0,10)
      .map(({e,dt})=>{
        const venue=e.venue||"";
        const addr=e.address||"";
        const meta=[fmtShort(dt), e.time||"", venue].filter(Boolean).join(" • ");
        const desc=e.description||"";
        const map=e.source_url||""; // keep source separately; map link below
        const mapUrl=e.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((venue||e.title||"Event")+" "+addr).trim())}`;
        return {
          kind:"Event",
          title:e.title,
          url:`event.html?id=${encodeURIComponent(e.id)}`,
          cover:e.cover||"assets/images/cover_default.jpg",
          meta,
          desc,
          actions:[
            {label:"Open", href:`event.html?id=${encodeURIComponent(e.id)}`},
            {label:"Map", href:mapUrl, external:true}
          ]
        };
      });

    renderMiniCards(up, list, {emptyText:"No upcoming events found yet."});
  }

  // Quick picks: featured restaurant / hotel / music
  const qp=$("quickPicks");
  if(qp){
    const [R,H,M]=await Promise.all([
      fetchJson("data/restaurants.json"),
      fetchJson("data/hotels.json"),
      fetchJson("data/music.json")
    ]);
    const pick=(arr)=> (arr||[])
      .slice()
      .sort((a,b)=>(+!!b.featured-+!!a.featured)||((b.priority||0)-(a.priority||0))||(a.name||a.place||"").localeCompare(b.name||b.place||""))[0];

    const r=pick(R.restaurants), h=pick(H.hotels), m=pick(M.music);
    const cards=[];
    if(r){
      const mapUrl=r.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((r.name||"Restaurant")+" "+(r.address||"San Cristóbal de las Casas")).trim())}`;
      cards.push({
        kind:"Food",
        title:r.name,
        url:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`,
        cover:r.cover||"assets/images/cover_default.jpg",
        meta:[r.type,r.area,r.price].filter(Boolean).join(" • ")||"Food",
        desc:r.description||"",
        actions:[
          {label:"Open", href:`item.html?type=restaurants&id=${encodeURIComponent(r.id||"")}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      });
    }
    if(h){
      const mapUrl=h.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((h.name||"Hotel")+" "+(h.address||"San Cristóbal de las Casas")).trim())}`;
      cards.push({
        kind:"Hotel",
        title:h.name,
        url:`item.html?type=hotels&id=${encodeURIComponent(h.id||"")}`,
        cover:h.cover||"assets/images/cover_default.jpg",
        meta:[h.type,h.area,h.price].filter(Boolean).join(" • ")||"Hotel",
        desc:h.description||"",
        actions:[
          {label:"Open", href:`item.html?type=hotels&id=${encodeURIComponent(h.id||"")}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      });
    }
    if(m){
      const mapUrl=m.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((m.place||"Music")+" "+(m.address||"San Cristóbal de las Casas")).trim())}`;
      cards.push({
        kind:"Music",
        title:m.place,
        url:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`,
        cover:m.cover||"assets/images/cover_default.jpg",
        meta:[m.genre,m.best_day,m.area].filter(Boolean).join(" • ")||"Music",
        desc:m.description||"",
        actions:[
          {label:"Open", href:`item.html?type=music&id=${encodeURIComponent(m.id||"")}`},
          {label:"Map", href:mapUrl, external:true}
        ]
      });
    }

    renderMiniCards(qp, cards, {emptyText:"Add featured items in data/*.json to show quick picks."});
  }

  // Quick FAQ
  const qf=$("faqQuick");
  if(qf){
    const F=await fetchJson("data/faq.json");
    const items=(F.faq||[])
      .slice()
      .sort((a,b)=>(+!!b.featured-+!!a.featured)||((b.priority||0)-(a.priority||0))||(a.q||"").localeCompare(b.q||""))
      .slice(0,6)
      .map(x=>({
        kind:"FAQ",
        title:x.q,
        url:`faq.html#${encodeURIComponent(x.id||"")}`,
        cover:"assets/images/cover_default.jpg",
        meta:"Tap to read",
        desc:(x.a||"").slice(0,160)+(x.a && x.a.length>160 ? "…" : ""),
        actions:[
          {label:"Open", href:`faq.html#${encodeURIComponent(x.id||"")}`},
          {label:"All FAQ", href:"faq.html"}
        ]
      }));
    renderMiniCards(qf, items, {emptyText:"FAQ is empty yet."});
  }

  // Scroll hint
  const sh=$("scrollHint");
  if(sh){
    sh.addEventListener("click",()=>{
      const target=$("nowSection")||$("featuredSection");
      if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
    });
  }
};
App.initListPage=async function({dataset,searchInputId,searchBtnId,listId,renderItem}){await App.initSite();const data=await fetchJson(dataset);const items=(Object.values(data)[0]||[]).slice();
const input=$(searchInputId);const btn=searchBtnId?$(searchBtnId):null;const list=$(listId);
function apply(q){const qq=norm(q);const filtered=!qq?items:items.filter(it=>{const hay=norm(JSON.stringify(it));return qq.split(" ").filter(Boolean).every(p=>hay.includes(p));});
list.innerHTML="";for(const it of filtered)list.appendChild(renderItem(it));if(!filtered.length)list.innerHTML=`<div class="muted small" style="padding:12px;">No results.</div>`;}
bindSearch(input,btn,apply);apply("");};
/**
 * Catalog pages: search + facets + sorting + optional quick chips.
 * Minimal, robust, static-site friendly.
 */
App.initCatalogPage = async function({
  dataset,
  searchInputId,
  searchBtnId,
  listId,
  renderItem,
  facetSelects = [],   // [{id,key,allLabel}]
  sortSelectId = null, // select id
  summaryId = null,    // element id for "N results"
  quickChipsId = null, // container id
  quickFilters = []    // [{id,label,fn}]
}){
  await App.initSite();
  const data = await fetchJson(dataset);
  const items = (Object.values(data)[0]||[]).slice();

  const input = $(searchInputId);
  const btn = searchBtnId ? $(searchBtnId) : null;
  const list = $(listId);
  const sortSel = sortSelectId ? $(sortSelectId) : null;
  const summaryEl = summaryId ? $(summaryId) : null;
  const chipsEl = quickChipsId ? $(quickChipsId) : null;

  // Facet selects
  const facets = facetSelects.map(f => ({
    ...f,
    el: $(f.id),
    key: f.key,
    allLabel: f.allLabel || "All"
  })).filter(f => !!f.el);

  function uniqValues(key){
    const set = new Set();
    for(const it of items){
      const v = it && it[key];
      if(v==null) continue;
      const s = String(v).trim();
      if(!s) continue;
      set.add(s);
    }
    return Array.from(set).sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:"base"}));
  }

  for(const f of facets){
    const values = uniqValues(f.key);
    // keep any existing first option
    f.el.innerHTML = `<option value="">${esc(f.allLabel)}</option>` + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  // Quick chips (optional)
  let activeQuick = "";
  if(chipsEl && quickFilters && quickFilters.length){
    chipsEl.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.type="button";
    allBtn.className="chip active";
    allBtn.textContent="All";
    allBtn.addEventListener("click", ()=>{
      activeQuick="";
      [...chipsEl.querySelectorAll(".chip")].forEach(x=>x.classList.remove("active"));
      allBtn.classList.add("active");
      apply((input&&input.value)||"");
    });
    chipsEl.appendChild(allBtn);

    for(const qf of quickFilters){
      const b = document.createElement("button");
      b.type="button";
      b.className="chip";
      b.textContent=qf.label;
      b.addEventListener("click", ()=>{
        activeQuick=qf.id;
        [...chipsEl.querySelectorAll(".chip")].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        apply((input&&input.value)||"");
      });
      chipsEl.appendChild(b);
    }
  }

  function titleOf(it){
    return it.title || it.name || it.place || it.q || "Item";
  }

  function priceRank(v){
    if(v==null) return 999;
    if(typeof v === "number") return v;
    const s = String(v).trim().toLowerCase();
    if(!s) return 999;
    // $, $$, $$$
    const dollars = (s.match(/\$/g)||[]).length;
    if(dollars) return dollars;
    if(s.includes("free") || s==="0") return 0;
    if(s.includes("budget")||s.includes("cheap")) return 1;
    if(s.includes("mid")||s.includes("medium")) return 2;
    if(s.includes("premium")||s.includes("lux")||s.includes("expensive")) return 3;
    const n = parseFloat(s.replace(/[^\d.]/g,""));
    return Number.isFinite(n) ? n : 999;
  }

  function sortItems(arr){
    const mode = (sortSel && sortSel.value) ? String(sortSel.value).toLowerCase() : "featured";
    const rs = [...arr];
    if(mode === "az"){
      rs.sort((a,b)=>String(titleOf(a)).localeCompare(String(titleOf(b)), undefined, {sensitivity:"base"}));
      return rs;
    }
    if(mode === "price"){
      rs.sort((a,b)=>(priceRank(a.price)-priceRank(b.price)) || String(titleOf(a)).localeCompare(String(titleOf(b))));
      return rs;
    }
    if(mode === "date"){
      rs.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")) || String(a.time||"").localeCompare(String(b.time||"")));
      return rs;
    }
    // featured (default)
    rs.sort((a,b)=> (+(b.featured||0) - +(a.featured||0)) || (+(b.priority||0) - +(a.priority||0)) || String(titleOf(a)).localeCompare(String(titleOf(b))));
    return rs;
  }

  function apply(q){
    const qq = norm(q);
    let filtered = !qq ? items : items.filter(it=>{
      const hay = norm(JSON.stringify(it));
      return qq.split(" ").filter(Boolean).every(p=>hay.includes(p));
    });

    // facets
    for(const f of facets){
      const want = String(f.el.value||"").trim();
      if(!want) continue;
      filtered = filtered.filter(it=>String((it||{})[f.key]||"").trim().toLowerCase() === want.toLowerCase());
    }

    // quick filter
    if(activeQuick && quickFilters && quickFilters.length){
      const qf = quickFilters.find(x=>x.id===activeQuick);
      if(qf && typeof qf.fn === "function"){
        filtered = filtered.filter(qf.fn);
      }
    }

    filtered = sortItems(filtered);

    list.innerHTML = "";
    for(const it of filtered) list.appendChild(renderItem(it));
    if(!filtered.length){
      list.innerHTML = `<div class="muted small" style="padding:12px;">No results.</div>`;
    }

    if(summaryEl){
      summaryEl.textContent = `${filtered.length} result${filtered.length===1?"":"s"}`;
    }
  }

  // bind
  bindSearch(input, btn, apply);
  for(const f of facets){
    f.el.addEventListener("change", ()=>apply((input&&input.value)||""));
  }
  if(sortSel){
    sortSel.addEventListener("change", ()=>apply((input&&input.value)||""));
  }

  apply("");
};

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
function eventCard(e){
  const w=document.createElement("div");
  w.className="item";
  const cover=e.cover||"assets/images/cover_default.jpg";
  const venue=e.venue||"TBA";
  const addr=e.address||"San Cristóbal de las Casas";
  const map=e.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((venue||e.title||"Event")+" "+addr)}`;
  const src=e.source_url||"";
  const priceLabel=!isPaid(e)?"Free":(typeof e.price==="number"?`$${e.price} MXN`:"Paid");
  w.innerHTML=`
    <div class="cover" style="background-image:url('${cover}')"></div>
    <div>
      <h3><a href="event.html?id=${encodeURIComponent(e.id)}">${esc(e.title)}</a></h3>
      <div class="meta">
        <span>🗓️ ${esc(fmtDate(e.date))}</span>
        <span>🕒 ${esc(e.time||"TBA")}</span>
        <span>📍 ${esc(venue)}</span>
      </div>
      <div class="badges">
        <span class="badge accent">${esc(e.category||"General")}</span>
        <span class="badge purple">${esc(priceLabel)}</span>
        ${(e.tags||[]).slice(0,3).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}
        ${e.featured?`<span class="badge accent">Featured</span>`:""}
      </div>
      ${e.description?`<div class="muted small" style="margin-top:8px;">${esc(e.description.length>180?e.description.slice(0,180)+"…":e.description)}</div>`:""}
      ${e.address?`<div class="muted small" style="margin-top:8px;">📍 ${esc(e.address)}</div>`:""}
    </div>
    <div class="actions">
      <a class="btn ghost" target="_blank" rel="noreferrer" href="${map}">Map</a>
      ${src?`<a class="btn ghost" target="_blank" rel="noreferrer" href="${esc(src)}">Source</a>`:""}
      <a class="btn" href="event.html?id=${encodeURIComponent(e.id)}">Details</a>
    </div>`;
  return w;
}
function renderEvents(c,arr){c.innerHTML="";if(!arr.length){c.innerHTML=`<div class="muted small" style="padding:12px;">No events found for selected filters.</div>`;return;}for(const e of arr)c.appendChild(eventCard(e));}
App.initEventsPage=async function(){
  await App.initSite();
  const data=await fetchJson("data/events.json");
  const all=(data.events||[]).slice().sort((a,b)=>{
    const d=String(a.date||"").localeCompare(String(b.date||""));
    if(d) return d;
    const f=(+(b.featured||0)-+(a.featured||0)) || (+(b.priority||0)-+(a.priority||0));
    if(f) return f;
    return String(a.time||"").localeCompare(String(b.time||""));
  });

  const q=$("q"), from=$("from"), to=$("to"), cat=$("category"), price=$("price"), out=$("eventsAll"), btn=$("eventsBtn");
  const quick=$("eventsQuick"), sum=$("eventsSummary");

  // Populate categories
  if(cat){
    [...new Set(all.map(e=>e.category).filter(Boolean))].sort().forEach(c=>{
      const o=document.createElement("option");o.value=c;o.textContent=c;cat.appendChild(o);
    });
  }

  const today=new Date();today.setHours(0,0,0,0);
  const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);

  function inRange(e){
    const ev=parseISO(e.date);
    if(from&&from.value&&ev<parseISO(from.value)) return false;
    if(to&&to.value&&ev>parseISO(to.value)) return false;
    return true;
  }
  function daysFromToday(dt){ return Math.floor((dt.getTime()-today.getTime())/86400000); }

  const quickFilters = [
    { id:"today", label:"Today", fn:(e)=>parseISO(e.date).getTime()===today.getTime() },
    { id:"tomorrow", label:"Tomorrow", fn:(e)=>parseISO(e.date).getTime()===tomorrow.getTime() },
    { id:"weekend", label:"Weekend", fn:(e)=>{const d=parseISO(e.date);const dd=daysFromToday(d);return dd>=0&&dd<=7&&(d.getDay()===0||d.getDay()===6);} },
    { id:"next7", label:"Next 7 days", fn:(e)=>{const d=parseISO(e.date);const dd=daysFromToday(d);return dd>=0&&dd<=7;} },
    { id:"free", label:"Free", fn:(e)=>!isPaid(e) }
  ];

  let activeQuick="";
  if(quick){
    quick.innerHTML="";
    const makeChip=(label,id)=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="chip"+(id===""?" active":"");
      b.textContent=label;
      b.addEventListener("click", ()=>{
        activeQuick=id;
        [...quick.querySelectorAll(".chip")].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        apply();
      });
      quick.appendChild(b);
    };
    makeChip("All","");
    for(const f of quickFilters) makeChip(f.label,f.id);
  }

  function apply(){
    const qq=q?q.value:"";
    const cc=cat?cat.value:"";
    const pp=price?price.value:"";
    let filtered=all.filter(e=>inRange(e) && (!cc||e.category===cc) && matchesPrice(e,pp) && matchesQ(e,qq));

    if(activeQuick){
      const f=quickFilters.find(x=>x.id===activeQuick);
      if(f) filtered=filtered.filter(f.fn);
    }

    renderEvents(out, filtered);
    if(sum) sum.textContent = `${filtered.length} event${filtered.length===1?"":"s"}`;
  }

  // Bind events
  bindSearch(q, btn, ()=>apply());
  [from,to,cat,price].forEach(el=>{
    if(!el) return;
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });

  apply();
};
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

  const input=document.getElementById("searchInput");
  const out=document.getElementById("searchResults");
  const qLabel=document.getElementById("queryLabel");
  const chips=document.getElementById("searchChips");
  const meta=document.getElementById("resultMeta");
  const sortSelect=document.getElementById("sortSelect");
  const form=document.getElementById("searchPageForm");

  const kindLabel={
    "article":"Life",
    "place":"Nature",
    "event":"Events",
    "hotel":"Hotels",
    "restaurant":"Food",
    "music":"Music",
    "faq":"FAQ"
  };
  const kindOrder=["event","restaurant","hotel","music","article","place","faq"];
  const kindOf=(item)=>String(item.type||"").toLowerCase();

  function readState(){
    const params=new URLSearchParams(location.search);
    return {
      q:(params.get("q")||"").trim(),
      t:(params.get("t")||"").toLowerCase().trim(),
      sort:(params.get("sort")||"relevance").toLowerCase().trim()
    };
  }

  function buildUrl(next){
    const u=new URL(location.href);
    const p=u.searchParams;

    const cur=readState();
    const q = (next.q!=null) ? String(next.q||"").trim() : cur.q;
    const t = (next.t!=null) ? String(next.t||"").toLowerCase().trim() : cur.t;
    const sort = (next.sort!=null) ? String(next.sort||"relevance").toLowerCase().trim() : cur.sort;

    if(q) p.set("q", q); else p.delete("q");
    if(t) p.set("t", t); else p.delete("t");
    if(sort && sort!=="relevance") p.set("sort", sort); else p.delete("sort");

    u.search=p.toString();
    return u.pathname + (u.search ? ("?"+u.searchParams.toString()) : "");
  }

  function sortResults(results, sort){
    const rs=[...results];
    if(sort==="az"){
      rs.sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""), undefined, {sensitivity:"base"}));
      return rs;
    }
    if(sort==="featured"){
      rs.sort((a,b)=> (b.featured-a.featured) || (b.priority-a.priority) || String(a.title||"").localeCompare(String(b.title||"")));
      return rs;
    }
    return rs;
  }

  function renderChips(baseResults, activeT){
    if(!chips) return;
    const counts={};
    for(const r of baseResults){
      const k=kindOf(r);
      counts[k]=(counts[k]||0)+1;
    }
    const parts=[];
    parts.push({k:"", label:"All", n:baseResults.length});
    for(const k of kindOrder){
      if(counts[k]) parts.push({k, label:kindLabel[k]||k, n:counts[k]});
    }

    chips.innerHTML="";
    for(const p of parts){
      const b=document.createElement("button");
      b.type="button";
      b.className="chip" + ((p.k===activeT) ? " active" : "");
      b.setAttribute("data-kind", p.k);
      b.innerHTML = `${esc(p.label)} <span class="chip-count">${esc(p.n)}</span>`;
      b.addEventListener("click", ()=>{
        const url=buildUrl({t:p.k});
        history.pushState({}, "", url);
        renderFromUrl();
      });
      chips.appendChild(b);
    }
  }

  function renderCards(q, t, sort){
    if(!out) return;
    out.innerHTML="";

    if(qLabel) qLabel.textContent=q ? `Results for “${q}”` : "Search the portal";

    if(!q){
      if(meta) meta.textContent="Type a few keywords (e.g. “yoga”, “arcotete”, “airport”, “vegan”).";
      out.innerHTML=`<div class="muted small" style="padding:12px;">Start typing to search across events, guides, places, hotels, food, music, and FAQ.</div>`;
      renderChips([], t);
      return;
    }

    const base=Search.query(q,120);
    renderChips(base, t);

    let rs=base;
    if(t) rs = rs.filter(x=>kindOf(x)===t);
    rs = sortResults(rs, sort).slice(0,40);

    if(sortSelect) sortSelect.value=["relevance","featured","az"].includes(sort)?sort:"relevance";

    if(meta){
      const filterText = t ? ` • filtered: ${kindLabel[t]||t}` : "";
      meta.textContent = `${rs.length} of ${base.length} results${filterText}`;
    }

    if(!rs.length){
      out.innerHTML=`<div class="muted small" style="padding:12px;">No results. Try shorter keywords or another category.</div>`;
      return;
    }

    for(const r of rs){
      const kind=kindOf(r);
      const el=document.createElement("a");
      el.className="result-card";
      el.href=r.url;
      el.setAttribute("data-kind", kind);

      const metaLine=r.snippet||"";
      const longLine=r.snippet_long||"";
      const badge = kindLabel[kind] || r.type || "Result";

      el.innerHTML=`
        <div class="rc-cover" style="background-image:url('${esc(r.cover||"assets/images/cover_default.jpg")}')"></div>
        <div class="rc-body">
          <div class="rc-top">
            <span class="rc-badge">${esc(badge)}</span>
            <span class="rc-meta">${esc(metaLine)}</span>
          </div>
          <div class="rc-title">${esc(r.title)}</div>
          <div class="rc-snippet">${esc(longLine||metaLine||"")}</div>
        </div>`;
      out.appendChild(el);
    }
  }

  function renderFromUrl(){
    const st=readState();
    if(input) input.value=st.q;
    renderCards(st.q, st.t, st.sort);
  }

  if(!App._searchPageBound){
    App._searchPageBound=true;

    if(input){
      input.addEventListener("keydown",(e)=>{
        if(e.key==="Enter"){
          e.preventDefault();
          const v=(input.value||"").trim();
          const url=buildUrl({q:v});
          history.pushState({}, "", url);
          renderFromUrl();
        }
      });
    }

    if(form){
      form.addEventListener("submit",(e)=>{
        e.preventDefault();
        const v=(input&&input.value)||"";
        const url=buildUrl({q:v.trim()});
        history.pushState({}, "", url);
        renderFromUrl();
      });
    }

    if(sortSelect){
      sortSelect.addEventListener("change", ()=>{
        const val=(sortSelect.value||"relevance").toLowerCase();
        const url=buildUrl({sort:val});
        history.pushState({}, "", url);
        renderFromUrl();
      });
    }

    window.addEventListener("popstate", renderFromUrl);
  }

  renderFromUrl();
};

window.App=App;})();