"use client";

import { useEffect, useState } from "react";
import { color, font, buttonStyle, Crown } from "@crownx-jewel/shared-design";
import {
  passkeysSupported,
  platformAuthenticatorAvailable,
  loginWithPasskey,
  registerPasskey,
  loginWithPassword,
  registerWithPassword,
  persistSession,
  type AuthResult
} from "../../lib/webauthn";

type Phase = "idle" | "scanning" | "verifying" | "success" | "fail";

export function BiometricLogin() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("Tap to authenticate with your passkey");
  const [user, setUser] = useState<string>("");
  const [showFallback, setShowFallback] = useState(false);
  const [canBiometric, setCanBiometric] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    platformAuthenticatorAvailable().then((ok) => {
      setCanBiometric(ok);
      if (!ok) {
        setShowFallback(true);
        setStatus("Passkeys unavailable on this device — use email & password");
      }
    });
  }, []);

  const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
  function onSuccess(res: AuthResult) {
    persistSession(res.accessToken);
    setUser(res.user.email);
    setPhase("success");
    // sign-up acceptance: record the user's agreement to the active terms bundle
    // (anchored audit trail). Non-blocking; the verified identity binds the signature.
    fetch(`${GATEWAY}/api/terms/accept`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: res.user.email, method: "passkey" }) }).catch(() => undefined);
  }

  async function runPasskey() {
    if (busy) return;
    if (!passkeysSupported()) {
      setShowFallback(true);
      return;
    }
    if (!email.includes("@")) {
      setStatus("Enter your email to use a passkey");
      setShowFallback(true);
      return;
    }
    setBusy(true);
    setPhase("scanning");
    setStatus("Scanning biometric…");
    if (navigator.vibrate) navigator.vibrate(12);
    try {
      setTimeout(() => setPhase((p) => (p === "scanning" ? "verifying" : p)), 600);
      // log in with an existing passkey; first-time users create one on the spot
      let res: AuthResult;
      try {
        res = await loginWithPasskey(email);
      } catch {
        res = await registerPasskey(email, email);
      }
      setStatus("✓ Authenticated");
      onSuccess(res);
      if (navigator.vibrate) navigator.vibrate([12, 40, 28]);
    } catch {
      // backend route missing OR user has no passkey yet -> graceful fallback
      setPhase("fail");
      setStatus("Couldn't verify a passkey — sign in below to continue");
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => {
        setPhase("idle");
        setStatus("Tap to authenticate with your passkey");
        setShowFallback(true);
      }, 1400);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ color: color.win, fontSize: 34 }}>✓</div>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 32, margin: "8px 0 0" }}>You&apos;re in.</h1>
        <div style={{ color: color.mut, fontSize: 13, marginTop: 6 }}>Welcome back{user ? `, ${user}` : ", collector"}.</div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(63,217,212,0.1)",
            border: "1px solid rgba(63,217,212,0.3)",
            fontFamily: font.mono,
            fontSize: 12,
            color: color.cyanHi,
            marginTop: 14
          }}
        >
          ♛ ASCENDANT · LV72
        </div>
        <div style={{ marginTop: 24 }}>
          <a href="/dashboard" style={{ ...buttonStyle("primary"), width: "100%" }}>Enter the Vault →</a>
        </div>
      </div>
    );
  }

  // `phase` is never "success" past the early return above.
  const orbBorder = phase === "fail" ? color.hot : phase === "idle" ? color.cyanDk : color.cyan;
  const orbGlow = phase === "scanning" || phase === "verifying";
  const face = phase === "fail" ? "✗" : phase === "scanning" || phase === "verifying" ? "🔍" : "🔒";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Crown size={40} />
      </div>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 30, margin: "10px 0 0" }}>Welcome to the Vault</h1>
      <div style={{ color: color.mut, fontSize: 13, marginTop: 6 }}>One tap. No passwords. Your device is your key.</div>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="you@email.com"
        autoComplete="email webauthn"
        style={{ width: "100%", marginTop: 18, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "12px 14px", borderRadius: 12, fontSize: 14, fontFamily: font.body, textAlign: "center" }}
      />

      {/* biometric orb */}
      <div
        onClick={runPasskey}
        style={{ margin: "34px auto 18px", width: 130, height: 130, position: "relative", cursor: canBiometric ? "pointer" : "not-allowed" }}
      >
        {orbGlow && (
          <span style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid transparent", borderTopColor: color.cyan, animation: "cx-spin 0.9s linear infinite" }} />
        )}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 50% 40%, rgba(63,217,212,0.2), rgba(63,217,212,0.04))",
            border: `2px solid ${orbBorder}`,
            boxShadow: orbGlow ? "0 0 40px rgba(63,217,212,0.5)" : "none",
            transition: ".3s",
            overflow: "hidden"
          }}
        >
          {orbGlow && (
            <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: `linear-gradient(90deg, transparent, ${color.cyanHi}, transparent)`, animation: "cx-scan 1.2s ease-in-out infinite" }} />
          )}
          <span style={{ fontSize: 54 }}>{face}</span>
        </div>
      </div>

      <div
        style={{
          fontFamily: font.mono,
          fontSize: 12,
          letterSpacing: "0.08em",
          minHeight: 18,
          marginBottom: 20,
          color: phase === "fail" ? color.hot : color.mut
        }}
      >
        {status}
      </div>

      {canBiometric && (
        <>
          <button onClick={runPasskey} disabled={busy} style={{ ...buttonStyle("primary"), width: "100%", marginBottom: 10 }}>
            🔐 Authenticate
          </button>
          <button onClick={() => setShowFallback((s) => !s)} style={{ ...buttonStyle("secondary"), width: "100%", fontSize: 13 }}>
            {showFallback ? "Hide" : "Use"} email & password
          </button>
        </>
      )}

      {showFallback && <FallbackForm onSuccess={onSuccess} />}

      <div style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut2, letterSpacing: "0.04em", marginTop: 14, lineHeight: 1.6 }}>
        By creating an account you sign and accept the CrownX{" "}
        <a href="/terms" style={{ color: color.cyan }}>Terms &amp; Agreements</a> — smart contracts, data &amp; AI-modeling consent, authenticity-risk disclosure, and the Royalty Vault. Your acceptance is anchored on-chain.
      </div>

      <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, letterSpacing: "0.06em", marginTop: 22, lineHeight: 1.7, textAlign: "left" }}>
        <span style={{ color: color.cyan }}>WebAuthn / FIDO2 passkeys</span> — biometric never leaves the device.
        <br />
        <span style={{ color: color.cyan }}>Zero-knowledge</span> — the server stores a public key, never your face or fingerprint.
        <br />
        <span style={{ color: color.cyan }}>Phishing-resistant</span> — credentials are bound to the CrownX origin.
      </div>
    </div>
  );
}

