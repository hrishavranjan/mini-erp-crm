import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail fast with a clear message rather than a cryptic runtime error later
  // eslint-disable-next-line no-console
  console.error(
    "[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env. " +
      "Copy .env.example to .env and fill in your Supabase project credentials."
  );
  process.exit(1);
}

// Service-role client: full DB access, used ONLY on the backend.
// Never expose this key to the frontend.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
