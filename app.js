// app.js — Blog Studio Pro++ (FULL)
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function params(){ return new URLSearchParams(location.search); }

function toTitleCase(s){ return (s||"").replace(/(^|\s)\S/g, m => m.toUpperCase()); }
function formatDateISO(iso){
  try{
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
  }catch(e){ return iso; }
}

let CACHE=null;
export async function loadData(){
  if(CACHE) return CACHE;
  const res = await fetch("./posts.json", { cache:"no-store" });
  if(!res.ok) throw new Error("Cannot load posts.json");
  CACHE = await res.json();
  return CACHE;
}
function normalizePosts(posts){
  return (posts||[]).map(p => ({...p, cat:(p.cat||"").toLowerCase(), dateText: p.date?formatDateISO(p.date):""}));
}
function getSite(data){
  return data?.site || { name:"Blog Studio", url:"", description:"", image:"" };
}
function getPopularPosts(data, posts){
  const ids = data?.popular || [];
  const map = new Map(posts.map(p => [p.id, p]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

// Toast
function ensureToast(){
  if($("#toast")) return;
  const t = document.createElement("div");
  t.id="toast"; t.className="toast"; t.textContent="Done";
  document.body.appendChild(t);
}
function toast(msg){
  ensureToast();
  const t = $("#toast");
  t.textContent = msg || "Done";
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove("show"), 1400);
}

// SEO
function ensureMeta(selector, attrs){
  let el = document.head.querySelector(selector);
  if(!el){
    el = document.createElement("meta");
    Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    document.head.appendChild(el);
  }
  return el;
}
function setSEO({ title, description, url, image }){
  if(title) document.title = title;

  let desc = document.head.querySelector('meta[name="description"]');
  if(!desc){
    desc = document.createElement("meta");
    desc.setAttribute("name","description");
    document.head.appendChild(desc);
  }
  if(description) desc.setAttribute("content", description);

  ensureMeta('meta[property="og:title"]', { property:"og:title" }).setAttribute("content", title||"");
  ensureMeta('meta[property="og:description"]', { property:"og:description" }).setAttribute("content", description||"");
  ensureMeta('meta[property="og:type"]', { property:"og:type" }).setAttribute("content", "article");
  if(url) ensureMeta('meta[property="og:url"]', { property:"og:url" }).setAttribute("content", url);
  if(image) ensureMeta('meta[property="og:image"]', { property:"og:image" }).setAttribute("content", image);

  ensureMeta('meta[name="twitter:card"]', { name:"twitter:card" }).setAttribute("content", "summary_large_image");
  ensureMeta('meta[name="twitter:title"]', { name:"twitter:title" }).setAttribute("content", title||"");
  ensureMeta('meta[name="twitter:description"]', { name:"twitter:description" }).setAttribute("content", description||"");
  if(image) ensureMeta('meta[name="twitter:image"]', { name:"twitter:image" }).setAttribute("content", image);
}

// Active menu
function setActiveMenu(){
  const path = (location.pathname||"").toLowerCase();
  const p = params();
  const cat = (p.get("cat") || "").toLowerCase();

  $all(".menu a").forEach(a => a.classList.remove("active"));

  const isHome = path.endsWith("index.html") || path === "/" || path.endsWith("/");
  if(isHome){
    $all('[data-nav="home"]').forEach(a => a.classList.add("active"));
    return;
  }
  if(path.endsWith("category.html")){
    if(cat) $all(`[data-nav="cat-${cat}"]`).forEach(a => a.classList.add("active"));
    return;
  }
  if(path.endsWith("post.html")){
    const guessed = cat ? cat : "";
    if(guessed) $all(`[data-nav="cat-${guessed}"]`).forEach(a => a.classList.add("active"));
  }
}

// Lazy-load images
function initLazyImages(){
  const imgs = $all("img[data-src]");
  if(!imgs.length) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      const img = e.target;
      const src = img.getAttribute("data-src");
      if(src){
        img.src = src;
        img.onload = () => img.classList.add("is-loaded");
        img.removeAttribute("data-src");
      }
      obs.unobserve(img);
    });
  }, { rootMargin: "220px" });

  imgs.forEach(img => io.observe(img));
}

// Highlight
function highlight(text, q){
  if(!q) return escapeHtml(text);
  const safe = escapeHtml(text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return safe.replace(re, '<mark class="hl">$1</mark>');
}

// Pager
function buildPager({ page, totalPages, makeUrl }){
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const nums = [];
  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);

  if(start > 1) nums.push(1);
  if(start > 2) nums.push("…");
  for(let i=start;i<=end;i++) nums.push(i);
  if(end < totalPages - 1) nums.push("…");
  if(end < totalPages) nums.push(totalPages);

  const btn = (label, p, disabled=false, active=false) => {
    const cls = ["page", active ? "active": "", disabled ? "disabled" : ""].filter(Boolean).join(" ");
    const href = disabled ? "#" : makeUrl(p);
    return `<a class="${cls}" href="${href}" aria-disabled="${disabled ? "true":"false"}">${label}</a>`;
  };

  return `
    <div class="pages">
      ${btn("‹", page-1, prevDisabled)}
      ${nums.map(n => n === "…" ? `<span class="page disabled">…</span>` : btn(String(n), n, false, n === page)).join("")}
      ${btn("›", page+1, nextDisabled)}
    </div>
  `;
}

