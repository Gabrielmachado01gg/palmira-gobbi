/* Player do tutorial: escala o palco, avança as cenas, pausa e pula etapas. */
(() => {
  "use strict";
  const player = document.querySelector("[data-player]");
  if (!player) return;
  const stage = player.querySelector("[data-stage]");
  const canvas = player.querySelector("[data-canvas]");
  const scenes = [...player.querySelectorAll("[data-scene]")];
  const pills = [...player.querySelectorAll("[data-pills] button")];
  const bar = player.querySelector("[data-progress]");
  const playBtn = player.querySelector("[data-play]");
  const capTitle = player.querySelector("[data-cap-title]");
  const capText = player.querySelector("[data-cap-text]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEPS = [
    { t: "Renomeie a foto", d: "Use o nome do cão, minúsculo, sem acento e sem espaço: pelucio.jpg.", ms: 5000 },
    { t: "Coloque na pasta", d: "Suba a foto para a pasta Fotos dos cães - site, no Drive da associação.", ms: 4500 },
    { t: "Copie o link", d: "Botão direito na foto › Compartilhar › Copiar link.", ms: 5200 },
    { t: "Preencha a planilha", d: "Uma linha nova: disponível, nome, sexo, textos e o link colado em Foto principal.", ms: 6200 },
    { t: "Recarregue o site", d: "Espere até 5 minutos e aperte Ctrl + Shift + R para ver o cão novo.", ms: 5200 },
    { t: "Foi adotado?", d: "Troque a Situação para adotado. O cão sai do site sozinho.", ms: 5200 },
  ];

  // Palco 960x540 acompanha a largura do container
  const fit = () => { canvas.style.transform = `scale(${stage.clientWidth / 960})`; };
  new ResizeObserver(fit).observe(stage);
  fit();

  let i = 0, paused = reduce, start = 0, elapsed = 0, raf = 0;

  function show(n) {
    i = (n + scenes.length) % scenes.length;
    scenes.forEach((s) => s.classList.remove("is-on"));
    canvas.removeAttribute("data-on");
    void canvas.offsetWidth; // reinicia as animações da cena
    scenes[i].classList.add("is-on");
    canvas.dataset.on = String(i + 1);
    pills.forEach((p, k) => { if (k === i) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current"); });
    capTitle.textContent = `${i + 1}. ${STEPS[i].t}`;
    capText.textContent = STEPS[i].d;
    elapsed = 0; start = performance.now();
    bar.style.width = "0%";
  }

  function tick(now) {
    if (!paused) {
      const t = elapsed + (now - start);
      const total = STEPS.reduce((a, s) => a + s.ms, 0);
      const before = STEPS.slice(0, i).reduce((a, s) => a + s.ms, 0);
      bar.style.width = `${Math.min(100, ((before + Math.min(t, STEPS[i].ms)) / total) * 100)}%`;
      if (t >= STEPS[i].ms) show(i + 1);
    }
    raf = requestAnimationFrame(tick);
  }

  function setPaused(p) {
    if (p === paused) return;
    if (p) elapsed += performance.now() - start; else start = performance.now();
    paused = p;
    player.classList.toggle("is-paused", p);
    playBtn.setAttribute("aria-label", p ? "Continuar" : "Pausar");
  }

  playBtn.addEventListener("click", () => setPaused(!paused));
  pills.forEach((p, k) => p.addEventListener("click", () => { show(k); }));
  stage.addEventListener("click", () => setPaused(!paused));

  // Só roda quando o player está visível
  new IntersectionObserver(([e]) => { if (!e.isIntersecting && !paused) setPaused(true); }, { threshold: 0.2 }).observe(stage);

  player.classList.toggle("is-paused", paused);
  if (paused) playBtn.setAttribute("aria-label", "Continuar");
  show(0);
  raf = requestAnimationFrame(tick);
})();
