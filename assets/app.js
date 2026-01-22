(function () {
  const App = {};
  const $ = (id) => document.getElementById(id);
  async function fetchJson(url){const r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw new Error(url); return r.json();}
  async function fetchText(url){const r=await fetch(url,{cache:"no-store"}); if(!r.ok) return ""; return r.text();}
  const norm=(s)=>(s||"").toLowerCase().replace(/\s+/g," ").trim();
  const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  function setActiveNav(){const path=location.pathname.split("/").pop()||"index.html"; document.querySelectorAll(".nav a").forEach(a=>{if(a.getAttribute("href")==path)a.classList.add("active");});}
  function setYear(){const y=$("year"); if(y)y.textContent=String(new Date().getFullYear());}
  App.initSite=function(){setActiveNav(); setYear();};

  async function buildIndex(){
    const [A,P,F,H,R,M,E]=await Promise.all([
      fetchJson("data/articles.json"),fetchJson("data/places.json"),fetchJson("data/faq.json"),
      fetchJson("data/hotels.json"),fetchJson("data/restaurants.json"),fetchJson("data/music.json"),fetchJson("data/events.json")
    ]);
    const items=[];
    for(const a of (A.articles||[])){
      const md=await fetchText(`posts/${a.slug}.md`);
      items.push({type:"Article",title:a.title,url:`post.html?slug=${encodeURIComponent(a.slug)}`,text:norm([a.title,a.excerpt,a.category,(a.tags||[]).join(" "),md].join(" ")),featured:!!a.featured,priority:+(a.priority||0),snippet:a.excerpt||""});
    }
    for(const p of (P.places||[])){
      const md=await fetchText(`posts/${p.slug}.md`);
      items.push({type:"Place",title:p.title,url:`post.html?slug=${encodeURIComponent(p.slug)}`,text:norm([p.title,p.excerpt,p.distance,p.category,(p.tags||[]).join(" "),md].join(" ")),featured:!!p.featured,priority:+(p.priority||0),snippet:p.excerpt||""});
    }
    for(const f of (F.faq||[])){
      items.push({type:"FAQ",title:f.q,url:`faq.html#${encodeURIComponent(f.id||"")}`,text:norm([f.q,f.a,(f.tags||[]).join(" ")].join(" ")),featured:!!f.featured,priority:+(f.priority||0),snippet:(f.a||"").slice(0,140)});
    }
    for(const h of (H.hotels||[])){
      items.push({type:"Hotel",title:h.name,url:`hotels.html#${encodeURIComponent(h.id||"")}`,text:norm([h.name,h.type,h.price,h.area,(h.tags||[]).join(" ")].join(" ")),featured:!!h.featured,priority:+(h.priority||0),snippet:`${h.type||"Hotel"} • ${h.area||""} • ${h.price||""}`});
    }
    for(const r of (R.restaurants||[])){
      items.push({type:"Restaurant",title:r.name,url:`restaurants.html#${encodeURIComponent(r.id||"")}`,text:norm([r.name,r.type,r.price,r.area,(r.tags||[]).join(" ")].join(" ")),featured:!!r.featured,priority:+(r.priority||0),snippet:`${r.type||"Food"} • ${r.area||""} • ${r.price||""}`});
    }
    for(const m of (M.music||[])){
      items.push({type:"Music",title:m.place,url:`music.html#${encodeURIComponent(m.id||"")}`,text:norm([m.place,m.genre,(m.tags||[]).join(" ")].join(" ")),featured:!!m.featured,priority:+(m.priority||0),snippet:m.genre||""});
    }
    for(const e of (E.events||[])){
      items.push({type:"Event",title:e.title,url:`event.html?id=${encodeURIComponent(e.id)}`,text:norm([e.title,e.description,e.category,e.venue,e.address,e.date,e.time,(e.tags||[]).join(" ")].join(" ")),featured:!!e.featured,priority:+(e.priority||0),snippet:`${e.date} • ${e.time||"TBA"} • ${e.venue||""}`});
    }
    items.sort((a,b)=>(b.featured-a.featured)||(b.priority-a.priority)||a.title.localeCompare(b.title));
    return items;
  }
  function renderResults(container, results){
    container.innerHTML="";
    if(!results.length){container.innerHTML='<div class="muted small" style="padding:12px;">No results.</div>';return;}
    for(const r of results){
      const el=document.createElement("div"); el.className="result";
      el.innerHTML=`<div class="type">${esc(r.type)}</div><div class="title"><a href="${esc(r.url)}">${esc(r.title)}</a></div><div class="snippet">${esc(r.snippet||"")}</div>`;
      container.appendChild(el);
    }
  }
  App.initHome=async function({submitUrl,communityUrl}){
    App.initSite();
    const items=await buildIndex();
    const submit=$("submitLink"); if(submit&&submitUrl) submit.href=submitUrl;
    const comm=$("communityLink"); if(comm&&communityUrl) comm.href=communityUrl;
    const featured=$("featuredList"); if(featured) renderResults(featured, items.filter(x=>x.featured).slice(0,8));
    const input=$("globalSearch"), out=$("globalResults");
    function apply(){
      const q=norm(input.value); if(!q){out.innerHTML=""; return;}
      const parts=q.split(" ").filter(Boolean);
      const res=items.filter(it=>parts.every(p=>it.text.includes(p))).slice(0,20);
      renderResults(out,res);
    }
    input.addEventListener("input",apply);
  };

  App.initListPage=async function({dataset,searchInputId,listId,renderItem}){
    App.initSite();
    const data=await fetchJson(dataset);
    const items=(Object.values(data)[0]||[]).slice();
    const input=$(searchInputId), list=$(listId);
    function apply(){
      const q=norm(input.value);
      const filtered=!q?items:items.filter(it=>q.split(" ").filter(Boolean).every(p=>norm(JSON.stringify(it)).includes(p)));
      list.innerHTML="";
      for(const it of filtered) list.appendChild(renderItem(it));
      if(!filtered.length) list.innerHTML='<div class="muted small" style="padding:12px;">No results.</div>';
    }
    input.addEventListener("input",apply); apply();
  };

  App.initFAQ=async function(){
    App.initSite();
    const data=await fetchJson("data/faq.json"); const items=(data.faq||[]).slice();
    const input=$("faqSearch"), list=$("faqList");
    function render(it){
      const wrap=document.createElement("div"); wrap.className="item"; wrap.id=it.id||"";
      wrap.innerHTML=`<div><h3 style="margin:0 0 6px 0;">${esc(it.q)}</h3><div class="muted small">${esc(it.a)}</div><div class="badges">${(it.tags||[]).slice(0,4).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}${it.featured?`<span class="badge accent">Featured</span>`:""}</div></div>`;
      return wrap;
    }
    function apply(){
      const q=norm(input.value);
      const filtered=!q?items:items.filter(it=>q.split(" ").filter(Boolean).every(p=>norm([it.q,it.a,(it.tags||[]).join(" ")].join(" ")).includes(p)));
      list.innerHTML=""; for(const it of filtered) list.appendChild(render(it));
      if(!filtered.length) list.innerHTML='<div class="muted small" style="padding:12px;">No results.</div>';
    }
    input.addEventListener("input",apply); apply();
  };

  App.initPost=async function(){
    App.initSite();
    const params=new URLSearchParams(location.search); const slug=params.get("slug")||"welcome";
    const container=$("postBody"); const md=await fetchText(`posts/${slug}.md`);
    container.innerHTML=window.marked?window.marked.parse(md||"# Not found"):("<pre>"+esc(md||"")+"</pre>");
  };

  function parseISO(d){const [y,m,dd]=d.split("-").map(Number); const dt=new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt;}
  function fmt(d){return parseISO(d).toLocaleDateString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"});}
  function isPaid(e){return !(e.price===0 || (typeof e.price==="string" && norm(e.price)==="free"));}
  function evCard(e){
    const wrap=document.createElement("div"); wrap.className="item";
    wrap.innerHTML=`<div><h3>${esc(e.title)}</h3><div class="meta"><span>🗓️ ${esc(fmt(e.date))}</span><span>🕒 ${esc(e.time||"TBA")}</span><span>📍 ${esc(e.venue||"TBA")}</span></div>
    <div class="badges"><span class="badge accent">${esc(e.category||"General")}</span><span class="badge purple">${esc(!isPaid(e)?"Free":(typeof e.price==="number"?`$${e.price} MXN`:"Paid"))}</span>${(e.tags||[]).slice(0,3).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}${e.featured?`<span class="badge accent">Featured</span>`:""}</div>
    ${e.description?`<div class="muted small" style="margin-top:8px;">${esc(e.description.length>160?e.description.slice(0,160)+"…":e.description)}</div>`:""}</div>
    <div style="display:grid;place-items:center;"><a class="btn" href="event.html?id=${encodeURIComponent(e.id)}">Details</a></div>`;
    return wrap;
  }
  App.initEventsPage=async function({eventsUrl}){
    App.initSite();
    const data=await fetchJson(eventsUrl); const all=(data.events||[]).slice().sort((a,b)=>a.date>b.date?1:-1);
    const q=$("q"), from=$("from"), to=$("to"), cat=$("category"), price=$("price"), out=$("eventsAll");
    const cats=[...new Set(all.map(e=>e.category).filter(Boolean))].sort(); for(const c of cats){const o=document.createElement("option"); o.value=c; o.textContent=c; cat.appendChild(o);}
    function apply(){
      const qq=q.value||""; const cc=cat.value||""; const pp=price.value||"";
      const filtered=all.filter(e=>{
        const ev=parseISO(e.date);
        if(from.value && ev<parseISO(from.value)) return false;
        if(to.value && ev>parseISO(to.value)) return false;
        if(cc && e.category!==cc) return false;
        if(pp==="free" && isPaid(e)) return false;
        if(pp==="paid" && !isPaid(e)) return false;
        if(qq && !norm([e.title,e.description,e.venue,e.address,e.category,(e.tags||[]).join(" ")].join(" ")).includes(norm(qq))) return false;
        return true;
      });
      out.innerHTML=""; for(const e of filtered) out.appendChild(evCard(e));
      if(!filtered.length) out.innerHTML='<div class="muted small" style="padding:12px;">No events found for selected filters.</div>';
    }
    [q,from,to,cat,price].forEach(el=>{el.addEventListener("input",apply); el.addEventListener("change",apply);});
    apply();
  };
  App.initEventDetails=async function({eventsUrl}){
    App.initSite();
    const id=new URLSearchParams(location.search).get("id");
    const data=await fetchJson(eventsUrl); const e=(data.events||[]).find(x=>String(x.id)===String(id));
    const box=$("eventDetails"); if(!e){box.innerHTML="<h1>Event not found</h1><p class='muted'>Wrong or missing event id.</p>"; return;}
    const priceText=!isPaid(e)?"Free":(typeof e.price==="number"?`$${e.price} MXN`:"Paid");
    box.innerHTML=`<h1 style="margin:0;">${esc(e.title)}</h1><div class="meta"><span>🗓️ ${esc(fmt(e.date))}</span><span>🕒 ${esc(e.time||"TBA")}</span><span>🏷️ ${esc(e.category||"General")}</span></div>
    <div class="badges"><span class="badge accent">📍 ${esc(e.venue||"TBA")}</span><span class="badge">🧭 ${esc(e.address||"Address not provided")}</span><span class="badge purple">💰 ${esc(priceText)}</span>${e.featured?`<span class="badge accent">Featured</span>`:""}</div>
    ${e.description?`<div class="muted" style="margin-top:10px;">${esc(e.description).replace(/\n/g,"<br/>")}</div>`:""}
    <div class="filters" style="margin-top:12px;">${e.contact?`<div class="muted small">Contact: ${esc(e.contact)}</div>`:""}${e.source_url?`<a class="btn ghost" href="${esc(e.source_url)}" target="_blank" rel="noreferrer">Source / flyer</a>`:""}</div>`;
  };

  window.App = App;
})();