// Cards
function postCard(p, q){
  const tag = p.tags?.[0] ? `#${p.tags[0]}` : "#blog";
  const badge = escapeHtml(p.badge || toTitleCase(p.cat));
  const cover = p.cover ? `<img data-src="${escapeHtml(p.cover)}" alt="${escapeHtml(p.title)}" />` : "";
  return `
    <article class="card">
      <div class="thumb">
        <div class="badge">${badge}</div>
        ${cover}
      </div>
      <div class="card-body">
        <div class="meta">
          <span>${escapeHtml(p.dateText||"")}</span> • <span>${escapeHtml(p.read||"")}</span> • <span>${escapeHtml(p.topic||"")}</span>
        </div>
        <h2 class="title">${highlight(p.title, q)}</h2>
        <p class="excerpt">${highlight(p.excerpt||"", q)}</p>
      </div>
      <div class="card-foot">
        <a class="read" href="./post.html?id=${encodeURIComponent(p.id)}">Read More →</a>
        <a class="tag" href="./category.html?cat=${encodeURIComponent(p.cat)}">${escapeHtml(tag)}</a>
      </div>
    </article>
  `;
}
function popularItem(p){
  return `
    <a class="item" href="./post.html?id=${encodeURIComponent(p.id)}">
      <div class="dot"></div>
      <div>
        <b>${escapeHtml(p.title)}</b>
        <span>${escapeHtml((p.badge||toTitleCase(p.cat)) + " • " + (p.read||""))}</span>
      </div>
    </a>
  `;
}

// TOC build
function buildTOC(){
  const body = $("#body");
  const wrap = $("#tocWrap");
  if(!body || !wrap) return;

  const headings = $all("h2, h3", body);
  if(!headings.length) return;

  headings.forEach((h, i) => { if(!h.id) h.id = `h-${i+1}`; });

  const items = headings.map(h => {
    const indent = h.tagName.toLowerCase() === "h3" ? "indent" : "";
    return `<a class="${indent}" href="#${h.id}">${escapeHtml(h.textContent || "")}</a>`;
  }).join("");

  wrap.innerHTML = `<div class="toc"><h3>Table of contents</h3>${items}</div>`;
}

// TOC Spy + smooth scroll
function initTOCSpy(){
  const toc = document.querySelector(".toc");
  if(!toc) return;

  const links = Array.from(toc.querySelectorAll("a[href^='#']"));
  const heads = links
    .map(a => document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))))
    .filter(Boolean);

  if(!heads.length) return;

  links.forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = decodeURIComponent(a.getAttribute("href").slice(1));
      const el = document.getElementById(id);
      if(!el) return;
      const topbar = document.querySelector(".topbar");
      const offset = (topbar?.offsetHeight || 72) + 14;
      const y = window.scrollY + el.getBoundingClientRect().top - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(!visible.length) return;
    const id = visible[0].target.id;
    links.forEach(a => a.classList.remove("active"));
    const hit = links.find(a => decodeURIComponent(a.getAttribute("href").slice(1)) === id);
    hit?.classList.add("active");
  }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.15,0.35,0.55,0.75] });

  heads.forEach(h => io.observe(h));
}

// Reading progress
function initReadingProgress(){
  const bar = document.getElementById("progress");
  const article = document.querySelector(".article");
  if(!bar || !article) return;

  function update(){
    const total = article.scrollHeight - window.innerHeight;
    const scrolled = Math.max(0, window.scrollY);
    const pct = total > 0 ? Math.min(1, scrolled / total) : 0;
    bar.style.width = (pct * 100).toFixed(2) + "%";
  }
  update();
  window.addEventListener("scroll", update, { passive:true });
  window.addEventListener("resize", update);
}

