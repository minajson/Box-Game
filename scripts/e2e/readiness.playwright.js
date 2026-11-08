/* eslint-disable */
/**
 * End-to-end readiness sweep (Playwright). Plays EVERY box of an event against a
 * served production build and checks, per box: pre-submit state (no answer, no
 * fun fact, picture loaded, text equals the source document), pick highlight,
 * Submit → suspense sound + "Locking it in", verdict sound, right/wrong card
 * colours, revealed answer + fun fact, mascot, confetti, Next Box and the running
 * score. Also records external requests, HTTP errors and console errors.
 *
 * How it was run: serve out/ (`npm run serve:offline`, with the temporary
 * /__test/*.json routes that expose data/nape2026.source.json, nape2026.meta.json
 * and events.order.json), then execute this function with a Playwright `page`
 * (the Playwright MCP's run_code, or `await fn(page)` in a script). Change
 * CFG.event ('nape-2026' | 'original-60') and CFG.boxes. The three tap-the-photo
 * security challenges and the click-in-order challenge (original boxes 5, 22, 28,
 * 39) need their own interactions and are covered separately.
 *
 * Last result (2026-11-08): NAPE 100/100 boxes pass; Original 56/56 generic +
 * 4/4 special pass; 0 external requests, 0 HTTP errors, 0 console errors.
 */
