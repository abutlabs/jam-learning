/* The Divergence Lab — renders real divergences from lasair's live JAM
   conformance fuzzer campaign. Data: data/divergences.json, built by
   tools/build_divergence_data.py from the actual fuzzer report.json files. */

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const listEl = document.getElementById("div-list");
  const viewEl = document.getElementById("div-view");
  const scoreEl = document.getElementById("scoreboard");

  function renderScoreboard(s) {
    const cells = [
      { n: s.total, l: "divergences traced", ok: true },
      { n: s.fixed, l: "fixed (gate-verified)", ok: true },
      { n: s.classes.length, l: "distinct bug classes", ok: true },
      { n: s.deepest.toLocaleString(), l: "deepest clean import", ok: true },
    ];
    scoreEl.innerHTML = `
      <div class="dv-score-grid">
        ${cells.map((c) => `
          <div class="dv-score">
            <div class="ds-num">${esc(c.n)}</div>
            <div class="ds-label">${esc(c.l)}</div>
          </div>`).join("")}
      </div>
      <p class="dv-score-foot">
        ${esc(s.classes.length)} classes, not ${esc(s.total)} unrelated bugs:
        ${s.classes.map((c) => `<span class="ds-chip">${esc(c)}</span>`).join(" ")}
        <br>Real protocol bugs cluster — learn the class and you stop debugging a client, you start understanding a protocol.
      </p>`;
  }

  // axis -> colour-coded badge label
  const AXIS = {
    ordering: "ordering", existence: "existence", value: "value",
    privilege: "privilege",
  };

  function diffBlock(k) {
    // render expected vs computed hex, marking the first differing byte
    const mark = (hex, first) => {
      if (first == null || first * 2 >= hex.length) return esc(hex);
      const i = first * 2;
      return esc(hex.slice(0, i)) +
        `<mark class="dv-byte">${esc(hex.slice(i, i + 2))}</mark>` +
        esc(hex.slice(i + 2));
    };
    return `
      <div class="dv-diff">
        <div class="dv-diff-head">
          <span class="dv-comp">${esc(k.component)}</span>
          <span class="dv-keymeta">key ${esc(k.key)} · ${esc(k.bytes)} bytes${
            k.first_diff != null ? ` · first diff at byte ${esc(k.first_diff)}` : ""}</span>
        </div>
        <div class="dv-hexrow"><span class="dv-hexlbl dv-exp">expected</span><code>${mark(k.exp, k.first_diff)}</code></div>
        <div class="dv-hexrow"><span class="dv-hexlbl dv-got">computed</span><code>${mark(k.got, k.first_diff)}</code></div>
      </div>`;
  }

  function renderDetail(d) {
    const axis = AXIS[d.axis] || d.axis;
    const reportLine = d.report
      ? `seed <code>${esc(d.seed)}</code> · step ${esc(d.step)} · ${esc(d.imports.toLocaleString())} blocks imported clean`
      : `found <strong>proactively</strong> — no fuzzer report (${esc(d.seed)})`;
    const roots = d.root_hex
      ? `<div class="dv-roots">
           <div><span class="dv-hexlbl dv-exp">root exp</span><code>${esc(d.root_hex.exp)}</code></div>
           <div><span class="dv-hexlbl dv-got">root got</span><code>${esc(d.root_hex.got)}</code></div>
         </div>` : "";
    const diffs = d.keys && d.keys.length
      ? d.keys.map(diffBlock).join("")
      : `<p class="dv-nodiff">${esc(d.keys_note || "No state-root diff — this one was caught by auditing the class, before any lane reached it.")}</p>`;
    viewEl.innerHTML = `
      <div class="dv-vhead">
        <div class="dv-vtitle"><span class="dv-id">${esc(d.id)}</span>${esc(d.title)}</div>
        <span class="dv-axis dv-axis-${esc(d.axis)}">${esc(axis)}</span>
      </div>
      <div class="dv-class">class: <strong>${esc(d.cls)}</strong></div>
      <div class="dv-report">${reportLine}</div>
      ${roots}

      <h3 class="dv-h">The diff — what the test actually caught</h3>
      ${diffs}

      <h3 class="dv-h">What happened</h3>
      <p class="dv-body">${esc(d.story)}</p>

      <h3 class="dv-h">How we found it</h3>
      <p class="dv-body">${esc(d.trace)}</p>

      <div class="dv-twocol">
        <div class="dv-rc">
          <h3 class="dv-h">Root cause</h3>
          <p class="dv-body">${esc(d.cause)}</p>
        </div>
        <div class="dv-fix">
          <h3 class="dv-h">The fix</h3>
          <p class="dv-body">${esc(d.fix)}</p>
        </div>
      </div>

      ${d.fix_code ? `
      <h3 class="dv-h">The fix, in code</h3>
      <div class="dv-fc-cap">${esc(d.fix_code.caption)}</div>
      <pre class="dv-fc dv-fc-before"><span class="dv-fc-lbl">− before</span><code>${esc(d.fix_code.before)}</code></pre>
      <pre class="dv-fc dv-fc-after"><span class="dv-fc-lbl">＋ after</span><code>${esc(d.fix_code.after)}</code></pre>` : ""}

      <div class="dv-lesson">
        <span class="dv-lesson-lbl">The lesson</span>
        ${esc(d.lesson)}
      </div>`;
  }

  function renderList(divs) {
    listEl.innerHTML = divs.map((d) => `
      <button class="dv-item" data-id="${esc(d.id)}">
        <span class="dv-item-id">${esc(d.id)}</span>
        <span class="dv-item-body">
          <span class="dv-item-title">${esc(d.title)}</span>
          <span class="dv-item-cls">${esc(d.cls)}</span>
        </span>
      </button>`).join("");
    listEl.querySelectorAll(".dv-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        listEl.querySelectorAll(".dv-item").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderDetail(divs.find((x) => x.id === btn.dataset.id));
      });
    });
  }

  fetch("data/divergences.json")
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d) => {
      renderScoreboard(d.summary);
      renderList(d.divergences);
      const first = d.divergences[0];
      if (first) {
        renderDetail(first);
        const btn = listEl.querySelector(`[data-id="${first.id}"]`);
        if (btn) btn.classList.add("active");
      }
    })
    .catch((e) => {
      viewEl.innerHTML = `<div class="dv-loading">Could not load divergence data: ${esc(e.message)}</div>`;
    });
})();
