// Leaderboards for Anatomy Sprint and Assessments.
// Data comes from the SQL functions in supabase/sobo_med_v4_leaderboard.sql. If that file has not
// been run yet, the boards show a short notice instead of failing, and the game keeps working.
import { supabase } from "./supabase.js";
import { esc } from "./session.js";

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();
const initials = (n) =>
  String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const mmss = (s) => {
  if (s == null) return "";
  s = Math.round(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const e = new Error(error.message || "Leaderboard unavailable");
    e.missing =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.code === "42P01" ||
      /could not find the function|does not exist|schema cache/i.test(error.message || "");
    throw e;
  }
  return data || [];
}

// Saves a finished sprint round. Never throws: the game must not break if saving fails.
export async function submitGameScore({ system, score, correct, answered, bestStreak, mode = "spot" }) {
  try {
    await call("submit_game_score", {
      p_system: system || null,
      p_score: Math.round(score),
      p_correct: correct,
      p_answered: answered,
      p_best_streak: bestStreak,
      p_mode: mode,
    });
    return true;
  } catch (e) {
    console.warn("[leaderboard] round not saved:", e.message);
    return false;
  }
}

// ---------- shared rendering ----------
function boardRows(rows, { value, sub, unit = "", limit = 10 }) {
  if (!rows.length)
    return `<div class="lb-empty"><b>No results yet</b><span>Be the first name on the board.</span></div>`;
  let prev = 0;
  const html = rows
    .map((r) => {
      const rank = Number(r.rank);
      // the caller's own row can come after the top list: show a gap first
      const gap = rank > limit && prev && rank > prev + 1 ? '<li class="lb-gap" aria-hidden="true">&middot;&middot;&middot;</li>' : "";
      prev = rank;
      const pos = rank <= 3 ? `<span class="lb-pos m${rank}">${rank}</span>` : `<span class="lb-pos">${rank}</span>`;
      return `${gap}<li class="lb-row${r.is_me ? " me" : ""}${rank <= 3 ? " top" : ""}">
          ${pos}
          <span class="lb-av" aria-hidden="true">${esc(initials(r.name))}</span>
          <span class="lb-who"><b>${esc(r.name || "Student")}${r.is_me ? ' <span class="lb-you">You</span>' : ""}</b><span>${sub(r)}</span></span>
          <span class="lb-val">${value(r)}${unit ? `<small>${unit}</small>` : ""}</span>
        </li>`;
    })
    .join("");
  return `<ol class="lb-list">${html}</ol>`;
}
function errorHtml(e) {
  return e.missing
    ? `<div class="lb-empty"><b>Leaderboard not switched on yet</b><span>A teacher needs to run <code>supabase/sobo_med_v4_leaderboard.sql</code> in Supabase.</span></div>`
    : `<p class="msg error small">Could not load the leaderboard: ${esc(e.message)}</p>`;
}
function shell(el, { title, eyebrow, controls }) {
  el.classList.add("lb");
  el.innerHTML = `<div class="lb-head">
      <div><span class="lb-eyebrow">${eyebrow}</span><h3>${title}</h3></div>
      <svg class="lb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>
    </div>
    <div class="lb-controls">${controls}</div>
    <div class="lb-body" aria-live="polite"><p class="muted small">Loading...</p></div>`;
  return el.querySelector(".lb-body");
}
const segmented = (name, opts, cur) =>
  `<div class="lb-seg" role="tablist" data-seg="${name}">${opts
    .map(([v, l]) => `<button type="button" role="tab" data-v="${v}" aria-selected="${v === cur}">${l}</button>`)
    .join("")}</div>`;

// ---------- Anatomy Sprint board ----------
// Returns { refresh(systemId, systemName) }. Shows the best round per student for one body system.
export function mountGameBoard(el, { systemId = null, systemName = "" } = {}) {
  let sys = systemId, sysName = systemName, days = "7";
  const body = shell(el, {
    eyebrow: "Anatomy Sprint",
    title: "Leaderboard",
    controls: segmented("days", [["7", "This week"], ["", "All time"]], days) + `<span class="lb-scope" id="lbScope"></span>`,
  });
  el.querySelector('[data-seg="days"]').addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    days = b.dataset.v;
    el.querySelectorAll('[data-seg="days"] button').forEach((x) => x.setAttribute("aria-selected", x === b));
    load();
  });
  let tok = 0;
  async function load() {
    const t = ++tok;
    el.querySelector("#lbScope").textContent = sysName;
    body.innerHTML = '<p class="muted small">Loading...</p>';
    try {
      const rows = await call("game_leaderboard", { p_system: sys, p_days: days ? Number(days) : null, p_limit: 10 });
      if (t !== tok) return;
      body.innerHTML = boardRows(rows, {
        value: (r) => fmt(r.best),
        unit: "pts",
        sub: (r) =>
          `${r.accuracy != null ? `${r.accuracy}% accuracy &middot; ` : ""}${r.rounds} round${r.rounds == 1 ? "" : "s"}${r.best_streak ? ` &middot; streak ${r.best_streak}` : ""}`,
      });
    } catch (e) {
      if (t === tok) body.innerHTML = errorHtml(e);
    }
  }
  load();
  return {
    refresh(systemIdNext = sys, systemNameNext = sysName) {
      sys = systemIdNext;
      sysName = systemNameNext;
      return load();
    },
  };
}

// ---------- Assessment board ----------
// quizzes: [{ id, title }] for the quiz picker. "All quizzes" ranks by average best score.
export function mountAssessmentBoard(el, quizzes = []) {
  let quiz = "";
  const opts = [["", "All quizzes (average best score)"], ...quizzes.map((z) => [z.id, z.title])];
  const body = shell(el, {
    eyebrow: "Assessments",
    title: "Leaderboard",
    controls: `<select class="lb-select" aria-label="Leaderboard for">${opts
      .map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`)
      .join("")}</select>`,
  });
  el.querySelector(".lb-select").addEventListener("change", (e) => {
    quiz = e.target.value;
    load();
  });
  let tok = 0;
  async function load() {
    const t = ++tok;
    body.innerHTML = '<p class="muted small">Loading...</p>';
    try {
      const rows = await call("assessment_leaderboard", { p_quiz: quiz || null, p_limit: 10 });
      if (t !== tok) return;
      body.innerHTML = boardRows(rows, {
        value: (r) => `${Number(r.score).toFixed(Number(r.score) % 1 ? 1 : 0)}`,
        unit: "%",
        sub: (r) =>
          quiz
            ? r.time_s != null
              ? `Best attempt in ${mmss(r.time_s)}`
              : "Best attempt"
            : `${r.quizzes} quiz${r.quizzes == 1 ? "" : "zes"} completed`,
      });
      body.insertAdjacentHTML(
        "beforeend",
        `<p class="lb-note">${quiz ? "Best finished attempt per student; ties go to the faster time." : "Average of each student's best score per quiz; ties go to more quizzes completed."}</p>`,
      );
    } catch (e) {
      if (t === tok) body.innerHTML = errorHtml(e);
    }
  }
  load();
  return { refresh: load };
}