function FallbackForm({ onSuccess }: { onSuccess: (r: AuthResult) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setMsg("");
    setPending(true);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const displayName = String(formData.get("displayName") || "");
    try {
      const res =
        mode === "login"
          ? await loginWithPassword(email, password)
          : await registerWithPassword(email, displayName, password);
      onSuccess(res);
    } catch (err) {
      setMsg(`Error: ${(err as Error).message}`);
    } finally {
      setPending(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    color: color.txt,
    border: `1px solid ${color.line2}`,
    padding: "12px 14px",
    borderRadius: 12,
    fontSize: 14,
    fontFamily: font.body
  };

  return (
    <form action={submit} style={{ display: "grid", gap: 10, marginTop: 18, textAlign: "left" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "9px",
              borderRadius: 10,
              border: `1px solid ${mode === m ? color.cyan : color.line}`,
              background: mode === m ? "rgba(63,217,212,0.08)" : "transparent",
              color: mode === m ? color.cyanHi : color.mut,
              fontFamily: font.mono,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer"
            }}
          >
            {m === "login" ? "Returning" : "New collector"}
          </button>
        ))}
      </div>
      {mode === "register" && <input name="displayName" placeholder="display name" required style={input} />}
      <input name="email" type="email" placeholder="you@email.com" required style={input} autoComplete="email" />
      <input name="password" type="password" placeholder={mode === "register" ? "password (min 8)" : "password"} required minLength={mode === "register" ? 8 : undefined} style={input} autoComplete={mode === "register" ? "new-password" : "current-password"} />
      <button type="submit" disabled={pending} style={{ ...buttonStyle("primary"), width: "100%" }}>
        {pending ? "…" : mode === "login" ? "Log in" : "Create my Vault"}
      </button>
      {msg && <div style={{ fontFamily: font.mono, fontSize: 11, color: color.hot }}>{msg}</div>}
      {/* demo-account helper — passkeys can't run in a sandboxed preview, so this
          gives a one-tap email/password sign-in for the seeded demo users */}
      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, lineHeight: 1.7, marginTop: 4 }}>
        Demo accounts: <span style={{ color: color.cyanHi }}>henry@crownx.ai</span> · raul@crownx.ai · eric@crownx.ai
        <br />Password: <span style={{ color: color.cyanHi }}>CrownXDemo!2026</span>
        <button
          type="button"
          onClick={(e) => {
            const f = (e.currentTarget.closest("form") as HTMLFormElement | null);
            if (f) {
              const em = f.elements.namedItem("email") as HTMLInputElement | null;
              const pw = f.elements.namedItem("password") as HTMLInputElement | null;
              if (em) em.value = "henry@crownx.ai";
              if (pw) pw.value = "CrownXDemo!2026";
            }
            setMode("login");
          }}
          style={{ display: "block", marginTop: 6, ...buttonStyle("secondary"), fontSize: 11, padding: "7px 12px" }}
        >
          ⚡ Fill demo account (henry)
        </button>
      </div>
    </form>
  );
}
