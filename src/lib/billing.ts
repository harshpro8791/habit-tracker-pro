import QRCode from "qrcode";

export type PlanId = "lifetime" | "monthly";

export type PremiumLicense = {
  unlocked: boolean;
  buyerId: string;
  tier: PlanId;
  activatedAt: number;
  expiresAt: number | null;
  code: string;
};

const STORAGE_KEY = "momentum.premium.v1";
const SECRET = "HARSH_PREMIUM_TRACKER_2026"; // client-side only; good for manual unlock, not bank-grade security.

export const SELLER = {
  name: "Harsh",
  appName: "Premium Habit Tracker",
  upiId: "8791274566@ibl",
  telegramUsername: "trackwithharsh",
  telegramHandle: "@trackwithharsh",
  monthlyPrice: 10,
  lifetimePrice: 49,
  message:
    "Hi Harsh! 👋\nI have completed the payment for the Premium Habit Tracker.\nI have attached my payment screenshot.\nPlease verify my payment and send me the Habit Tracker. Thank you!",
};

export const PLANS: Record<PlanId, { id: PlanId; label: string; price: number; blurb: string; badge?: string }> = {
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    price: 49,
    blurb: "One-time payment. Full access forever.",
    badge: "Best value",
  },
  monthly: {
    id: "monthly",
    label: "Monthly",
    price: 10,
    blurb: "30 days of premium access.",
  },
};

export function upiLink(plan: PlanId) {
  const item = PLANS[plan];
  const params = new URLSearchParams({
    pa: SELLER.upiId,
    pn: SELLER.name,
    am: String(item.price),
    cu: "INR",
    tn: `${SELLER.appName} ${item.label} plan`,
  });
  return `upi://pay?${params.toString()}`;
}

export async function qrDataUrl(plan: PlanId) {
  return QRCode.toDataURL(upiLink(plan), {
    margin: 1,
    width: 520,
    color: { dark: "#0b0d12", light: "#0000" },
  });
}

export function telegramDraft(extra?: string) {
  const text = `${SELLER.message}${extra ? `\n\n${extra}` : ""}`;
  return `https://t.me/${SELLER.telegramUsername}?text=${encodeURIComponent(text)}`;
}

function hash(input: string) {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase();
}

function makePayload(buyerId: string, tier: PlanId, expiresAt: number | null) {
  return `${buyerId.trim().toLowerCase()}|${tier}|${expiresAt ?? "LIFE"}`;
}

/**
 * Member ID stays human-readable. Access code is derived from buyerId + plan + expiry.
 * This is intentionally manual/offline and can be generated from the script in /scripts.
 */
export function generateCode(buyerId: string, tier: PlanId, expiresAt: number | null) {
  const payload = makePayload(buyerId, tier, expiresAt);
  const sig = hash(`${payload}|${SECRET}`).slice(0, 12);
  const exp = expiresAt ? new Date(expiresAt).toISOString().slice(0, 10).replace(/-/g, "") : "LIFE";
  return `MHP-${tier === "lifetime" ? "L" : "M"}-${exp}-${sig}`;
}

export function validateLicense(buyerId: string, code: string): PremiumLicense | null {
  const clean = code.trim().toUpperCase();
  const m = /^MHP-(L|M)-([0-9]{8}|LIFE)-([A-Z0-9]+)$/.exec(clean);
  if (!m) return null;
  const tier: PlanId = m[1] === "L" ? "lifetime" : "monthly";
  const expiresAt = m[2] === "LIFE" ? null : new Date(
    `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6, 8)}T23:59:59Z`,
  ).getTime();
  const expected = generateCode(buyerId, tier, expiresAt);
  if (expected !== clean) return null;
  if (expiresAt && expiresAt < Date.now()) return null;
  return {
    unlocked: true,
    buyerId: buyerId.trim(),
    tier,
    activatedAt: Date.now(),
    expiresAt,
    code: clean,
  };
}

export function savePremium(p: PremiumLicense) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function loadPremium(): PremiumLicense | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PremiumLicense;
    if (!data?.buyerId || !data?.code || !data?.tier) return null;
    const valid = validateLicense(data.buyerId, data.code);
    return valid ? { ...valid, activatedAt: data.activatedAt ?? Date.now() } : null;
  } catch {
    return null;
  }
}

export function clearPremium() {
  localStorage.removeItem(STORAGE_KEY);
}

export function premiumActive(p: PremiumLicense | null) {
  return !!p && (p.expiresAt === null || p.expiresAt > Date.now());
}

export function formatExpiry(p: PremiumLicense | null) {
  if (!p) return "Locked";
  if (p.expiresAt === null) return "Lifetime active";
  return `Active till ${new Date(p.expiresAt).toLocaleDateString()}`;
}
