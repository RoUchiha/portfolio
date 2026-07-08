const { getSupabaseAdmin } = require("../_lib/supabase");

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
      .from("ai_digests")
      .select("id, digest_date, title, summary_md, sources, created_at")
      .order("digest_date", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("digest_date", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const nextCursor = data.length === limit ? data[data.length - 1].digest_date : null;

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items: data, nextCursor });
  } catch (err) {
    console.error("digest list failed", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
};
