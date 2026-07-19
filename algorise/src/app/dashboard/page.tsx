import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, BrainCircuit, CalendarDays, CheckCircle2, CircleDashed, Code2, Compass, Flame, GitBranch, Radar, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { CodeforcesImport } from "@/components/CodeforcesImport";
import { Logo } from "@/components/Logo";
import { PairingCard } from "@/components/PairingCard";

const topics = [
  { name: "Implementation", score: 82, state: "strong" },
  { name: "Math", score: 61, state: "steady" },
  { name: "Binary search", score: 48, state: "steady" },
  { name: "Graphs", score: 12, state: "gap" },
  { name: "Dynamic programming", score: 18, state: "gap" },
];

const week = [
  { day: "MON", title: "Graph representation", detail: "Read + 2 warm-ups", done: true },
  { day: "TUE", title: "BFS fundamentals", detail: "Module + 3 drills", active: true },
  { day: "WED", title: "DFS and components", detail: "Module + 3 drills" },
  { day: "THU", title: "Mixed review", detail: "2 weak-topic + 1 stretch" },
];

export default function DashboardPage() {
  return (
    <main className="workspace-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          <Link className="active" href="/dashboard"><Radar size={18} /> Overview</Link>
          <a href="#roadmap"><Compass size={18} /> Roadmap</a>
          <a href="#import"><Code2 size={18} /> Import</a>
          <a href="#companion"><ShieldCheck size={18} /> Companion</a>
        </nav>
        <div className="sidebar-project"><span>Sprint Zero</span><strong>Local workspace</strong><small>5 foundations · 3 blockers</small><div><i style={{ width: "72%" }} /></div></div>
        <Link className="back-home" href="/"><ArrowLeft size={16} /> Product home</Link>
      </aside>

      <section className="workspace-main">
        <header className="workspace-header"><div><span className="kicker">Sample learner · demo data</span><h1>Good evening, founder.</h1><p>Here is the evidence-backed route this Sprint Zero scaffold can support.</p></div><div className="header-actions"><button className="icon-button" title="Repository"><GitBranch size={18} /></button><span className="local-chip"><i /> LOCAL</span></div></header>

        <div className="metric-grid">
          <article className="metric hero-metric"><div className="metric-icon cyan"><Trophy size={20} /></div><span>Internal level</span><strong>620</strong><small>Beginner band · demo</small><div className="mini-progress"><i style={{ width: "62%" }} /></div></article>
          <article className="metric"><div className="metric-icon lime"><Flame size={20} /></div><span>Current streak</span><strong>7 <em>days</em></strong><small>2 freeze tokens remain</small></article>
          <article className="metric"><div className="metric-icon violet"><Target size={20} /></div><span>Weekly plan</span><strong>5 <em>/ 12</em></strong><small>42% complete</small></article>
          <article className="metric"><div className="metric-icon amber"><BrainCircuit size={20} /></div><span>Evidence confidence</span><strong>76<em>%</em></strong><small>Metadata-only profile</small></article>
        </div>

        <div className="dashboard-grid">
          <section className="panel radar-panel">
            <div className="panel-heading"><div><span className="kicker">Deterministic analytics</span><h2>Skill Radar</h2></div><span className="method-chip">NO AI SCORING</span></div>
            <div className="topic-list">
              {topics.map((topic) => <div className="topic-row" key={topic.name}><span>{topic.name}</span><div><i className={topic.state} style={{ width: `${topic.score}%` }} /></div><strong className={topic.state}>{topic.score}</strong></div>)}
            </div>
            <div className="radar-insight"><Sparkles size={19} /><div><strong>Highest-leverage gap</strong><span>Graph fundamentals unlock shortest paths, trees, and a large 1200–1500 problem band.</span></div><button>View evidence <ArrowUpRight size={15} /></button></div>
          </section>

          <section className="panel coach-panel">
            <div className="panel-heading"><div><span className="kicker">Coach report preview</span><h2>Your pattern</h2></div><BrainCircuit size={24} /></div>
            <blockquote>“Fast on implementation once the pattern is visible; coverage, not syntax, is the current bottleneck.”</blockquote>
            <ul><li><span>01</span><div><strong>Strength</strong><p>Reliable first-try solves below 1000.</p></div></li><li><span>02</span><div><strong>Risk</strong><p>Repeated attempts cluster around unfamiliar graph tags.</p></div></li><li><span>03</span><div><strong>Next move</strong><p>Four focused graph sessions before adding harder mixed sets.</p></div></li></ul>
            <small>Preview text is illustrative. Production reports must cite imported data points.</small>
          </section>
        </div>

        <section className="panel roadmap-panel" id="roadmap">
          <div className="panel-heading"><div><span className="kicker">Personal route</span><h2>This week, with intent</h2></div><button className="secondary-button"><CalendarDays size={17} /> Asia/Dhaka</button></div>
          <div className="week-grid">{week.map((item) => <article key={item.day} className={item.active ? "active" : item.done ? "done" : ""}><span>{item.day}</span>{item.done ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}<strong>{item.title}</strong><small>{item.detail}</small></article>)}</div>
        </section>

        <section id="import" className="import-grid"><CodeforcesImport /><div className="import-aside"><div className="aside-top"><BookOpen size={22} /><span>What comes next</span></div><h3>Metadata builds the radar.<br />Your own code sharpens the coach.</h3><p>The official Codeforces API never exposes submission source. Use the consent-first extension only for your own signed-in account.</p><a href="#companion">Pair Import Companion <ArrowUpRight size={15} /></a></div></section>

        <section id="companion"><PairingCard /></section>

        <footer className="workspace-footer"><span><i /> Local system scaffold</span><span>Verdict integrity: sandbox only</span><span>Third-party problems: link-out only</span></footer>
      </section>
    </main>
  );
}