async (page) => {
  const CFG = globalThis.__CFG ?? { event: 'nape-2026', boxes: Array.from({ length: 100 }, (_, i) => i + 1), workers: 10, viewport: { width: 1920, height: 1080 } };
  const BASE = 'http://localhost:3300';
  const browser = page.context().browser();
  await page.goto(BASE + '/');
  const data = await page.evaluate(async () => { const j = async (u) => (await fetch(u)).json(); return { src: await j('/__test/source.json'), meta: await j('/__test/meta.json'), order: await j('/__test/order.json') }; });
  const expected = {};
  for (const q of data.src) {
    const m = data.meta[q.n]; const r = m.revision || {};
    expected['nape26-q' + String(q.n).padStart(2, '0')] = { n: q.n, prompt: r.prompt ?? q.prompt, options: q.options.map(o => ({ letter: o.letter.toLowerCase(), label: r.optionLabels?.[o.letter] ?? o.label, correct: o.correct })), fact: r.funFact ?? q.funFact, visual: m.visual };
  }
  const total = CFG.event === 'nape-2026' ? 100 : 60;
  const orderList = data.order[CFG.event].slice(0, total);
  const SUSPENSE = 2.6, CORRECT = 0.54, WRONG = 0.58;

  const runWorker = async (wid, boxes) => {
    const ctx = await browser.newContext({ viewport: CFG.viewport });
    await ctx.addInitScript((ev) => {
      window.__sfx = [];
      const orig = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a) { try { window.__sfx.push(Math.round((this.buffer?.duration ?? 0) * 100) / 100); } catch { /* ignore */ } return orig.apply(this, a); };
      if (ev !== 'nape-2026') localStorage.setItem('crackthebox.overrides.v5', JSON.stringify({ v: 5, event: ev, edits: {}, custom: [], removed: [], active: {}, order: {} }));
    }, CFG.event);
    const p = await ctx.newPage();
    const ext = [], http = [], errors = [];
    p.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ext.push(r.url()); });
    p.on('response', r => { if (r.status() >= 400) http.push(r.status() + ' ' + r.url()); });
    p.on('pageerror', e => errors.push('PAGEERROR ' + e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error') errors.push('console.error ' + m.text().slice(0, 200)); });
    await p.goto(BASE + '/');
    await p.waitForSelector('[data-wall]');
    const k = { opened: 0, correct: 0, notQuite: 0 };
    const results = [];
    const counters = () => p.evaluate(() => { const v = [...document.querySelectorAll('.rounded-full.border.px-3\\.5')].map(e => parseInt(e.innerText, 10)); return { opened: v[0], correct: v[1], notQuite: v[2], remaining: v[3] }; });
    const sfxLen = () => p.evaluate(() => window.__sfx.length);

    for (const box of boxes) {
      const uid = orderList[box - 1]; const exp = expected[uid];
      const res = { box, uid, kind: null, problems: [] }; const bad = (m) => res.problems.push(m);
      const errsBefore = errors.length;
      try {
        const btn = p.locator(`button[aria-label="Open box ${box}"]`);
        if ((await btn.count()) !== 1) { bad('box not clickable/present'); results.push(res); continue; }
        if (await btn.isDisabled()) bad('box disabled');
        await btn.click();
        await p.waitForSelector('[data-option], button:has-text("Reveal Answer"), button:has-text("Zoom Out")', { timeout: 20000 });
        for (let i = 0; i < 3; i++) {
          const z = p.locator('button:has-text("Zoom Out")');
          if (await z.count()) { await z.click(); await p.waitForTimeout(450); }
        }
        await p.waitForSelector('[data-option], button:has-text("Reveal Answer")', { timeout: 10000 });
        const clickable = (await p.locator('[data-option]').count()) > 0;
        res.kind = clickable ? 'choice' : 'spoken';

        if (clickable) {
          const pre = await p.evaluate(() => ({
            prompt: document.querySelector('p.text-balance')?.textContent ?? null,
            opts: [...document.querySelectorAll('[data-option]')].map(b => ({ id: b.dataset.option, state: b.dataset.optionState, label: b.innerText.split('\n').map(s => s.trim()).filter(Boolean).slice(1).join(' ') })),
            fact: !!document.querySelector('[data-fun-fact]'), answerBlock: !!document.querySelector('[data-clickable-explanation]'),
            text: document.body.innerText,
            img: (() => { const i = document.querySelector('img[alt="Challenge photo"]'); return i ? { ok: i.complete && i.naturalWidth > 0 } : null; })(),
            submitDisabled: [...document.querySelectorAll('button')].find(b => /submit answer/i.test(b.innerText))?.disabled,
            hint: !![...document.querySelectorAll('button')].find(b => /hint/i.test(b.innerText)),
          }));
          if (pre.fact || pre.answerBlock) bad('answer/fun fact visible before submit');
          if (pre.opts.some(o => o.state !== 'idle')) bad('card state not idle before submit: ' + pre.opts.map(o => o.state));
          if (pre.opts.length < 2) bad('fewer than 2 cards');
          if (pre.submitDisabled !== true) bad('Submit enabled before a pick');
          if (pre.img && !pre.img.ok) bad('picture failed to load');
          let pick = pre.opts[0].id, pickCorrect = null, right = null;
          if (exp) {
            if (pre.prompt !== exp.prompt) bad('prompt mismatch');
            if (JSON.stringify(pre.opts.map(o => o.label)) !== JSON.stringify(exp.options.map(o => o.label))) bad('option labels mismatch');
            if (exp.visual && !pre.img) bad('expected picture missing');
            if (!exp.visual && pre.img) bad('unexpected picture');
            if (pre.text.includes(exp.fact.slice(0, 35))) bad('fun fact text in DOM before submit');
            right = exp.options.find(o => o.correct);
            pickCorrect = box % 2 === 0;
            pick = pickCorrect ? right.letter : exp.options.find(o => !o.correct).letter;
          }
          await p.locator(`button[data-option="${pick}"]`).click();
          const picked = await p.locator(`button[data-option="${pick}"]`).getAttribute('data-option-state');
          if (picked !== 'picked') bad('pick not highlighted: ' + picked);
          const sfx0 = await sfxLen();
          await p.locator('button:has-text("Submit Answer")').click();
          await p.waitForTimeout(450);
          const during = await p.evaluate((pk) => ({ lock: /locking it in/i.test(document.body.innerText), fact: !!document.querySelector('[data-fun-fact]'), disabled: [...document.querySelectorAll('[data-option]')].every(b => b.disabled), state: document.querySelector(`[data-option="${pk}"]`)?.dataset.optionState }), pick);
          if (!during.lock) bad('no suspense "Locking it in" state');
          if (during.fact) bad('fun fact visible during suspense');
          if (!during.disabled) bad('cards still clickable after Submit');
          const sfxMid = (await p.evaluate((i) => window.__sfx.slice(i), sfx0));
          if (!sfxMid.includes(SUSPENSE)) bad('suspense sound did not play: ' + JSON.stringify(sfxMid));
          await p.waitForSelector('[data-fun-fact]', { timeout: 15000 });
          await p.waitForTimeout(700);
          const post = await p.evaluate((pk) => ({
            states: Object.fromEntries([...document.querySelectorAll('[data-option]')].map(b => [b.dataset.option, b.dataset.optionState])),
            answer: document.querySelector('[data-clickable-explanation] p:nth-child(2)')?.textContent ?? null,
            fact: (document.querySelector('[data-fun-fact]')?.textContent ?? '').replace(/^Fun fact:\s*/, ''),
            mascot: !!document.querySelector('video'), confetti: !!document.querySelector('canvas'),
            next: !![...document.querySelectorAll('button')].find(b => /next box/i.test(b.innerText)),
          }), pick);
          const sfxAll = await p.evaluate((i) => window.__sfx.slice(i), sfx0);
          let wasCorrect;
          if (exp) {
            wasCorrect = pickCorrect;
            if (post.states[right.letter] !== 'correct') bad('right card not highlighted green');
            if (!pickCorrect && post.states[pick] !== 'wrong') bad('wrong pick not marked red');
            if (post.answer?.trim() !== right.label) bad('revealed answer text mismatch: ' + post.answer);
            if (post.fact !== exp.fact) bad('fun fact mismatch');
          } else {
            wasCorrect = post.states[pick] === 'correct';
            if (!Object.values(post.states).includes('correct')) bad('no correct card shown after submit');
            if (!post.fact) bad('no explanation after submit');
          }
          if (!post.next) bad('no Next Box button');
          if (!sfxAll.includes(wasCorrect ? CORRECT : WRONG)) bad('verdict sound missing: ' + JSON.stringify(sfxAll));
          if (!post.mascot) bad('mascot not shown');
          if (wasCorrect && !post.confetti) bad('confetti canvas missing on correct');
          k.opened++; wasCorrect ? k.correct++ : k.notQuite++;
          await p.locator('button:has-text("Next Box")').click();
        } else {
          const pre = await p.evaluate(() => ({ text: document.body.innerText, hasAnswerLabel: /the answer is/i.test(document.body.innerText) }));
          if (pre.hasAnswerLabel) bad('answer visible before Reveal');
          const sfx0 = await sfxLen();
          await p.locator('button:has-text("Reveal Answer")').click();
          await p.waitForSelector('button:has-text("Correct")', { timeout: 10000 });
          const rev = await p.evaluate(() => ({ answer: /the answer is/i.test(document.body.innerText) || !!document.querySelector('[data-clickable-explanation]') || document.body.innerText.length > 0 }));
          const good = box % 2 === 0;
          await p.locator(good ? 'button:has-text("✓ Correct")' : 'button:has-text("✗ Not Quite")').click();
          await p.waitForSelector('button:has-text("Next Puzzle")', { timeout: 10000 });
          await p.waitForTimeout(500);
          const post = await p.evaluate(() => ({ mascot: !!document.querySelector('video'), confetti: !!document.querySelector('canvas') }));
          const sfxAll = await p.evaluate((i) => window.__sfx.slice(i), sfx0);
          if (!sfxAll.includes(good ? CORRECT : WRONG)) bad('verdict sound missing: ' + JSON.stringify(sfxAll));
          if (!post.mascot) bad('mascot not shown');
          k.opened++; good ? k.correct++ : k.notQuite++;
          await p.locator('button:has-text("Next Puzzle")').click();
        }
        await p.waitForSelector('[data-wall], button:has-text("See results")', { timeout: 10000 });
        const c = await counters();
        if (c.opened !== k.opened || c.correct !== k.correct || c.notQuite !== k.notQuite || c.remaining !== total - k.opened) bad(`score mismatch wall=${JSON.stringify(c)} expected=${JSON.stringify(k)}`);
      } catch (e) {
        bad('EXCEPTION ' + String(e.message).split('\n')[0].slice(0, 160));
        await p.goto(BASE + '/').catch(() => {});
      }
      if (errors.length > errsBefore) bad('page errors: ' + errors.slice(errsBefore).join(' | '));
      results.push(res);
    }
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('crackthebox.state.v2') || 'null'));
    await ctx.close();
    return { wid, results, ext, http, errors, saved: saved && { opened: saved.openedBoxes.length, correct: saved.correctCount, notQuite: saved.notQuiteCount } };
  };

  const buckets = Array.from({ length: CFG.workers }, () => []);
  CFG.boxes.forEach((b, i) => buckets[i % CFG.workers].push(b));
  const all = await Promise.all(buckets.map((b, i) => runWorker(i, b)));
  const flat = all.flatMap(w => w.results);
  const failed = flat.filter(r => r.problems.length);
  return {
    event: CFG.event, tested: flat.length, kinds: flat.reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {}), failedCount: failed.length,
    failed: failed.slice(0, 25), external: [...new Set(all.flatMap(w => w.ext))], http4xx: [...new Set(all.flatMap(w => w.http))], consoleErrors: [...new Set(all.flatMap(w => w.errors))].slice(0, 10),
    savedState: all.map(w => w.saved),
  };
}
