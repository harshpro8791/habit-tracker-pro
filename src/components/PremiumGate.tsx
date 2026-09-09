import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { confetti, toast } from "@/components/effects";
import {
  PLANS,
  SELLER,
  formatExpiry,
  premiumActive,
  qrDataUrl,
  telegramDraft,
  type PlanId,
  type PremiumLicense,
} from "@/lib/billing";
import { hexToRgba } from "@/lib/accents";
import { cn } from "@/utils/cn";

export default function PremiumGate({
  accent,
  premium,
  onUnlock,
  onReset,
  validate,
}: {
  accent: string;
  premium: PremiumLicense | null;
  onUnlock: (buyerId: string, code: string) => boolean;
  onReset: () => void;
  validate: (buyerId: string, code: string) => PremiumLicense | null;
}) {
  const [plan, setPlan] = useState<PlanId>("lifetime");
  const [qr, setQr] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [code, setCode] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [shake, setShake] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    void qrDataUrl(plan).then(setQr).catch(() => setQr(""));
  }, [plan]);

  const selected = PLANS[plan];
  const perks = useMemo(
    () => [
      "Unlimited habits, streaks, focus timer and insights",
      "Offline data saved on your device forever",
      "XP, badges, animated celebrations and premium updates",
      plan === "lifetime" ? "Pay once — unlock forever" : "30 days access, renewable manually",
    ],
    [plan],
  );

  const beginUpi = () => {
    location.href = `upi://pay?pa=${encodeURIComponent(SELLER.upiId)}&pn=${encodeURIComponent(
      SELLER.name,
    )}&am=${selected.price}&cu=INR&tn=${encodeURIComponent(`Premium Habit Tracker ${selected.label} plan`)}`;
  };

  const copyUpi = async () => {
    await navigator.clipboard.writeText(SELLER.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 1800);
    toast("UPI ID copied", "📋");
  };

  const tryUnlock = () => {
    const valid = validate(buyerId, code);
    if (!valid) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast("Invalid ID or access code", "🚫");
      return;
    }
    onUnlock(buyerId, code);
    confetti(180, [accent, "#ffffff", "#ffc247"]);
    toast(valid.tier === "lifetime" ? "Lifetime premium unlocked" : "Monthly premium unlocked", "🔓");
  };

  return (
    <div className="h-full w-full overflow-y-auto app-scroll no-scrollbar px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-[560px]">
        <header className="px-1 pt-4">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: hexToRgba(accent, 0.45), background: hexToRgba(accent, 0.12), color: accent }}
          >
            <span className="text-sm">💎</span>
            Premium access required
          </div>
          <h1 className="mt-4 text-[30px] font-bold leading-tight">Premium Habit Tracker</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            This app now requires a one-time purchase. Pay via UPI, send the payment screenshot on
            Telegram, and you'll receive your <b>ID + PASS</b> to unlock premium.
          </p>
        </header>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {(["lifetime", "monthly"] as const).map((p) => {
            const item = PLANS[p];
            const active = plan === p;
            return (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className="press text-left"
              >
                <Card
                  className={cn("relative h-full overflow-hidden !p-4", active && "glow-pulse")}
                  style={{
                    background: active ? `linear-gradient(145deg, ${hexToRgba(accent, 0.22)}, var(--surface) 65%)` : "var(--surface)",
                    borderColor: active ? accent : "var(--line)",
                  }}
                >
                  {item.badge && (
                    <span
                      className="absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold"
                      style={{ background: accent, color: "#fff" }}
                    >
                      {item.badge}
                    </span>
                  )}
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-[34px] font-extrabold leading-none">₹{item.price}</p>
                  <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                    {item.blurb}
                  </p>
                </Card>
              </button>
            );
          })}
        </div>

        <Card
          className="anim-fade-up mt-4 overflow-hidden"
          style={{ background: `linear-gradient(145deg, ${hexToRgba(accent, 0.12)}, var(--surface) 68%)` }}
        >
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div
                className="overflow-hidden rounded-[28px] border p-3"
                style={{ borderColor: hexToRgba(accent, 0.28), background: "#fff" }}
              >
                {qr ? (
                  <div className="relative h-[170px] w-[170px] overflow-hidden rounded-[20px] bg-white">
                    <img src={qr} alt="UPI QR code" className="h-full w-full object-cover" />
                    <span
                      className="pointer-events-none absolute inset-x-2 top-0 h-8 rounded-full blur-xl"
                      style={{ background: hexToRgba(accent, 0.3), animation: "floaty 2.6s ease-in-out infinite" }}
                    />
                  </div>
                ) : (
                  <div className="grid h-[170px] w-[170px] place-items-center rounded-[20px] bg-neutral-100 text-neutral-500">
                    Loading QR…
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                Pay now · {selected.label}
              </p>
              <p className="mt-1 text-xl font-bold">₹{selected.price}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Scan this QR in any UPI app, or tap the button below to open PhonePe / GPay / Paytm.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={beginUpi}
                  className="press rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: accent }}
                >
                  Pay via UPI app
                </button>
                <button
                  onClick={copyUpi}
                  className="press rounded-full border px-4 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--line)" }}
                >
                  {copiedUpi ? "UPI copied" : "Copy UPI ID"}
                </button>
              </div>
              <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
                UPI ID: <span className="font-semibold" style={{ color: "var(--text)" }}>{SELLER.upiId}</span>
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <Card className="!py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
              How it works
            </p>
            <ol className="mt-3 flex flex-col gap-2.5 text-sm">
              {[
                `Pay ₹${selected.price} using the QR or UPI button`,
                "Take a screenshot of the successful payment",
                `Send it on Telegram to ${SELLER.telegramHandle}`,
                "Get your ID + PASS from Harsh and unlock the app",
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: hexToRgba(accent, 0.18), color: accent }}
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="!py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                  Premium includes
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {perks.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span style={{ color: accent }}>•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <span className="text-3xl">🚀</span>
            </div>
          </Card>
        </div>

        <Card className="mt-4 !py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                Verify payment on Telegram
              </p>
            </div>
            <span className="text-2xl">📨</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={telegramDraft()}
              target="_blank"
              rel="noreferrer"
              className="press rounded-full px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: accent }}
            >
              Open Telegram chat
            </a>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            Telegram: <span style={{ color: "var(--text)" }}>{SELLER.telegramHandle}</span>
          </p>
        </Card>

        <Card className={cn("mt-4 !py-4", shake && "wiggle")} style={{ borderColor: hexToRgba(accent, 0.32) }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                Already paid? Unlock now
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Enter the <b>ID</b> and <b>PASS</b> Harsh sent you below.
              </p>
            </div>
            <span className="text-2xl">🔓</span>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <input
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              placeholder="Member ID"
              className="h-12 rounded-2xl border px-4 text-[15px] outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--line)", color: "var(--text)" }}
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Access PASS"
              className="h-12 rounded-2xl border px-4 text-[15px] outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--line)", color: "var(--text)" }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={tryUnlock}
              className="press rounded-full px-5 py-3 text-sm font-semibold text-white"
              style={{ background: accent }}
            >
              Unlock premium
            </button>
            <button
              onClick={() => setShowHelp((s) => !s)}
              className="press rounded-full border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: "var(--line)" }}
            >
              {showHelp ? "Hide format" : "See code format"}
            </button>
          </div>
          {showHelp && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Example format: Member ID = your Telegram username or any buyer ID sent by Harsh. PASS
              looks like <span style={{ color: "var(--text)" }}>MHP-L-LIFE-XXXXXXXXXXXX</span> or
              <span style={{ color: "var(--text)" }}> MHP-M-YYYYMMDD-XXXXXXXXXXXX</span>.
            </p>
          )}
        </Card>

        {premium && (
          <Card className="mt-4 !py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
              Current status
            </p>
            <p className="mt-2 text-sm font-semibold">
              {premiumActive(premium) ? "Premium active" : "Premium expired"}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {formatExpiry(premium)} · {premium.tier === "lifetime" ? "Lifetime" : "Monthly"}
            </p>
            <button
              onClick={onReset}
              className="press mt-3 rounded-full border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: "var(--line)" }}
            >
              Reset saved license
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
