// Printful drafts for paid HAITMOUS orders.
// confirm is left OFF so Printful holds the order until Stephany approves it.
// Nothing is submitted for production, and Printful is not charged, until that approval.
//
// Env: PRINTFUL_TOKEN (same private token as the Fraimous store).
// Optional: PRINTFUL_STORE_ID — only needed if the account later has more than one store.

const PRINTFUL_API = "https://api.printful.com";

function printfulToken() {
  return String(process.env.PRINTFUL_TOKEN || "").trim();
}

function printfulHeaders() {
  const token = printfulToken();
  if (!token) throw new Error("PRINTFUL_TOKEN missing");
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "HAITMOUS-checkout/1.0",
  };
  const storeId = String(process.env.PRINTFUL_STORE_ID || "").trim();
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  return headers;
}

function recipientFromSession(session) {
  const collected = session && session.collected_information;
  const shipping =
    (session && session.shipping_details) ||
    (collected && collected.shipping_details) ||
    null;
  const address = (shipping && shipping.address) || {};
  const name =
    (shipping && shipping.name) ||
    (session && session.customer_details && session.customer_details.name) ||
    "";
  const email =
    (session && session.customer_details && session.customer_details.email) ||
    (session && session.customer_email) ||
    "";
  if (!address.line1 || !address.city || !address.country || !address.postal_code) {
    return null;
  }
  const recipient = {
    name: name || "HAITMOUS buyer",
    address1: address.line1,
    city: address.city,
    country_code: address.country,
    zip: address.postal_code,
  };
  if (address.line2) recipient.address2 = address.line2;
  if (address.state) recipient.state_code = address.state;
  if (email) recipient.email = email;
  return recipient;
}

function itemsFromSession(session, catalog) {
  const lines =
    (session && session.line_items && session.line_items.data) ||
    (session && session.line_items) ||
    [];
  const items = [];
  for (const li of lines) {
    const prod = li.price && typeof li.price.product === "object" ? li.price.product : {};
    const md = (prod && prod.metadata) || {};
    const slug = String(md.slug || "").trim();
    const qty = Math.max(1, parseInt(li.quantity, 10) || 1);
    let syncVariantId = parseInt(md.sync_variant_id, 10);
    if (!syncVariantId && slug && catalog && catalog.getHat) {
      const hat = catalog.getHat(slug);
      if (hat) syncVariantId = hat.syncVariantId;
    }
    if (!syncVariantId) {
      return { ok: false, reason: "missing_sync_variant", slug };
    }
    items.push({ sync_variant_id: syncVariantId, quantity: qty });
  }
  if (!items.length) return { ok: false, reason: "no_items" };
  return { ok: true, items };
}

// Exact body posted to POST /orders (confirm left off / false).
function buildDraftOrderPayload({ externalId, recipient, items }) {
  return {
    external_id: String(externalId).slice(0, 32),
    confirm: false,
    recipient,
    items,
  };
}

async function printfulRequest(method, path, { body, fetchImpl } = {}) {
  const fetchFn = fetchImpl || fetch;
  const res = await fetchFn(PRINTFUL_API + path, {
    method,
    headers: printfulHeaders(),
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function findOrderByExternalId(externalId, { fetchImpl } = {}) {
  const id = encodeURIComponent("@" + externalId);
  const r = await printfulRequest("GET", "/orders/" + id, { fetchImpl });
  if (r.status === 404) return { ok: true, found: false };
  if (!r.ok) return { ok: false, status: r.status, data: r.data };
  return { ok: true, found: true, order: (r.data && r.data.result) || r.data };
}

async function createDraftOrder(payload, { fetchImpl } = {}) {
  return printfulRequest("POST", "/orders", { body: payload, fetchImpl });
}

// Idempotent: skip the POST if an order with this external_id already exists.
async function createDraftOrderIdempotent(payload, { fetchImpl } = {}) {
  const existing = await findOrderByExternalId(payload.external_id, { fetchImpl });
  if (!existing.ok) return { ok: false, skipped: false, reason: "lookup_failed", lookup: existing };
  if (existing.found) {
    return { ok: true, skipped: true, reason: "already_exists", order: existing.order };
  }
  const created = await createDraftOrder(payload, { fetchImpl });
  if (!created.ok) return { ok: false, skipped: false, reason: "create_failed", response: created };
  return { ok: true, skipped: false, order: (created.data && created.data.result) || created.data };
}

module.exports = {
  PRINTFUL_API,
  printfulToken,
  recipientFromSession,
  itemsFromSession,
  buildDraftOrderPayload,
  findOrderByExternalId,
  createDraftOrder,
  createDraftOrderIdempotent,
};
