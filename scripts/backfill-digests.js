// Calls the deployed /api/digests/generate endpoint once per day for the last N days
// so the portfolio has historical digests to paginate through.
//
// Usage:
//   BASE_URL=https://portfolio-nine-swart-38.vercel.app CRON_SECRET=... node scripts/backfill-digests.js [days]

const BASE_URL = process.env.BASE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const DAYS = parseInt(process.argv[2], 10) || 30;

if (!BASE_URL || !CRON_SECRET) {
  console.error("Set BASE_URL and CRON_SECRET env vars before running this script.");
  process.exit(1);
}

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function generateOne(date) {
  const res = await fetch(`${BASE_URL}/api/digests/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({ date }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`Backfilling ${DAYS} days against ${BASE_URL}`);
  for (let i = DAYS; i >= 1; i -= 1) {
    const date = isoDateDaysAgo(i);
    process.stdout.write(`[${date}] generating... `);
    try {
      const { status, body } = await generateOne(date);
      console.log(status, JSON.stringify(body));
    } catch (err) {
      console.log("ERROR", err.message);
    }
  }
  console.log("Backfill complete.");
}

main();
