// Weekly achievements: every badge can be earned once per week. Weeks are counted from the
// student's first sign-in (profiles.first_login_at, falling back to the account creation date),
// so week 1 starts on that day and a new week begins every 7 days after it.
// Everything is worked out in the browser from the student's own attempts and study activity.
import { supabase } from "./supabase.js";
import { esc } from "./session.js";

const WEEK = 7 * 86400000;

// Anatomy-themed line icons (paths adapted from Lucide, ISC licence). 24x24, stroke = currentColor.
const ICONS = {
  syringe:
    '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>',
  pulse:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  bone:
    '<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/>',
  brain:
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',
  stethoscope:
    '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  microscope:
    '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
  droplet:
    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  dna: '<path d="m10 16 1.5 1.5"/><path d="m14 8-1.5-1.5"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m16.5 10.5 1 1"/><path d="m17 6-2.891-2.891"/><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="m20 9 .891.891"/><path d="M3.109 14.109 4 15"/><path d="m6.5 12.5 1 1"/><path d="m7 18 2.891 2.891"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>',
  clock:
    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
};
export const icon = (name, size = 24) =>
  `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.pulse}</svg>`;

// value(w) -> number shown against target; w = one week's numbers
export const BADGES = [
  { key: "first_dose", name: "First Dose", desc: "Complete a quiz", icon: "syringe", target: 1, value: (w) => w.attempts },
  { key: "steady_pulse", name: "Steady Pulse", desc: "Study on 3 different days", icon: "pulse", target: 3, value: (w) => w.studyDays },
  { key: "bone_collector", name: "Bone Collector", desc: "Study 10 different structures", icon: "bone", target: 10, value: (w) => w.studied },
  { key: "neural_network", name: "Neural Network", desc: "Study 30 different structures", icon: "brain", target: 30, value: (w) => w.studied },
  { key: "clean_bill", name: "Clean Bill of Health", desc: "Pass 2 quizzes", icon: "stethoscope", target: 2, value: (w) => w.passes },
  { key: "precision", name: "Precision Diagnosis", desc: "Score 90% or more on a quiz", icon: "microscope", target: 90, unit: "%", value: (w) => w.best },
  { key: "circulation", name: "Full Circulation", desc: "Make 5 quiz attempts", icon: "droplet", target: 5, value: (w) => w.attempts },
  { key: "in_your_dna", name: "In Your DNA", desc: "Average 80%+ over 3 or more quizzes", icon: "dna", target: 80, unit: "%", value: (w) => (w.attempts >= 3 ? w.avg : Math.min(w.avg, 79)) },
];

const tsOf = (r) => Date.parse(r.created_at || r.at || r.viewed_at || r.inserted_at || "") || 0;

// Loads the student's data and returns this week's badges plus how often each was earned before.
export async function loadWeekly(profile) {
  const anchor =
    Date.parse(profile.first_login_at || "") ||
    Date.parse(profile.created_at || "") ||
    Date.now();
  const weekOf = (t) => Math.max(0, Math.floor((t - anchor) / WEEK));
  const now = Date.now();
  const cur = weekOf(now);

  const [att, act] = await Promise.all([
    supabase
      .from("assessment_attempts")
      .select("quiz_id,status,percentage,submitted_at,started_at,quizzes(passing_score)")
      .eq("user_id", profile.id)
      .neq("status", "IN_PROGRESS")
      .limit(5000),
    supabase.from("learning_activity").select("*").limit(10000),
  ]);
  if (att.error) console.warn("attempts unavailable", att.error);
  if (act.error) console.warn("learning activity unavailable", act.error);

  const weeks = new Map(); // week index -> numbers
  const W = (i) => {
    if (!weeks.has(i))
      weeks.set(i, { attempts: 0, passes: 0, best: 0, sum: 0, avg: 0, studiedSet: new Set(), daySet: new Set() });
    return weeks.get(i);
  };
  (att.data || []).forEach((a) => {
    const t = Date.parse(a.submitted_at || a.started_at || "");
    if (!t || t < anchor) return;
    const w = W(weekOf(t)),
      p = Number(a.percentage) || 0;
    w.attempts++;
    w.sum += p;
    w.best = Math.max(w.best, p);
    if (p >= (Number(a.quizzes?.passing_score) || 60)) w.passes++;
  });
  (act.data || []).forEach((r) => {
    if (r.user_id && r.user_id !== profile.id) return;
    const t = tsOf(r);
    if (!t || t < anchor) return;
    const w = W(weekOf(t));
    if (r.structure_id) w.studiedSet.add(r.structure_id);
    w.daySet.add(new Date(t).toDateString());
  });
  weeks.forEach((w) => {
    w.avg = w.attempts ? Math.round(w.sum / w.attempts) : 0;
    w.studied = w.studiedSet.size;
    w.studyDays = w.daySet.size;
  });

  const thisWeek = W(cur);
  const earnedIn = (b, w) => b.value(w) >= b.target;
  const badges = BADGES.map((b) => {
    const v = b.value(thisWeek);
    let times = 0;
    weeks.forEach((w) => earnedIn(b, w) && times++);
    return { ...b, current: v, progress: Math.min(1, v / b.target), earned: v >= b.target, times };
  });
  const start = anchor + cur * WEEK;
  return {
    week: cur + 1,
    start,
    end: start + WEEK,
    resetsIn: start + WEEK - now,
    badges,
    stats: thisWeek,
    earnedNow: badges.filter((b) => b.earned).length,
    lifetime: badges.reduce((s, b) => s + b.times, 0),
  };
}

const left = (ms) => {
  const d = Math.floor(ms / 86400000),
    h = Math.floor((ms % 86400000) / 3600000);
  return d ? `${d}d ${h}h` : `${Math.max(h, 1)}h`;
};
const day = (t) => new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });

// Renders the weekly badge board into `el`. compact = smaller tiles (profile sidebar).
export function renderWeekly(el, w, { compact = false } = {}) {
  el.innerHTML = `<div class="week-head">
      <div><span class="week-no">Week ${w.week}</span> <span class="muted small">${day(w.start)} &ndash; ${day(w.end - 1)}</span></div>
      <span class="reset-chip" title="Badges reset at the start of each new week">${icon("clock", 14)} Resets in ${left(w.resetsIn)}</span>
    </div>
    <div class="week-sum"><b>${w.earnedNow}</b> / ${w.badges.length} badges this week <span class="muted small">&middot; ${w.lifetime} collected in total</span></div>
    <div class="badges ${compact ? "compact" : ""}">${w.badges
      .map(
        (b) => `<div class="badge ${b.earned ? "on" : ""}" title="${esc(b.desc)}">
        <span class="ic">${icon(b.icon, compact ? 22 : 28)}</span>
        <b>${esc(b.name)}</b>
        <span class="small">${esc(b.desc)}</span>
        <span class="bprog"><i style="width:${Math.round(b.progress * 100)}%"></i></span>
        <span class="bnum">${b.earned ? "Earned" : `${Math.round(b.current)}${b.unit || ""} / ${b.target}${b.unit || ""}`}${b.times ? ` &middot; &times;${b.times}` : ""}</span>
      </div>`,
      )
      .join("")}</div>`;
}
