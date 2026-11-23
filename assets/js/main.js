/* Associação Palmira Gobbi — interações do site
   Sem dependências. Cada bloco só roda se o elemento existir na página. */
(() => {
  "use strict";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ---------- Copiar texto (chave PIX e mensagem) ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
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
  });

  /* ---------- Baralho de cães na página inicial ---------- */
  const deck = $(".deck");
  if (deck) {
    const cards = $$(".deck-card", deck);
    const counter = $(".deck-count");
    const total = cards.length;
    let order = cards.map((_, i) => i); // order[0] é a carta do topo
    let busy = false;

    const paint = () => {
      order.forEach((cardIndex, pos) => {
        const card = cards[cardIndex];
        card.dataset.pos = String(pos);
        card.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
        $$("a", card).forEach((a) => (a.tabIndex = pos === 0 ? 0 : -1));
      });
      if (counter) counter.textContent = `${(order[0] % total) + 1} de ${total}`;
    };

    const advance = (dir = 1) => {
      if (busy) return;
      busy = true;
      if (dir > 0) {
        const top = cards[order[0]];
        top.classList.add("is-leaving");
        if (dir === 1 && top.dataset.swipe === "left") top.classList.add("to-left");
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

    $(".deck-next")?.addEventListener("click", () => advance(1));
    $(".deck-prev")?.addEventListener("click", () => advance(-1));
    deck.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") advance(1);
      if (e.key === "ArrowLeft") advance(-1);
    });

    // Arrastar a carta do topo (mouse ou dedo)
    let startX = 0, dx = 0, dragging = false, topCard = null;
    deck.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a")) return;
      topCard = cards[order[0]];
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
      if (Math.abs(dx) > 70) {
        if (dx < 0) topCard.dataset.swipe = "left";
        advance(1);
      } else if (Math.abs(dx) < 6) {
        advance(1); // toque simples também passa para o próximo
      }
    };
    deck.addEventListener("pointerup", endDrag);
    deck.addEventListener("pointercancel", endDrag);

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

  /* ---------- Galeria da página de cada cão ---------- */
  if ($(".gallery-main img")) {
    $$(".thumbs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".thumbs button").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        const current = $(".gallery-main img");
        const next = current.cloneNode();
        next.src = btn.dataset.src;
        next.alt = btn.dataset.alt;
        current.replaceWith(next); // recria a imagem para repetir a animação de entrada
      });
    });
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

/* ---------- Links de WhatsApp com mensagem pronta ---------- */
(() => {
  const num = String((window.SITE_CONFIG || {}).whatsapp || "").replace(/\D/g, "");
  if (!num) return; // sem número: mantém o link do Instagram
  document.querySelectorAll("[data-whats]").forEach((a) => {
    const msg = a.dataset.msg || "";
    a.href = `https://wa.me/${num}${msg ? "?text=" + encodeURIComponent(msg) : ""}`;
  });
})();
