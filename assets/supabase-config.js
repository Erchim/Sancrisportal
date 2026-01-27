// Supabase config for Events San Cristobal portal.
// 1) Create a Supabase project
// 2) In Supabase -> Project Settings -> API:
//    - Project URL -> paste below
//    - anon public key -> paste below
// 3) Commit this file.

export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

// Optional: where magic links should send users after login.
// Leave empty to auto-detect at runtime.
export const AUTH_REDIRECT_PATH = "account.html";
