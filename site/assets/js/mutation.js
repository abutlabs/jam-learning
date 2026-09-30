/* The Mutation Lab — renders the real per-class results of the mutation
   engine (bin/fuzz_driver --mutate). Data: data/mutation.json, built by
   tools/build_mutation_data.py from an actual soak run. */

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const listEl = document.getElementById("class-list");
  const viewEl = document.getElementById("class-view");
  const scoreEl = document.getElementById("scoreboard");
  const wallsEl = document.getElementById("walls");

  function renderScoreboard(s) {
    const fams = s.families.length;
    const cells = [
      { n: s.total_checks.toLocaleString(), l: "mutations fired", ok: true },
      { n: s.rejected.toLocaleString(), l: "correctly rejected", ok: true },
      { n: s.alive_ok.toLocaleString(), l: "survived (random flips)", ok: true },
      { n: s.crash, l: "crashes", zero: true },
      { n: s.hang, l: "hangs", zero: true },
      { n: s.wrong_accept, l: "wrongly accepted", zero: true },
    ];
    scoreEl.innerHTML = `
      <div class="mut-score-grid">
        ${cells.map((c) => `
          <div class="mut-score${c.zero ? (c.n === 0 ? " good-zero" : " bad") : ""}">
            <div class="ms-num">${c.n}</div>
            <div class="ms-label">${esc(c.l)}</div>
          </div>`).join("")}
      </div>
      <p class="mut-score-foot">
        ${fams} trace families · ${s.rounds} soak round${s.rounds === 1 ? "" : "s"}.
        The three numbers on the right are the trilogy. They must all be zero.
      </p>`;
  }

  function renderWalls(walls) {
    wallsEl.innerHTML = walls.map((w, i) => `
      <div class="mut-wall">
        <div class="mw-num">${i + 1}</div>
        <div class="mw-body">
          <div class="mw-name">${esc(w.name)}</div>
          <div class="mw-desc">${esc(w.desc)}</div>
        </div>
      </div>`).join("");
  }

  function verdictBadge(c) {
    if (c.crash || c.hang || c.wrong_accept)
      return `<span class="mv-badge mv-bad">FAILED</span>`;
    if (c.expect === "Alive")
      return `<span class="mv-badge mv-alive">SURVIVED</span>`;
    return `<span class="mv-badge mv-ok">REJECTED</span>`;
  }

  function flowDiagram(c) {
    const verdict = (c.expect === "Alive")
      ? `<div class="mf-node mf-alive">target stays up<br><small>answers, never dies</small></div>`
      : `<div class="mf-node mf-reject">Error: <code>${esc(c.reason || "rejected")}</code></div>`;
    return `
      <div class="mut-flow">
        <div class="mf-node mf-valid">valid block</div>
        <div class="mf-arrow">→</div>
        <div class="mf-node mf-mutate">${esc(c.class)}<br><small>${esc(c.corrupts)}</small></div>
        <div class="mf-arrow">→</div>
        ${verdict}
      </div>`;
  }

  function renderDetail(c) {
    const total = c.applied || 1;
    const handled = c.rejected + c.alive_ok;
    const pct = Math.round((handled / total) * 100);
    viewEl.innerHTML = `
      <div class="mv-head">
        <h2>${esc(c.class)}</h2>
        ${verdictBadge(c)}
      </div>
      <p class="mv-group">${esc(c.group_label)}</p>
      ${flowDiagram(c)}
      <div class="mv-grid">
        <div class="mv-card">
          <div class="mv-k">What it corrupts</div>
          <div class="mv-v">${esc(c.corrupts)}</div>
        </div>
        <div class="mv-card">
          <div class="mv-k">What must happen</div>
          <div class="mv-v">${c.expect === "Alive"
            ? "Stay alive and answer something parseable — the flip may be harmless."
            : "Answer with an Error variant — the block is invalid."}</div>
        </div>
        <div class="mv-card">
          <div class="mv-k">Which wall caught it</div>
          <div class="mv-v">${esc(c.wall)}</div>
        </div>
        <div class="mv-card">
          <div class="mv-k">Target's real answer</div>
          <div class="mv-v">${c.reason
            ? `<code>${esc(c.reason)}</code>` : "—"}</div>
        </div>
      </div>
      <div class="mv-counts">
        <span><b>${c.applied.toLocaleString()}</b> fired</span>
        <span class="mc-ok"><b>${c.rejected.toLocaleString()}</b> rejected</span>
        ${c.alive_ok ? `<span class="mc-ok"><b>${c.alive_ok.toLocaleString()}</b> survived</span>` : ""}
        ${c.wrong_accept ? `<span class="mc-bad"><b>${c.wrong_accept}</b> wrongly accepted</span>` : ""}
        ${c.crash ? `<span class="mc-bad"><b>${c.crash}</b> crashes</span>` : ""}
        ${c.hang ? `<span class="mc-bad"><b>${c.hang}</b> hangs</span>` : ""}
        <span class="mc-pct">${pct}% handled correctly</span>
      </div>`;
  }

  function renderList(classes) {
    // group classes by group_label, preserving first-seen order
    const groups = [];
    const byLabel = {};
    classes.forEach((c) => {
      if (!byLabel[c.group_label]) {
        byLabel[c.group_label] = [];
        groups.push(c.group_label);
      }
      byLabel[c.group_label].push(c);
    });
    listEl.innerHTML = groups.map((g) => `
      <div class="mut-group">
        <div class="mg-label">${esc(g)}</div>
        ${byLabel[g].map((c) => {
          const bad = c.crash || c.hang || c.wrong_accept;
          const dot = bad ? "mci-bad" : "mci-ok";
          return `<button class="mut-class-item" data-class="${esc(c.class)}">
            <span class="mci-dot ${dot}"></span>${esc(c.class)}</button>`;
        }).join("")}
      </div>`).join("");

    listEl.querySelectorAll(".mut-class-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        listEl.querySelectorAll(".mut-class-item").forEach((b) =>
          b.classList.remove("active"));
        btn.classList.add("active");
        const c = classes.find((x) => x.class === btn.dataset.class);
        renderDetail(c);
      });
    });
  }

  fetch("data/mutation.json")
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d) => {
      renderScoreboard(d.summary);
      renderWalls(d.walls);
      renderList(d.classes);
      // open the first reject-class by default (the garbage-append story
      // is the headline find, but seal-bitflip is the cleanest intro)
      const first = d.classes.find((c) => c.class === "seal-bitflip") || d.classes[0];
      if (first) {
        renderDetail(first);
        const btn = listEl.querySelector(`[data-class="${first.class}"]`);
        if (btn) btn.classList.add("active");
      }
    })
    .catch((e) => {
      viewEl.innerHTML = `<div class="mut-loading">Could not load mutation data: ${esc(e.message)}</div>`;
    });
})();
