'use client';
/**
 * ARONCANDY — Real email authentication via Supabase Auth.
 * Verification status comes only from the server session
 * (`user.email_confirmed_at`), never from browser-tamperable state.
 */
import { database, isDatabaseConfigured } from './database';

export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface AuthSnapshot { session: boolean; emailVerified: boolean; email: string | null; userId: string | null }

/** Single source of truth: verification is decided by the provider. */
export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const db = database();
  if (!db) return { session: false, emailVerified: false, email: null, userId: null };
  const { data } = await db.auth.getSession();
  const user = data.session?.user ?? null;
  return {
    session: Boolean(user),
    emailVerified: Boolean(user && user.email_confirmed_at),
    email: user?.email ?? null,
    userId: user?.id ?? null,
  };
}

export async function signIn(email: string) {
  const db = database(); if (!db) throw new Error('Login online belum diaktifkan. Kamu tetap bisa bermain sebagai tamu.');
  if (!EMAIL_RE.test(email)) throw new Error('Format email tidak valid.');
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { error } = await db.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: redirectTo } });
  if (error) throw new Error(friendly(error.message));
}

export async function signOut() {
  const db = database(); if (db) await db.auth.signOut();
}

const friendly = (m: string) =>
  m.includes('already registered') || m.includes('already exists')
    ? 'Email sudah terdaftar. Coba masuk saja.'
    : m.includes('Password should be')
      ? 'Password minimal 6 karakter.'
      : m.includes('rate limit')
        ? 'Terlalu banyak percobaan. Tunggu sebentar.'
        : m.includes('Invalid login')
          ? 'Email atau password salah.'
          : m.includes('Email not confirmed')
            ? 'Email kamu belum diverifikasi.'
            : 'Login belum berhasil. Coba lagi.';

/** Register a new account: validation happens client-side, verification is done by Supabase. */
export async function registerWithPassword(email: string, password: string, username: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia. Kamu tetap bisa bermain sebagai tamu.');
  if (!EMAIL_RE.test(email)) throw new Error('Format email tidak valid.');
  if (!USERNAME_RE.test(username)) throw new Error('Username 3-16 karakter: huruf, angka, dan underscore.');
  if (password.length < 8) throw new Error('Password minimal 8 karakter.');
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { data, error } = await db.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { username: username.trim() },
    },
  });
  if (error) throw new Error(friendly(error.message));
  // Never assume verified — Supabase sends the confirmation email.
  return { needsEmailVerification: !data.session && !data.user?.email_confirmed_at };
}

/** Resend the verification email (Supabase enforces server-side rate limits too). */
export async function resendVerification(email: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia.');
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { error } = await db.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw new Error(friendly(error.message));
}

/** Official provider password-reset flow. */
export async function sendPasswordReset(email: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia.');
  if (!EMAIL_RE.test(email)) throw new Error('Format email tidak valid.');
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/reset-password` : undefined;
  const { error } = await db.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) throw new Error(friendly(error.message));
}

/** Sign in with email + password. Session is managed by the provider. */
export async function signInWithPassword(email: string, password: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia. Kamu tetap bisa bermain sebagai tamu.');
  const { data, error } = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (error.message.includes('Email not confirmed')) throw new Error('UNVERIFIED');
    throw new Error(friendly(error.message));
  }
  return { emailVerified: Boolean(data.user?.email_confirmed_at), email: data.user?.email ?? null };
}

/** Subscribe to provider session changes so refresh/expiry keeps the UI correct. */
export function onAuthChange(cb: (snap: AuthSnapshot) => void) {
  const db = database();
  if (!db) return () => {};
  const { data } = db.auth.onAuthStateChange(async () => { cb(await getAuthSnapshot()); });
  return () => { data.subscription.unsubscribe(); };
}

export { isDatabaseConfigured };
