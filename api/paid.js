// GET /api/paid?session_id=cs_... — thanks-page lookup. No emails. No Printful calls.
const { stripeGet } = require("./_lib/stripe-rest");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const key = process.env.STRIPE_SECRET_KEY;
  const id = String((req.query && req.query.session_id) || "").trim();
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) return res.status(400).json({ ok: false });

  let r;
  try {
    r = await stripeGet("checkout/sessions/" + encodeURIComponent(id), {
      key,
      expand: ["line_items", "line_items.data.price.product"],
    });
  } catch {
    return res.status(502).json({ ok: false });
  }
  const session = r.data || {};
  if (!r.ok) return res.status(r.status === 404 ? 404 : 502).json({ ok: false });
  const md = session.metadata || {};
  if (md.source !== "haitmous" && !/^HAT-/.test(String(md.order_number || ""))) {
    return res.status(404).json({ ok: false });
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return res.status(402).json({
      ok: false,
      paid: false,
      payment_status: session.payment_status || "",
    });
  }
  const items = ((session.line_items && session.line_items.data) || []).map((li) => {
    const prod = li.price && typeof li.price.product === "object" ? li.price.product : {};
    const pmd = prod.metadata || {};
    return {
      title: pmd.title || li.description || "Hat",
      slug: pmd.slug || "",
      qty: li.quantity || 1,
    };
  });
  return res.status(200).json({
    ok: true,
    paid: true,
    orderNumber: md.order_number || session.client_reference_id || "",
    items,
  });
};
