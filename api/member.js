// POST /api/member — store a HAITMOUS membership-offer email.
// No email is sent. No Stripe objects or coupons are created.
// Persistence uses Vercel KV / Upstash REST when those env vars are present.

const crypto = require("crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_HASH = "haitmous:members";
const KEY_SET = "haitmous:member-emails";

function envGet(name) {
  try {
    return String((process.env && process.env[name]) || "").trim();
  } catch (e) {
    return "";
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const raw = typeof req.body === "string" ? req.body : (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function kvCommand(command) {
  const url = envGet("KV_REST_API_URL") || envGet("UPSTASH_REDIS_REST_URL");
  const token = envGet("KV_REST_API_TOKEN") || envGet("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return { ok: false, missing: true };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, missing: false, status: res.status, data };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({ ok: true, service: "member-offer" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method" });
    return;
  }

  const body = readBody(req);
  // Honeypot: pretend success, store nothing.
  if (String(body.company || "").trim()) {
    res.status(200).json({ ok: true });
    return;
  }

  const email = normalizeEmail(body.email);
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ ok: false, error: "email", message: "Please enter a valid email." });
    return;
  }

  const now = new Date().toISOString();
  const record = JSON.stringify({
    email,
    source: "member-offer",
    created: now,
    hash: crypto.createHash("sha256").update(email).digest("hex").slice(0, 32),
  });

  const saved = await kvCommand(["HSET", KEY_HASH, email, record]);
  if (saved.missing) {
    // No KV configured on this project. Accept the signup so the offer
    // still completes, but report that it was not persisted.
    res.status(200).json({ ok: true, persisted: false });
    return;
  }
  if (!saved.ok) {
    res.status(500).json({ ok: false, error: "store", message: "Please try again." });
    return;
  }
  await kvCommand(["SADD", KEY_SET, email]);
  res.status(200).json({ ok: true, persisted: true });
};
