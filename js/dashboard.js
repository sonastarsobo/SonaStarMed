// Student dashboard: greeting + level, overview numbers, performance, weekly achievements,
// continue learning, recent activity and recommendations.
import {
  $,
  esc,
  rpc,
  mountNav,
  fmtDate,
  fmtDay,
  pct,
  lineChart,
  barChart,
  setNavXP,
  hiddenResultQuizzes,
} from "./session.js";
import { loadWeekly, renderWeekly, icon } from "./achievements.js";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export async function initDashboard(profile) {
  mountNav(profile, "dashboard", { xp: false });
  $("today").textContent = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  $("hi").textContent = `${greeting()}, ${profile.name}`;

  // Weekly badges load on their own so a slow request never blocks the rest of the page
  loadWeekly(profile)
    .then((w) => renderWeekly($("ach"), w))
    .catch((e) => {
      console.error(e);
      $("ach").innerHTML = '<p class="muted">Achievements are unavailable right now.</p>';
    });

  let d, quizzes, hidden;
  try {
    [d, quizzes, hidden] = await Promise.all([
      rpc("my_dashboard"),
      rpc("student_quizzes"),
      hiddenResultQuizzes(),
    ]);
  } catch (e) {
    console.error(e);
    $("hero").insertAdjacentHTML(
      "afterend",
      `<div class="card"><p class="msg error">${esc(e.message)}</p></div>`,
    );
    return;
  }

  const o = d.overview,
    p = d.performance,
    g = d.gamification;
  setNavXP(g);

  // ---- hero ----
  const open = quizzes.find((z) => z.status === "IN_PROGRESS");
  const next = quizzes.find((z) => z.status === "NOT_STARTED" && z.can_start);
  $("heroSub").textContent = o.pending
    ? `You have ${o.pending} quiz${o.pending > 1 ? "zes" : ""} waiting. Keep the streak going!`
    : "You are all caught up. Explore the 3D atlas to earn this week's badges.";
  $("heroActions").innerHTML =
    (open
      ? `<a class="btn" href="assessment.html?attempt=${open.in_progress_attempt_id}">Resume quiz &rarr;</a>`
      : next
        ? `<a class="btn" href="assessment.html?quiz=${next.id}">Start: ${esc(next.title)} &rarr;</a>`
        : `<a class="btn" href="assessment.html">Browse quizzes</a>`) +
    `<a class="btn secondary" href="learn.html">${icon("brain", 18)} Open Learn mode</a>`;
  const lp = Math.max(0, Math.min(100, Number(g.level_progress) || 0));
  $("level").innerHTML = `<div class="level-ring" style="--p:${lp}"><div><span>Level</span><b>${esc(g.level)}</b></div></div>
    <div class="level-txt"><b>${esc(g.xp)} XP</b><span class="muted small">${g.next_level_xp != null ? `${g.next_level_xp - g.xp} XP to level ${g.level + 1}` : "Max level"}</span>
    <span class="muted small">${esc(g.structures_viewed ?? 0)} structures studied</span></div>`;

  // ---- overview ----
  $("overview").innerHTML = [
    ["Assigned", o.assigned],
    ["Completed", o.completed],
    ["Pending", o.pending],
    ["In progress", o.in_progress],
    ["Passed", o.passed, "ok"],
    ["Failed", o.failed, o.failed ? "bad" : ""],
  ]
    .map(
      ([l, v, c]) =>
        `<div class="stat ${c || ""}"><b>${v}</b><span>${l}</span></div>`,
    )
    .join("");

  // ---- performance ----
  const trend = d.trend.filter((t) => !hidden.titles.has(t.title));
  $("perf").innerHTML =
    `<div class="perf-top"><div class="mini"><b>${pct(p.average)}</b><span>Average</span></div><div class="mini"><b>${pct(p.highest)}</b><span>Highest</span></div>
    <div class="mini"><b>${p.attempts}</b><span>Attempts</span></div>
    <div class="mini grow"><span>Course progress &middot; ${o.completed} of ${o.assigned} quizzes</span><div class="prog"><i style="width:${p.progress}%"></i></div></div></div>
    <h3 style="margin-top:18px">Score trend</h3><div id="trend"></div>`;
  lineChart(
    $("trend"),
    trend.map((t, i) => ({
      label: `${t.title} (${fmtDay(t.at)})`,
      value: Number(t.percentage),
      short: i + 1,
    })),
  );

  // ---- continue learning + up next ----
  const todo = quizzes
    .filter((z) => z.status === "NOT_STARTED" && z.can_start)
    .slice(0, 3);
  $("cont").innerHTML =
    (open
      ? `<div class="feedback bad" style="margin-bottom:10px"><b>Quiz in progress:</b> ${esc(open.title)} <a class="btn small" href="assessment.html?attempt=${open.in_progress_attempt_id}">Resume</a></div>`
      : "") +
    (d.continue_learning.length
      ? `<ul class="list">${d.continue_learning.map((c) => `<li><span><b>${esc(c.name)}</b><br><span class="muted small">${esc(c.system_name)} &middot; ${fmtDate(c.at)}</span></span><a class="btn small secondary" href="learn.html?structure=${c.structure_id}">Continue</a></li>`).join("")}</ul>`
      : '<p class="muted">You have not opened any structure yet. <a href="learn.html">Start exploring in Learn Mode</a>.</p>') +
    (todo.length
      ? `<h3 style="margin-top:12px">Up next</h3><ul class="list">${todo.map((z) => `<li><span>${esc(z.title)} <span class="muted small">${z.question_count} questions</span></span><a class="btn small" href="assessment.html?quiz=${z.id}">Start</a></li>`).join("")}</ul>`
      : "");

  // ---- recent ----
  $("recent").innerHTML = d.recent.length
    ? `<ul class="list">${d.recent
        .map((r) => {
          const hide = hidden.titles.has(r.title);
          return `<li><span><b>${esc(r.title)}</b><br><span class="muted small">${fmtDate(r.at)}</span></span>
      <span>${hide ? '<span class="chip">Result pending</span>' : `<span class="chip ${r.passed ? "ok" : "bad"}">${pct(r.percentage)} ${r.passed ? "Passed" : "Failed"}</span> <a class="btn small secondary" href="result.html?attempt=${r.attempt_id}">Review</a>`}</span></li>`;
        })
        .join("")}</ul>`
    : '<p class="muted">No quiz attempts yet.</p>';

  // ---- recommendations from weak areas ----
  const weakTopics = d.topics.filter((t) => Number(t.pct) < 70).slice(0, 3);
  const ids = d.weak_structures.map((s) => s.id);
  $("reco").innerHTML =
    weakTopics.length || d.weak_structures.length
      ? `
    ${weakTopics.length ? `<h3>Topics to revise</h3>${weakTopics.map((t) => `<div class="bar"><span class="bl">${esc(t.name)}</span><span class="bt"><i class="${Number(t.pct) < 50 ? "bad" : "mid"}" style="width:${t.pct}%"></i></span><span class="bv">${pct(t.pct)}</span></div>`).join("")}` : ""}
    ${
      d.weak_structures.length
        ? `<h3 style="margin-top:12px">Structures you missed most</h3><ul class="list">${d.weak_structures.map((s) => `<li><span>${esc(s.name)} <span class="muted small">${esc(s.system_name)} &middot; missed ${s.missed}x</span></span><a class="btn small secondary" href="learn.html?structure=${s.id}">Study</a></li>`).join("")}</ul>
      <a class="btn" style="margin-top:8px" href="learn.html?structures=${ids.join(",")}">Study all in Learn Mode</a>`
        : ""
    }`
      : '<p class="muted">Complete a quiz and we will recommend what to revise.</p>';

  barChart(
    $("topics"),
    d.topics.map((t) => ({
      label: t.name,
      value: Number(t.pct),
      note: `${t.questions} q`,
    })),
  );
}
