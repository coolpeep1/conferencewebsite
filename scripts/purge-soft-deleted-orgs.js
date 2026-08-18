// Org trash purge.
//
// Hard-deletes organizations whose `deleted_at` is older than
// RETENTION_DAYS. The DB cascade removes form_assignments + form_responses.
//
// Runs as the `conference-app-purge` PM2 process (see ecosystem.config.js).
// One tick per PURGE_TICK_MS (default: 1 hour). The single-tick CLI
// (`npm run purge`) for manual triggering shells into this script with
// RUN_ONCE=true.

const { createClient } = require("@supabase/supabase-js");

try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv not installed; that's fine in prod where PM2 sets env.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TICK_MS = Number.parseInt(process.env.PURGE_TICK_MS || "3600000", 10);
const RETENTION_DAYS = Number.parseInt(process.env.PURGE_RETENTION_DAYS || "5", 10);
const RUN_ONCE = process.env.RUN_ONCE === "true";

if (!SUPABASE_URL) {
  console.error("[purge] NEXT_PUBLIC_SUPABASE_URL is required");
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[purge] SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function tick() {
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("organizations")
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .select("id, org_name");

  if (error) {
    console.error("[purge] hard-delete failed:", error.message);
    return;
  }

  if (data && data.length) {
    console.log(
      `[purge] hard-deleted ${data.length} org(s) past ${RETENTION_DAYS}d retention.`,
    );
  } else {
    console.log(`[purge] no orgs past ${RETENTION_DAYS}d retention.`);
  }
}

async function main() {
  console.log(
    `[purge] starting — retention=${RETENTION_DAYS}d, tick=${TICK_MS}ms, run-once=${RUN_ONCE}`,
  );
  // Always run a tick on startup so a fresh deploy doesn't have to wait a
  // full tick interval to pick up rows that went stale during downtime.
  await tick();
  if (RUN_ONCE) return;
  while (true) {
    await new Promise((r) => setTimeout(r, TICK_MS));
    try {
      await tick();
    } catch (err) {
      console.error("[purge] tick threw:", err);
    }
  }
}

main().catch((err) => {
  console.error("[purge] fatal:", err);
  process.exit(1);
});
