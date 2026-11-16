// Teacher tools: per-student and per-quiz performance pages, student account creation
// (manual + Excel import) and password resets. Used by admin.js.
import { supabase } from "./supabase.js";
import {
  $,
  esc,
  rpc,
  toast,
  fmtDate,
  fmtDay,
  fmtDur,
  pct,
  lineChart,
  barChart,
  downloadCSV,
  confirmBox,
} from "./session.js";

const db = async (req) => {
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data;
};
const FINISHED = new Set(["COMPLETED", "TIMEOUT"]);
const tone = (v) => (v == null ? "" : v >= 70 ? "ok" : v >= 50 ? "mid" : "bad");
const scorePill = (v) =>
  v == null ? '<span class="muted">-</span>' : `<span class="score-pill ${tone(v)}">${pct(Math.round(v * 10) / 10)}</span>`;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const initials = (n) =>
  String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------
export async function loadAttempts({ user = null, quiz = null } = {}) {
  let q = supabase
    .from("assessment_attempts")
    .select("id,user_id,quiz_id,status,percentage,score,total_points,started_at,submitted_at,time_taken_seconds")
    .order("started_at", { ascending: true })
    .limit(10000);
  if (user) q = q.eq("user_id", user);
  if (quiz) q = q.eq("quiz_id", quiz);
  return db(q);
}
export async function loadQuizzes() {
  return db(supabase.from("quizzes").select("*").order("created_at", { ascending: false }));
}
// username per profile id (empty map if the column does not exist yet)
export async function loadUsernames() {
  const { data, error } = await supabase.from("profiles").select("id,username");
  return new Map(error ? [] : data.filter((p) => p.username).map((p) => [p.id, p.username]));
}

// Combined numbers for one student across every quiz they took.
export function summarise(attempts, quizById) {
  const done = attempts.filter((a) => FINISHED.has(a.status));
  const byQuiz = new Map();
  done.forEach((a) => {
    if (!byQuiz.has(a.quiz_id)) byQuiz.set(a.quiz_id, []);
    byQuiz.get(a.quiz_id).push(a);
  });
  const perQuiz = [...byQuiz].map(([qid, list]) => {
    const z = quizById.get(qid);
    const scores = list.map((a) => Number(a.percentage) || 0);
    const best = Math.max(...scores);
    return {
      quiz_id: qid,
      title: z?.title || "(deleted quiz)",
      passing: Number(z?.passing_score ?? 60),
      attempts: list.length,
      best,
      latest: scores[scores.length - 1],
      average: avg(scores),
      passed: best >= Number(z?.passing_score ?? 60),
      last: list[list.length - 1],
      time: list.reduce((s, a) => s + (a.time_taken_seconds || 0), 0),
    };
  });
  const bests = perQuiz.map((q) => q.best);
  return {
    quizzesTaken: perQuiz.length,
    attempts: done.length,
    inProgress: attempts.filter((a) => a.status === "IN_PROGRESS").length,
    average: avg(done.map((a) => Number(a.percentage) || 0)), // every finished attempt
    avgBest: avg(bests), // best score per quiz, averaged
    best: bests.length ? Math.max(...bests) : null,
    passed: perQuiz.filter((q) => q.passed).length,
    passRate: perQuiz.length ? (100 * perQuiz.filter((q) => q.passed).length) / perQuiz.length : null,
    time: done.reduce((s, a) => s + (a.time_taken_seconds || 0), 0),
    last: attempts.length ? attempts[attempts.length - 1].started_at : null,
    perQuiz,
    done,
  };
}

