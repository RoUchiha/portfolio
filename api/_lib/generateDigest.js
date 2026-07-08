const Anthropic = require("@anthropic-ai/sdk");
const { Resend } = require("resend");

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 16000;

function buildPrompt(targetDateISO, { isBackfill }) {
  const scope = isBackfill
    ? `You are writing a HISTORICAL digest for ${targetDateISO}. Search for AI news, research, and product announcements that were published on or in the 1-2 days immediately before ${targetDateISO}. Write as if this digest were being delivered on the morning of ${targetDateISO}.`
    : `You are writing today's digest, dated ${targetDateISO}. Search for AI news, research, and product announcements from roughly the last 24-48 hours (right up to now).`;

  return `${scope}

Scour reputable sources for genuinely new AI breakthroughs, developments, and research. Prioritize primary/reputable sources: Anthropic, OpenAI, Google DeepMind, Meta AI, arXiv, MIT Technology Review, Ars Technica, The Verge, Wired, VentureBeat, Reuters/Bloomberg tech coverage. Search the web as many times as you need to find real, current items with real URLs.

Write a digest that a busy reader can fully read in a few minutes, in plain English, broken into short sections (one per story/theme), each explaining: what happened, why it matters, and any important caveat or nuance. Do not skip anything materially important from the period, but keep total length tight - this should be a "few minutes of reading," not an essay. Avoid hype; be precise about what is confirmed vs. speculative.

Every factual claim must be backed by a real source you found via web search. Never invent a URL.

When you are done researching, respond with EXACTLY this structure and nothing else. Use these literal delimiter lines so the output can be parsed:

TITLE: <short, specific headline for this day's digest, under 90 chars, one line>
===SUMMARY===
<the full digest in Markdown: ## section headings, short paragraphs and/or - bullets, plain-English explanations. Multiple lines are fine here.>
===SOURCES===
<one source per line, formatted "Source title | https://full-url" — list every distinct source you cited, deduplicated, with the real URLs you found via search>

Do not wrap the response in code fences. Do not add anything before TITLE: or after the last source line.`;
}

// Parse the delimiter format:
//   TITLE: ...
//   ===SUMMARY===
//   <markdown, multi-line>
//   ===SOURCES===
//   Title | https://url   (one per line)
// This is newline/quote-safe, unlike cramming a Markdown doc into a JSON string.
function parseDigest(text) {
  const cleaned = text.replace(/```[a-z]*\s*|\s*```/gi, ""); // tolerate stray fences
  const sumIdx = cleaned.indexOf("===SUMMARY===");
  const srcIdx = cleaned.indexOf("===SOURCES===");
  if (sumIdx === -1 || srcIdx === -1 || srcIdx < sumIdx) {
    throw new Error("Model output missing ===SUMMARY===/===SOURCES=== delimiters");
  }

  const head = cleaned.slice(0, sumIdx);
  const titleMatch = head.match(/TITLE:\s*(.+)/i);
  const title = (titleMatch ? titleMatch[1] : "AI Digest").trim().slice(0, 200);

  const summaryMd = cleaned.slice(sumIdx + "===SUMMARY===".length, srcIdx).trim();

  const sources = [];
  const seen = new Set();
  for (const rawLine of cleaned.slice(srcIdx + "===SOURCES===".length).split("\n")) {
    const line = rawLine.replace(/^[-*]\s*/, "").trim();
    if (!line) continue;
    const urlMatch = line.match(/(https?:\/\/[^\s|]+)/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (seen.has(url)) continue;
    seen.add(url);
    let srcTitle = line.slice(0, line.indexOf(url)).replace(/[|\-–—]\s*$/, "").trim();
    if (!srcTitle) srcTitle = url;
    sources.push({ title: srcTitle, url });
  }

  return { title, summaryMd, sources };
}

// Google Search grounding hands back vertexaisearch redirect links. Resolve them
// to their real destination so stored sources stay durable and clean.
async function resolveSourceUrls(sources) {
  const resolved = await Promise.all(
    sources.map(async (s) => {
      let url = s.url;
      if (/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/.test(url)) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
          clearTimeout(timer);
          if (r.url) url = r.url;
        } catch (_) {
          // keep the redirect link if resolution fails — it still works when clicked
        }
      }
      return { title: s.title, url };
    })
  );

  const out = [];
  const seen = new Set();
  for (const s of resolved) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// POST to Gemini with retry/backoff on 429 (free-tier rate limit) and 503
// (overloaded). Honors the "retry in Ns" hint the API returns, so a backfill
// can grind through the free-tier per-minute cap instead of dropping days.
async function geminiFetch(url, apiKey, body) {
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();

    const errText = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status === 503;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const hint = errText.match(/retry in ([\d.]+)s/i);
      let waitSec = hint ? Math.ceil(parseFloat(hint[1])) : res.status === 429 ? 30 : 8;
      waitSec = Math.min(Math.max(waitSec, 5) + 2, 75); // clamp + small buffer
      await sleep(waitSec * 1000);
      continue;
    }
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
  }
  throw new Error("Gemini API: retries exhausted");
}

