import Link from "next/link";
import { ArrowRight, BrainCircuit, ChartNoAxesCombined, Check, Code2, Compass, Gauge, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { Logo } from "@/components/Logo";

const loop = [
  { step: "01", title: "Diagnose", copy: "Import your Codeforces history or start with a short placement path.", icon: ChartNoAxesCombined },
  { step: "02", title: "Plan", copy: "A deterministic Skill Radar turns gaps into a seven-day route.", icon: Compass },
  { step: "03", title: "Practice", copy: "Solve original, rights-cleared problems without leaving the platform.", icon: Code2 },
  { step: "04", title: "Improve", copy: "Machine verdicts stay authoritative; AI explains the evidence.", icon: BrainCircuit },
];

const safeguards = [
  "LLMs never assign verdicts",
  "Original or rights-cleared judge content only",
  "Model credentials stay server-side",
  "Imported source remains private and revocable",
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <nav className="topbar">
        <Logo />
        <div className="nav-links"><a href="#loop">How it works</a><a href="#integrity">Integrity</a><Link href="/dashboard">Local demo</Link></div>
        <Link className="nav-cta" href="/dashboard">Open workspace <ArrowRight size={16} /></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="announcement"><Sparkles size={15} /> Sprint Zero · local-first build</div>
          <h1>Competitive programming,<br /><em>with direction.</em></h1>
          <p>AlgoRise turns scattered submissions into a visible skill map, a personal training route, and a practice loop that rewards real progress—not empty activity.</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/dashboard">Explore the local demo <ArrowRight size={18} /></Link>
            <a className="text-button" href="#loop">See the learning loop</a>
          </div>
          <div className="trust-row"><ShieldCheck size={18} /><span>Evidence-backed coaching</span><i /><TerminalSquare size={18} /><span>Machine-verified verdicts</span></div>
        </div>

        <figure className="hero-console" aria-label="AlgoRise dashboard preview">
          <div className="console-bar"><span /><span /><span /><code>learner / trajectory</code><b>DEMO DATA</b></div>
          <div className="console-grid">
            <div className="trajectory-card">
              <div className="card-label">Current trajectory</div>
              <div className="rating-line"><strong>1,204</strong><span>Pupil band</span></div>
              <svg viewBox="0 0 520 170" role="img" aria-label="Sample rating trajectory">
                <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#74e7ff" stopOpacity=".38"/><stop offset="1" stopColor="#74e7ff" stopOpacity="0"/></linearGradient></defs>
                <path className="grid-line" d="M0 30H520M0 85H520M0 140H520" />
                <path className="area" d="M0 150 C65 135 76 122 125 126 S198 101 240 105 S315 71 355 78 S430 31 520 38 L520 170 L0 170Z" />
                <path className="line" d="M0 150 C65 135 76 122 125 126 S198 101 240 105 S315 71 355 78 S430 31 520 38" />
                <circle cx="520" cy="38" r="5" />
              </svg>
              <div className="trajectory-foot"><span>Last 12 contests</span><b>+184</b></div>
            </div>
            <div className="focus-card">
              <div className="card-label">Next best move</div>
              <Gauge size={28} />
              <strong>Graph traversal foundations</strong>
              <p>Your sample record shows breadth in implementation, but no graph coverage yet.</p>
              <div className="focus-meta"><span>7-day route</span><b>+220 XP</b></div>
            </div>
            <div className="radar-mini">
              <div><span>Implementation</span><strong>82</strong></div><div><span>Math</span><strong>61</strong></div><div><span>Graphs</span><strong className="warn">12</strong></div><div><span>DP</span><strong className="warn">18</strong></div>
            </div>
          </div>
        </figure>
      </section>

      <section className="loop-section" id="loop">
        <div className="section-heading"><span className="kicker">The closed learning loop</span><h2>Every action has a reason.<br />Every reward has evidence.</h2></div>
        <div className="loop-grid">
          {loop.map(({ step, title, copy, icon: Icon }) => (
            <article key={step}><span className="step">{step}</span><Icon size={26} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section className="integrity-section" id="integrity">
        <div>
          <span className="kicker">Integrity by architecture</span>
          <h2>AI coaches.<br />The sandbox decides.</h2>
          <p>The most important boundary is also the simplest: a language model can explain a failing case, but only validated tests and sandboxed execution determine the verdict.</p>
        </div>
        <div className="integrity-card">
          <div className="integrity-top"><ShieldCheck size={24} /><strong>Frozen safeguards</strong><span>ENFORCED</span></div>
          <ul>{safeguards.map((item) => <li key={item}><Check size={17} />{item}</li>)}</ul>
        </div>
      </section>

      <footer><Logo /><p>Built for a two-founder team. Local first, honest by default.</p><Link href="/dashboard">Launch demo <ArrowRight size={15} /></Link></footer>
    </main>
  );
}