// Dashboard "Student performance": one row per student, combined across all quizzes.
export async function studentPerformanceTable(students, limit = 10) {
  const [att, quizzes] = await Promise.all([loadAttempts(), loadQuizzes()]);
  const quizById = new Map(quizzes.map((z) => [z.id, z]));
  const byUser = new Map();
  att.forEach((a) => {
    if (!byUser.has(a.user_id)) byUser.set(a.user_id, []);
    byUser.get(a.user_id).push(a);
  });
  const rows = students
    .map((s) => ({ s, x: summarise(byUser.get(s.id) || [], quizById) }))
    .sort((a, b) => (b.x.avgBest ?? -1) - (a.x.avgBest ?? -1) || a.s.name.localeCompare(b.s.name));
  const body =
    rows
      .slice(0, limit)
      .map(
        ({ s, x }) =>
          `<tr class="click" data-student="${s.id}" title="Open ${esc(s.name)}'s report"><td><b>${esc(s.name)}</b></td><td>${x.quizzesTaken}</td><td>${x.attempts}</td><td>${scorePill(x.avgBest)}</td><td>${x.passed}/${x.quizzesTaken}</td></tr>`,
      )
      .join("") || '<tr><td colspan="5" class="empty">No students yet.</td></tr>';
  return `<div class="tblwrap"><table class="tbl"><thead><tr><th>Student</th><th title="Different quizzes taken">Quizzes</th><th>Attempts</th><th title="Average of each quiz's best score">Average</th><th>Passed</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
export function wireStudentRows(root) {
  root.querySelectorAll("tr[data-student]").forEach(
    (tr) =>
      (tr.onclick = (e) => {
        if (e.target.closest("button,a,select,input,label")) return;
        location.href = `student.html?id=${tr.dataset.student}`;
      }),
  );
}

function distribution(scores) {
  const bins = [0, 0, 0, 0, 0];
  scores.forEach((v) => bins[Math.min(4, Math.floor((Number(v) || 0) / 20))]++);
  const max = Math.max(1, ...bins);
  return `<div class="dist">${bins
    .map(
      (n, i) =>
        `<div class="col"><b>${n}</b><i style="height:${(n / max) * 100}%"></i><span>${i * 20}-${i * 20 + (i === 4 ? 20 : 19)}%</span></div>`,
    )
    .join("")}</div>`;
}

// ---------------------------------------------------------------------------------------------
// Student detail page (admin/student.html?id=...)
// ---------------------------------------------------------------------------------------------
export async function studentDetail() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) throw new Error("No student selected.");
  const [people, att, quizzes, usernames] = await Promise.all([
    rpc("admin_student_stats"),
    loadAttempts({ user: id }),
    loadQuizzes(),
    loadUsernames(),
  ]);
  const p = people.find((x) => x.id === id);
  if (!p) throw new Error("Student not found.");
  const quizById = new Map(quizzes.map((z) => [z.id, z]));
  const x = summarise(att, quizById);
  const uname = usernames.get(id);
  document.title = `${p.name} · SOBO`;

  $("root").innerHTML = `<p><a href="users.html">&larr; All users</a></p>
    <section class="card detail-hero">
      <div class="big-avatar" style="width:72px;height:72px;font-size:1.6rem;border-radius:50%;display:grid;place-items:center;background:var(--grad);color:#101014;font-weight:800">${esc(initials(p.name))}</div>
      <div style="flex:1;min-width:220px"><span class="eyebrow-sm">Student report</span><h1>${esc(p.name)}</h1>
        <div class="row small" style="margin-top:6px">${uname ? `<span class="chip brand">@${esc(uname)}</span>` : ""}<span class="chip">${esc(p.email || "")}</span>${(p.batches || []).map((b) => `<span class="chip">${esc(b)}</span>`).join("")}<span class="muted">Last active ${p.last_active ? fmtDate(p.last_active) : "never"}</span></div></div>
      <div class="row">${p.role === "STUDENT" ? '<button class="btn secondary" id="resetPw">Reset password</button>' : ""}<button class="btn secondary" id="csv">Download CSV</button><a class="btn secondary" href="attempts.html?user=${id}">Attempts log</a></div>
    </section>
    <section class="grid">
      <div class="stat"><b>${x.quizzesTaken}</b><span>Quizzes taken</span></div>
      <div class="stat"><b>${x.attempts}</b><span>Total attempts</span></div>
      <div class="stat ${tone(x.avgBest)}"><b>${pct(x.avgBest == null ? null : Math.round(x.avgBest))}</b><span>Average (best per quiz)</span></div>
      <div class="stat"><b>${pct(x.average == null ? null : Math.round(x.average))}</b><span>Average (all attempts)</span></div>
      <div class="stat ok"><b>${pct(x.best)}</b><span>Highest score</span></div>
      <div class="stat"><b>${x.passed}/${x.quizzesTaken}</b><span>Quizzes passed</span></div>
      <div class="stat"><b>${fmtDur(x.time)}</b><span>Time in quizzes</span></div>
    </section>
    <div class="grid two">
      <section class="card"><h2>Score trend</h2><div id="trend"></div></section>
      <section class="card"><h2>Best score per quiz</h2><div id="bestq"></div></section>
    </div>
    <section class="card" style="margin-top:16px"><h2>Quiz by quiz</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>Quiz</th><th>Attempts</th><th>Best</th><th>Latest</th><th>Average</th><th>Pass mark</th><th>Result</th><th>Last attempt</th></tr></thead><tbody>
      ${x.perQuiz
        .sort((a, b) => Date.parse(b.last.started_at) - Date.parse(a.last.started_at))
        .map(
          (q) =>
            `<tr class="click" data-quiz="${q.quiz_id}"><td><b>${esc(q.title)}</b></td><td>${q.attempts}</td><td>${scorePill(q.best)}</td><td>${scorePill(q.latest)}</td><td>${scorePill(q.average)}</td><td>${pct(q.passing)}</td><td><span class="chip ${q.passed ? "ok" : "bad"}">${q.passed ? "Passed" : "Not passed"}</span></td><td class="small">${fmtDate(q.last.submitted_at || q.last.started_at)}</td></tr>`,
        )
        .join("") || '<tr><td colspan="8" class="empty">No quizzes taken yet.</td></tr>'}
    </tbody></table></div></section>
    <section class="card" style="margin-top:16px"><h2>Every attempt</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>Date</th><th>Quiz</th><th>Attempt</th><th>Score</th><th>Points</th><th>Time</th><th>Status</th><th></th></tr></thead><tbody>
      ${(() => {
        const n = new Map();
        return att
          .map((a) => {
            n.set(a.quiz_id, (n.get(a.quiz_id) || 0) + 1);
            return { a, k: n.get(a.quiz_id) };
          })
          .reverse()
          .map(
            ({ a, k }) =>
              `<tr><td class="small nowrap">${fmtDate(a.started_at)}</td><td>${esc(quizById.get(a.quiz_id)?.title || "(deleted quiz)")}</td><td>#${k}</td><td>${FINISHED.has(a.status) ? scorePill(Number(a.percentage)) : "-"}</td><td class="small">${a.score ?? "-"} / ${a.total_points ?? "-"}</td><td class="small">${a.time_taken_seconds != null ? fmtDur(a.time_taken_seconds) : "-"}</td><td><span class="chip ${a.status === "COMPLETED" ? "ok" : a.status === "TIMEOUT" ? "mid" : ""}">${esc(a.status)}</span></td><td>${FINISHED.has(a.status) ? `<a class="btn small secondary" href="../student/result.html?attempt=${a.id}">View</a>` : ""}</td></tr>`,
          )
          .join("") || '<tr><td colspan="8" class="empty">No attempts yet.</td></tr>';
      })()}
    </tbody></table></div></section>`;

  lineChart(
    $("trend"),
    x.done.map((a, i) => ({
      label: `${quizById.get(a.quiz_id)?.title || "Quiz"} (${fmtDay(a.submitted_at || a.started_at)})`,
      value: Math.round(Number(a.percentage) || 0),
      short: i + 1,
    })),
  );
  barChart(
    $("bestq"),
    x.perQuiz.map((q) => ({ label: q.title, value: Math.round(q.best), note: `${q.attempts}x` })),
  );
  $("root").querySelectorAll("tr[data-quiz]").forEach(
    (tr) => (tr.onclick = () => (location.href = `quiz-report.html?id=${tr.dataset.quiz}`)),
  );
  if ($("resetPw")) $("resetPw").onclick = () => resetPasswordFlow({ ...p, username: uname });
  $("csv").onclick = () =>
    downloadCSV(`report-${p.name.replace(/\W+/g, "_")}.csv`, [
      ["Date", "Quiz", "Status", "Percentage", "Score", "Total points", "Time (s)"],
      ...att.map((a) => [a.started_at, quizById.get(a.quiz_id)?.title || "", a.status, a.percentage, a.score, a.total_points, a.time_taken_seconds]),
    ]);
}

// ---------------------------------------------------------------------------------------------
// Quiz report page (admin/quiz-report.html?id=...)
// ---------------------------------------------------------------------------------------------
export async function quizReport() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) throw new Error("No quiz selected.");
  const [z, att, people, assigns, members] = await Promise.all([
    db(supabase.from("quizzes").select("*").eq("id", id).single()),
    loadAttempts({ quiz: id }),
    rpc("admin_student_stats"),
    supabase.from("quiz_assignments").select("user_id,batch_id").eq("quiz_id", id).then((r) => r.data || []),
    supabase.from("batch_members").select("user_id,batch_id").then((r) => r.data || []),
  ]);
  document.title = `${z.title} · Quiz report`;
  const pass = Number(z.passing_score ?? 60);
  const students = people.filter((p) => p.role === "STUDENT");
  const name = new Map(people.map((p) => [p.id, p]));

  // who the quiz is assigned to (no rows = everyone)
  let assigned = students;
  if (assigns.length) {
    const ids = new Set(assigns.filter((a) => a.user_id).map((a) => a.user_id));
    const bs = new Set(assigns.filter((a) => a.batch_id).map((a) => a.batch_id));
    members.forEach((m) => bs.has(m.batch_id) && ids.add(m.user_id));
    assigned = students.filter((s) => ids.has(s.id));
  }

  const done = att.filter((a) => FINISHED.has(a.status));
  const byUser = new Map();
  att.forEach((a) => {
    if (!byUser.has(a.user_id)) byUser.set(a.user_id, []);
    byUser.get(a.user_id).push(a);
  });
  const rows = [...byUser].map(([uid, list]) => {
    const f = list.filter((a) => FINISHED.has(a.status));
    const scores = f.map((a) => Number(a.percentage) || 0);
    const bestA = f.reduce((b, a) => (!b || Number(a.percentage) > Number(b.percentage) ? a : b), null);
    return {
      uid,
      name: name.get(uid)?.name || "(removed user)",
      email: name.get(uid)?.email || "",
      attempts: list.length,
      finished: f.length,
      best: scores.length ? Math.max(...scores) : null,
      latest: scores.length ? scores[scores.length - 1] : null,
      average: avg(scores),
      bestA,
      time: bestA?.time_taken_seconds,
      last: list[list.length - 1].started_at,
      passed: scores.length ? Math.max(...scores) >= pass : false,
      inProgress: list.some((a) => a.status === "IN_PROGRESS"),
    };
  });
  rows.sort((a, b) => (b.best ?? -1) - (a.best ?? -1) || a.name.localeCompare(b.name));
  const bests = rows.filter((r) => r.best != null).map((r) => r.best);
  const notYet = assigned.filter((s) => !byUser.has(s.id));

  $("root").innerHTML = `<p><a href="dashboard.html">&larr; Dashboard</a> &middot; <a href="quizzes.html?edit=${z.id}">Edit quiz</a></p>
    <section class="card detail-hero"><div style="flex:1;min-width:240px"><span class="eyebrow-sm">Quiz report</span><h1>${esc(z.title)}</h1>
      <p class="muted small" style="margin:6px 0 0">${z.status ? `<span class="chip ${z.status === "PUBLISHED" ? "ok" : ""}">${esc(z.status)}</span> ` : ""}${fmtDur(z.duration_seconds)} &middot; pass mark ${pct(pass)} &middot; ${z.max_attempts ? z.max_attempts + " attempt(s) allowed" : "unlimited attempts"}${z.show_result === false ? " &middot; results held back from students" : ""}</p></div>
      <div class="row"><button class="btn secondary" id="csv">Download CSV</button><a class="btn secondary" href="attempts.html?quiz=${z.id}">Attempts log</a></div></section>
    <section class="grid">
      <div class="stat"><b>${rows.length}${assigned.length ? `<small class="muted" style="font-size:1rem"> / ${assigned.length}</small>` : ""}</b><span>Students attended</span></div>
      <div class="stat"><b>${att.length}</b><span>Total attempts</span></div>
      <div class="stat ${tone(avg(bests))}"><b>${pct(bests.length ? Math.round(avg(bests)) : null)}</b><span>Average (best)</span></div>
      <div class="stat ok"><b>${pct(bests.length ? Math.max(...bests) : null)}</b><span>Highest</span></div>
      <div class="stat bad"><b>${pct(bests.length ? Math.min(...bests) : null)}</b><span>Lowest</span></div>
      <div class="stat"><b>${pct(rows.length ? Math.round((100 * rows.filter((r) => r.passed).length) / rows.length) : null)}</b><span>Pass rate</span></div>
      <div class="stat"><b>${done.length ? fmtDur(avg(done.map((a) => a.time_taken_seconds || 0))) : "-"}</b><span>Average time</span></div>
    </section>
    <div class="grid two">
      <section class="card"><h2>Score distribution <span class="muted small">(best score per student)</span></h2>${distribution(bests)}</section>
      <section class="card"><h2>Not attempted yet <span class="muted small">(${notYet.length})</span></h2>${notYet.length ? `<div class="row">${notYet.slice(0, 60).map((s) => `<a class="chip" href="student.html?id=${s.id}">${esc(s.name)}</a>`).join("")}${notYet.length > 60 ? `<span class="muted small">and ${notYet.length - 60} more</span>` : ""}</div>` : '<p class="muted">Every assigned student has attempted this quiz.</p>'}</section>
    </div>
    <section class="card" style="margin-top:16px"><h2>Student performance</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>#</th><th>Student</th><th>Attempts</th><th>Best</th><th>Latest</th><th>Average</th><th>Time (best)</th><th>Result</th><th>Last attempt</th><th></th></tr></thead><tbody>
      ${rows
        .map(
          (r, i) =>
            `<tr class="click" data-student="${r.uid}"><td>${i + 1}</td><td><b>${esc(r.name)}</b><br><span class="muted small">${esc(r.email)}</span></td><td>${r.attempts}</td><td>${scorePill(r.best)}</td><td>${scorePill(r.latest)}</td><td>${scorePill(r.average)}</td><td class="small">${r.time != null ? fmtDur(r.time) : "-"}</td>
            <td>${r.best == null ? '<span class="chip">In progress</span>' : `<span class="chip ${r.passed ? "ok" : "bad"}">${r.passed ? "Passed" : "Not passed"}</span>`}</td><td class="small">${fmtDate(r.last)}</td><td>${r.bestA ? `<a class="btn small secondary" href="../student/result.html?attempt=${r.bestA.id}">Best attempt</a>` : ""}</td></tr>`,
        )
        .join("") || '<tr><td colspan="10" class="empty">No one has attempted this quiz yet.</td></tr>'}
    </tbody></table></div></section>`;
  wireStudentRows($("root"));
  $("csv").onclick = () =>
    downloadCSV(`quiz-${z.title.replace(/\W+/g, "_")}.csv`, [
      ["Student", "Email", "Attempts", "Best %", "Latest %", "Average %", "Passed", "Last attempt"],
      ...rows.map((r) => [r.name, r.email, r.attempts, r.best, r.latest, r.average == null ? "" : Math.round(r.average * 10) / 10, r.passed ? "Yes" : "No", r.last]),
      ...notYet.map((s) => [s.name, s.email, 0, "", "", "", "Not attempted", ""]),
    ]);
}

// ---------------------------------------------------------------------------------------------
// Accounts: passwords, manual creation, Excel import, credential sharing
// ---------------------------------------------------------------------------------------------
const PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export function generatePassword(len = 10) {
  const r = new Uint32Array(len + 3);
  crypto.getRandomValues(r);
  const pick = (set, n) => set[n % set.length];
  // guarantee upper, lower, digit and one symbol, then shuffle
  const chars = [
    pick("ABCDEFGHJKLMNPQRSTUVWXYZ", r[0]),
    pick("abcdefghijkmnopqrstuvwxyz", r[1]),
    pick("23456789", r[2]),
    pick("@#$%&*", r[3]),
    ...[...r.slice(4)].map((n) => pick(PW_CHARS, n)),
  ].slice(0, Math.max(len, 8));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 30) || "student";
// imported students without an e-mail get a placeholder address (they sign in with their username)
const placeholderEmail = (name) => `${slug(name)}.${generatePassword(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}@students.sobo.local`;
const isPlaceholder = (email) => /@students\.sobo\.local$/i.test(email || "");

async function createStudent({ username, email, password }) {
  const { data, error } = await supabase.rpc("admin_create_student", {
    p_username: username,
    p_email: email,
    p_password: password,
  });
  if (error) {
    if (/function .*admin_create_student|could not find the function/i.test(error.message))
      throw new Error("Account creation needs supabase/sobo_med_v3.sql to be run in the Supabase SQL Editor first.");
    throw new Error(error.message);
  }
  return data;
}

const loginUrl = () => new URL("../login.html", import.meta.url).href;
const mailto = (c) =>
  `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent("Your SOBO account")}&body=${encodeURIComponent(
    `Hello ${c.username},\n\nAn account has been created for you on SOBO.\n\nSign in at: ${loginUrl()}\nUsername: ${c.username}\nPassword: ${c.password}\n\nYou can change your password any time from your profile, or with "Forgot / change password" on the sign-in page using this e-mail address.\n`,
  )}`;

// Table of new credentials with copy / e-mail / CSV, shown once after creating accounts.
export function credentialsHtml(list) {
  return `<p class="small muted">Share these with the students now. Passwords are not stored in readable form and cannot be shown again (you can reset them later).</p>
    <div class="tblwrap"><table class="tbl cred-box"><thead><tr><th>Username</th><th>E-mail</th><th>Password</th><th></th></tr></thead><tbody>
    ${list
      .map(
        (c, i) =>
          `<tr><td>${esc(c.username)}</td><td>${isPlaceholder(c.email) ? '<span class="muted">(none: signs in with username)</span>' : esc(c.email)}</td><td><b>${esc(c.password)}</b></td><td class="nowrap"><button class="btn small secondary" data-copy="${i}">Copy</button>${isPlaceholder(c.email) ? "" : ` <a class="btn small secondary" href="${esc(mailto(c))}">E-mail</a>`}</td></tr>`,
      )
      .join("")}</tbody></table></div>
    <div class="row" style="margin-top:10px"><button class="btn secondary" id="credCsv">Download credentials (CSV)</button><button class="btn secondary" id="credCopyAll">Copy all</button></div>`;
}
export function wireCredentials(root, list) {
  const text = (c) => `Username: ${c.username}\nPassword: ${c.password}\nSign in: ${loginUrl()}`;
  root.querySelectorAll("[data-copy]").forEach(
    (b) =>
      (b.onclick = () => {
        navigator.clipboard?.writeText(text(list[+b.dataset.copy]));
        toast("Copied");
      }),
  );
  root.querySelector("#credCsv").onclick = () =>
    downloadCSV("student-credentials.csv", [
      ["Username", "E-mail", "Password", "Sign-in page"],
      ...list.map((c) => [c.username, isPlaceholder(c.email) ? "" : c.email, c.password, loginUrl()]),
    ]);
  root.querySelector("#credCopyAll").onclick = () => {
    navigator.clipboard?.writeText(list.map(text).join("\n\n"));
    toast("Copied all");
  };
}

// Sheet/dialog for creating accounts. onDone() runs after any account was created.
export function openAccountCreator(openSheet, existing, onDone) {
  const taken = new Set(existing.map((u) => u.toLowerCase()));
  const body = openSheet(
    "Create student accounts",
    `<div class="tabs" id="acTabs"><button data-t="m" aria-selected="true">Enter manually</button><button data-t="x" aria-selected="false">Import from Excel</button></div><div id="acBody"></div>`,
  );
  let created = [];
  const finish = (list) => {
    created = [...created, ...list];
    if (list.length) onDone?.();
  };
  const showCreds = (box, list) => {
    box.innerHTML = credentialsHtml(list);
    wireCredentials(box, list);
  };

  function manual() {
    $("acBody").innerHTML = `<p class="muted small">The username is exactly the name you type (spaces and capitals included). Students sign in with it and the password below.</p>
      <div class="row2"><div class="field"><label>Student name = username *</label><input id="mName" maxlength="80" placeholder="e.g. Priya Sharma"></div>
      <div class="field"><label>E-mail * <span class="muted small">(for password resets)</span></label><input id="mEmail" type="email" placeholder="student@example.com"></div></div>
      <div class="field"><label>Password</label><div class="row" style="flex-wrap:nowrap"><input id="mPw" style="font-family:var(--mono)"><button class="btn secondary" id="mGen" type="button" title="Generate another password">&#8635; New</button></div></div>
      <div class="row"><button class="btn" id="mGo">Create account</button><span class="msg" id="mMsg"></span></div>
      <div id="mCreds" style="margin-top:16px"></div>`;
    $("mPw").value = generatePassword();
    $("mGen").onclick = () => ($("mPw").value = generatePassword());
    const list = [];
    $("mGo").onclick = async () => {
      const username = $("mName").value.trim().replace(/\s+/g, " "),
        email = $("mEmail").value.trim(),
        password = $("mPw").value;
      const err = (t) => (($("mMsg").textContent = t), ($("mMsg").className = "msg error"));
      if (!username) return err("Enter the student's name.");
      if (taken.has(username.toLowerCase())) return err(`"${username}" is already a username.`);
      if (!/^\S+@\S+\.\S+$/.test(email)) return err("Enter a valid e-mail.");
      if (password.length < 8) return err("Password must be at least 8 characters.");
      $("mGo").disabled = true;
      $("mMsg").className = "msg";
      $("mMsg").textContent = "Creating...";
      try {
        await createStudent({ username, email, password });
        taken.add(username.toLowerCase());
        list.push({ username, email, password });
        showCreds($("mCreds"), list);
        finish([{ username }]);
        $("mMsg").className = "msg success";
        $("mMsg").textContent = `Account created for ${username}.`;
        $("mName").value = $("mEmail").value = "";
        $("mPw").value = generatePassword();
        $("mName").focus();
      } catch (e) {
        err(e.message);
      } finally {
        $("mGo").disabled = false;
      }
    };
  }

  function excel() {
    $("acBody").innerHTML = `<p class="muted small">Upload an Excel (.xlsx / .xls) or CSV file with a column headed <b>Student Names</b>. Each name becomes the username exactly as written, and a unique password is generated. An optional <b>Email</b> column is used for password resets; students without one sign in with their username only.</p>
      <div class="row"><input type="file" id="xFile" accept=".xlsx,.xls,.csv" style="max-width:360px"><button class="btn secondary" id="xTpl" type="button">Download template</button></div>
      <div id="xPrev" style="margin-top:14px"></div>`;
    $("xTpl").onclick = () => downloadCSV("student-import-template.csv", [["Student Names", "Email"], ["Priya Sharma", "priya@example.com"], ["Arjun Kumar", ""]]);
    $("xFile").onchange = async () => {
      const f = $("xFile").files[0];
      if (!f) return;
      $("xPrev").innerHTML = '<p class="muted">Reading file...</p>';
      let rows;
      try {
        const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false });
      } catch (e) {
        console.error(e);
        $("xPrev").innerHTML = `<p class="msg error">Could not read the file: ${esc(e.message)}</p>`;
        return;
      }
      // find the header row containing "Student Names" (allowing for title rows above it)
      const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, " ");
      const hIdx = rows.findIndex((r) => r.some((c) => norm(c) === "student names"));
      if (hIdx < 0) {
        $("xPrev").innerHTML = '<p class="msg error">No column headed "Student Names" was found in the first sheet.</p>';
        return;
      }
      const head = rows[hIdx].map(norm);
      const nCol = head.indexOf("student names"),
        eCol = head.findIndex((h) => /^(e-?mail|email id|email address)$/.test(h));
      const seen = new Set();
      const items = rows
        .slice(hIdx + 1)
        .map((r) => ({ username: String(r[nCol] ?? "").trim().replace(/\s+/g, " "), email: eCol >= 0 ? String(r[eCol] ?? "").trim() : "" }))
        .filter((r) => r.username)
        .map((r) => {
          const k = r.username.toLowerCase();
          let problem = "";
          if (taken.has(k)) problem = "Username already exists";
          else if (seen.has(k)) problem = "Duplicate name in the file";
          else if (r.email && !/^\S+@\S+\.\S+$/.test(r.email)) problem = "Invalid e-mail";
          seen.add(k);
          return { ...r, password: generatePassword(), problem };
        });
      if (!items.length) {
        $("xPrev").innerHTML = '<p class="msg error">The "Student Names" column is empty.</p>';
        return;
      }
      const ok = items.filter((i) => !i.problem);
      $("xPrev").innerHTML = `<p><b>${items.length}</b> name(s) found &middot; <b>${ok.length}</b> ready${items.length - ok.length ? ` &middot; <span style="color:var(--err)">${items.length - ok.length} will be skipped</span>` : ""}</p>
        <div class="tblwrap" style="max-height:40vh"><table class="tbl cred-box"><thead><tr><th>Username</th><th>E-mail</th><th>Password</th><th>Status</th></tr></thead><tbody>
        ${items.map((i) => `<tr><td>${esc(i.username)}</td><td>${i.email ? esc(i.email) : '<span class="muted">(none)</span>'}</td><td>${esc(i.password)}</td><td>${i.problem ? `<span class="chip bad">${esc(i.problem)}</span>` : '<span class="chip">Ready</span>'}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="row" style="margin-top:12px"><button class="btn" id="xGo" ${ok.length ? "" : "disabled"}>Create ${ok.length} account(s)</button><span class="msg" id="xMsg"></span></div><div id="xCreds" style="margin-top:16px"></div>`;
      $("xGo").onclick = async () => {
        $("xGo").disabled = true;
        $("xFile").disabled = true;
        const done = [],
          failed = [];
        for (const [n, it] of ok.entries()) {
          $("xMsg").textContent = `Creating ${n + 1} of ${ok.length}...`;
          const acct = { username: it.username, email: it.email || placeholderEmail(it.username), password: it.password };
          try {
            await createStudent(acct);
            taken.add(it.username.toLowerCase());
            done.push(acct);
          } catch (e) {
            failed.push(`${it.username}: ${e.message}`);
            if (/sobo_med_v3/.test(e.message)) break;
          }
        }
        finish(done);
        $("xMsg").className = failed.length ? "msg error" : "msg success";
        $("xMsg").innerHTML = `${done.length} account(s) created.${failed.length ? `<br>${failed.length} failed:<br>${failed.map(esc).join("<br>")}` : ""}`;
        if (done.length) showCreds($("xCreds"), done);
      };
    };
  }

  body.querySelectorAll("#acTabs button").forEach(
    (b) =>
      (b.onclick = () => {
        body.querySelectorAll("#acTabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
        b.dataset.t === "m" ? manual() : excel();
      }),
  );
  manual();
  return () => created;
}

// Teacher sets a fresh generated password for a student and gets it to share.
export async function resetPasswordFlow(p) {
  const password = generatePassword();
  const ok = await confirmBox(
    `<h3 style="margin-top:0">Reset password for ${esc(p.name)}?</h3><p class="muted">Their current password stops working. The new password will be:</p><p style="font-family:var(--mono);font-size:1.2rem"><b>${esc(password)}</b></p>`,
    { ok: "Reset password" },
  );
  if (!ok) return;
  const { error } = await supabase.rpc("admin_reset_student_password", { p_user: p.id, p_password: password });
  if (error) {
    toast(
      /could not find the function|admin_reset_student_password/i.test(error.message)
        ? "Run supabase/sobo_med_v3.sql first to enable password resets."
        : error.message,
      "error",
    );
    return;
  }
  const c = { username: p.username || p.name, email: p.email || "", password };
  const d = document.createElement("dialog");
  d.className = "confirm";
  d.style.maxWidth = "620px";
  d.innerHTML = `<h3 style="margin-top:0">New password for ${esc(p.name)}</h3><div id="cr">${credentialsHtml([c])}</div><div class="row2"><span></span><button class="btn" value="x">Done</button></div>`;
  document.body.appendChild(d);
  wireCredentials(d, [c]);
  d.querySelector('[value="x"]').onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  d.showModal();
}
