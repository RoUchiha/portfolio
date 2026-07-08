// Local digest generator / backfiller. Runs the SAME generation code the
// deployed cron uses (api/lib/generateDigest.js), but calls it directly and
// writes straight to Supabase with the service-role key — bypassing Vercel's
// function time limit so a 30-day backfill can run reliably from a laptop.
//
// Reads secrets from .env.local. Usage:
//   node scripts/backfill-local.js today            # today's digest, insert + EMAIL (real end-to-end test)
//   node scripts/backfill-local.js date 2026-06-20  # one specific day, insert only (no email)
//   node scripts/backfill-local.js backfill 30      # last 30 calendar days (excluding today), insert only
//
// Flags: append "email" to also send email for date/backfill modes (off by default there).

const fs = require("fs");
const path = require("path");

// --- load .env.local into process.env (no dotenv dependency) ---
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { generateDigestContent, sendDigestEmail } = require("../api/_lib/generateDigest");
const { getSupabaseAdmin } = require("../api/_lib/supabase");

const RECIPIENT = "rosingh.dev@gmail.com";

function chicagoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function generateForDate(date, { isBackfill, email }) {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("ai_digests")
    .select("id")
    .eq("digest_date", date)
    .maybeSingle();
  if (existing) {
    console.log(`[${date}] already exists (id ${existing.id}) — skipping`);
    return;
  }

  const t0 = Date.now();
  const { title, summaryMd, sources } = await generateDigestContent(date, { isBackfill });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);

  const { data: row, error } = await supabase
    .from("ai_digests")
    .upsert({ digest_date: date, title, summary_md: summaryMd, sources }, { onConflict: "digest_date" })
    .select()
    .single();
  if (error) throw error;

  console.log(`[${date}] ${secs}s  ${sources.length} sources  "${title}"  (row ${row.id})`);

  if (email) {
    await sendDigestEmail({ to: RECIPIENT, digestDate: date, title, summaryMd, sources });
    console.log(`[${date}] emailed ${RECIPIENT}`);
  }
}

async function main() {
  const [mode, arg, ...rest] = process.argv.slice(2);
  const wantEmail = rest.includes("email");

  if (mode === "today") {
    await generateForDate(chicagoToday(), { isBackfill: false, email: true });
  } else if (mode === "date") {
    await generateForDate(arg, { isBackfill: true, email: wantEmail });
  } else if (mode === "backfill") {
    const days = parseInt(arg, 10) || 30;
    console.log(`Backfilling ${days} days (oldest first), email=${wantEmail}`);
    for (let i = days; i >= 1; i -= 1) {
      const date = isoDaysAgo(i);
      try {
        await generateForDate(date, { isBackfill: true, email: wantEmail });
      } catch (err) {
        console.error(`[${date}] ERROR: ${err.message}`);
      }
    }
    console.log("Backfill complete.");
  } else {
    console.error("Usage: node scripts/backfill-local.js today | date <YYYY-MM-DD> | backfill <N> [email]");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
