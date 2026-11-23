// Anatomy Sprint: a short, timed 3D identification drill. It has its own page (student/sprint.html),
// reached from the banner on the Assessment page.
// It is practice only: it never reaches the gradebook or XP. Personal bests and recent rounds stay in this
// browser (localStorage); every finished round is also sent to the class leaderboard (js/leaderboard.js).
//
// 3D Spot: a structure is highlighted on the 3D model; pick its name from four options.
// Distractors come from the same body system, preferring siblings in the hierarchy, so the choices
// are plausible rather than obvious.
import { loadSystems, loadAllStructures } from "./anatomy.js";
import { esc } from "./session.js";
import { mountScene } from "./assessment.js";
import { mountGameBoard, submitGameScore } from "./leaderboard.js";

const ROUND_MS = 60000;
const WRONG_PENALTY_MS = 3000;
const SKIP_PENALTY_MS = 1000;
const FAST_MS = 8000; // answers faster than this earn a speed bonus
const HIGHLIGHT = "#26bbff";
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmt = (n) => Math.round(n).toLocaleString();

// ---------- personal records (this browser only) ----------
function recordKey(profile, mode, sys) {
  return `sprint:${profile.id}:${mode}:${sys || "all"}`;
}
function readRecord(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || { best: 0, runs: [] };
  } catch {
    return { best: 0, runs: [] };
  }
}
function saveRecord(key, rec) {
  try {
    localStorage.setItem(key, JSON.stringify(rec));
  } catch {}
}

