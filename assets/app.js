const App={};

async function loadJSON(path){return fetch(path).then(r=>r.json());}

App.loadArticles=async()=>{
  const data=await loadJSON('data/articles.json');
  const box=document.getElementById('articlesList');
  box.innerHTML=data.articles.map(a=>`<div class="item"><h3>${a.title}</h3><p>${a.excerpt}</p></div>`).join('');
};

App.loadFAQ=async()=>{
  const data=await loadJSON('data/faq.json');
  const box=document.getElementById('faqList');
  box.innerHTML=data.faq.map(f=>`<div class="item"><b>${f.q}</b><p>${f.a}</p></div>`).join('');
};

App.loadPlaces=async()=>{
  const data=await loadJSON('data/places.json');
  const box=document.getElementById('placesList');
  box.innerHTML=data.places.map(p=>`<div class="item"><h3>${p.title}</h3><p>${p.description}</p></div>`).join('');
};

App.loadHotels=async()=>{
  const data=await loadJSON('data/hotels.json');
  const box=document.getElementById('hotelsList');
  box.innerHTML=data.hotels.map(h=>`<div class="item"><h3>${h.name}</h3><p>${h.area} • ${h.price}</p></div>`).join('');
};

App.loadRestaurants=async()=>{
  const data=await loadJSON('data/restaurants.json');
  const box=document.getElementById('restaurantsList');
  box.innerHTML=data.restaurants.map(r=>`<div class="item"><h3>${r.name}</h3><p>${r.type}</p></div>`).join('');
};

App.loadMusic=async()=>{
  const data=await loadJSON('data/music.json');
  const box=document.getElementById('musicList');
  box.innerHTML=data.music.map(m=>`<div class="item"><h3>${m.place}</h3><p>${m.genre}</p></div>`).join('');
};
