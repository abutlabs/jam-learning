/* M1 Understanding — flashcards, random-draw timed self-tests ("run-throughs") and a
   grade ledger. Data: data/exam.json, built by tools/lasair/build_exam_data.py from the
   content/06-m1-exam lessons.
   No frameworks. Grades persist in localStorage only. */

(function () {
  "use strict";

  const GRADES = ["P", "M", "D", "U", "F"];
  const GRADE_LABEL = { P: "Pass", M: "Merit", D: "Distinction", U: "Undecided", F: "Fail" };
  const GRADE_RANK = { D: 4, M: 3, P: 2, U: 1, F: 0 };
  const LEDGER_KEY = "examLedger";
  const MOCKS_KEY = "examMocks";
  const PORTION_ORDER = ["A", "B", "C", "D", "E"];
  const FIXED_LESSONS = {
    C: ["c-architecture"],
    D: ["d-rationale"],
    E: ["e-pvm", "e-invocations", "e-codec-merklization"],
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => (window.marked ? marked.parse(s || "") : esc(s));
  const $ = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  let DATA = null;

  // ---------------- storage ----------------
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  function record(entry) {
    const led = load(LEDGER_KEY, []);
    led.push(Object.assign({ ts: new Date().toISOString() }, entry));
    save(LEDGER_KEY, led);
  }
  function latestGradeFor(chapterId, qn) {
    const led = load(LEDGER_KEY, []);
    for (let i = led.length - 1; i >= 0; i--) {
      if (led[i].chapter === chapterId && led[i].qn === qn) return led[i].grade;
    }
    return null;
  }

  // ---------------- data ----------------
  function chapterById(id) { return DATA.chapters.find((c) => c.id === id); }
  function randomPool() { return DATA.chapters.filter((c) => c.portion === "random"); }

  // ---------------- tabs ----------------
  function initTabs() {
    document.querySelectorAll(".exam-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".exam-tab").forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        document.querySelectorAll(".exam-panel").forEach((p) => {
          p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab);
        });
        if (btn.dataset.tab === "ledger") renderLedger();
      });
    });
  }

  // ---------------- card renderer (shared) ----------------
  // opts: { question, chapter, index, total, onGrade(grade), portionLabel }
  function renderCard(el, opts) {
    const q = opts.question;
    const prev = latestGradeFor(opts.chapter.id, q.n);
    el.classList.remove("hidden");
    el.innerHTML = `
      <div class="exam-card-head no-tips">
        <span class="exam-card-chapter">${esc(opts.portionLabel || opts.chapter.title)}</span>
        <span class="exam-card-count">${opts.index + 1} / ${opts.total}</span>
      </div>
      <div class="exam-q">${q.star ? '<span class="exam-star" title="key question">★</span>' : ""}${md(q.q)}</div>
      ${prev ? `<div class="exam-prev">last time: <b class="grade-${prev}">${prev}</b></div>` : ""}
      ${opts.seconds ? `<div class="exam-countdown" data-left="${opts.seconds}">${Math.floor(opts.seconds / 60)}:00</div>` : ""}
      <div class="exam-hint hidden"></div>
      <div class="exam-actions">
        ${opts.hint ? '<button class="exam-btn" data-act="hint">Hint</button>' : ""}
        <button class="exam-btn primary" data-act="reveal">Reveal model answer</button>
        <a class="exam-link" href="lesson.html?lesson=${esc(opts.chapter.lesson)}" target="_blank" rel="noopener">open sheet ↗</a>
      </div>
      <div class="exam-a hidden"></div>
      <div class="exam-grade hidden">
        <span>Your grade, honestly:</span>
        ${GRADES.map((g) => `<button class="exam-btn grade-btn grade-${g}" data-grade="${g}" title="${GRADE_LABEL[g]}">${g}</button>`).join("")}
      </div>
    `;
    const hintBtn = el.querySelector('[data-act="hint"]');
    if (hintBtn) hintBtn.addEventListener("click", () => {
      // Hint = the first sentence of the model answer: the direction, not the whole route.
      if (q.hintText) { const h0 = el.querySelector(".exam-hint"); h0.innerHTML = `<b>Hint:</b> ${md(q.hintText)}`; h0.classList.remove("hidden"); hintBtn.disabled = true; return; }
      const plain = q.a.replace(/\s+/g, " ");
      const m = plain.match(/^.+?[.!?](\s|$)/);
      const h = el.querySelector(".exam-hint");
      h.innerHTML = `<b>Hint:</b> ${md(m ? m[0] : plain.slice(0, 160) + "…")}`;
      h.classList.remove("hidden");
      hintBtn.disabled = true;
    });
    const cd = el.querySelector(".exam-countdown");
    if (cd) {
      flash.timer = setInterval(() => {
        let left = +cd.dataset.left - 1; cd.dataset.left = left;
        cd.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        if (left <= 20) cd.classList.add("warn");
        if (left <= 0) { stopFlashTimer(); const r = el.querySelector('[data-act="reveal"]'); if (r && !r.disabled) r.click(); }
      }, 1000);
    }
    el.querySelector('[data-act="reveal"]').addEventListener("click", () => {
      stopFlashTimer();
      const a = el.querySelector(".exam-a");
      a.innerHTML = md(q.a);
      a.classList.remove("hidden");
      el.querySelector(".exam-grade").classList.remove("hidden");
      el.querySelector('[data-act="reveal"]').disabled = true;
    });
    el.querySelectorAll(".grade-btn").forEach((b) => {
      b.addEventListener("click", () => opts.onGrade(b.dataset.grade));
    });
  }

  // ---------------- study: difficulty 1-5 ----------------
  // Content per level (data from tools/build_exam_data.py):
  // 1 Learn     sheet sections, each followed by the basic bank questions tagged to it
  // 2 Recall    applied bank questions + multiple choice generated from sheet tables
  // 3 Explain   short open bank questions with hints, then the sheet's easier questions
  // 4 Deep      every question in the sheet's deep bank (the ## Chapter sheet), no hints
  // 5 Pressure  ★ questions only, two minutes each
  const LEVELS = {
    1: { name: "Learn", desc: "The basics. Read each section of the chapter, then answer the basic questions about it; every answer is explained. Misses come back until you get them. Goal: 100% on every chapter." },
    2: { name: "Recall", desc: "Applied multiple choice: scenarios, which rule rejects what, tiny vs full, cause and effect. Aim for 80% or better before moving up." },
    3: { name: "Explain", desc: "Short open questions in your own words, with a hint before the answer. Grade yourself honestly." },
    4: { name: "Deep", desc: "Every deep question, shuffled, no hints: what someone who knows the chapter cold would ask you." },
    5: { name: "Pressure", desc: "Key questions (★) only, two minutes each, no hints. The answer appears when time runs out." },
  };
  const ALL = "__all";
  const LEVEL_KEY = "examLevel";
  const MASTERY_KEY = "examMastery";   // {chapterId: {"1": {key: bool}, "2": {key: bool}}}
  const flash = { queue: [], i: 0, chapter: null, level: 1, score: { right: 0, total: 0 }, retries: new Map(), timer: null };

  function stopFlashTimer() { if (flash.timer) { clearInterval(flash.timer); flash.timer = null; } }
  const hashKey = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h >>> 0); };
  const PORTION_RANK = { foundation: -1, random: 0, fixed: 1, reference: 2 };
  // percent with a decimal while small, so early progress is visible (1/620 = 0.2%)
  const pctStr = (k, n) => { if (!n) return "0%"; const p = (100 * k) / n; return (p > 0 && p < 10 ? p.toFixed(1) : Math.round(p)) + "%"; };
  const studyChapters = () => DATA.chapters.filter((c) => c.portion !== "mock")
    .sort((x, y) => (PORTION_RANK[x.portion] - PORTION_RANK[y.portion]) || 0);

  // ---- mastery ----
  function mcPool(ch, lv) {
    // Every multiple-choice item a chapter offers at level 1 or 2, as generic MC items.
    const out = [];
    const b = ch.bank || {};
    (b[String(lv)] || []).forEach((it) => out.push({
      kind: "mc", chapter: ch, level: lv, si: it.si, title: ch.title, label: lv === 1 ? "Basics" : "Applied",
      prompt: it.q, options: shuffle(it.opts), explain: it.why, key: "b" + hashKey(it.q),
    }));
    // Level 1 falls back to generated recall cards only for pages without a written bank.
    if (lv === 2 || (lv === 1 && !out.length)) {
      ch.recall.forEach((g) => g.cards.forEach((card) => {
        if (g.cards.length < 3) return;
        const dir = lv === 1 ? "fwd" : (Math.random() < 0.5 ? "fwd" : "rev");
        const pick = (c) => (dir === "fwd" ? c.ans : c.cue);
        const others = shuffle(g.cards.filter((c) => c !== card)).slice(0, Math.min(3, g.cards.length - 1));
        out.push({
          kind: "mc", chapter: ch, level: lv, si: g.section, title: g.title,
          label: card.cueLabel && card.ansLabel ? (dir === "fwd" ? `${card.cueLabel} → ${card.ansLabel}` : `${card.ansLabel} → ${card.cueLabel}`) : g.title,
          prompt: dir === "fwd" ? card.cue : card.ans,
          options: shuffle([card].concat(others)).map((c) => ({ text: pick(c), correct: c === card })),
          explain: `**${card.cue}**: ${card.ans}`, key: "r" + hashKey(g.section + ":" + card.cue),
        });
      }));
    }
    return out;
  }
  function masteryOf(ch, lv) {
    const m = (load(MASTERY_KEY, {})[ch.id] || {})[String(lv)] || {};
    const pool = mcPool(ch, lv);
    const keys = new Set(pool.map((p) => p.key));
    const known = Object.entries(m).filter(([k, v]) => v && keys.has(k)).length;
    const seen = Object.keys(m).filter((k) => keys.has(k)).length;
    return { known, seen, total: keys.size };
  }
  function recordMastery(ch, lv, key, ok) {
    const all = load(MASTERY_KEY, {});
    const c = all[ch.id] || (all[ch.id] = {});
    const l = c[String(lv)] || (c[String(lv)] = {});
    l[key] = ok;
    save(MASTERY_KEY, all);
  }
  function isKnown(ch, lv, key) { return !!(((load(MASTERY_KEY, {})[ch.id] || {})[String(lv)] || {})[key]); }

  // ---- controls ----
  function renderLevel() {
    const lv = parseInt($("flash-level").value, 10);
    $("level-name").textContent = `${lv} · ${LEVELS[lv].name}`;
    $("level-desc").textContent = LEVELS[lv].desc;
    $("flash-read-wrap").classList.toggle("hidden", lv !== 1 || $("flash-chapter").value === ALL);
    save(LEVEL_KEY, lv);
    renderSuggest();
    renderBoard();
  }

  function renderSuggest() {
    const id = $("flash-chapter").value;
    const lv = parseInt($("flash-level").value, 10);
    const el = $("level-suggest");
    if (lv > 2) { el.textContent = ""; return; }
    const chs = id === ALL ? studyChapters() : [chapterById(id)].filter(Boolean);
    const t = chs.reduce((a, c) => { const m = masteryOf(c, lv); return { k: a.k + m.known, n: a.n + m.total }; }, { k: 0, n: 0 });
    if (!t.n) { el.textContent = ""; return; }
    const pct = Math.round((100 * t.k) / t.n);
    el.textContent = `Level ${lv} mastery: ${t.k}/${t.n} (${pctStr(t.k, t.n)})` + (lv === 1 && pct === 100 ? " · ready for level 2" : lv === 2 && pct >= 80 ? " · ready for level 3" : "");
  }

  // Level 1/2 board: every chapter's mastery at the current level, tap to pick.
  function renderBoard() {
    const lv = parseInt($("flash-level").value, 10);
    const el = $("mastery-board");
    if (lv > 2) { el.innerHTML = ""; return; }
    const prev = el.querySelector("details");
    const wasOpen = prev ? prev.open : lv === 1;
    const rows = studyChapters().map((c) => ({ c, m: masteryOf(c, lv) })).filter((r) => r.m.total);
    const tk = rows.reduce((a, r) => a + r.m.known, 0), tn = rows.reduce((a, r) => a + r.m.total, 0);
    el.innerHTML = `
      <details ${wasOpen ? "open" : ""}><summary>Level ${lv} mastery, all chapters: <b>${tk}/${tn}</b> (${pctStr(tk, tn)})</summary>
      <div class="mastery-grid">
        ${rows.map(({ c, m }) => { const pct = Math.round(100 * m.known / m.total); return `
          <button class="mastery-row${pct === 100 ? " done" : ""}" data-id="${esc(c.id)}">
            <span class="mastery-name">${esc(c.title)}</span>
            <span class="mastery-bar"><span style="width:${pct}%"></span></span>
            <span class="mastery-num">${m.known}/${m.total}</span>
          </button>`; }).join("")}
      </div></details>`;
    el.querySelectorAll(".mastery-row").forEach((b) => b.addEventListener("click", () => {
      $("flash-chapter").value = b.dataset.id; renderLevel(); startFlash();
    }));
  }

  function initFlash() {
    const sel = $("flash-chapter");
    const groups = [
      ["Foundations (start here)", DATA.chapters.filter((c) => c.portion === "foundation")],
      ["Random pool (ch. 3–13)", DATA.chapters.filter((c) => c.portion === "random")],
      ["Fixed portions", DATA.chapters.filter((c) => c.portion === "fixed")],
      ["References", DATA.chapters.filter((c) => c.portion === "reference" && (c.questions.length || c.sections.length))],
    ];
    sel.innerHTML = `<option value="${ALL}">All chapters: my misses and unseen first</option>` + groups.map(([label, cs]) => cs.length ? `
      <optgroup label="${esc(label)}">
        ${cs.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("")}
      </optgroup>` : "").join("");
    sel.value = DATA.chapters.find((c) => c.id === "f00-start-here") ? "f00-start-here" : (DATA.chapters.find((c) => c.id === "ch04-overview") ? "ch04-overview" : sel.options[1].value);
    const lvl = $("flash-level");
    lvl.value = String(load(LEVEL_KEY, 1));
    lvl.addEventListener("input", renderLevel);
    sel.addEventListener("change", renderLevel);
    $("flash-start").addEventListener("click", startFlash);
    const params = new URLSearchParams(window.location.search);
    if (params.get("level")) lvl.value = params.get("level");
    renderLevel();
    const want = params.get("chapter");
    if (want && chapterById(want)) { sel.value = want; renderLevel(); startFlash(); }
  }

  // ---- queue building ----
  function orderByNeed(items, ch, lv) {
    // unseen and missed before known; stable shuffle within each band
    const band = (it) => { const m = ((load(MASTERY_KEY, {})[(it.chapter || ch).id] || {})[String(lv)] || {})[it.key]; return m === false ? 0 : m === undefined ? 1 : 2; };
    return shuffle(items).sort((a, b) => band(a) - band(b));
  }

  function buildQueue(id, lv) {
    if (id === ALL) {
      if (lv > 2) return null;
      const items = [].concat(...studyChapters().map((c) => mcPool(c, lv)));
      return orderByNeed(items, null, lv).slice(0, 40);
    }
    const ch = chapterById(id);
    if (lv === 1) {
      const pool = mcPool(ch, 1);
      if (!$("flash-read").checked) return orderByNeed(pool, ch, 1);
      const q = [];
      ch.sections.forEach((sec, si) => {
        q.push({ kind: "read", section: sec, si, chapter: ch });
        shuffle(pool.filter((p) => p.si === si)).forEach((p) => q.push(p));
      });
      return q.concat(shuffle(pool.filter((p) => p.si < 0 || p.si >= ch.sections.length)));
    }
    if (lv === 2) return orderByNeed(mcPool(ch, 2), ch, 2);
    if (lv === 3) {
      const written = ((ch.bank || {})["3"] || []).map((it, i) => ({ kind: "open", chapter: ch, q: { n: 1000 + i, q: it.q, a: it.a, star: false, hintText: it.hint }, hint: true }));
      const sheet = ch.questions.filter((q) => !q.star).sort((a, b) => a.a.length - b.a.length).map((q) => ({ kind: "open", chapter: ch, q, hint: true }));
      return written.concat(sheet);
    }
    if (lv === 4) return shuffle(ch.questions).map((q) => ({ kind: "open", chapter: ch, q }));
    return shuffle(ch.questions.filter((q) => q.star)).map((q) => ({ kind: "open", chapter: ch, q, seconds: 120 }));
  }

  function startFlash() {
    stopFlashTimer();
    const id = $("flash-chapter").value;
    const lv = parseInt($("flash-level").value, 10);
    const q = buildQueue(id, lv);
    if (!q || !q.length) {
      $("flash-card").classList.add("hidden");
      $("flash-empty").classList.remove("hidden");
      $("flash-empty").textContent = q === null ? "\"All chapters\" works at levels 1 and 2. Pick one chapter for levels 3 to 5."
        : "Nothing at this level for this page yet. Try another level.";
      return;
    }
    Object.assign(flash, { queue: q, i: 0, chapter: id === ALL ? null : chapterById(id), level: lv, score: { right: 0, total: 0 }, retries: new Map() });
    $("flash-empty").classList.add("hidden");
    const board = $("mastery-board").querySelector("details");
    if (board) board.open = false;
    nextFlash();
    $("flash-card").scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function progressBar() {
    const pct = Math.round((100 * flash.i) / flash.queue.length);
    return `<div class="exam-progress"><div style="width:${pct}%"></div></div>`;
  }

  function nextFlash() {
    stopFlashTimer();
    const el = $("flash-card");
    el.classList.remove("hidden");
    if (flash.i >= flash.queue.length) return finishFlash();
    const item = flash.queue[flash.i];
    const advance = () => { flash.i++; nextFlash(); };
    if (item.kind === "read") return renderRead(el, item, advance);
    if (item.kind === "mc") return renderMc(el, item, advance);
    renderCard(el, {
      question: item.q, chapter: item.chapter, index: flash.i, total: flash.queue.length,
      portionLabel: `${item.chapter.title} · level ${flash.level} ${LEVELS[flash.level].name}`,
      hint: item.hint, seconds: item.seconds,
      onGrade: (g) => {
        record({ mode: "study-" + flash.level, chapter: item.chapter.id, title: item.chapter.title, qn: item.q.n, q: item.q.q, grade: g });
        advance();
      },
    });
  }

  function renderRead(el, item, advance) {
    const n = item.chapter.sections.length;
    el.innerHTML = `
      ${progressBar()}
      <div class="exam-card-head no-tips"><span class="exam-card-chapter">${esc(item.chapter.title)} · Learn</span>
        <span class="exam-card-count">section ${item.si + 1} / ${n}</span></div>
      <h3 class="exam-read-title">${esc(item.section.title)}</h3>
      <div class="exam-read lesson-body">${md(item.section.md)}</div>
      <div class="exam-actions"><button class="exam-btn primary" data-act="next">Got it, check me</button></div>`;
    el.querySelector('[data-act="next"]').addEventListener("click", advance);
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function renderMc(el, item, advance) {
    const inline = (t) => (window.marked ? marked.parseInline(t) : esc(t));
    el.innerHTML = `
      ${progressBar()}
      <div class="exam-card-head no-tips"><span class="exam-card-chapter">${esc(flash.chapter ? item.title : item.chapter.title)}</span>
        <span class="exam-card-count">${flash.score.right}/${flash.score.total} right</span></div>
      <div class="exam-mc-label no-tips">${esc(item.label)}</div>
      <div class="exam-q">${inline(item.prompt)}</div>
      <div class="exam-options">
        ${item.options.map((o, i) => `<button class="exam-option" data-i="${i}"><span class="opt-key">${"ABCDE"[i]}</span> ${inline(o.text)}</button>`).join("")}
      </div>
      <div class="exam-a hidden"></div>`;
    const choose = (idx) => {
      const b = el.querySelectorAll(".exam-option")[idx];
      if (!b || b.disabled) return;
      const chosen = item.options[idx];
      el.querySelectorAll(".exam-option").forEach((x, i) => { x.disabled = true; if (item.options[i].correct) x.classList.add("right"); });
      if (!chosen.correct) {
        b.classList.add("wrong");
        // level 1: a miss comes back later in this run (up to twice), so every run ends knowing it
        const n = flash.retries.get(item.key) || 0;
        if ((item.level === 1 && n < 2) || (item.level === 2 && n < 1)) {
          flash.retries.set(item.key, n + 1);
          const again = Object.assign({}, item, { options: shuffle(item.options) });
          flash.queue.splice(Math.min(flash.queue.length, flash.i + 4), 0, again);
        }
      }
      flash.score.total++; if (chosen.correct) flash.score.right++;
      recordMastery(item.chapter, item.level, item.key, chosen.correct);
      // live: the mastery line and the all-chapters board update as you answer
      if (parseInt($("flash-level").value, 10) === item.level) { renderSuggest(); renderBoard(); }
      const a = el.querySelector(".exam-a");
      a.innerHTML = `<p><b class="${chosen.correct ? "grade-P" : "grade-F"}">${chosen.correct ? "Right." : "Not quite."}</b> ${md(item.explain || "")}</p>
        <div class="exam-actions"><button class="exam-btn primary" data-act="next">Next</button>
        <a class="exam-link" href="lesson.html?lesson=${esc(item.chapter.lesson)}" target="_blank" rel="noopener">open sheet ↗</a></div>`;
      a.classList.remove("hidden");
      a.querySelector('[data-act="next"]').addEventListener("click", advance);
      a.querySelector('[data-act="next"]').focus();
    };
    el.querySelectorAll(".exam-option").forEach((b) => b.addEventListener("click", () => choose(+b.dataset.i)));
  }

  function finishFlash() {
    const lv = flash.level;
    const s = flash.score;
    const pct = s.total ? Math.round((100 * s.right) / s.total) : null;
    const scope = flash.chapter ? flash.chapter.title : "All chapters";
    let next = "";
    if (lv <= 2) {
      const chs = flash.chapter ? [flash.chapter] : studyChapters();
      const t = chs.reduce((a, c) => { const m = masteryOf(c, lv); return { k: a.k + m.known, n: a.n + m.total }; }, { k: 0, n: 0 });
      const mp = t.n ? Math.round(100 * t.k / t.n) : 0;
      next = `Mastery at level ${lv}: ${t.k}/${t.n} (${mp}%). ` + (lv === 1
        ? (mp === 100 ? "Every basic question known. Move to level 2." : "Run it again with reading off until it reaches 100%.")
        : (mp >= 80 ? "Move to level 3." : "Run it again before moving up."));
    } else if (lv < 5) next = `When most answers here felt like P or better, move up to level ${lv + 1}.`;
    else next = "Level 5 done. Try a full run-through on the Timed self-test tab.";
    $("flash-card").innerHTML = `
      <div class="exam-done">
        <h3>${esc(scope)} · level ${lv} ${LEVELS[lv].name} done</h3>
        <p>${pct !== null ? `${s.right} of ${s.total} answers right this run. ` : ""}${esc(next)}</p>
        <div class="exam-actions">
          <button class="exam-btn primary" id="flash-again">Run again</button>
          ${lv < 5 && flash.chapter ? `<button class="exam-btn" id="flash-up">Go to level ${lv + 1}</button>` : ""}
        </div>
      </div>`;
    $("flash-again").addEventListener("click", () => { if (lv === 1) $("flash-read").checked = false; startFlash(); });
    if ($("flash-up")) $("flash-up").addEventListener("click", () => { $("flash-level").value = String(lv + 1); renderLevel(); startFlash(); });
    renderSuggest();
    renderBoard();
  }

  // keyboard: A-E / 1-5 pick an option, Enter goes next
  document.addEventListener("keydown", (e) => {
    const card = $("flash-card");
    if (!card || card.classList.contains("hidden") || !$("tab-flash").classList.contains("active")) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toUpperCase();
    const idx = "ABCDE".indexOf(k) >= 0 ? "ABCDE".indexOf(k) : "12345".indexOf(k);
    const opts = card.querySelectorAll(".exam-option:not(:disabled)");
    if (idx >= 0 && opts.length) { const all = card.querySelectorAll(".exam-option"); if (all[idx]) all[idx].click(); }
    else if (e.key === "Enter") { const n = card.querySelector('.exam-a:not(.hidden) [data-act="next"], .exam-read ~ .exam-actions [data-act="next"]'); if (n) n.click(); }
  });

  // ---------------- timed self-test (run-through) ----------------
  const mock = { draw: null, portions: [], pi: 0, qi: 0, grades: {}, qgrades: [], startedAt: null, timer: null, seconds: 0, useTimer: true };

  function drawChapters() {
    const pool = randomPool();
    const smalls = pool.filter((c) => c.bucket === "small" || c.bucket === "either");
    const larges = pool.filter((c) => c.bucket === "large" || c.bucket === "either");
    if (!smalls.length || !larges.length) return null;
    const small = smalls[Math.floor(Math.random() * smalls.length)];
    let largeCandidates = larges.filter((c) => c.id !== small.id);
    if (!largeCandidates.length) largeCandidates = larges;
    const large = largeCandidates[Math.floor(Math.random() * largeCandidates.length)];
    return { A: [small.id], B: [large.id], C: FIXED_LESSONS.C, D: FIXED_LESSONS.D, E: FIXED_LESSONS.E };
  }

  function pickQuestions(ids, n) {
    // ★ first (shuffled among themselves), then the rest shuffled; tag each with its chapter
    const all = [];
    ids.forEach((id) => {
      const ch = chapterById(id);
      if (ch) ch.questions.forEach((q) => all.push({ q, ch }));
    });
    const stars = shuffle(all.filter((x) => x.q.star));
    const rest = shuffle(all.filter((x) => !x.q.star));
    return stars.concat(rest).slice(0, n);
  }

  function initMock() {
    $("mock-draw").addEventListener("click", beginMock);
    $("mock-abort").addEventListener("click", () => {
      if (!confirm("Stop this run-through? Grades so far stay in the ledger; no run-through record is written.")) return;
      stopTimer();
      $("mock-run").classList.add("hidden");
      $("mock-setup").classList.remove("hidden");
    });
    const pool = randomPool();
    $("mock-preview").innerHTML = `
      <details><summary>What can be drawn</summary>
        <p><b>Small:</b> ${pool.filter((c) => c.bucket !== "large").map((c) => esc(c.title)).join(" · ") || "none yet"}</p>
        <p><b>Large:</b> ${pool.filter((c) => c.bucket !== "small").map((c) => esc(c.title)).join(" · ") || "none yet"}</p>
        <p><b>Fixed:</b> ${["C", "D", "E"].map((p) => FIXED_LESSONS[p].map((id) => { const c = chapterById(id); return c ? esc(c.title) : `<i>${id} (not written yet)</i>`; }).join(", ")).join(" · ")}</p>
      </details>`;
  }

  function beginMock() {
    const draw = drawChapters();
    if (!draw) { alert("Not enough chapters with a small/large bucket yet."); return; }
    const per = parseInt($("mock-per").value, 10);
    mock.draw = draw;
    mock.portions = PORTION_ORDER.map((p) => ({
      key: p,
      label: DATA.portions[p].label,
      minutes: DATA.portions[p].minutes,
      lessons: draw[p].filter(chapterById),
      questions: pickQuestions(draw[p], per),
    }));
    mock.pi = 0; mock.qi = 0; mock.grades = {}; mock.qgrades = [];
    mock.useTimer = $("mock-timer").checked;
    mock.startedAt = new Date();
    mock.seconds = 0;
    $("mock-setup").classList.add("hidden");
    $("mock-result").classList.add("hidden");
    $("mock-run").classList.remove("hidden");
    startTimer();
    renderMockStep();
  }

  function startTimer() {
    stopTimer();
    renderClock();
    mock.timer = setInterval(() => { mock.seconds++; renderClock(); }, 1000);
  }
  function stopTimer() { if (mock.timer) { clearInterval(mock.timer); mock.timer = null; } }
  function renderClock() {
    const total = 120 * 60;
    const left = Math.max(0, total - mock.seconds);
    const mm = String(Math.floor(left / 60)).padStart(3, "0");
    const ss = String(left % 60).padStart(2, "0");
    const el = $("mock-clock");
    el.textContent = mock.useTimer ? `${mm}:${ss}` : `${Math.floor(mock.seconds / 60)} min`;
    el.classList.toggle("warn", mock.useTimer && left < 10 * 60);
    // portion budget: cumulative minutes up to and including the current portion
    const budget = mock.portions.slice(0, mock.pi + 1).reduce((s, p) => s + p.minutes, 0) * 60;
    el.classList.toggle("over", mock.useTimer && mock.seconds > budget);
  }

  function renderMockStep() {
    const p = mock.portions[mock.pi];
    const budgetFrom = mock.portions.slice(0, mock.pi).reduce((s, x) => s + x.minutes, 0);
    $("mock-portion-label").innerHTML =
      `Portion <b>${p.key}</b> · ${esc(p.label)}: ${p.lessons.map((id) => esc(chapterById(id).title)).join(", ")}` +
      ` <span class="exam-budget">budget ${budgetFrom}–${budgetFrom + p.minutes} min</span>`;
    if (!p.questions.length) {
      $("mock-card").innerHTML = `<div class="exam-done"><p>No questions written for this portion yet.</p>
        <button class="exam-btn primary" id="mock-skip">Skip portion</button></div>`;
      $("mock-skip").addEventListener("click", () => endPortion("U"));
      return;
    }
    if (mock.qi >= p.questions.length) { askPortionGrade(p); return; }
    const { q, ch } = p.questions[mock.qi];
    renderCard($("mock-card"), {
      question: q, chapter: ch, index: mock.qi, total: p.questions.length,
      portionLabel: `${p.key} · ${ch.title}`,
      onGrade: (g) => {
        record({ mode: "mock", chapter: ch.id, title: ch.title, qn: q.n, q: q.q, grade: g, portion: p.key });
        mock.qgrades.push({ portion: p.key, grade: g });
        mock.qi++;
        renderMockStep();
      },
    });
  }

  function askPortionGrade(p) {
    const qg = mock.qgrades.filter((x) => x.portion === p.key).map((x) => x.grade);
    const worst = qg.reduce((w, g) => (GRADE_RANK[g] < GRADE_RANK[w] ? g : w), "D");
    const counts = GRADES.map((g) => `${g}:${qg.filter((x) => x === g).length}`).join("  ");
    $("mock-card").innerHTML = `
      <div class="exam-done">
        <h3>End of portion ${p.key}</h3>
        <p>Question grades: <code>${counts}</code>. Worst: <b class="grade-${worst}">${worst}</b>.
        Grade the portion as a whole. "U" for any concept you could not explain; "F" for little or none.</p>
        <div class="exam-grade">
          <span>Portion grade:</span>
          ${GRADES.map((g) => `<button class="exam-btn grade-btn grade-${g}" data-grade="${g}">${g}</button>`).join("")}
        </div>
      </div>`;
    $("mock-card").querySelectorAll(".grade-btn").forEach((b) => b.addEventListener("click", () => endPortion(b.dataset.grade)));
  }

  function endPortion(grade) {
    const p = mock.portions[mock.pi];
    mock.grades[p.key] = grade;
    mock.pi++; mock.qi = 0;
    if (mock.pi >= mock.portions.length) finishMock(); else { renderClock(); renderMockStep(); }
  }

  function finishMock() {
    stopTimer();
    const rec = {
      ts: mock.startedAt.toISOString(),
      minutes: Math.round(mock.seconds / 60),
      draw: { A: mock.draw.A[0], B: mock.draw.B[0] },
      grades: mock.grades,
      pass: !Object.values(mock.grades).includes("F"),
    };
    const mocks = load(MOCKS_KEY, []);
    mocks.push(rec);
    save(MOCKS_KEY, mocks);
    $("mock-run").classList.add("hidden");
    $("mock-result").classList.remove("hidden");
    $("mock-result").innerHTML = `
      <div class="exam-done">
        <h3>Run-through complete · ${rec.minutes} min · ${rec.pass ? '<span class="grade-P">no F in any portion</span>' : '<span class="grade-F">an F in a portion: revisit it</span>'}</h3>
        <table class="exam-table">
          <tr><th>Portion</th><th>Drawn</th><th>Grade</th></tr>
          ${mock.portions.map((p) => `<tr><td>${p.key}</td><td>${p.lessons.map((id) => esc(chapterById(id).title)).join(", ")}</td><td class="grade-${mock.grades[p.key]}"><b>${mock.grades[p.key]}</b></td></tr>`).join("")}
        </table>
        <p>Recorded in your ledger (this browser only). Export it from the Ledger tab to keep it.</p>
        <button class="exam-btn primary" id="mock-again">New run-through</button>
      </div>`;
    $("mock-again").addEventListener("click", () => {
      $("mock-result").classList.add("hidden");
      $("mock-setup").classList.remove("hidden");
    });
  }

  // ---------------- ledger ----------------
  function ledgerSummary() {
    const led = load(LEDGER_KEY, []);
    const byChapter = {};
    led.forEach((e) => {
      const c = byChapter[e.chapter] || (byChapter[e.chapter] = { title: e.title, latest: {}, count: 0 });
      c.latest[e.qn] = e.grade; c.count++;
    });
    return Object.entries(byChapter).map(([id, c]) => {
      const gs = Object.values(c.latest);
      const dist = GRADES.map((g) => gs.filter((x) => x === g).length);
      const worst = gs.reduce((w, g) => (GRADE_RANK[g] < GRADE_RANK[w] ? g : w), "D");
      const ch = chapterById(id);
      return { id, title: c.title, graded: gs.length, total: ch ? ch.questions.length : "?", dist, worst, count: c.count };
    }).sort((a, b) => GRADE_RANK[a.worst] - GRADE_RANK[b.worst]);
  }

  function weakSpots() {
    const led = load(LEDGER_KEY, []);
    const latest = {};
    led.forEach((e) => { latest[e.chapter + "#" + e.qn] = e; });
    return Object.values(latest).filter((e) => e.grade === "U" || e.grade === "F")
      .sort((a, b) => a.chapter.localeCompare(b.chapter) || a.qn - b.qn);
  }

  function renderLedger() {
    const sum = ledgerSummary();
    const mocks = load(MOCKS_KEY, []);
    const weak = weakSpots();
    const led = load(LEDGER_KEY, []);
    const mrows = studyChapters().map((c) => { const a = masteryOf(c, 1), b = masteryOf(c, 2); return (a.total || b.total) ? `<tr><td>${esc(c.title)}</td><td>${a.known}/${a.total}</td><td>${b.known}/${b.total}</td></tr>` : ""; }).join("");
    $("ledger-recall").innerHTML = mrows ? `<h2>Mastery (levels 1 and 2)</h2>
      <table class="exam-table"><tr><th>Chapter</th><th>Level 1 known</th><th>Level 2 known</th></tr>${mrows}</table>` : "";
    $("ledger-summary").innerHTML = sum.length ? `
      <h2>By chapter (latest grade per question)</h2>
      <table class="exam-table">
        <tr><th>Chapter</th><th>Graded</th>${GRADES.map((g) => `<th class="grade-${g}">${g}</th>`).join("")}<th>Worst</th></tr>
        ${sum.map((s) => `<tr><td><a href="lesson.html?lesson=06-m1-exam/${esc(s.id)}">${esc(s.title)}</a></td><td>${s.graded}/${s.total}</td>${s.dist.map((n) => `<td>${n || ""}</td>`).join("")}<td class="grade-${s.worst}"><b>${s.worst}</b></td></tr>`).join("")}
      </table>` : `<p class="exam-empty">No grades yet. Run some flashcards.</p>`;
    $("ledger-mocks").innerHTML = mocks.length ? `
      <h2>Run-throughs</h2>
      <table class="exam-table">
        <tr><th>Date</th><th>Min</th><th>Drawn A</th><th>Drawn B</th>${PORTION_ORDER.map((p) => `<th>${p}</th>`).join("")}<th>Result</th></tr>
        ${mocks.map((m) => `<tr><td>${m.ts.slice(0, 10)}</td><td>${m.minutes}</td><td>${esc(m.draw.A)}</td><td>${esc(m.draw.B)}</td>${PORTION_ORDER.map((p) => `<td class="grade-${m.grades[p]}"><b>${m.grades[p] || ""}</b></td>`).join("")}<td>${m.pass ? "pass" : "<b class='grade-F'>fail</b>"}</td></tr>`).join("")}
      </table>` : "";
    $("ledger-weak").innerHTML = weak.length ? `
      <h2>Weak spots (latest grade U or F)</h2>
      <ul class="exam-weak">${weak.map((e) => `<li><b class="grade-${e.grade}">${e.grade}</b> <a href="lesson.html?lesson=06-m1-exam/${esc(e.chapter)}">${esc(e.title)}</a> Q${e.qn}: ${esc(e.q)}</li>`).join("")}</ul>` : (sum.length ? "<p class='exam-note'>No weak spots on record.</p>" : "");
    $("ledger-log").innerHTML = led.length ? `<details><summary>Full log (${led.length} grades)</summary>
      <table class="exam-table small">${led.slice().reverse().map((e) => `<tr><td>${e.ts.slice(0, 16).replace("T", " ")}</td><td>${e.mode}${e.portion ? " " + e.portion : ""}</td><td>${esc(e.title)}</td><td>Q${e.qn}</td><td class="grade-${e.grade}"><b>${e.grade}</b></td></tr>`).join("")}</table></details>` : "";
  }

  function ledgerMarkdown() {
    const sum = ledgerSummary();
    const mocks = load(MOCKS_KEY, []);
    const weak = weakSpots();
    const today = new Date().toISOString().slice(0, 10);
    let out = `## M1 Understanding export ${today}\n\n`;
    if (sum.length) {
      out += `| Chapter | Graded | P | M | D | U | F | Worst |\n|---|---|---|---|---|---|---|---|\n`;
      sum.forEach((s) => { out += `| ${s.title} | ${s.graded}/${s.total} | ${s.dist.join(" | ")} | ${s.worst} |\n`; });
      out += "\n";
    }
    if (mocks.length) {
      out += `### Run-throughs\n\n| Date | Min | Drawn A | Drawn B | A | B | C | D | E | Result |\n|---|---|---|---|---|---|---|---|---|---|\n`;
      mocks.forEach((m) => { out += `| ${m.ts.slice(0, 10)} | ${m.minutes} | ${m.draw.A} | ${m.draw.B} | ${PORTION_ORDER.map((p) => m.grades[p] || "").join(" | ")} | ${m.pass ? "pass" : "FAIL"} |\n`; });
      out += "\n";
    }
    if (weak.length) {
      out += `### Weak spots\n\n`;
      weak.forEach((e) => { out += `- **${e.grade}** ${e.title} Q${e.qn}: ${e.q}\n`; });
      out += "\n";
    }
    return out;
  }

  function initLedger() {
    $("ledger-export").addEventListener("click", () => {
      const blob = new Blob([ledgerMarkdown()], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `m1-understanding-ledger-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("ledger-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(ledgerMarkdown()).then(() => {
        $("ledger-copy").textContent = "Copied!";
        setTimeout(() => { $("ledger-copy").textContent = "Copy to clipboard"; }, 1500);
      });
    });
    $("ledger-clear").addEventListener("click", () => {
      if (!confirm("Clear every grade and run-through result in this browser? Export first if you want to keep them.")) return;
      save(LEDGER_KEY, []); save(MOCKS_KEY, []);
      renderLedger();
    });
  }

  // ---------------- boot ----------------
  async function boot() {
    try {
      const r = await fetch("data/exam.json");
      if (!r.ok) throw new Error(`exam.json: HTTP ${r.status}`);
      DATA = await r.json();
    } catch (e) {
      $("flash-empty").innerHTML = `<b>Could not load data/exam.json.</b> Run <code>python3 tools/build_exam_data.py</code> and serve the site over HTTP.`;
      console.error(e);
      return;
    }
    window.LearningLasair.useGlossary();     // hard terms in the cards explain themselves
    initTabs();
    initFlash();
    initMock();
    initLedger();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