export async function mountGame(root, profile, { autostart = false, sys = "" } = {}) {
  root.innerHTML = `<div class="card game">
    <div class="g-top">
      <div><span class="g-eyebrow">3D Spot &middot; Practice arena</span><h2>Anatomy Sprint</h2></div>
      <a class="btn small secondary" href="assessment.html">&larr; Back to assessments</a>
    </div>
    <div id="gMenu"><p class="muted small">Loading anatomy...</p></div>
    <div id="gHud" class="g-hud" hidden></div>
    <div id="gStage" class="g-stage" hidden></div>
    <div id="gPlay" hidden></div>
    <div id="gDone" hidden></div>
  </div>
  <aside class="card" id="gBoard"></aside>`;
  const $g = (id) => root.querySelector("#" + id);
  let board = null; // leaderboard, created once the systems are known

  let systems, all;
  try {
    [systems, all] = await Promise.all([loadSystems(), loadAllStructures()]);
  } catch (e) {
    console.error(e);
    $g("gMenu").innerHTML =
      '<p class="msg error">Could not load anatomy data for the game.</p>';
    return;
  }
  const sysName = new Map(systems.map((s) => [s.id, s.name]));
  const modelSystems = systems.filter((s) =>
    all.some((r) => r.system_id === s.id && r.model_file_path),
  );
  if (!modelSystems.length) {
    $g("gMenu").innerHTML =
      '<p class="msg error">No 3D models have been uploaded yet, so there is nothing to spot.</p>';
    return;
  }
  let scene = null;

  const state = {
    mode: "spot",
    sys: modelSystems.some((s) => s.id === sys) ? sys : modelSystems[0].id,
  };
  board = mountGameBoard($g("gBoard"), { systemId: state.sys, systemName: sysName.get(state.sys) || "" });

  // ======================= menu =======================
  function drawMenu() {
    show("gMenu");
    if (!modelSystems.some((s) => s.id === state.sys)) state.sys = modelSystems[0].id;
    const sysOpts = modelSystems
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === state.sys ? "selected" : ""}>${esc(s.name)}</option>`,
      )
      .join("");
    const rec = readRecord(recordKey(profile, state.mode, state.sys));
    const runs = rec.runs.slice(-8);
    const maxRun = Math.max(1, ...runs);
    $g("gMenu").innerHTML = `
      <p class="g-hint">A structure lights up on the 3D model. Name it before the clock runs out.</p>
      <label for="gSys">Body system</label>
      <select id="gSys">${sysOpts}</select>
      <div class="g-rules">
        <div><b>60s</b><span>round</span></div>
        <div><b>&times;3</b><span>max streak bonus</span></div>
        <div><b>&minus;3s</b><span>per miss</span></div>
      </div>
      <div class="g-record">
        <div><span class="g-label">Personal best</span><b>${rec.best ? fmt(rec.best) : "&mdash;"}</b></div>
        <div class="g-spark" title="Your last rounds">${
          runs.length
            ? runs
                .map(
                  (r) =>
                    `<i style="height:${Math.max(8, (r / maxRun) * 100)}%" title="${fmt(r)}"></i>`,
                )
                .join("")
            : '<span class="muted small">No rounds yet</span>'
        }</div>
      </div>
      <button class="btn g-start" id="gStart">Start round <kbd>Enter</kbd></button>
      <p class="small muted g-foot">Practice only: does not affect grades or XP. Your best round per system appears on the class leaderboard.</p>`;
    $g("gSys").onchange = (e) => {
      state.sys = e.target.value;
      try {
        localStorage.setItem("sprint:lastSys", state.sys);
      } catch {}
      drawMenu();
      board?.refresh(state.sys, sysName.get(state.sys) || "");
    };
    $g("gStart").onclick = start;
  }
  function show(...ids) {
    ["gMenu", "gHud", "gStage", "gPlay", "gDone"].forEach(
      (id) => ($g(id).hidden = !ids.includes(id)),
    );
  }

  // ======================= round =======================
  let run = null;
  async function start() {
    const btn = $g("gStart");
    btn.disabled = true;
    btn.textContent = "Preparing...";
    try {
      const pool = await buildPool();
      if (pool.length < 4) {
        $g("gStage").hidden = true;
        btn.disabled = false;
        btn.innerHTML = "Start round <kbd>Enter</kbd>";
        $g("gMenu").insertAdjacentHTML(
          "beforeend",
          `<p class="msg error">Not enough 3D structures in this system to play. Pick another system.</p>`,
        );
        return;
      }
      run = {
        pool,
        used: new Set(),
        score: 0,
        streak: 0,
        bestStreak: 0,
        correct: 0,
        answered: 0,
        times: [],
        missed: [],
        endAt: 0,
        q: null,
        locked: false,
        over: false,
      };
      show("gHud", "gPlay", "gStage");
      await countdown();
      run.endAt = performance.now() + ROUND_MS;
      tick();
      next();
    } catch (e) {
      console.error(e);
      show("gMenu");
      btn.disabled = false;
      btn.innerHTML = "Start round <kbd>Enter</kbd>";
      $g("gMenu").insertAdjacentHTML(
        "beforeend",
        `<p class="msg error">${esc(e.message || "Could not start the game.")}</p>`,
      );
    }
  }

  async function buildPool() {
    if (state.mode === "spot") {
      const stage = $g("gStage");
      stage.hidden = false;
      if (!scene) scene = await mountScene(stage, { systems, all });
      scene.setStatus("Loading 3D model...");
      const failed = await scene.ensure([state.sys]);
      if (failed.length) throw new Error("Could not load the 3D model for " + failed[0] + ".");
      scene.show([state.sys]);
      scene.setStatus("");
      return all.filter((r) => r.system_id === state.sys && r.model_object_id);
    }
  }

  function countdown() {
    return new Promise((resolve) => {
      let n = 3;
      $g("gHud").innerHTML = "";
      const paint = () =>
        ($g("gPlay").innerHTML = `<div class="g-count"><b>${n}</b><span>Get ready</span></div>`);
      paint();
      const t = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(t);
          resolve();
        } else paint();
      }, 650);
    });
  }

  const mult = () => Math.min(3, 1 + Math.floor(run.streak / 3) * 0.5);
  function drawHud() {
    const left = Math.max(0, run.endAt - performance.now());
    const pctLeft = (left / ROUND_MS) * 100;
    $g("gHud").innerHTML = `
      <div class="g-stats">
        <div><span class="g-label">Score</span><b id="gScore">${fmt(run.score)}</b></div>
        <div><span class="g-label">Streak</span><b>${run.streak}${run.streak >= 3 ? ' <span class="g-fire">&times;' + mult() + "</span>" : ""}</b></div>
        <div><span class="g-label">Time</span><b class="${left < 10000 ? "g-low" : ""}">${(left / 1000).toFixed(1)}s</b></div>
      </div>
      <div class="g-timebar"><i style="width:${pctLeft}%" class="${left < 10000 ? "low" : ""}"></i></div>`;
  }
  let lastHud = 0;
  function tick() {
    if (!run || run.over) return;
    const now = performance.now();
    if (now - lastHud > 90) {
      lastHud = now;
      drawHud(); // ~10 redraws a second is plenty for a 0.1s clock
    }
    if (performance.now() >= run.endAt) {
      if (!run.locked) finish();
      else run.timeUp = true; // finish once the current feedback is shown
      return;
    }
    requestAnimationFrame(tick);
  }

  function pickOptions(target) {
    const sameSys = run.pool.filter(
      (r) => r.system_id === target.system_id && r.id !== target.id,
    );
    const siblings = shuffle(
      sameSys.filter((r) => target.parent_id && r.parent_id === target.parent_id),
    );
    const names = new Set([target.name.trim().toLowerCase()]);
    const out = [target];
    for (const r of [...siblings.slice(0, 2), ...shuffle(sameSys)]) {
      if (out.length >= 4) break;
      const n = r.name.trim().toLowerCase();
      if (names.has(n)) continue;
      names.add(n);
      out.push(r);
    }
    return shuffle(out);
  }

  function next() {
    if (!run || run.over) return;
    if (run.timeUp) return finish();
    let target = null;
    for (let tries = 0; tries < 25 && !target; tries++) {
      let fresh = run.pool.filter((r) => !run.used.has(r.id));
      if (!fresh.length) {
        run.used.clear(); // the whole pool has been seen: start over
        fresh = run.pool;
      }
      const t = fresh[Math.floor(Math.random() * fresh.length)];
      run.used.add(t.id);
      if (state.mode === "spot") {
        const items = scene.itemsFor([t], HIGHLIGHT);
        if (!scene.viewer.setMarks(items, { ghost: true })) continue; // not present in the model
        scene.viewer.frameItems(items);
      }
      target = t;
    }
    if (!target) return finish();
    const opts = pickOptions(target);
    if (opts.length < 2) return finish();
    run.q = { target, opts, t0: performance.now() };
    run.locked = false;

    const prompt = `<p class="g-q">Identify the highlighted structure</p>`;
    $g("gPlay").innerHTML = `${prompt}
      <div class="g-opts">${opts
        .map(
          (o, i) =>
            `<button class="g-opt" data-id="${o.id}"><kbd>${i + 1}</kbd><span>${esc(o.name)}</span></button>`,
        )
        .join("")}</div>
      <div class="g-actions"><button class="btn small secondary" id="gSkip">Skip <kbd>0</kbd></button><button class="btn small secondary" id="gQuit">End round <kbd>Esc</kbd></button><span class="g-pop" id="gPop"></span></div>`;
    $g("gPlay")
      .querySelectorAll(".g-opt")
      .forEach((b) => (b.onclick = () => answer(b.dataset.id)));
    $g("gSkip").onclick = () => answer(null);
    $g("gQuit").onclick = () => finish();
  }

  function answer(id) {
    if (!run || run.locked || run.over || !run.q) return;
    run.locked = true;
    const { target } = run.q;
    const ms = performance.now() - run.q.t0;
    const ok = id === target.id;
    const btns = $g("gPlay").querySelectorAll(".g-opt");
    btns.forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === target.id) b.classList.add("right");
      else if (b.dataset.id === id) b.classList.add("wrong");
    });
    let pop;
    if (ok) {
      run.streak++;
      run.bestStreak = Math.max(run.bestStreak, run.streak);
      run.correct++;
      const gain = (100 + 50 * Math.max(0, 1 - ms / FAST_MS)) * mult();
      run.score += gain;
      pop = `<span class="ok">+${fmt(gain)}</span>`;
    } else {
      run.streak = 0;
      run.endAt -= id ? WRONG_PENALTY_MS : SKIP_PENALTY_MS;
      if (!run.missed.some((m) => m.id === target.id)) run.missed.push(target);
      pop = `<span class="bad">${id ? "&minus;3s" : "Skipped &minus;1s"}</span>`;
    }
    if (id) {
      run.answered++;
      run.times.push(ms);
    }
    $g("gPop").innerHTML = pop;
    if (state.mode === "spot")
      scene.viewer.setMarks(scene.itemsFor([target], ok ? "#34d399" : "#f87171"), { ghost: true });
    setTimeout(next, ok ? 550 : 1300);
  }

  function finish() {
    if (!run || run.over) return;
    run.over = true;
    scene?.viewer.setMarks([]);
    const key = recordKey(profile, state.mode, state.sys);
    const rec = readRecord(key);
    const score = Math.round(run.score);
    const isBest = score > 0 && score > rec.best;
    rec.best = Math.max(rec.best, score);
    rec.runs = [...rec.runs, score].slice(-20);
    saveRecord(key, rec);
    // class leaderboard: rounds where nothing was answered are not sent
    if (run.answered)
      submitGameScore({
        system: state.sys,
        mode: state.mode,
        score,
        correct: run.correct,
        answered: run.answered,
        bestStreak: run.bestStreak,
      }).then((saved) => saved && board?.refresh());
    const acc = run.answered ? Math.round((run.correct / run.answered) * 100) : 0;
    const avg = run.times.length ? run.times.reduce((a, b) => a + b, 0) / run.times.length / 1000 : 0;
    const missed = run.missed.slice(0, 6);
    show("gDone");
    $g("gDone").innerHTML = `
      <div class="g-result">
        ${isBest ? '<span class="chip brand">New personal best</span>' : ""}
        <span class="g-label">Round score</span>
        <b class="g-big">${fmt(score)}</b>
        <div class="g-summary">
          <div><b>${acc}%</b><span>accuracy</span></div>
          <div><b>${run.correct}/${run.answered}</b><span>correct</span></div>
          <div><b>${run.bestStreak}</b><span>best streak</span></div>
          <div><b>${avg ? avg.toFixed(1) + "s" : "&mdash;"}</b><span>avg answer</span></div>
        </div>
      </div>
      ${
        missed.length
          ? `<h3 class="g-sub">Revise these</h3><ul class="list g-missed">${missed
              .map(
                (m) =>
                  `<li><span>${esc(m.name)} <span class="muted small">${esc(sysName.get(m.system_id) || "")}</span></span><a class="btn small secondary" href="learn.html?structure=${m.id}">Study</a></li>`,
              )
              .join("")}</ul>
             <a class="btn small secondary g-all" href="learn.html?structures=${run.missed.map((m) => m.id).join(",")}">Open all ${run.missed.length} in Learn mode</a>`
          : run.answered
            ? '<p class="muted small">No misses this round. Nicely done.</p>'
            : ""
      }
      <div class="row g-again"><button class="btn" id="gAgain">Play again <kbd>Enter</kbd></button><button class="btn secondary" id="gMenuBtn">Change system</button></div>`;
    $g("gAgain").onclick = () => {
      drawMenu();
      start();
    };
    $g("gMenuBtn").onclick = drawMenu;
  }

  // ---------- keyboard: 1-4 answer, 0 skip, Esc end, Enter start / play again ----------
  document.addEventListener("keydown", (e) => {
    if (/input|select|textarea/i.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey)
      return;
    if (!root.isConnected) return;
    const playing = run && !run.over && !$g("gPlay").hidden;
    if (playing && run.q) {
      if (/^[1-4]$/.test(e.key)) {
        const b = $g("gPlay").querySelectorAll(".g-opt")[+e.key - 1];
        if (b) {
          e.preventDefault();
          answer(b.dataset.id);
        }
      } else if (e.key === "0") {
        e.preventDefault();
        answer(null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    } else if (e.key === "Enter" && e.target === document.body) {
      if (!$g("gMenu").hidden && $g("gStart") && !$g("gStart").disabled) {
        e.preventDefault();
        start();
      } else if (!$g("gDone").hidden) {
        e.preventDefault();
        $g("gAgain")?.click();
      }
    }
  });

  drawMenu();
  if (autostart) start();
}
