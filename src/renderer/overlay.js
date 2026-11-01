'use strict';

// Süre dolunca masaüstünde beliren tema figürü: soldan gelir, ortada durup
// "Süre doldu!" der, sonra sağdan çıkar. Temada `herd` varsa sürüyle birlikte gelir.
(() => {
  const SCALE = 10;
  const FPS = 12;
  const MOVE_MS = 2000;
  const REST_FRAME_TICKS = 6;
  const BOTTOM_MARGIN = 2;

  const { THEMES } = window.PixelThemes;
  const { walkFrame, drawGroup } = window.Pixel;
  const params = new URLSearchParams(location.search);
  const theme = THEMES.find((t) => t.id === params.get('theme')) ?? THEMES[0];
  const totalMs = Number(params.get('ms')) || 12000;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.style.setProperty('--panel', theme.colors.panel);
  document.documentElement.style.setProperty('--ink', theme.colors.ink);

  const canvas = document.getElementById('canvas');
  const bubble = document.getElementById('bubble');
  const ctx = canvas.getContext('2d');
  const W = Math.ceil(innerWidth / SCALE);
  const H = Math.ceil(innerHeight / SCALE);
  canvas.width = W;
  canvas.height = H;

  const herd = theme.herd ?? [];
  const spriteW = theme.rest[0][0].length;
  const spriteH = theme.rest[0].length;
  const behind = Math.max(0, ...herd.map((m) => -m.dx));
  const lowest = Math.max(0, ...herd.map((m) => m.dy));
  const highest = Math.max(0, ...herd.map((m) => -m.dy));
  const baseY = H - BOTTOM_MARGIN - lowest;

  // Grup ekranda ortalanır; balon öndeki figürün üstünde durur.
  const stopX = Math.round((W - spriteW + behind) / 2);
  bubble.style.left = `${(stopX + spriteW / 2) * SCALE}px`;
  bubble.style.bottom = `${(spriteH + BOTTOM_MARGIN + lowest + highest) * SCALE + 28}px`;

  const lerp = (from, to, t) => from + (to - from) * t;

  function render(now) {
    // Karenin zaman damgası `started` değerinden biraz önce olabilir.
    const elapsed = Math.max(0, now - started);
    const frame = Math.floor((elapsed / 1000) * FPS);
    const arriving = !reducedMotion && elapsed < MOVE_MS;
    const leaving = !reducedMotion && elapsed >= totalMs - MOVE_MS;

    ctx.clearRect(0, 0, W, H);
    if (arriving || leaving) {
      const x = arriving
        ? lerp(-spriteW, stopX, elapsed / MOVE_MS)
        : lerp(stopX, W + behind, (elapsed - (totalMs - MOVE_MS)) / MOVE_MS);
      drawGroup(ctx, theme, (i) => walkFrame(theme, frame, i), x, baseY);
    } else {
      const tick = Math.floor(frame / REST_FRAME_TICKS);
      drawGroup(ctx, theme, (i) => theme.rest[(tick + i) % theme.rest.length], stopX, baseY);
    }
    bubble.hidden = arriving || leaving;
    if (elapsed < totalMs) requestAnimationFrame(render);
  }

  const started = performance.now();
  requestAnimationFrame(render);
})();
