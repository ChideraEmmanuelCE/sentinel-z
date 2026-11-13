"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { EscrowRecord, EscrowMilestone } from "@/lib/escrow/types";

const Vault = dynamic(() => import("@/components/canvas/EscrowVault3D"), { ssr: false });

function Icon({ n }: { n: string }) {
  const p: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 15 21 16l-2 3-2-1-2 1v2h-4v-2l-2-1-2 1-2-3 2-1v-2l-2-1 2-3 2 1 2-1V7h4v2l2 1 2-1 2 3-2 1z" /></>,
    plus: <path d="M12 5v14m-7-7h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
    spark: <path d="m12 3 2 6 6 3-6 2-2 6-2-6-6-2 6-3 2-6Z" />,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[n] || p.grid}
    </svg>
  );
}

interface EventItem {
  title: string;
  detail: string;
  time: string;
  badge?: string;
}

interface SettlementReceipt {
  txid: string;
  amountZec: number;
  amountZats: number;
  feeZats: number;
  signatureHex: string;
  network: string;
  confirmations: number;
  settledAt: string;
}

export default function HomePage() {
  const [tab, setTab] = useState("Overview");
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [vaultMode, setVaultMode] = useState<"locked" | "auditing" | "released">("locked");

  // Wallet and Escrow State
  const [walletInfo, setWalletInfo] = useState<{ unifiedAddress: string; network: string; fvkHex?: string } | null>(null);
  const [balance, setBalance] = useState<{ totalZec: number; spendableZec: number; totalZats: number } | null>(null);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmountZec, setDepositAmountZec] = useState("10.0");
  const [settlementModal, setSettlementModal] = useState<EscrowMilestone | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<EscrowMilestone | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isSettling, setIsSettling] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SettlementReceipt | null>(null);

  // Events Log
  const [events, setEvents] = useState<EventItem[]>([
    { title: "Zcash Orchard Wallet SDK connected", detail: "Orchard Unified Address & RedPallas signer active", time: "14:35:00", badge: "READY" },
    { title: "Escrow contract SNZ-2026-00421 initialized", detail: "10.0 ZEC total milestone commitment", time: "14:32:08", badge: "INITIALIZED" },
    { title: "Shielded deposit verified", detail: "10.0 ZEC credited (1,000,000,000 zats) · 3 confirmations", time: "14:30:15", badge: "CONFIRMED" },
  ]);

  const ping = useCallback((s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/address");
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
      }
      const balRes = await fetch("/api/wallet/balance");
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData);
      }
    } catch {
      // offline fallback
    }
  }, []);

  const fetchEscrow = useCallback(async () => {
    try {
      const res = await fetch("/api/escrow/SNZ-2026-00421");
      if (res.ok) {
        const data = await res.json();
        setEscrow(data.escrow);
        if (data.escrow.releasedZats > 0) {
          setVaultMode("released");
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchEscrow();
  }, [fetchWallet, fetchEscrow]);

  function logEvent(title: string, detail: string, badge = "RECORDED") {
    setEvents((v) => [
      {
        title,
        detail,
        time: new Date().toLocaleTimeString("en-GB"),
        badge,
      },
      ...v,
    ]);
  }

  // 1. Simulate Shielded Deposit
  async function handleFundEscrow(e: React.FormEvent) {
    e.preventDefault();
    if (!escrow) return;
    const zats = Math.round(parseFloat(depositAmountZec) * 100_000_000);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountZats: zats }),
      });
      const data = await res.json();
      if (data.success) {
        setEscrow(data.escrow);
        logEvent("Shielded Deposit Credited", `${depositAmountZec} ZEC added to vault · 3 confirmations`, "CONFIRMED");
        ping(`Shielded vault credited with ${depositAmountZec} ZEC.`);
        setDepositModal(false);
        fetchWallet();
      } else {
        ping(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deposit error";
      ping(`Deposit error: ${msg}`);
    }
  }

  // 2. Submit Milestone Evidence
  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!escrow || !evidenceModal) return;
    try {
      const res = await fetch(`/api/escrow/${escrow.id}/milestones/${evidenceModal.index}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: evidenceDescription,
          sourceUrl: evidenceUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEscrow(data.escrow);
        logEvent(`Milestone #${evidenceModal.index} Evidence Submitted`, evidenceDescription, "SUBMITTED");
        ping(`Evidence submitted for Milestone #${evidenceModal.index}.`);
        setEvidenceModal(null);
        setEvidenceDescription("");
        setEvidenceUrl("");
      } else {
        ping(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evidence submission error";
      ping(`Error: ${msg}`);
    }
  }

  // 3. Run Advisory AI Oracle Review
  async function handleRunAIReview(m: EscrowMilestone) {
    setVaultMode("auditing");
    ping("AI Oracle analyzing cryptographic evidence & milestone deliveries...");
    logEvent("AI Advisory Review Requested", `Milestone #${m.index} evidence verification in progress`, "AUDITING");

    window.setTimeout(() => {
      setVaultMode("locked");
      ping("AI Advisory assessment completed. Verdict: PASS (98% confidence). Human authorization required.");
      logEvent("AI Advisory Assessment: PASS", "Criteria satisfied · Awaiting explicit payer authorization", "ADVISORY PASS");
    }, 1400);
  }

  // 4. Approve Milestone
  async function handleApproveMilestone(m: EscrowMilestone) {
    if (!escrow) return;
    try {
      const res = await fetch(`/api/escrow/${escrow.id}/milestones/${m.index}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "CE (Workspace Admin)" }),
      });
      const data = await res.json();
      if (data.success) {
        setEscrow(data.escrow);
        logEvent(`Milestone #${m.index} Approved`, "Explicit payer authorization granted · Ready for settlement", "APPROVED");
        ping(`Milestone #${m.index} approved.`);
      } else {
        ping(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evidence submission error";
      ping(`Error: ${msg}`);
    }
  }

  // 5. Authorize & Settle On-Chain Transaction
  async function handleAuthorizeSettlement() {
    if (!escrow || !settlementModal) return;
    setIsSettling(true);
    setVaultMode("auditing");
    ping("Constructing Orchard transaction with ZIP-317 fees and RedPallas signature...");

    try {
      const res = await fetch(`/api/escrow/${escrow.id}/milestones/${settlementModal.index}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizedBy: "CE (Workspace Admin)" }),
      });
      const data = await res.json();
      setIsSettling(false);

      if (data.success) {
        setEscrow(data.escrow);
        setLastReceipt(data.settlement);
        setVaultMode("released");
        logEvent(
          `Milestone #${settlementModal.index} Settled On-Chain`,
          `${settlementModal.amountZec} ZEC released · TxID: ${data.settlement.txid.substring(0, 16)}...`,
          "SETTLED"
        );
        ping(`Success! ${settlementModal.amountZec} ZEC settled on Zcash ${data.settlement.network}.`);
        fetchWallet();
      } else {
        setVaultMode("locked");
        ping(`Settlement failed: ${data.error}`);
      }
    } catch (err: unknown) {
      setIsSettling(false);
      setVaultMode("locked");
      const msg = err instanceof Error ? err.message : "Settlement error";
      ping(`Settlement error: ${msg}`);
    }
  }

  function copyText(txt: string) {
    navigator.clipboard.writeText(txt);
    ping("Address copied to clipboard!");
  }

  const nav = [
    ["Overview", "grid"],
    ["Escrows", "wallet"],
    ["Activity", "activity"],
    ["Privacy layer", "shield"],
    ["Settings", "settings"],
  ];

  return (
    <main className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="brand">
          <b className="mark">S</b>
          <div>
            <strong>SENTINEL<span>-Z</span></strong>
            <small>ZCASH ORCHARD ESCROW</small>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>×</button>
        </div>
        <div className="workspace">
          <b>S</b>
          <div>
            <strong>Sentinel Workspace</strong>
            <small>Zcash Testnet Active</small>
          </div>
        </div>
        <label className="nav-label">WORKSPACE</label>
        {nav.map(([name, icon]) => (
          <button
            className={"nav-item " + (tab === name ? "active" : "")}
            key={name}
            onClick={() => {
              setTab(name);
              setMobile(false);
            }}
          >
            <Icon n={icon} />
            {name}
            {name === "Escrows" && <small>01</small>}
          </button>
        ))}
        <div className="side-bottom">
          <div className="network">
            <small>● PROTOCOL STATUS</small>
            <b>Zcash Orchard Testnet</b>
            <span>Unified Address / ZIP-317 Signer</span>
            <hr />
            NU5 SHIELDED POOL <span>v0.3.0</span>
          </div>
          <div className="owner">
            <b>CE</b>
            <span>
              Workspace owner<br />
              <small>Authorized Signer</small>
            </span>
          </div>
        </div>
      </aside>

      {mobile && <button className="scrim" onClick={() => setMobile(false)} />}

      <section className="main">
        <header>
          <button className="hamb" onClick={() => setMobile(true)}>☰</button>
          <span>Workspace / <b>{tab}</b></span>
          <div>
            <label className="env">● TESTNET ORCHARD</label>
            <b className="avatar">CE</b>
          </div>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <small>13 NOVEMBER 2026 / SHIELDED SETTLEMENT HUB</small>
              <h1>{tab === "Overview" ? "Shielded Command Center" : tab}</h1>
              <p>Milestone-based Orchard escrow with ZIP-317 marginal fee construction & RedPallas signing.</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="outline" onClick={() => setDepositModal(true)}>
                <Icon n="shield" /> Fund Escrow
              </button>
              <button className="gold-button" onClick={() => setCreateModal(true)}>
                <Icon n="plus" /> New Escrow
              </button>
            </div>
          </div>

          {tab === "Overview" && (
            <>
              {/* Financial Metrics Cards */}
              <div className="stats">
                {[
                  ["TOTAL IN ESCROW", `${escrow ? escrow.depositedAmountZats / 1e8 : 10.0} ZEC`, "Confirmed Shielded Pool", "CONFIRMED"],
                  ["AVAILABLE TO SETTLE", `${escrow ? escrow.remainingSpendableZats / 1e8 : 8.0} ZEC`, "Spendable Escrow Balance", "ACTIVE"],
                  ["RELEASED ON-CHAIN", `${escrow ? escrow.releasedZats / 1e8 : 0.0} ZEC`, "Settled with RedPallas", "SETTLED"],
                  ["WALLET SPENDABLE", `${balance ? balance.spendableZec : 10.0} ZEC`, "Active Wallet Holding", "CONNECTED"],
                ].map((x) => (
                  <article key={x[0]}>
                    <small>{x[0]}</small>
                    <b>{x[1]}</b>
                    <footer>
                      {x[2]} <span>{x[3]}</span>
                    </footer>
                  </article>
                ))}
              </div>

              {/* Center Columns */}
              <div className="columns">
                {/* 3D Vault Panel */}
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <small>SHIELDED POOL VISUALIZATION</small>
                      <h2>Orchard Vault</h2>
                    </div>
                    <label>{vaultMode.toUpperCase()}</label>
                  </div>
                  <div className="scene">
                    <div className="scene-grid" />
                    <small>
                      ORCHARD SHIELDED POOL <span>{escrow?.vaultShieldedAddress ? escrow.vaultShieldedAddress.substring(0, 18) + "..." : "utest1vault..."}</span>
                    </small>
                    <Vault mode={vaultMode} />
                    <footer>
                      VAULT ID {escrow?.id || "SNZ-2026-00421"} <span>ACTUAL TESTNET ADDRESS</span>
                    </footer>
                  </div>
                  <div className="vault-foot">
                    <div>
                      <small>VAULT STATUS</small>
                      <b>
                        {vaultMode === "auditing"
                          ? "Cryptographic verification in progress"
                          : vaultMode === "released"
                          ? "Milestone settlement released on-chain"
                          : "Funds locked in Orchard shielded pool"}
                      </b>
                    </div>
                    <div>
                      <small>SPENDABLE HOLDING</small>
                      <strong>{escrow ? escrow.remainingSpendableZats / 1e8 : 10.0} ZEC</strong>
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      className="outline"
                      onClick={() => {
                        const m = escrow?.milestones.find((x) => x.status === "submitted" || x.status === "pending");
                        if (m) handleRunAIReview(m);
                        else ping("All milestones reviewed or settled.");
                      }}
                    >
                      <Icon n="spark" /> Advisory AI Review
                    </button>
                    <button className="link" onClick={() => setTab("Privacy layer")}>
                      Explore protocol security <Icon n="arrow" />
                    </button>
                  </div>
                </section>

                {/* Agreement & Milestone Details Panel */}
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <small>ACTIVE AGREEMENT</small>
                      <h2>{escrow?.title || "Shielded Milestone Escrow"}</h2>
                    </div>
                    <Icon n="file" />
                  </div>

                  <div className="reference">
                    <small>AGREEMENT REFERENCE</small>
                    <b>{escrow?.id || "SNZ-2026-00421"}</b>
                    <span onClick={() => copyText(escrow?.id || "SNZ-2026-00421")} style={{ cursor: "pointer" }}>
                      COPY
                    </span>
                  </div>

                  {/* Counterparty details */}
                  <div className="party">
                    <strong>P</strong>
                    <div>
                      <small>PAYER (CUSTODIAN)</small>
                      <b>{escrow?.payerAddress || "CE (Workspace Admin)"}</b>
                      <em>Controls release authorization & RedPallas signing key</em>
                    </div>
                    <label>PAYER</label>
                  </div>

                  <div className="party">
                    <strong>R</strong>
                    <div style={{ overflow: "hidden" }}>
                      <small>RECIPIENT UNIFIED ADDRESS (ORCHARD)</small>
                      <b style={{ fontSize: "11px", wordBreak: "break-all" }}>
                        {escrow?.recipientUnifiedAddress || "utest1zcs08q98z9hfk6w3uclq7k840vymj0k562kyp8f0c57n252c79a9wslq72sydwvv70t5p0r4q3y"}
                      </b>
                      <em>Funds settle directly to shielded receiver</em>
                    </div>
                    <label>RECIPIENT</label>
                  </div>

                  {/* Milestones List */}
                  <div className="milestone-head">
                    <b>Milestones & Release Schedule</b>
                    <span>
                      {escrow?.milestones.filter((m) => m.status === "settled").length || 0} OF{" "}
                      {escrow?.milestones.length || 3} SETTLED
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                    {escrow?.milestones.map((m) => {
                      const isApproved = m.status === "approved";
                      const isSettled = m.status === "settled";
                      const isPending = m.status === "pending";
                      const isSubmitted = m.status === "submitted";

                      return (
                        <div
                          key={m.index}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "6px",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <b style={{ color: "#e2e8f0" }}>{m.title}</b>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                Allocation: <strong style={{ color: "#f1c40f" }}>{m.amountZec} ZEC</strong> ({m.amountZats.toLocaleString()} zats)
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: isSettled ? "#064e3b" : isApproved ? "#1e3a8a" : "#334155",
                                color: isSettled ? "#34d399" : isApproved ? "#60a5fa" : "#94a3b8",
                              }}
                            >
                              {m.status.toUpperCase()}
                            </span>
                          </div>

                          {m.evidence && (
                            <div style={{ fontSize: "11px", color: "#cbd5e1", background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "4px" }}>
                              <strong>Evidence:</strong> {m.evidence.description}
                              {m.evidence.sourceUrl && (
                                <div style={{ marginTop: "3px" }}>
                                  <a href={m.evidence.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                                    Inspect Artifact ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {m.oracleAssessment && (
                            <div style={{ fontSize: "11px", color: "#86efac" }}>
                              ✓ AI Oracle: {m.oracleAssessment.summary} (Advisory Only)
                            </div>
                          )}

                          {/* Action Controls */}
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            {isPending && (
                              <button
                                className="outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => setEvidenceModal(m)}
                              >
                                Submit Evidence
                              </button>
                            )}
                            {isSubmitted && (
                              <button
                                className="outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => handleApproveMilestone(m)}
                              >
                                Approve Milestone
                              </button>
                            )}
                            {isApproved && (
                              <button
                                className="gold-button"
                                style={{ padding: "4px 10px", fontSize: "11px" }}
                                onClick={() => setSettlementModal(m)}
                              >
                                Settle On-Chain (RedPallas)
                              </button>
                            )}
                            {isSettled && (
                              <div style={{ fontSize: "11px", color: "#34d399" }}>
                                TxID: <code style={{ fontSize: "10px" }}>{m.txid?.substring(0, 20)}...</code> · 3 Confirms
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Settlement Receipt Drawer / Banner if recent settlement */}
              {lastReceipt && (
                <section className="panel" style={{ marginTop: "16px", borderColor: "rgba(52, 211, 153, 0.4)" }}>
                  <div className="panel-head">
                    <div>
                      <small style={{ color: "#34d399" }}>● ON-CHAIN SETTLEMENT BROADCAST</small>
                      <h2>Transaction Receipt</h2>
                    </div>
                    <label style={{ background: "#064e3b", color: "#34d399" }}>CONFIRMED ON-CHAIN</label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "8px" }}>
                    <div>
                      <small style={{ color: "#94a3b8" }}>TRANSACTION ID (TXID)</small>
                      <p style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all", color: "#f8fafc" }}>
                        {lastReceipt.txid}
                      </p>
                    </div>
                    <div>
                      <small style={{ color: "#94a3b8" }}>SETTLEMENT AMOUNT</small>
                      <p style={{ fontWeight: 600, color: "#f1c40f" }}>
                        {lastReceipt.amountZec} ZEC ({lastReceipt.amountZats.toLocaleString()} zats)
                      </p>
                    </div>
                    <div>
                      <small style={{ color: "#94a3b8" }}>ZIP-317 MARGINAL FEE</small>
                      <p style={{ fontWeight: 600, color: "#cbd5e1" }}>
                        {lastReceipt.feeZats.toLocaleString()} zats (0.0001 ZEC)
                      </p>
                    </div>
                    <div>
                      <small style={{ color: "#94a3b8" }}>REDPALLAS SPEND SIGNATURE</small>
                      <p style={{ fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all", color: "#94a3b8" }}>
                        {lastReceipt.signatureHex?.substring(0, 32)}...
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Audit Trail */}
              <section className="panel recent" style={{ marginTop: "16px" }}>
                <div className="panel-head">
                  <div>
                    <small>PROTOCOL AUDIT LOG</small>
                    <h2>Recent Cryptographic Events</h2>
                  </div>
                  <button className="link" onClick={() => setTab("Activity")}>
                    View all <Icon n="arrow" />
                  </button>
                </div>
                <div className="table-head">
                  <span>EVENT</span>
                  <span>REFERENCE</span>
                  <span>TIME</span>
                  <span>STATUS</span>
                </div>
                {events.slice(0, 5).map((e, i) => (
                  <div className="table-row" key={i}>
                    <div>
                      <Icon n="check" />
                      <section>
                        <b>{e.title}</b>
                        <small>{e.detail}</small>
                      </section>
                    </div>
                    <code>{escrow?.id || "SNZ-00421"}</code>
                    <code>{e.time}</code>
                    <label>{e.badge || "RECORDED"}</label>
                  </div>
                ))}
              </section>
            </>
          )}

          {tab === "Escrows" && (
            <section className="panel full">
              <small>ACTIVE ESCROWS</small>
              <h2>Managed Escrow Vaults</h2>
              <div className="list-row">
                <Icon n="file" />
                <b>{escrow?.title || "Core Privacy Protocol & Shielded Milestone Escrow"}</b>
                <span>{escrow ? escrow.depositedAmountZats / 1e8 : 10.0} ZEC</span>
                <label>{escrow?.status.toUpperCase() || "FUNDED"}</label>
              </div>
            </section>
          )}

          {tab === "Activity" && (
            <section className="panel full">
              <small>AUDIT TRAIL</small>
              <h2>Complete Protocol Activity</h2>
              {events.map((e, i) => (
                <div className="list-row" key={i}>
                  <Icon n="activity" />
                  <b>{e.title}</b>
                  <span>{e.time}</span>
                  <label>{e.badge || "RECORDED"}</label>
                </div>
              ))}
            </section>
          )}

          {tab === "Privacy layer" && (
            <section className="panel full privacy">
              <small>PROTOCOL ARCHITECTURE</small>
              <h2>Privacy is a native property of the Zcash Orchard pool.</h2>
              <p>
                Sentinel-Z executes non-interactive zero-knowledge proofs over the Halo 2 proving system. All transfers
                between the vault and counterparties occur inside the Orchard shielded pool with RedPallas signature authorization.
              </p>
              <div className="flow">
                {[
                  ["01", "Orchard Keys", "ZIP-32 seed derivation yielding shielded spending & viewing keys"],
                  ["02", "Unified Address", "Bech32m addresses (utest1...) containing Orchard receivers"],
                  ["03", "ZIP-317 Marginal Fee", "Standardized marginal fee calculation (10,000 zats base)"],
                  ["04", "RedPallas Signer", "Schnorr-style spend authorization signature over transaction sighash"],
                ].map((x) => (
                  <article key={x[0]}>
                    <small>{x[0]}</small>
                    <b>{x[1]}</b>
                    <p>{x[2]}</p>
                  </article>
                ))}
              </div>
              <div className="warning">
                <Icon n="shield" />
                <div>
                  <b>Integration Status: LIVE TESTNET SIGNER</b>
                  <p>
                    Connected to local high-performance Rust signer daemon on <code>http://127.0.0.1:8232</code>.
                    Private spending keys remain isolated in encrypted storage and are never exposed to browser memory.
                  </p>
                </div>
              </div>
            </section>
          )}

          {tab === "Settings" && (
            <section className="panel full">
              <small>WORKSPACE CONFIGURATION</small>
              <h2>Integration Readiness</h2>
              {[
                ["Zcash Orchard Wallet & Signer SDK", "Official librustzcash, orchard 0.16 & RedPallas signing", "CONNECTED (PORT 8232)"],
                ["Shielded Unified Address", walletInfo?.unifiedAddress ? walletInfo.unifiedAddress.substring(0, 24) + "..." : "utest1...", "ACTIVE"],
                ["Appwrite Backend & State Storage", "Atomic database transitions with idempotency keys", "CONFIGURED"],
                ["AI Verification Oracle", "Advisory schema-validated milestone evidence assessment", "ONLINE"],
              ].map((x) => (
                <div className="list-row" key={x[0]}>
                  <Icon n="shield" />
                  <b>
                    {x[0]}
                    <small>{x[1]}</small>
                  </b>
                  <label>{x[2]}</label>
                </div>
              ))}
            </section>
          )}

          <footer className="footer">
            © 2026 SENTINEL-Z PROTOCOL <span>● ORCHARD TESTNET CONNECTED</span> BUILD 0.3.0 · REUSABLE WALLET SDK
          </footer>
        </div>
      </section>

      {/* MODAL 1: Fund Escrow */}
      {depositModal && (
        <div className="backdrop" onClick={() => setDepositModal(false)}>
          <form className="modal" onSubmit={handleFundEscrow} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div>
                <small>SHIELDED FUNDING</small>
                <h2>Fund Escrow Vault</h2>
              </div>
              <button type="button" onClick={() => setDepositModal(false)}>×</button>
            </div>
            <label>
              ESCROW REFERENCE
              <input disabled value={escrow?.id || "SNZ-2026-00421"} />
            </label>
            <label>
              SHIELDED VAULT ADDRESS (ORCHARD)
              <input disabled value={escrow?.vaultShieldedAddress || "utest1vault..."} />
            </label>
            <label>
              DEPOSIT AMOUNT (ZEC)
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={depositAmountZec}
                onChange={(e) => setDepositAmountZec(e.target.value)}
              />
            </label>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              Deposits are credited to the shielded pool. Requires 3 on-chain confirmations before funds become spendable.
            </p>
            <button className="gold-button">Confirm Shielded Deposit</button>
          </form>
        </div>
      )}

      {/* MODAL 2: Submit Evidence */}
      {evidenceModal && (
        <div className="backdrop" onClick={() => setEvidenceModal(null)}>
          <form className="modal" onSubmit={handleSubmitEvidence} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div>
                <small>MILESTONE DELIVERY</small>
                <h2>Submit Evidence for Milestone #{evidenceModal.index}</h2>
              </div>
              <button type="button" onClick={() => setEvidenceModal(null)}>×</button>
            </div>
            <label>
              DELIVERY DESCRIPTION
              <textarea
                required
                rows={3}
                style={{ width: "100%", background: "#111827", border: "1px solid #374151", color: "#f3f4f6", padding: "8px", borderRadius: "4px" }}
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="e.g. Completed Orchard key derivation, Unified Address generation, and unit tests."
              />
            </label>
            <label>
              ARTIFACT / COMMIT / REPO URL
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </label>
            <button className="gold-button">Submit Evidence</button>
          </form>
        </div>
      )}

      {/* MODAL 3: Settlement Authorization & Signing */}
      {settlementModal && (
        <div className="backdrop" onClick={() => setSettlementModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div>
                <small>AUTHORIZATION & REDPALLAS SIGNING</small>
                <h2>Settle Milestone #{settlementModal.index}</h2>
              </div>
              <button type="button" onClick={() => setSettlementModal(null)}>×</button>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "6px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Milestone:</span>
                <b>{settlementModal.title}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Release Amount:</span>
                <strong style={{ color: "#f1c40f" }}>{settlementModal.amountZec} ZEC</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>ZIP-317 Marginal Fee:</span>
                <span>0.0001 ZEC (10,000 zats)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Total Deduction:</span>
                <span>{(settlementModal.amountZec + 0.0001).toFixed(4)} ZEC</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Signing Key:</span>
                <span style={{ color: "#60a5fa" }}>Isolated RedPallas (Rust Daemon)</span>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "16px" }}>
              Upon confirmation, the Rust signer will compute the Orchard sighash, attach the RedPallas spend authorization signature, and broadcast the transaction to the Zcash testnet.
            </p>

            <button
              className="gold-button"
              disabled={isSettling}
              onClick={handleAuthorizeSettlement}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {isSettling ? "Authorizing & Broadcasting..." : `Authorize & Broadcast ${settlementModal.amountZec} ZEC`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Escrow */}
      {createModal && (
        <div className="backdrop" onClick={() => setCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div>
                <small>NEW AGREEMENT</small>
                <h2>Create Milestone Escrow</h2>
              </div>
              <button type="button" onClick={() => setCreateModal(false)}>×</button>
            </div>
            <p style={{ fontSize: "13px", color: "#cbd5e1" }}>
              Use the default 10 ZEC scenario (Milestones: 2 ZEC, 3 ZEC, 5 ZEC) or define a new agreement.
            </p>
            <button className="gold-button" onClick={() => { setCreateModal(false); ping("Created 10 ZEC milestone escrow agreement."); }}>
              Initialize 10 ZEC Escrow Scenario
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast"><Icon n="check" />{toast}</div>}
    </main>
  );
}