// -------- Common init --------
export async function initCommon(){
  const y = $("#year");
  if(y) y.textContent = new Date().getFullYear();

  const root = document.body;
  const saved = localStorage.getItem("theme");
  if(saved) root.setAttribute("data-theme", saved);

  const btnTheme = $("#btnTheme");
  if(btnTheme){
    btnTheme.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  const btnMenu = $("#btnMenu");
  const drawer = $("#drawer");
  if(btnMenu && drawer){
    btnMenu.addEventListener("click", () => drawer.classList.toggle("show"));
    $all(".menu.mobile a").forEach(a => a.addEventListener("click", () => drawer.classList.remove("show")));
  }
// Donate Modal
const btnDonate = document.getElementById("btnDonate");
const modal = document.getElementById("donateModal");

function openModal(){
  if(!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

btnDonate?.addEventListener("click", openModal);

modal?.addEventListener("click", (e) => {
  const t = e.target;
  if(t?.dataset?.close === "true") closeModal();
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeModal();
});

// Copy ABA ID
document.getElementById("btnCopyPay")?.addEventListener("click", async () => {
  const abaId = "xxxxxx"; // <-- change to your ABA ID
  try{
    await navigator.clipboard.writeText(abaId);
    toast?.("Copied ✅"); // uses your existing toast in app.js
  }catch(err){
    alert("Copy failed");
  }
});
  ensureToast();
  setActiveMenu();
}

// -------- Index --------
export async function initIndex(){
  const data = await loadData();
  const site = getSite(data);
  const posts = normalizePosts(data.posts);

  setSEO({
    title: `${site.name} • Home`,
    description: site.description || "Modern Blog UI",
    url: site.url || "",
    image: site.image || ""
  });

  const p = params();
  const page = Math.max(1, Number(p.get("page") || "1"));
  const q = (p.get("q") || "").trim().toLowerCase();
  const cat = (p.get("cat") || "all").toLowerCase();

  const qInput = $("#q");
  if(qInput) qInput.value = p.get("q") || "";

  const chips = $all(".chip");
  chips.forEach(c => c.classList.remove("active"));
  (chips.find(x => (x.getAttribute("data-filter")||"all")===cat) || chips[0])?.classList.add("active");

  const filtered = posts.filter(x => {
    const okCat = cat === "all" || x.cat === cat;
    const okQ = !q || x.title.toLowerCase().includes(q) || (x.excerpt||"").toLowerCase().includes(q);
    return okCat && okQ;
  });

  const perPage = 6;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const pageItems = filtered.slice(startIndex, startIndex + perPage);

  const postsEl = $("#posts");
  if(postsEl){
    postsEl.innerHTML = pageItems.map(x => postCard(x, q)).join("") || `
      <div class="panel" style="grid-column:1/-1">
        <h3 style="margin:0 0 6px">No posts found</h3>
        <p style="margin:0;color:var(--muted)">Try another keyword or category.</p>
      </div>
    `;
  }

  const popularEl = $("#popular");
  const popularPosts = getPopularPosts(data, posts);
  if(popularEl) popularEl.innerHTML = popularPosts.map(popularItem).join("");

  const pagerEl = $("#pager");
  const pagerInfo = $("#pagerInfo");
  if(pagerInfo){
    const a = total ? (startIndex + 1) : 0;
    const b = Math.min(startIndex + perPage, total);
    pagerInfo.textContent = `Showing ${a}–${b} of ${total} posts`;
  }
  if(pagerEl){
    const makeUrl = (pg) => {
      const u = new URL(location.href);
      u.searchParams.set("page", String(pg));
      if(cat && cat !== "all") u.searchParams.set("cat", cat); else u.searchParams.delete("cat");
      if(q) u.searchParams.set("q", q); else u.searchParams.delete("q");
      return u.pathname + u.search;
    };
    pagerEl.innerHTML = buildPager({ page: safePage, totalPages, makeUrl });
  }

  function go(next){
    const u = new URL(location.href);
    u.searchParams.set("page", "1");
    if(next.cat && next.cat !== "all") u.searchParams.set("cat", next.cat); else u.searchParams.delete("cat");
    if(next.q) u.searchParams.set("q", next.q); else u.searchParams.delete("q");
    location.href = u.pathname + u.search;
  }

  chips.forEach(c => c.addEventListener("click", () => go({ cat: c.getAttribute("data-filter") || "all", q })));

  if(qInput){
    let t;
    qInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(()=> go({ cat, q: (qInput.value||"").trim().toLowerCase() }), 250);
    });
  }

  initLazyImages();
}

// -------- Category --------
export async function initCategory(){
  const data = await loadData();
  const site = getSite(data);
  const posts = normalizePosts(data.posts);

  const p = params();
  const cat = (p.get("cat") || "all").toLowerCase();
  const page = Math.max(1, Number(p.get("page") || "1"));
  const q = (p.get("q") || "").trim().toLowerCase();

  setSEO({
    title: `${site.name} • Category: ${cat}`,
    description: site.description || "Category page",
    url: site.url || "",
    image: site.image || ""
  });

  const catName = $("#catName");
  if(catName) catName.textContent = cat === "all" ? "All" : cat;

  const qInput = $("#q");
  if(qInput) qInput.value = p.get("q") || "";

  const filtered = posts.filter(x => {
    const okCat = cat === "all" || x.cat === cat;
    const okQ = !q || x.title.toLowerCase().includes(q) || (x.excerpt||"").toLowerCase().includes(q);
    return okCat && okQ;
  });

  const perPage = 8;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const pageItems = filtered.slice(startIndex, startIndex + perPage);

  const postsEl = $("#posts");
  if(postsEl){
    postsEl.innerHTML = pageItems.map(x => postCard(x, q)).join("") || `
      <div class="panel" style="grid-column:1/-1">
        <h3 style="margin:0 0 6px">No posts found</h3>
        <p style="margin:0;color:var(--muted)">Try another keyword.</p>
      </div>
    `;
  }

  const pagerEl = $("#pager");
  const pagerInfo = $("#pagerInfo");
  if(pagerInfo){
    const a = total ? (startIndex + 1) : 0;
    const b = Math.min(startIndex + perPage, total);
    pagerInfo.textContent = `Showing ${a}–${b} of ${total} posts`;
  }
  if(pagerEl){
    const makeUrl = (pg) => {
      const u = new URL(location.href);
      u.searchParams.set("page", String(pg));
      u.searchParams.set("cat", cat);
      if(q) u.searchParams.set("q", q); else u.searchParams.delete("q");
      return u.pathname + u.search;
    };
    pagerEl.innerHTML = buildPager({ page: safePage, totalPages, makeUrl });
  }

  if(qInput){
    let t;
    qInput.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const u = new URL(location.href);
        u.searchParams.set("page","1");
        u.searchParams.set("cat", cat);
        const v = (qInput.value||"").trim().toLowerCase();
        if(v) u.searchParams.set("q", v); else u.searchParams.delete("q");
        location.href = u.pathname + u.search;
      }, 250);
    });
  }

  initLazyImages();
}

