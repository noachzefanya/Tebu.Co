/**
 * authService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised authentication helpers for Tebu.Co.
 *
 * Strategy:
 *  - Phone numbers are converted to a synthetic email `${cleanPhone}@tebu.app`
 *    so Supabase Auth email+password flow can be used without exposing real emails.
 *  - PIN (6-digit string) is used directly as the Supabase password.
 *  - After signUp the function attempts to upsert a row into `public.profiles`.
 *    If the DB already has a trigger that creates the profile on auth.users INSERT
 *    the upsert will simply update with the same values – safe to run either way.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '../lib/supabaseClient.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip all non-digit characters from a phone string and append `@tebu.app`
 * to produce a deterministic synthetic email usable with Supabase Auth.
 *
 * @param   {string} phone  Raw phone input (e.g. "081 234-567 890")
 * @returns {string}        Virtual email  (e.g. "081234567890@tebu.app")
 */
export function formatVirtualEmail(phone) {
  const clean = String(phone).replace(/\D/g, '');
  return `${clean}@tebu.app`;
}

// ─── Auth operations ──────────────────────────────────────────────────────────

/**
 * Register a new user with phone + PIN.
 *
 * Calls supabase.auth.signUp, then upserts a row into public.profiles.
 *
 * @param {{ fullName: string, phone: string, pin: string, role: string, millName?: string }} params
 * @returns {{ user, profile, error? }}
 */
export async function registerWithPhone({ fullName, phone, pin, role, millName = '' }) {
  try {
    const email = formatVirtualEmail(phone);
    const cleanPhone = String(phone).replace(/\D/g, '');

    // ── 1. Create Supabase Auth user ──────────────────────────────────────────
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: pin,
      options: {
        emailRedirectTo: undefined,       // no email confirmation needed
        data: {
          full_name: fullName.trim(),
          phone:     cleanPhone,
          phone_number: cleanPhone, // Add both to prevent SQL metadata mismatch
          role,
          mill_name: millName.trim(),
        },
      },
    });

    if (signUpError) {
      // Supabase returns "User already registered" for duplicate accounts
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        throw new Error('Nomor HP ini sudah terdaftar. Silakan gunakan Login.');
      }
      throw signUpError;
    }

    if (!authData?.user) {
      throw new Error('Pendaftaran gagal. Coba lagi beberapa saat.');
    }

    // ── 2. Upsert profile row (fallback if no DB trigger) ────────────────────
    const profilePayload = {
      id:        authData.user.id,
      full_name: fullName.trim(),
      phone:     cleanPhone,
      phone_number: cleanPhone,
      role,
      mill_name: millName.trim() || null,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      // Profile upsert failed — not fatal if trigger already created it
      console.warn('[authService] Profile upsert warning (may be OK if trigger exists):', profileError.message);
    }

    return { user: authData.user, profile: profile || profilePayload };

  } catch (err) {
    console.error('[authService] registerWithPhone error:', err);
    throw err;
  }
}

/**
 * Log in with phone + PIN.
 *
 * @param {{ phone: string, pin: string }} params
 * @returns {{ session, user }}
 */
export async function loginWithPhone({ phone, pin }) {
  try {
    const email = formatVirtualEmail(phone);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('invalid login') ||
        error.message?.toLowerCase().includes('invalid credentials')
      ) {
        throw new Error('Nomor HP atau PIN salah. Periksa kembali dan coba lagi.');
      }
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Akun belum diaktifkan. Hubungi admin sistem.');
      }
      throw error;
    }

    if (!data?.session) {
      throw new Error('Login gagal, tidak ada sesi aktif. Coba lagi.');
    }

    return { session: data.session, user: data.user };

  } catch (err) {
    console.error('[authService] loginWithPhone error:', err);
    throw err;
  }
}

/**
 * Fetch the user's profile row from public.profiles.
 *
 * @param   {string} userId  Supabase Auth user UUID
 * @returns {object|null}    Profile row or null
 */
export async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[authService] fetchUserProfile error:', error.message);
      return null;
    }

    return data;

  } catch (err) {
    console.error('[authService] fetchUserProfile unexpected error:', err);
    return null;
  }
}

/**
 * Sign the current user out.
 */
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[authService] logoutUser error:', error.message);
    }
  } catch (err) {
    console.error('[authService] logoutUser unexpected error:', err);
  }
}

/**
 * Generate a mock demo session/profile.
 * 
 * @param {'petani'|'admin_pg'} role 
 * @returns {object} Mock profile object
 */
export function loginAsDemo(role) {
  if (role === 'admin_pg') {
    return {
      id: 'demo-admin',
      full_name: 'Admin PG Kebonagung (Demo)',
      role: 'admin_pg',
      phone: '081200000002',
      mill_name: 'PG Kebonagung',
      isDemo: true,
    };
  }
  
  return {
    id: 'demo-petani',
    full_name: 'Pak Sugeng (Demo)',
    role: 'petani',
    phone: '081200000001',
    isDemo: true,
  };
}
