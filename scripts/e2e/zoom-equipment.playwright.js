/* eslint-disable */
/**
 * Plays the five NAPE equipment Zoom In challenges (and, as a baseline for the
 * unchanged engine, one ORIGINAL zoom puzzle) end to end against a served
 * production build, using only the facilitator's existing controls:
 *
 *   open box → zoom stage 0 → Zoom Out ×3 → Hint → Reveal Answer → Correct /
 *   Not Quite → Next Puzzle → wall score.
 *
 * Per step it records the picture's real zoom scale (computed transform), the
 * progress dots, the hint text and whether it fits on one line, the revealed
 * answer and insight, the sounds the audio engine started, the mascot, the
 * score, and external requests / HTTP errors / console errors. Screenshots go
 * to review-screenshots/nape-2026/zoom-equipment/.
 *
 * Run: serve out/ (`PORT=3400 npm run serve:offline`), then execute this
 * function with a Playwright `page` (the Playwright MCP's run_code).
 */
async (page) => {
  const BASE = 'http://localhost:3400';
  const SHOTS = '/Users/osas/Desktop/Box Game/review-screenshots/nape-2026/zoom-equipment';
  const TARGETS = [
    { event: 'nape-2026', box: 7, slug: 'christmas-tree', answer: 'A WELLHEAD CHRISTMAS TREE', hint: "Valves on top of a producing well · Its stacked shape gave it a festive name", judge: 'correct' },
    { event: 'nape-2026', box: 29, slug: 'drill-bit', answer: 'A DRILL BIT', hint: 'At the very end of the drill string · Its carbide-studded cones crush the rock', judge: 'wrong' },
    { event: 'nape-2026', box: 44, slug: 'pipeline-pig', answer: 'A PIPELINE PIG', hint: 'Pushed along a pipeline by the flow · It cleans and inspects from the inside', judge: 'correct' },
    { event: 'nape-2026', box: 64, slug: 'bop', answer: 'A BLOWOUT PREVENTER (BOP)', hint: 'Stacked on top of the wellhead · Its rams can seal the well in an emergency', judge: 'wrong' },
    { event: 'nape-2026', box: 88, slug: 'pressure-gauge', answer: 'A PRESSURE GAUGE', hint: 'A needle sweeps across a dial · It shows how hard the fluid pushes in the line', judge: 'correct' },
    // Baseline: an untouched original zoom puzzle in the Original event (box 8 = the light bulb).
    { event: 'original-60', box: 8, slug: 'ORIGINAL-lightbulb', answer: 'A LIGHT BULB', hint: 'It switches on the moment inspiration strikes.', judge: 'correct' },
  ];
  const browser = page.context().browser();
  const results = [];
  const viewport = { width: 1920, height: 1080 };

  for (const t of TARGETS) {
    const ctx = await browser.newContext({ viewport });
    await ctx.addInitScript((ev) => {
      window.__sfx = [];
      const orig = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a) { try { window.__sfx.push(Math.round((this.buffer?.duration ?? 0) * 100) / 100); } catch {} return orig.apply(this, a); };
      if (ev !== 'nape-2026') localStorage.setItem('crackthebox.overrides.v5', JSON.stringify({ v: 5, event: ev, edits: {}, custom: [], removed: [], active: {}, order: {} }));
    }, t.event);
    const p = await ctx.newPage();
    const ext = [], http = [], errors = [], problems = [];
    const bad = (m) => problems.push(m);
    p.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    p.on('response', (r) => { if (r.status() >= 400) http.push(r.status() + ' ' + r.url()); });
    p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    const sfx = () => p.evaluate(() => window.__sfx.slice());
    const read = () => p.evaluate(() => {
      const img = document.querySelector('.shadow-lift img');
      const m = img ? getComputedStyle(img).transform.match(/matrix\(([^,]+)/) : null;
      const dots = [...document.querySelectorAll('span.h-3.rounded-full')].map((s) => s.className.includes('w-12'));
      return { src: img?.getAttribute('src'), loaded: !!img && img.complete && img.naturalWidth > 0, scale: m ? +(+m[1]).toFixed(2) : (img && getComputedStyle(img).transform === 'none' ? 1 : null), dots: dots.filter(Boolean).length, text: document.body.innerText };
    });
    const steps = {};
    try {
      await p.goto(BASE + '/');
      await p.waitForSelector('[data-wall]');
      const boxes = await p.locator('[data-wall] button[aria-label^="Open box"]').count();
      steps.wallBoxes = boxes;
      await p.locator(`button[aria-label="Open box ${t.box}"]`).click();
      await p.waitForSelector('button:has-text("Reveal Answer")', { timeout: 20000 });
      await p.waitForTimeout(1800);
      const s0 = await read(); steps.stage0 = { scale: s0.scale, dots: s0.dots, src: s0.src, loaded: s0.loaded };
      if (!s0.loaded) bad('picture did not load');
      if (!t.slug.startsWith('ORIGINAL') && !(s0.src ?? '').endsWith(`/nape/zoom/${t.slug}.svg`)) bad('wrong picture: ' + s0.src);
      if (t.slug.startsWith('ORIGINAL') && s0.src !== '/media/puzzles/zoom-lightbulb.svg') bad('wrong original picture: ' + s0.src);
      if (s0.scale !== 7) bad('stage 0 scale ' + s0.scale + ' (expected 7)');
      if (s0.dots !== 1) bad('stage 0 dots ' + s0.dots);
      if (s0.text.includes(t.answer)) bad('answer visible at stage 0');
      if (s0.text.includes(t.hint.slice(0, 20))) bad('hint visible before pressing Hint');
      await p.screenshot({ path: `${SHOTS}/${t.slug}-1-zoom0.png` });
      const expectScale = [4.2, 2.4, 1.35];
      steps.zoom = [];
      for (let i = 0; i < 3; i++) {
        await p.locator('button:has-text("Zoom Out")').click();
        await p.waitForTimeout(1900);
        const s = await read();
        steps.zoom.push({ scale: s.scale, dots: s.dots });
        if (s.scale !== expectScale[i]) bad(`zoom stage ${i + 1} scale ${s.scale} (expected ${expectScale[i]})`);
        if (s.dots !== i + 2) bad(`zoom stage ${i + 1} dots ${s.dots}`);
        await p.screenshot({ path: `${SHOTS}/${t.slug}-${i + 2}-zoom${i + 1}.png` });
      }
      steps.zoomButtonAfterMax = await p.locator('button:has-text("Zoom Out")').count();
      steps.sfxBeforeHint = await sfx();
      // Hint — the existing button, once.
      await p.locator('button:has-text("Hint")').first().click();
      await p.waitForTimeout(700);
      const h = await p.evaluate((hint) => {
        const el = [...document.querySelectorAll('p')].find((e) => e.textContent.includes(hint.slice(0, 20)));
        if (!el) return null;
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        const lines = Math.round(r.height / parseFloat(cs.lineHeight || cs.fontSize));
        const btn = [...document.querySelectorAll('button')].find((b) => /hint/i.test(b.innerText));
        return { text: el.textContent.replace('💡', '').trim(), height: Math.round(r.height), lines, width: Math.round(r.width), vw: innerWidth, disabled: btn?.disabled };
      }, t.hint);
      steps.hint = h;
      if (!h) bad('hint not shown');
      else {
        if (h.text !== t.hint) bad('hint text mismatch: ' + h.text);
        if (h.lines > 1) bad('hint wraps onto ' + h.lines + ' lines');
        if (h.disabled !== true) bad('Hint button not disabled after use');
      }
      await p.screenshot({ path: `${SHOTS}/${t.slug}-5-hint.png` });
      // Reveal
      await p.locator('button:has-text("Reveal Answer")').click();
      await p.waitForSelector('button:has-text("Correct")', { timeout: 10000 });
      await p.waitForTimeout(2200);
      const rv = await read();
      steps.reveal = { scale: rv.scale, answerShown: rv.text.includes(t.answer), allDots: rv.dots };
      if (rv.scale !== 1) bad('revealed scale ' + rv.scale);
      if (!rv.text.includes(t.answer)) bad('answer not shown after reveal');
      await p.screenshot({ path: `${SHOTS}/${t.slug}-6-reveal.png` });
      // Judge
      const before = await sfx();
      await p.locator(t.judge === 'correct' ? 'button:has-text("✓ Correct")' : 'button:has-text("✗ Not Quite")').click();
      await p.waitForSelector('button:has-text("Next Puzzle")', { timeout: 10000 });
      await p.waitForTimeout(900);
      const after = await sfx();
      steps.verdictSfx = after.slice(before.length);
      steps.mascot = await p.evaluate(() => !!document.querySelector('video'));
      steps.confetti = await p.evaluate(() => !!document.querySelector('canvas'));
      if (!steps.mascot) bad('no mascot after verdict');
      if (t.judge === 'correct' && !steps.confetti) bad('no confetti on correct');
      await p.screenshot({ path: `${SHOTS}/${t.slug}-7-verdict.png` });
      await p.locator('button:has-text("Next Puzzle")').click();
      await p.waitForSelector('[data-wall]', { timeout: 10000 });
      await p.waitForTimeout(600);
      const score = await p.evaluate(() => [...document.querySelectorAll('.rounded-full.border.px-3\\.5')].map((e) => e.innerText.replace(/\s+/g, ' ')));
      steps.score = score;
      const opened = parseInt(score[0], 10), good = parseInt(score[1], 10), notq = parseInt(score[2], 10);
      if (opened !== 1 || good !== (t.judge === 'correct' ? 1 : 0) || notq !== (t.judge === 'wrong' ? 1 : 0)) bad('score after verdict: ' + score.join(' | '));
      steps.sfxAll = await sfx();
    } catch (e) { bad('EXCEPTION ' + e.message.slice(0, 200)); }
    results.push({ slug: t.slug, event: t.event, box: t.box, ok: problems.length === 0 && ext.length === 0 && http.length === 0 && errors.length === 0, problems, external: ext, http, errors, steps });
    await ctx.close();
  }
  return results.map((r) => ({ ...r, steps: { wallBoxes: r.steps.wallBoxes, picture: r.steps.stage0?.src, scales: [r.steps.stage0?.scale, ...(r.steps.zoom ?? []).map((z) => z.scale), r.steps.reveal?.scale], dotsPerStage: [r.steps.stage0?.dots, ...(r.steps.zoom ?? []).map((z) => z.dots)], zoomBtnAfterMax: r.steps.zoomButtonAfterMax, hint: r.steps.hint, sfx: r.steps.sfxAll, verdictSfx: r.steps.verdictSfx, mascot: r.steps.mascot, confetti: r.steps.confetti, score: r.steps.score } }));
}
