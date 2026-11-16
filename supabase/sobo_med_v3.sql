-- =====================================================================================
-- SOBO Med v3 migration. Run once in the Supabase SQL Editor (safe to re-run).
--   1. Usernames + login with username
--   2. Teacher-created student accounts (username + email + generated password)
--   3. Teacher password reset for a student
--   4. First-login date (weekly achievements are counted from it)
--   5. Per-quiz "show result immediately" option
--   6. Remove traditional multiple-choice questions from quizzes
-- After running: Authentication > URL Configuration > add <your site>/reset-password.html
-- to "Redirect URLs" so the "Forgot / change password" e-mail link works.
-- =====================================================================================

-- ---------- 1. usernames ----------
alter table profiles add column if not exists username text;
alter table profiles add column if not exists first_login_at timestamptz;
create unique index if not exists profiles_username_lower_idx on profiles (lower(username));

-- Resolves what a person typed in the login box to the e-mail Supabase Auth signs in with.
-- Accepts an e-mail (returned as is), a username, or (if unique) a display name.
create or replace function login_email_for(p_login text)
returns text language plpgsql stable security definer set search_path = public, auth as $$
declare v text; n int;
begin
  p_login := trim(coalesce(p_login, ''));
  if p_login = '' then return null; end if;
  if position('@' in p_login) > 0 then return p_login; end if;
  select u.email into v from profiles p join auth.users u on u.id = p.id
   where lower(p.username) = lower(p_login) limit 1;
  if v is not null then return v; end if;
  select count(*) into n from profiles where lower(name) = lower(p_login);
  if n = 1 then
    select u.email into v from profiles p join auth.users u on u.id = p.id where lower(p.name) = lower(p_login);
  end if;
  return v;
end $$;
revoke all on function login_email_for(text) from public;
grant execute on function login_email_for(text) to anon, authenticated;

-- ---------- 2. teacher creates a student account ----------
-- The username is stored exactly as typed and is also used as the display name.
create or replace function admin_create_student(p_username text, p_email text, p_password text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid();
begin
  if not is_admin() then raise exception 'Only teachers can create accounts'; end if;
  p_username := trim(coalesce(p_username, ''));
  p_email := lower(trim(coalesce(p_email, '')));
  if p_username = '' then raise exception 'Username is required'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid e-mail: %', p_email; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if exists (select 1 from profiles where lower(username) = lower(p_username)) then
    raise exception 'Username "%" is already taken', p_username;
  end if;
  if exists (select 1 from auth.users where lower(email) = p_email) then
    raise exception 'E-mail % is already registered', p_email;
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
          crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('name', p_username), now(), now(), '', '', '', '', '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
          'email', null, now(), now());

  -- the signup trigger normally creates the profile; make sure it exists and carries the username
  insert into profiles (id, name, role) values (uid, p_username, 'STUDENT')
  on conflict (id) do update set name = excluded.name;
  update profiles set username = p_username, name = p_username, role = 'STUDENT' where id = uid;
  return uid;
end $$;
revoke all on function admin_create_student(text, text, text) from public;
grant execute on function admin_create_student(text, text, text) to authenticated;

-- ---------- 3. teacher sets a new password for a student ----------
create or replace function admin_reset_student_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not is_admin() then raise exception 'Only teachers can reset passwords'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if not exists (select 1 from profiles where id = p_user and role = 'STUDENT') then
    raise exception 'Student not found';
  end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;
revoke all on function admin_reset_student_password(uuid, text) from public;
grant execute on function admin_reset_student_password(uuid, text) to authenticated;

-- ---------- 4. first login ----------
-- Called once after sign-in; only ever sets the value the first time.
create or replace function mark_first_login()
returns timestamptz language sql security definer set search_path = public as $$
  update profiles set first_login_at = coalesce(first_login_at, now()) where id = auth.uid()
  returning first_login_at;
$$;
revoke all on function mark_first_login() from public;
grant execute on function mark_first_login() to authenticated;

-- ---------- 5. show result immediately ----------
-- Skipped (with a notice) if the quiz tables do not exist in this project yet.
do $$
begin
  if to_regclass('public.quizzes') is null then
    raise notice 'Skipped show_result: table public.quizzes not found. Run the assessment schema first, then re-run this file.';
  else
    execute 'alter table public.quizzes add column if not exists show_result boolean not null default true';
  end if;
end $$;

-- ---------- 6. no traditional MCQ in quizzes ----------
-- Unlinks multiple-choice questions from every quiz and archives them (they stay in the
-- database and old attempt results are kept; un-archive them in the Questions page if needed).
do $$
begin
  if to_regclass('public.questions') is null then
    raise notice 'Skipped MCQ clean-up: table public.questions not found.';
    return;
  end if;
  if to_regclass('public.quiz_questions') is not null then
    execute $q$delete from public.quiz_questions qq using public.questions q
              where q.id = qq.question_id and q.question_type::text = 'MULTIPLE_CHOICE'$q$;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'questions' and column_name = 'archived') then
    execute $q$update public.questions set archived = true
              where question_type::text = 'MULTIPLE_CHOICE' and archived = false$q$;
  end if;
end $$;
