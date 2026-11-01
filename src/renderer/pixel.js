'use strict';

// Sprite çizimi ve temaya özel sahneler. Hem ana pencere hem overlay kullanır.
window.Pixel = (() => {
  const STAGE_W = 120;
  const STAGE_H = 56;
  const GROUND_Y = 44;
  const FPS = 8;

  function drawSprite(ctx, rows, palette, x, y, flip = false) {
    const width = rows[0].length;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < width; c++) {
        const color = palette[rows[r][c]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) + (flip ? width - 1 - c : c), Math.round(y) + r, 1, 1);
      }
    }
  }

  function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  /** Yürüyüş karesi; temanın `walkStep` değeri animasyon hızını belirler. */
  function walkFrame(theme, frame, phase = 0) {
    return theme.walk[(Math.floor(frame / (theme.walkStep ?? 2)) + phase) % theme.walk.length];
  }

  /** Öndeki figürü ve varsa sürünün ilk `herdSize` üyesini, arkadakiler önce gelecek şekilde çizer. */
  function drawGroup(ctx, theme, pick, x, baseY, herdSize = Infinity) {
    const followers = (theme.herd ?? []).slice(0, herdSize);
    const members = [{ dx: 0, dy: 0 }, ...followers].map((member, i) => ({ ...member, i }));
    members.sort((a, b) => a.dy - b.dy);
    for (const { dx, dy, coat, i } of members) {
      const rows = pick(i);
      drawSprite(ctx, rows, coat ? { ...theme.palette, ...coat } : theme.palette, x + dx, baseY - rows.length + dy);
    }
  }

  const STAGE_HERD_SIZE = 2;

  const SCENERY = {
    yilki(ctx, frame, scroll) {
      // Gün batımı bantları ve güneş
      rect(ctx, '#f7c978', 0, 0, STAGE_W, 14);
      rect(ctx, '#ef9f59', 0, 14, STAGE_W, 10);
      rect(ctx, '#d9713e', 0, 24, STAGE_W, 20);
      rect(ctx, '#fff0c2', 84, 14, 12, 12);
      rect(ctx, '#fff0c2', 82, 16, 16, 8);
      // Uzak dağlar yavaş, yakın tepeler daha hızlı kayar
      for (let x = 0; x < STAGE_W; x++) {
        const far = (x + Math.floor(scroll / 8)) % 48;
        rect(ctx, '#8a4f3c', x, GROUND_Y - 8 - Math.floor(Math.abs(far - 24) / 2), 1, 20);
        const near = (x + Math.floor(scroll / 3)) % 32;
        rect(ctx, '#5f3626', x, GROUND_Y - 2 - Math.floor(Math.abs(near - 16) / 4), 1, 8);
      }
      // Bozkır
      rect(ctx, '#2b1a12', 0, GROUND_Y, STAGE_W, 1);
      rect(ctx, '#a88a3f', 0, GROUND_Y + 1, STAGE_W, 11);
      for (const [spacing, row] of [[11, 3], [17, 7], [13, 10]]) {
        for (let x = -(scroll % spacing); x < STAGE_W; x += spacing) {
          rect(ctx, '#7d6a2c', x, GROUND_Y + row, 2, 1);
          rect(ctx, '#7d6a2c', x + 1, GROUND_Y + row - 1, 1, 1);
        }
      }
    },
    pocket(ctx, frame) {
      rect(ctx, '#9bbc0f', 0, 0, STAGE_W, STAGE_H);
      // Süzülen bulutlar
      const drift = Math.floor(frame / 4);
      for (const [bx, by] of [[10, 8], [58, 14], [96, 6]]) {
        const x = ((bx - drift) % (STAGE_W + 16) + STAGE_W + 16) % (STAGE_W + 16) - 16;
        rect(ctx, '#8bac0f', x, by, 14, 3);
        rect(ctx, '#8bac0f', x + 3, by - 2, 7, 2);
      }
      rect(ctx, '#306230', 0, GROUND_Y, STAGE_W, 2);
      rect(ctx, '#8bac0f', 0, GROUND_Y + 2, STAGE_W, 10);
      for (let x = 0; x < STAGE_W; x += 4) {
        rect(ctx, '#306230', x, GROUND_Y + 4, 1, 1);
        rect(ctx, '#306230', x + 2, GROUND_Y + 7, 1, 1);
      }
    },
    neon(ctx, frame) {
      rect(ctx, '#140c2b', 0, 0, STAGE_W, STAGE_H);
      const stars = [[6, 4], [18, 12], [31, 6], [44, 15], [57, 3], [70, 10], [83, 5], [96, 14], [110, 7], [114, 18]];
      stars.forEach(([x, y], i) => rect(ctx, (frame + i * 3) % 12 < 8 ? '#f6edff' : '#35205f', x, y, 1, 1));
      // Ufuktaki güneş
      for (let i = 0; i < 7; i++) {
        const half = [5, 8, 9, 10, 10, 10, 9][i];
        if (i % 3 !== 2) rect(ctx, i < 3 ? '#ffe14d' : '#ff3d9a', 60 - half, 24 + i * 2, half * 2, 2);
      }
      // Perspektif zemin
      rect(ctx, '#241447', 0, GROUND_Y - 6, STAGE_W, STAGE_H - GROUND_Y + 6);
      rect(ctx, '#29e7ff', 0, GROUND_Y, STAGE_W, 1);
      const shift = frame % 4;
      for (const y of [GROUND_Y + 3 + shift % 2, GROUND_Y + 7 + shift % 2]) rect(ctx, '#ff3d9a', 0, y, STAGE_W, 1);
      for (let x = 4 - shift * 2; x < STAGE_W; x += 16) rect(ctx, '#ff3d9a', x, GROUND_Y + 1, 1, 11);
    },
    cafe(ctx, frame) {
      rect(ctx, '#f3e2c7', 0, 0, STAGE_W, STAGE_H);
      // Pencere
      rect(ctx, '#4a2c1d', 8, 6, 26, 22);
      rect(ctx, '#bfe0ee', 10, 8, 22, 18);
      rect(ctx, '#4a2c1d', 20, 8, 2, 18);
      rect(ctx, '#4a2c1d', 10, 16, 22, 2);
      // Raf ve fincanlar
      rect(ctx, '#8a5a2b', 56, 20, 54, 3);
      for (const x of [60, 72, 84, 96]) {
        rect(ctx, '#e0752f', x, 14, 7, 6);
        rect(ctx, '#e0752f', x + 7, 15, 2, 3);
      }
      // Yükselen buhar
      const steam = frame % 8 < 4 ? 0 : 1;
      rect(ctx, '#70493a', 62 + steam, 9, 1, 3);
      rect(ctx, '#70493a', 86 - steam, 9, 1, 3);
      // Tezgâh
      rect(ctx, '#4a2c1d', 0, GROUND_Y, STAGE_W, 2);
      rect(ctx, '#8a5a2b', 0, GROUND_Y + 2, STAGE_W, 10);
      for (let x = 6; x < STAGE_W; x += 18) rect(ctx, '#6d4520', x, GROUND_Y + 2, 1, 10);
    },
    dungeon(ctx, frame) {
      rect(ctx, '#2e2b38', 0, 0, STAGE_W, STAGE_H);
      for (let row = 0; row < 6; row++) {
        const y = row * 8;
        rect(ctx, '#1f1c27', 0, y, STAGE_W, 1);
        for (let x = row % 2 ? 0 : 8; x < STAGE_W; x += 16) rect(ctx, '#1f1c27', x, y, 1, 8);
      }
      // Meşaleler
      for (const x of [22, 96]) {
        rect(ctx, '#8a5a2b', x, 18, 2, 8);
        const flicker = (frame + x) % 4;
        rect(ctx, '#c43c3c', x - 1, 12 + (flicker % 2), 4, 6);
        rect(ctx, '#e0a526', x, 14 + (flicker % 2), 2, 4);
        if (flicker === 0) rect(ctx, '#e0a526', x + 2, 10, 1, 1);
      }
      rect(ctx, '#14121a', 0, GROUND_Y, STAGE_W, 2);
      rect(ctx, '#3d3948', 0, GROUND_Y + 2, STAGE_W, 10);
      for (let x = 4; x < STAGE_W; x += 12) rect(ctx, '#2e2b38', x, GROUND_Y + 2, 1, 10);
    },
  };

  /** Ana penceredeki sahne: maskot, ilerlemeye göre hedefe doğru yürür. */
  function createStage(canvas) {
    canvas.width = STAGE_W;
    canvas.height = STAGE_H;
    const ctx = canvas.getContext('2d');
    let theme = null;
    let status = 'idle';
    let progress = 0;
    let frame = 0;
    let scroll = 0;
    let last = 0;
    let raf = null;

    function draw() {
      SCENERY[theme.id](ctx, frame, scroll);
      const standing = theme.rest[0];
      const width = standing[0].length;
      const goal = theme.goal;
      const goalX = STAGE_W - goal[0].length - 4;
      const behind = Math.max(0, ...(theme.herd ?? []).slice(0, STAGE_HERD_SIZE).map((m) => -m.dx));
      const startX = 4 + behind;
      const endX = goalX - width - 2;
      let x = startX + (endX - startX) * progress;
      let y = GROUND_Y;
      let pick = () => standing;

      if (status === 'running') {
        pick = (i) => walkFrame(theme, frame, i);
      } else if (status === 'idle') {
        y -= frame % 8 < 4 ? 0 : 1;
      } else if (status === 'finished') {
        x = endX;
        y -= [0, 3, 5, 3][frame % 4];
        pick = (i) => walkFrame(theme, frame, i);
      }
      if (status !== 'finished' || frame % 2 === 0) drawSprite(ctx, goal, theme.palette, goalX, GROUND_Y - goal.length - (status === 'finished' ? 2 : 0));
      if (status === 'paused' && frame % 8 < 5) {
        // Duraklatıldı işareti
        const top = y - standing.length - 7;
        rect(ctx, theme.colors.ink, x + width / 2 - 3, top, 2, 5);
        rect(ctx, theme.colors.ink, x + width / 2 + 1, top, 2, 5);
      }
      drawGroup(ctx, theme, pick, x, y, STAGE_HERD_SIZE);
    }

    function loop(time) {
      raf = requestAnimationFrame(loop);
      if (time - last < 1000 / FPS) return;
      last = time;
      frame++;
      if (status === 'running') scroll += 2;
      draw();
    }

    return {
      setTheme(next) { theme = next; draw(); },
      update(nextStatus, nextProgress) { status = nextStatus; progress = nextProgress; draw(); },
      start() { if (raf === null) raf = requestAnimationFrame(loop); },
      stop() { cancelAnimationFrame(raf); raf = null; },
    };
  }

  /** Tema kartlarındaki küçük önizleme: sahne üzerinde yürüyen maskot. */
  function drawThemePreview(canvas, theme, frame) {
    const ctx = canvas.getContext('2d');
    canvas.width = STAGE_W;
    canvas.height = STAGE_H;
    SCENERY[theme.id](ctx, frame, frame * 2);
    const width = theme.walk[0][0].length;
    const behind = Math.max(0, ...(theme.herd ?? []).slice(0, STAGE_HERD_SIZE).map((m) => -m.dx));
    drawGroup(ctx, theme, (i) => walkFrame(theme, frame, i), Math.round((STAGE_W - width + behind) / 2), GROUND_Y, STAGE_HERD_SIZE);
  }

  return { walkFrame, drawGroup, createStage, drawThemePreview };
})();
