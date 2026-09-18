import { database } from './database';
export async function signIn(email:string){const db=database();if(!db)throw new Error('Login online belum diaktifkan. Kamu tetap bisa bermain sebagai tamu.');const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});if(error)throw error;}
export async function signOut(){const db=database();if(db){const {error}=await db.auth.signOut();if(error)throw error;}}
const friendly = (m: string) =>
  m.includes('already registered') || m.includes('already exists')
    ? 'Email sudah terdaftar. Coba masuk saja.'
    : m.includes('Password should be')
      ? 'Password minimal 6 karakter.'
      : m.includes('rate limit')
        ? 'Terlalu banyak percobaan. Tunggu sebentar.'
        : m.includes('Invalid login')
          ? 'Email atau password salah.'
          : 'Login belum berhasil. Coba lagi.';

/** Register a new account with email + password (+ optional username). */
export async function signUp(email: string, password: string, username?: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia. Kamu tetap bisa bermain sebagai tamu.');
  const { error } = await db.auth.signUp({
    email: email.trim(),
    password,
    options: username ? { data: { username: username.trim() } } : undefined,
  });
  if (error) throw new Error(friendly(error.message));
}

/** Sign in with email + password. */
export async function signInWithPassword(email: string, password: string) {
  const db = database();
  if (!db) throw new Error('Layanan akun belum tersedia. Kamu tetap bisa bermain sebagai tamu.');
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
}
