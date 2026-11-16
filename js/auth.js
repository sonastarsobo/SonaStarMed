import { supabase } from "./supabase.js";

export async function register(name, email, password) {
  // Role is NOT sent from the client: a DB trigger always creates STUDENT profiles.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data; // data.session is null if email confirmation is enabled
}
// `who` is an e-mail or a username (accounts created by a teacher sign in with their username).
export async function resolveLoginEmail(who) {
  who = String(who || "").trim();
  if (who.includes("@")) return who;
  const { data, error } = await supabase.rpc("login_email_for", { p_login: who });
  if (error) {
    console.error(error);
    throw new Error(
      "Username sign-in is not set up yet. Sign in with your e-mail, or ask your teacher to run supabase/sobo_med_v3.sql.",
    );
  }
  if (!data) throw new Error("No account found with that username.");
  return data;
}
export async function login(who, password) {
  const email = await resolveLoginEmail(who);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error)
    throw new Error(
      /invalid login/i.test(error.message)
        ? "Incorrect username/e-mail or password."
        : error.message,
    );
  // Weekly achievements count from the first sign-in. Ignored if the migration has not been run.
  await supabase.rpc("mark_first_login").then(() => {}, () => {});
  return data.user;
}
// Sends the "reset your password" e-mail. The link opens reset-password.html.
export async function sendPasswordReset(email) {
  const redirectTo = new URL("../reset-password.html", import.meta.url).href;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error(error);
  location.href = new URL("../login.html", import.meta.url).href;
}
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error(error);
    return null;
  }
  return { ...data, email: user.email };
}
export const homeFor = (role) =>
  role === "ADMIN" ? "admin/dashboard.html" : "student/dashboard.html";
