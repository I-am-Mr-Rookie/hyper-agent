"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";

interface ImportResult {
  source?: string;
  sourceCodeImported?: boolean;
  partial?: boolean;
  submissions?: Array<{ platformSubmissionId: string; verdict: string; problemName: string; rating: number | null; tags: string[] }>;
  profile?: { handle?: string; rating?: number; rank?: string };
  error?: string;
}

export function CodeforcesImport() {
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/codeforces/import?handle=${encodeURIComponent(handle)}&limit=100`);
      const payload = (await response.json()) as ImportResult;
      setResult(payload);
    } catch {
      setResult({ error: "The local app could not reach Codeforces. Try again when network access is available." });
    } finally {
      setLoading(false);
    }
  }

  const accepted = result?.submissions?.filter((submission) => submission.verdict === "OK").length ?? 0;

  return (
    <div className="import-panel">
      <div className="eyebrow"><span className="pulse" /> Official API import</div>
      <h2>Bring your Codeforces signal.</h2>
      <p>We import public metadata only—never pretend the official API includes source code.</p>
      <form className="import-form" onSubmit={submit}>
        <label htmlFor="cf-handle">Codeforces handle</label>
        <div className="input-row">
          <input id="cf-handle" value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="e.g. your_handle" minLength={3} required />
          <button disabled={loading} type="submit">
            {loading ? <LoaderCircle className="spin" size={18} /> : <>Import <ArrowRight size={17} /></>}
          </button>
        </div>
      </form>
      {result?.error && <div className="result error-result"><ShieldAlert size={18} /><span>{result.error}</span></div>}
      {result?.submissions && (
        <div className="result success-result">
          <CheckCircle2 size={19} />
          <div>
            <strong>{result.profile?.handle ?? handle}: {accepted} accepted in this {result.partial ? "partial" : "sampled"} import</strong>
            <span>{result.submissions.length} submissions normalized · source code not imported</span>
          </div>
        </div>
      )}
    </div>
  );
}
