import { createClient } from "npm:@supabase/supabase-js@2";
import { handleStaffAccountRequest } from "./handler.ts";

Deno.serve((request) => handleStaffAccountRequest(request, {
  createClient,
  env: {
    HARBOUR_SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("HARBOUR_SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  },
}));
