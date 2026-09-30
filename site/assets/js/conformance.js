/* Conformance Explorer — renders annotated JAM trace vectors.
   Data built by tools/build_conformance_data.py from jam-conformance. */

(function () {
  const listEl = document.getElementById("vector-list");
  const viewEl = document.getElementById("vector-view");
  let index = [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function pipelineStages(d) {
    const hasGuar = d.extrinsic.guarantees.length > 0;
    const hasAssure = d.extrinsic.assurance_votes.count > 0;
    const accumulated = d.accumulated_now.length > 0;
    const gas = d.service_stats.reduce((a, s) => a + (s.acc_gas || 0), 0);
    return [
      { name: "1 · Guarantee", detail: hasGuar
          ? `${d.extrinsic.guarantees.length} report(s) onto cores` : "no new reports",
        active: hasGuar },
      { name: "2 · Assure", detail: hasAssure
          ? `${d.extrinsic.assurance_votes.count} validator votes` : "no assurances",
        active: hasAssure },
      { name: "3 · Available", detail: accumulated
          ? `${d.accumulated_now.length} package(s) released` : "threshold not met",
        active: accumulated },
      { name: "4 · Accumulate (PVM)", detail: accumulated
          ? `${gas.toLocaleString()} gas` : "nothing to run",
        active: accumulated },
      { name: "5 · State Root", detail: `${d.diff.length} entries changed`,
        active: true },
    ];
  }

  function render(d) {
    const stages = pipelineStages(d)
      .map((s) => `<div class="pipe-stage${s.active ? " active" : ""}">
          <div class="ps-name">${esc(s.name)}</div>
          <div class="ps-detail">${esc(s.detail)}</div></div>`)
      .join("");

    const anatomy = [];
    anatomy.push({ label: "slot", value: d.slot, sub: `ring index ${d.slot % 12}` });
    anatomy.push({ label: "guarantees", value: d.extrinsic.guarantees.length,
      sub: d.extrinsic.guarantees.map((g) =>
        `core ${g.core}: ${g.package}… ×${g.digests.length}`).join(" · ") || "—" });
    anatomy.push({ label: "assurances", value: d.extrinsic.assurance_votes.count,
      sub: `core0: ${d.extrinsic.assurance_votes.core0} · core1: ${d.extrinsic.assurance_votes.core1}` });
    if (d.extrinsic.preimages.length)
      anatomy.push({ label: "preimages (E_P)", value: d.extrinsic.preimages.length,
        sub: d.extrinsic.preimages.map((p) => `${p.bytes}B`).join(", ") });
    if (d.extrinsic.tickets)
      anatomy.push({ label: "tickets", value: d.extrinsic.tickets, sub: "Ring-VRF" });
    anatomy.push({ label: "state entries", value: d.post_state_entries,
      sub: `${d.pre_state_entries} before` });
    const anatomyHtml = anatomy.map((a) =>
      `<div class="anatomy-card"><div class="ac-label">${esc(a.label)}</div>
       <div class="ac-value">${esc(a.value)}</div>
       <div class="ac-sub">${esc(a.sub)}</div></div>`).join("");

    const events = d.events.length
      ? `<ul class="timeline">${d.events.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
      : `<p class="vv-family-note">A quiet block: only the clock, entropy and
         statistics move. Compare the diff below with a busy block.</p>`;

    const gasBanner = d.service_stats.length
      ? `<div class="gas-banner">${d.service_stats.map((s) => `
          <div class="gb-item"><div class="gb-num">${(s.acc_gas || 0).toLocaleString()}</div>
            <div class="gb-label">gas · service ${s.service}</div></div>
          <div class="gb-item"><div class="gb-num">${s.acc_count || 0}</div>
            <div class="gb-label">items accumulated</div></div>
          ${s.provided_count ? `<div class="gb-item"><div class="gb-num">${s.provided_count}</div>
            <div class="gb-label">preimages provided (${s.provided_size}B)</div></div>` : ""}`).join("")}
        </div>`
      : "";

    const diffRows = d.diff.map((e) => `
      <tr>
        <td><span class="chip ${e.change}">${e.change}</span></td>
        <td><div class="diff-label">${esc(e.label)}</div>
            <div class="diff-desc">${esc(e.desc)}</div>
            <div class="diff-key">${esc(e.key)}</div></td>
        <td class="diff-size">${e.pre_len == null ? "—" : e.pre_len + "B"}
            → ${e.post_len == null ? "—" : e.post_len + "B"}${
              e.first_diff_byte != null ? `<br>first diff @ byte ${e.first_diff_byte}` : ""}</td>
      </tr>`).join("");

    viewEl.innerHTML = `
      <div class="vv-header">
        <h1>${esc(d.family)} / block ${esc(d.block)}
          <span class="vv-slot">slot ${d.slot}</span></h1>
      </div>
      <div class="vv-why">${esc(d.why)}</div>
      <p class="vv-family-note"><strong>This family:</strong> ${esc(d.family_explainer)}</p>

      <div class="vv-section"><h2>Work-report lifecycle in this block</h2>
        <div class="pipeline">${stages}</div></div>

      <div class="vv-section"><h2>Block anatomy</h2>
        <div class="anatomy">${anatomyHtml}</div></div>

      <div class="vv-section"><h2>What happens, step by step</h2>
        ${events}${gasBanner}</div>

      <div class="vv-section"><h2>State diff — what the test actually checks</h2>
        <p class="vv-family-note">The vector supplies a complete pre-state and the
        block to import. The implementation must produce a post-state whose Merkle
        root matches <em>exactly</em> — these are the entries that change:</p>
        <table class="diff-table">
          <thead><tr><th></th><th>state entry</th><th>size</th></tr></thead>
          <tbody>${diffRows}</tbody>
        </table></div>`;
  }

  function select(item, btn) {
    document.querySelectorAll(".vector-item").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    viewEl.innerHTML = '<div class="loading">Loading…</div>';
    fetch(`data/conformance/${item.file}`)
      .then((r) => r.json())
      .then(render)
      .catch((e) => { viewEl.innerHTML = `<div class="loading">Failed to load: ${esc(e)}</div>`; });
  }

  fetch("data/conformance/index.json")
    .then((r) => r.json())
    .then((idx) => {
      index = idx;
      listEl.innerHTML = "";
      idx.forEach((item, i) => {
        const btn = document.createElement("button");
        btn.className = "vector-item";
        btn.innerHTML = `<span class="vi-family">${esc(item.family)}</span>
          <span class="vi-title">block ${esc(item.block.replace(/^0+/, "") || "0")}</span>
          <span class="vi-hook">${esc(item.why.split(". ")[0])}.</span>`;
        btn.addEventListener("click", () => select(item, btn));
        listEl.appendChild(btn);
        if (i === 2) select(item, btn); // default: storage block 6
      });
    })
    .catch((e) => { listEl.innerHTML = `<p>Failed to load index: ${esc(e)}</p>`; });
})();