// --- Provider: Google Gemini (free tier, Google Search grounding) ---
// Uses the REST API via fetch so no extra npm dependency is needed. The
// google_search tool grounds the model in live web results and returns cited
// URLs in groundingMetadata, which we use to backfill the sources list.
async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var");
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const data = await geminiFetch(url, apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.4,
      // For Gemini 2.5, thinking tokens count against maxOutputTokens, so the
      // ceiling must comfortably fit BOTH the reasoning and the JSON answer or
      // the response truncates (finishReason MAX_TOKENS) with no text.
      maxOutputTokens: 24000,
      thinkingConfig: { thinkingBudget: 8192 },
    },
  });
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = (candidate.content && candidate.content.parts) || [];
  const text = parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("\n");

  const chunks =
    (candidate.groundingMetadata && candidate.groundingMetadata.groundingChunks) || [];
  const groundingSources = chunks
    .map((c) => (c.web ? { title: c.web.title || c.web.uri, url: c.web.uri } : null))
    .filter((s) => s && s.url);

  return { text, groundingSources };
}

// --- Provider: Anthropic Claude (used only when DIGEST_PROVIDER=anthropic) ---
async function generateWithAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY env var");
  }
  const anthropic = new Anthropic({ apiKey });

  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }];
  const messages = [{ role: "user", content: prompt }];

  // The web_search server tool can return stop_reason "pause_turn" before the
  // final JSON is written. Resume by echoing the assistant turn back.
  const MAX_TURNS = 6;
  let fullText = "";
  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools,
      messages,
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    if (text) fullText += (fullText ? "\n" : "") + text;

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    break;
  }
  return { text: fullText, groundingSources: [] };
}

async function generateDigestContent(targetDateISO, { isBackfill = false } = {}) {
  const provider = (process.env.DIGEST_PROVIDER || "gemini").toLowerCase();
  const prompt = buildPrompt(targetDateISO, { isBackfill });

  const { text, groundingSources } =
    provider === "anthropic"
      ? await generateWithAnthropic(prompt)
      : await generateWithGemini(prompt);

  const parsed = parseDigest(text);
  if (!parsed.title || !parsed.summaryMd) {
    throw new Error("Model output missing title or summary");
  }

  // Prefer the model's own cited URLs; fall back to grounding metadata.
  let sources = parsed.sources.length ? parsed.sources : groundingSources;
  sources = await resolveSourceUrls(sources);

  return {
    title: parsed.title,
    summaryMd: parsed.summaryMd,
    sources,
  };
}

function markdownToHtml(md) {
  // Minimal Markdown -> HTML for email rendering (headings, bold, bullets, paragraphs, links).
  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.split("\n");
  let html = "";
  let inList = false;

  const inline = (line) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h2 style="font-size:18px;margin:24px 0 8px;color:#0d1917;">${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith("# ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h1 style="font-size:22px;margin:0 0 12px;color:#0d1917;">${inline(line.slice(2))}</h1>`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += "<ul style=\"margin:0 0 12px;padding-left:20px;\">";
        inList = true;
      }
      html += `<li style="margin-bottom:6px;">${inline(line.slice(2))}</li>`;
    } else if (line === "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p style="margin:0 0 12px;line-height:1.55;color:#1c2b28;">${inline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

async function sendDigestEmail({ to, digestDate, title, summaryMd, sources }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY env var");
  }

  const resend = new Resend(apiKey);
  const bodyHtml = markdownToHtml(summaryMd);
  const sourcesHtml = sources
    .map(
      (s) =>
        `<li style="margin-bottom:4px;"><a href="${s.url}" style="color:#0f766e;">${s.title || s.url}</a></li>`
    )
    .join("");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f5f8f2;">
      <p style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#45a396;font-weight:700;margin:0 0 4px;">AI Digest &middot; ${digestDate}</p>
      <h1 style="font-size:24px;margin:0 0 20px;color:#0d1917;">${title}</h1>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #dbe4de;margin:24px 0 16px;" />
      <p style="font-size:13px;font-weight:700;color:#0d1917;margin:0 0 8px;">Sources</p>
      <ul style="font-size:13px;color:#334340;padding-left:18px;margin:0;">${sourcesHtml}</ul>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.DIGEST_FROM_EMAIL || "AI Digest <onboarding@resend.dev>",
    to,
    subject: `AI Digest - ${digestDate}: ${title}`,
    html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message || JSON.stringify(error)}`);
  }
}

module.exports = { generateDigestContent, sendDigestEmail, markdownToHtml };