// -------- Post --------
export async function initPost(){
  const data = await loadData();
  const site = getSite(data);
  const posts = normalizePosts(data.posts);

  const p = params();
  const id = Number(p.get("id") || "1");
  const post = posts.find(x => x.id === id) || posts[0];

  const base = site.url || "";
  const canonical = base ? `${base.replace(/\/$/,"")}/post.html?id=${encodeURIComponent(post.id)}` : "";

  setSEO({
    title: `${post.title} • ${site.name}`,
    description: post.excerpt || site.description || "",
    url: canonical || "",
    image: post.cover || site.image || ""
  });

  const badge = $("#badge");
  const meta = $("#meta");
  const title = $("#title");
  const body = $("#body");
  const btnCat = $("#btnCat");
  const btnBack = $("#btnBack");
  const btnNext = $("#btnNext");

  if(badge) badge.textContent = post.badge || toTitleCase(post.cat);
  if(meta) meta.innerHTML = `<span>${escapeHtml(post.dateText||"")}</span> • <span>${escapeHtml(post.read||"")}</span> • <span>${escapeHtml(post.topic||"")}</span>`;
  if(title) title.textContent = post.title;

  if(body){
    body.innerHTML = post.bodyHtml || "";
    buildTOC();
    initTOCSpy();
  }

  initReadingProgress();

  if(btnCat) btnCat.href = `./category.html?cat=${encodeURIComponent(post.cat)}`;
  if(btnBack) btnBack.href = document.referrer ? document.referrer : "./index.html";

  const idx = posts.findIndex(x => x.id === post.id);
  const next = posts[(idx + 1) % posts.length];
  if(btnNext) btnNext.href = `./post.html?id=${encodeURIComponent(next.id)}`;

  const relatedEl = $("#related");
  const rel = posts.filter(x => x.cat === post.cat && x.id !== post.id).slice(0, 2);
  const list = rel.length ? rel : posts.filter(x => x.id !== post.id).slice(0, 2);
  if(relatedEl){
    relatedEl.innerHTML = list.map(x => `
      <a class="rel" href="./post.html?id=${encodeURIComponent(x.id)}">
        <div style="color:var(--muted);font-weight:1000;font-size:12px">${escapeHtml(x.badge||toTitleCase(x.cat))} • ${escapeHtml(x.read||"")}</div>
        <div style="margin-top:6px;font-weight:1000">${escapeHtml(x.title)}</div>
        <div style="margin-top:6px;color:var(--muted);font-size:13px">${escapeHtml(x.excerpt||"")}</div>
      </a>
    `).join("");
  }

  // Share
  const shareUrl = canonical || location.href;
  const btnCopy = $("#btnCopy");
  const btnFb = $("#btnFb");
  if(btnCopy){
    btnCopy.addEventListener("click", async () => {
      try{ await navigator.clipboard.writeText(shareUrl); toast("Copied link ✅"); }
      catch(e){ toast("Copy failed"); }
    });
  }
  if(btnFb){
    btnFb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    btnFb.target = "_blank";
    btnFb.rel = "noopener";
  }
}

