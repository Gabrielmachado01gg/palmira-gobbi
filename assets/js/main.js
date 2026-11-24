/* Associação Palmira Gobbi — interações do site
   Sem dependências. Os cães vêm da planilha do Google (ver assets/js/config.js);
   se ela não responder, o site usa a lista de assets/js/caes.js. */
(() => {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CFG = window.SITE_CONFIG || {};
  const ROOT = document.body.dataset.root || "";
  const INSTA_DM = "https://ig.me/m/abrigopalmiragobbi";

  /* ---------- Aviso rápido (toast) ---------- */
  const toast = $(".toast");
  let toastTimer;
  function showToast(text) {
    if (!toast) return;
    $("span", toast).textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2400);
  }

  /* ---------- Cabeçalho: borda ao rolar ---------- */
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Menu no celular ---------- */
  const menuBtn = $(".menu-btn");
  const nav = $("#menu");
  if (menuBtn && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };
    menuBtn.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    $$("a", nav).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  /* ---------- Copiar texto (vale também para botões criados depois) ---------- */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
    }
    showToast(btn.dataset.copied || "Copiado");
  });

  /* ---------- Links de WhatsApp com mensagem pronta ---------- */
  function applyWhats(scope = document) {
    const num = String(CFG.whatsapp || "").replace(/\D/g, "");
    $$("[data-whats]", scope).forEach((a) => {
      const msg = a.dataset.msg || "";
      a.href = num ? `https://wa.me/${num}${msg ? "?text=" + encodeURIComponent(msg) : ""}` : INSTA_DM;
    });
  }
  applyWhats();

  /* =========================================================
     CÃES: leitura da planilha
     ========================================================= */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // CSV com aspas, vírgulas e quebras de linha dentro das células
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // Link do Google Drive vira link de imagem; nome de arquivo aponta para a pasta do site
  function photoURL(v) {
    v = String(v || "").trim();
    if (!v) return "";
    const drive = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/) || v.match(/[?&]id=([\w-]{10,})/);
    if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}=w1200`;
    if (/^https?:\/\//.test(v)) return v;
    return `${ROOT}assets/img/caes/${v}`;
  }

  function toDog(r) {
    const name = (r[1] || "").trim();
    if (!name) return null;
    const female = norm(r[2]).startsWith("f");
    const photos = [r[6], ...String(r[7] || "").split(/[,\n]/)].map(photoURL).filter(Boolean);
    return {
      status: norm(r[0]),
      name, id: slug(name), female,
      art: female ? "a" : "o", pron: female ? "ela" : "ele", dele: female ? "dela" : "dele",
      short: (r[3] || "").trim(),
      story: (r[4] || "").trim(),
      traits: String(r[5] || "").split(",").map((t) => t.trim()).filter(Boolean),
      photos: photos.length ? photos : [`${ROOT}assets/img/logo.png`],
    };
  }

  async function loadDogs() {
    let rows = null;
    if (CFG.planilhaCSV) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const sep = CFG.planilhaCSV.includes("?") ? "&" : "?";
        const res = await fetch(`${CFG.planilhaCSV}${sep}_=${Date.now()}`, { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(timer);
        if (res.ok) rows = parseCSV(await res.text()).slice(1);
      } catch { rows = null; }
    }
    if (!rows) rows = window.CAES_PADRAO || [];
    return rows.map(toDog).filter((d) => d && d.status.startsWith("dispon"));
  }

  /* ---------- Contagem por extenso nos textos ---------- */
  const WORDS = ["nenhum", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze"];
  function paintCounts(n) {
    const w = WORDS[n] || String(n);
    const W = w.charAt(0).toUpperCase() + w.slice(1);
    $$("[data-count]").forEach((el) => {
      const tpl = n === 0 ? el.dataset.zero : n === 1 ? el.dataset.one : el.dataset.many;
      if (tpl) el.innerHTML = tpl.replaceAll("{w}", w).replaceAll("{W}", W).replaceAll("{n}", n);
    });
  }

  /* ---------- Modelos de HTML ---------- */
  const ICON = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const dogURL = (d) => `${ROOT}cao.html?c=${encodeURIComponent(d.id)}`;

  const cardHTML = (d) => `
    <a class="dog-card" href="${dogURL(d)}">
      <div class="photo" style="view-transition-name:foto-${d.id}">
        <img src="${esc(d.photos[0])}" alt="${esc(d.name)}" loading="lazy">
        ${d.photos[1] ? `<img src="${esc(d.photos[1])}" alt="" loading="lazy">` : ""}
      </div>
      <div class="info">
        <div><h3>${esc(d.name)}</h3><p>${esc(d.short)}</p></div>
        <span class="go">${ICON("arrow-right")}</span>
      </div>
    </a>`;

  const deckCardHTML = (d, i) => `
    <figure class="deck-card" data-pos="${i}">
      <img src="${esc(d.photos[0])}" alt="${esc(d.name)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <figcaption><strong>${esc(d.name)}</strong><a href="${dogURL(d)}">Conhecer</a></figcaption>
    </figure>`;

  const emptyHTML = `
    <div class="note" style="grid-column:1/-1">${ICON("heart")}<p>Todos os cães foram adotados! Novos cães aparecem aqui assim que chegarem. Acompanhe pelo Instagram <a href="https://www.instagram.com/abrigopalmiragobbi/" target="_blank" rel="noopener">@abrigopalmiragobbi</a>.</p></div>`;

  function renderLists(dogs) {
    paintCounts(dogs.length);
    $$("[data-dogs-grid]").forEach((g) => { g.innerHTML = dogs.length ? dogs.map(cardHTML).join("") : emptyHTML; g.classList.remove("is-loading"); });
    $$("[data-dogs-faces]").forEach((f) => { f.innerHTML = dogs.slice(0, 8).map((d) => `<img src="${esc(d.photos[0])}" alt="" loading="lazy">`).join(""); });
    const deck = $(".deck");
    if (deck) {
      const wrap = deck.closest(".deck-wrap");
      if (!dogs.length) { wrap.hidden = true; return; }
      deck.innerHTML = dogs.map(deckCardHTML).join("");
      deck.classList.remove("is-loading");
      $(".deck-controls", wrap).hidden = dogs.length < 2;
      $(".deck-hint", wrap).hidden = dogs.length < 2;
      initDeck(deck);
    }
  }

  /* ---------- Página de um cão (cao.html?c=nome) ---------- */
  function renderDogPage(dogs) {
    const host = $("[data-dog-page]");
    if (!host) return;
    const id = new URLSearchParams(location.search).get("c") || "";
    const k = dogs.findIndex((d) => d.id === slug(id));
    if (k < 0) {
      document.title = "Cão não encontrado | Associação Palmira Gobbi";
      host.innerHTML = `
        <div class="dog-info" style="grid-column:1/-1;max-width:640px">
          <h1>Este cão já encontrou uma família ❤️</h1>
          <p class="story">Ou o link está incompleto. Veja os cães que ainda esperam por um lar.</p>
          <div class="actions"><a class="btn btn-primary" href="${ROOT}caes.html">${ICON("paw")}Ver os cães</a></div>
        </div>`;
      host.classList.remove("is-loading");
      return;
    }
    const d = dogs[k], prev = dogs[(k - 1 + dogs.length) % dogs.length], next = dogs[(k + 1) % dogs.length];
    const msg = `Oi! Vi ${d.art} ${d.name} no site e quero saber mais sobre a adoção ${d.dele}.`;
    document.title = `${d.name} | Associação Palmira Gobbi`;
    $('meta[name="description"]')?.setAttribute("content", `${d.name}: ${d.short} Disponível para adoção na Associação Palmira Gobbi, em Canoas (RS).`);
    host.innerHTML = `
      <div class="gallery">
        <div class="gallery-main" style="view-transition-name:foto-${d.id}">
          <img src="${esc(d.photos[0])}" alt="Foto 1 d${d.art} ${esc(d.name)}" fetchpriority="high">
        </div>
        ${d.photos.length > 1 ? `<div class="thumbs">${d.photos.map((p, j) => `
          <button aria-pressed="${j === 0}" data-src="${esc(p)}" data-alt="Foto ${j + 1} d${d.art} ${esc(d.name)}" aria-label="Ver foto ${j + 1}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="dog-info">
        <h1>${esc(d.name)}</h1>
        ${d.story ? `<p class="story">${esc(d.story).replace(/\n+/g, "<br>")}</p>` : ""}
        ${d.traits.length ? `<ul class="chips" aria-label="Características">${d.traits.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        <div class="note">${ICON("info")}<p>Quer saber mais sobre ${d.art} ${esc(d.name)}? A equipe que cuida ${d.dele} todos os dias conta tudo pelo WhatsApp.</p></div>
        <div class="message-box">
          <h3>Quer adotar ${d.art} ${esc(d.name)}?</h3>
          <p>Toque no botão e a conversa abre no WhatsApp com esta mensagem pronta:</p>
          <blockquote>${esc(msg)}</blockquote>
          <div class="actions">
            <a class="btn btn-butter" href="${INSTA_DM}" data-whats data-msg="${esc(msg)}" target="_blank" rel="noopener">${ICON("whats")}Chamar no WhatsApp</a>
            <button class="btn btn-ghost on-dark" data-copy="${esc(msg)}" data-copied="Mensagem copiada">${ICON("copy")}Copiar mensagem</button>
          </div>
        </div>
        <p><a class="link-arrow" href="${ROOT}adotar.html">Como funciona a adoção ${ICON("arrow-right")}</a></p>
        ${dogs.length > 1 ? `<nav class="dog-nav" aria-label="Outros cães">
          <a class="link-arrow" href="${dogURL(prev)}">${ICON("arrow-left")}${esc(prev.name)}</a>
          <a class="link-arrow" href="${dogURL(next)}">${esc(next.name)} ${ICON("arrow-right")}</a>
        </nav>` : ""}
      </div>`;
    host.classList.remove("is-loading");
    applyWhats(host);
    $$(".thumbs button", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".thumbs button", host).forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        const current = $(".gallery-main img", host);
        const img = current.cloneNode();
        img.src = btn.dataset.src; img.alt = btn.dataset.alt;
        current.replaceWith(img);
      });
    });
  }

  /* ---------- Baralho de cães na página inicial ---------- */
  function initDeck(deck) {
    const cards = $$(".deck-card", deck);
    const counter = $(".deck-count");
    const total = cards.length;
    if (!total) return;
    let order = cards.map((_, i) => i);
    let busy = false;

    const paint = () => {
      order.forEach((cardIndex, pos) => {
        const card = cards[cardIndex];
        card.dataset.pos = String(Math.min(pos, 5));
        card.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
        $$("a", card).forEach((a) => (a.tabIndex = pos === 0 ? 0 : -1));
      });
      if (counter) counter.textContent = `${order[0] + 1} de ${total}`;
    };
    const advance = (dir = 1) => {
      if (busy || total < 2) return;
      busy = true;
      if (dir > 0) {
        const top = cards[order[0]];
        top.classList.add("is-leaving");
        if (top.dataset.swipe === "left") top.classList.add("to-left");
        setTimeout(() => {
          top.classList.remove("is-leaving", "to-left");
          delete top.dataset.swipe;
          order.push(order.shift());
          paint();
          busy = false;
        }, reduceMotion ? 0 : 420);
      } else {
        order.unshift(order.pop());
        paint();
        setTimeout(() => (busy = false), 300);
      }
    };
    if (!deck.dataset.bound) {
      deck.dataset.bound = "1";
      $(".deck-next")?.addEventListener("click", () => deck._advance(1));
      $(".deck-prev")?.addEventListener("click", () => deck._advance(-1));
      deck.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") deck._advance(1);
        if (e.key === "ArrowLeft") deck._advance(-1);
      });
      let startX = 0, dx = 0, dragging = false, topCard = null;
      deck.addEventListener("pointerdown", (e) => {
        if (e.target.closest("a")) return;
        topCard = deck._top();
        if (!topCard) return;
        dragging = true; startX = e.clientX; dx = 0;
        topCard.style.transition = "none";
        deck.setPointerCapture(e.pointerId);
      });
      deck.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dx = e.clientX - startX;
        topCard.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        topCard.style.transition = "";
        topCard.style.transform = "";
        if (Math.abs(dx) > 70) { if (dx < 0) topCard.dataset.swipe = "left"; deck._advance(1); }
        else if (Math.abs(dx) < 6) deck._advance(1);
      };
      deck.addEventListener("pointerup", endDrag);
      deck.addEventListener("pointercancel", endDrag);
    }
    deck._advance = advance;
    deck._top = () => cards[order[0]];
    paint();
    if (!reduceMotion) {
      deck.classList.add("is-intro");
      requestAnimationFrame(() => {
        cards.forEach((c, i) => (c.style.transitionDelay = `${(total - i) * 70}ms`));
        requestAnimationFrame(() => {
          deck.classList.remove("is-intro");
          setTimeout(() => cards.forEach((c) => (c.style.transitionDelay = "")), 1400);
        });
      });
    }
  }

  // Esconde as listas fixas enquanto a planilha carrega (sem JS, elas continuam visíveis)
  const dynamic = $$("[data-dogs-grid], .deck, [data-dog-page]");
  if (dynamic.length || $("[data-count]")) {
    dynamic.forEach((el) => el.classList.add("is-loading"));
    loadDogs().then((dogs) => { renderLists(dogs); renderDogPage(dogs); });
  }

  /* ---------- Vídeos: toque para assistir, um de cada vez ---------- */
  const clips = $$(".clip");
  clips.forEach((clip) => {
    const video = $("video", clip);
    const btn = $("button", clip);
    btn.addEventListener("click", () => {
      clips.forEach((other) => {
        if (other !== clip) { $("video", other).pause(); other.classList.remove("is-playing"); }
      });
      video.controls = true;
      video.play();
      clip.classList.add("is-playing");
    });
    video.addEventListener("ended", () => { clip.classList.remove("is-playing"); video.controls = false; });
  });

  /* ---------- Vídeo de fundo: só toca quando aparece na tela ---------- */
  $$("video[data-autoplay]").forEach((v) => {
    if (reduceMotion) return;
    const io = new IntersectionObserver(([entry]) => {
      entry.isIntersecting ? v.play().catch(() => {}) : v.pause();
    }, { threshold: 0.35 });
    io.observe(v);
  });
})();
