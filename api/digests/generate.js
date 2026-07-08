const { getSupabaseAdmin } = require("../_lib/supabase");
const { generateDigestContent, sendDigestEmail } = require("../_lib/generateDigest");

const DIGEST_RECIPIENT = "rosingh.dev@gmail.com";

function todayInChicago() {
  // en-CA gives YYYY-MM-DD directly.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

module.exports = async (req, res) => {
  // Vercel Cron sends a GET with an Authorization: Bearer <CRON_SECRET> header.
  // Manual/backfill calls send a POST with an x-cron-secret header (so a date can be passed in the body).
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = process.env.CRON_SECRET;
  const bearerOk = secret && req.headers["authorization"] === `Bearer ${secret}`;
  const headerOk = secret && req.headers["x-cron-secret"] === secret;
  if (!bearerOk && !headerOk) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.method === "POST" && req.body && typeof req.body === "object" ? req.body : {};
  const queryDate = typeof req.query.date === "string" ? req.query.date : undefined;
  const requestedDate = body.date || queryDate;
  const targetDate = requestedDate && isValidDate(requestedDate) ? requestedDate : todayInChicago();
  const isBackfill = Boolean(requestedDate);
  const force = Boolean(body.force || req.query.force);
  const skipEmail = Boolean(body.skipEmail || req.query.skipEmail);

  const supabase = getSupabaseAdmin();

  try {
    if (!force) {
      const { data: existing, error: lookupError } = await supabase
        .from("ai_digests")
        .select("id")
        .eq("digest_date", targetDate)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        res.status(200).json({ status: "already_exists", date: targetDate });
        return;
      }
    }

    const { title, summaryMd, sources } = await generateDigestContent(targetDate, { isBackfill });

    const { data: row, error: upsertError } = await supabase
      .from("ai_digests")
      .upsert(
        {
          digest_date: targetDate,
          title,
          summary_md: summaryMd,
          sources,
        },
        { onConflict: "digest_date" }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    if (!skipEmail) {
      await sendDigestEmail({
        to: DIGEST_RECIPIENT,
        digestDate: targetDate,
        title,
        summaryMd,
        sources,
      });
    }

    res.status(200).json({ status: "ok", date: targetDate, id: row.id, emailed: !skipEmail });
  } catch (err) {
    console.error("digest generate failed", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
};
