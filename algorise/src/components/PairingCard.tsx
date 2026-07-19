"use client";

import { useState } from "react";
import { Copy, KeyRound, LoaderCircle } from "lucide-react";

export function PairingCard() {
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Generate a one-time code, then paste it into the unpacked extension.");

  async function createCode() {
    setLoading(true);
    try {
      const response = await fetch("/api/import/extension/pair", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create pairing code");
      setCode(result.pairingCode);
      setExpiresAt(result.expiresAt);
      setMessage(result.localDemo ? "Local demo pairing code—replace demo auth before deployment." : "Pairing code ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create pairing code");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setMessage("Copied. This code can be exchanged only once.");
  }

  return (
    <div className="pair-card">
      <div className="pair-icon"><KeyRound size={20} /></div>
      <div className="pair-copy">
        <span className="kicker">Import Companion</span>
        <h3>Pair a private browser session</h3>
        <p>{message}</p>
        {expiresAt && <small>Expires {new Date(expiresAt).toLocaleTimeString()}</small>}
      </div>
      {code ? (
        <button className="pair-code" onClick={copyCode} type="button"><code>{code}</code><Copy size={16} /></button>
      ) : (
        <button className="secondary-button" onClick={createCode} disabled={loading} type="button">
          {loading ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Generate code
        </button>
      )}
    </div>
  );
}
