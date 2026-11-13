"use client";

import { useMemo, useState } from "react";

type EscrowState = "Shielded & Locked" | "AI Oracle Auditing" | "Verified & Disbursed";

export default function HomePage() {
  const [state, setState] = useState<EscrowState>("Shielded & Locked");
  const [events, setEvents] = useState<string[]>(["Demo vault initialized", "Funds represented in local simulation"]);
  const [evidence, setEvidence] = useState("");
  const isReleased = state === "Verified & Disbursed";
  const statusTone = useMemo(() => isReleased ? "text-emerald-300" : state === "AI Oracle Auditing" ? "text-sky-300" : "text-[#F4B728]", [isReleased, state]);

  function addEvent(message: string) {
    setEvents((current) => [new Date().toLocaleTimeString(), message].map((item, index) => index === 0 ? item : item).concat(current).slice(0, 7));
  }

  function audit() {
    if (!evidence.trim()) return;
    setState("AI Oracle Auditing");
    addEvent("Milestone submitted for advisory review");
    window.setTimeout(() => {
      setState("Shielded & Locked");
      addEvent("Demo oracle assessment completed: human authorization required");
    }, 900);
  }

  function release() {
    if (state === "AI Oracle Auditing") return;
    setState("Verified & Disbursed");
    addEvent("Demo release explicitly authorized by user");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-10">
      <header className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#F4B728]/40 bg-[#F4B728]/10 text-lg font-black text-[#F4B728]">S</div>
          <div><p className="font-semibold tracking-wide">SENTINEL-Z</p><p className="text-xs text-slate-500">PRIVATE BY DESIGN · DEMO NETWORK</p></div>
        </div>
        <span className="rounded-full border border-[#F4B728]/30 px-3 py-1 text-xs text-[#F4B728]">HACKATHON PREVIEW</span>
      </header>

      <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[.28em] text-[#F4B728]">SHIELDED ESCROW PROTOCOL</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">Trust the work.<br/><span className="text-[#F4B728]">Protect the value.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">Milestone-based payments with privacy-preserving settlement and an AI-assisted review layer. Your funds stay under explicit escrow authorization—not an AI decision.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#vault" className="rounded-xl bg-[#F4B728] px-5 py-3 font-semibold text-black transition hover:bg-amber-300">Open demo vault <span aria-hidden>↗</span></a>
            <a href="https://z.cash/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-5 py-3 text-slate-200 hover:bg-white/5">Explore Zcash</a>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div><p className="text-2xl font-semibold">01</p><p className="mt-1 text-xs text-slate-500">Shielded escrow</p></div>
            <div><p className="text-2xl font-semibold">02</p><p className="mt-1 text-xs text-slate-500">AI review</p></div>
            <div><p className="text-2xl font-semibold">03</p><p className="mt-1 text-xs text-slate-500">Human release</p></div>
          </div>
        </div>

        <section id="vault" className="rounded-3xl border border-white/10 bg-[#10141D]/90 p-5 shadow-glow md:p-7">
          <div className="flex items-center justify-between">
            <div><p className="text-xs tracking-[.2em] text-slate-500">ESCROW COMMAND CENTER</p><h2 className="mt-1 text-xl font-semibold">Vault 001</h2></div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] tracking-wider text-emerald-300">SIMULATED</span>
          </div>
          <div className="relative my-8 grid aspect-[1.35] place-items-center overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(circle,rgba(244,183,40,.12),transparent_55%),#090c12]">
            <div className={`absolute h-52 w-52 rounded-full border border-[#F4B728]/30 ${state === "AI Oracle Auditing" ? "animate-spin border-t-sky-300" : "animate-pulse"}`}/>
            <div className="absolute h-40 w-40 rounded-full border border-[#F4B728]/20"/>
            <div className="relative grid h-28 w-28 place-items-center rounded-3xl border border-[#F4B728]/50 bg-[#F4B728]/10 shadow-[0_0_55px_rgba(244,183,40,.18)]">
              <span className="text-5xl text-[#F4B728]">{isReleased ? "✓" : state === "AI Oracle Auditing" ? "⌁" : "⬡"}</span>
            </div>
            <p className="absolute bottom-5 text-[10px] tracking-[.24em] text-slate-500">ORCHARD-READY ADAPTER · DEMO ONLY</p>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div><p className="text-xs text-slate-500">VAULT STATUS</p><p className={`mt-1 font-semibold ${statusTone}`}>{state}</p></div>
            <div className="text-right"><p className="text-xs text-slate-500">DEMO BALANCE</p><p className="mt-1 text-xl font-semibold">0.25 ZEC</p></div>
          </div>
          <label htmlFor="evidence" className="mt-5 block text-xs font-medium text-slate-400">MILESTONE EVIDENCE / DELIVERABLE SUMMARY</label>
          <textarea id="evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Describe the milestone delivered…" className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#F4B728]/50"/>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={audit} disabled={!evidence.trim() || state === "AI Oracle Auditing" || isReleased} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Submit for AI review</button>
            <button onClick={release} disabled={state === "AI Oracle Auditing" || isReleased} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Authorize demo release</button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">This prototype does not move cryptocurrency. AI review is illustrative and never authorizes a real payment.</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-slate-400">ACTIVITY LOG</p>
            <ul className="space-y-2">{events.slice(0,5).map((event, index) => <li key={index} className="flex gap-2 text-xs text-slate-500"><span className="text-[#F4B728]">•</span>{event}</li>)}</ul>
          </div>
        </section>
      </section>
      <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-600">Sentinel-Z · Privacy-first escrow research prototype · No real funds are held or transferred</footer>
    </main>
  );
}
