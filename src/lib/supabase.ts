import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jyjpitagxtdzedtooedw.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5anBpdGFneHRkemVkdG9vZWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDUyMDEsImV4cCI6MjA5MDgyMTIwMX0.nTUbvwcRnER0aGL0UPjgHw51SRAu0dxqQKcZvN68px4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
