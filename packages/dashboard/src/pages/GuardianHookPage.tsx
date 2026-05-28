import { useCallback, useEffect, useState } from 'react';

import {
  ADDR,
  AGENT_PUSH_TX,
  DEMO_TXS,
  POOL_ID,
  RISK_LABELS,
  SAMPLE_TOKENS,
  XLAYER_RPC,
  connectWallet,
  ensureXLayer,
  fetchGuardianHookState,
  formatEther,
  okLinkAddr,
  okLinkTx,
  scanTokenForSimulation,
  shortAddr,
  simulateRugProofSwap,
  type GuardianHookState,
  type ScanOutcome,
  type SwapAttemptResult,
} from '../lib/guardianHook';

// ============================================================
// Page
// ============================================================

export function GuardianHookPage() {
  const [state, setState] = useState<GuardianHookState | null>(null);
  const [wallet, setWallet] = useState<string>('');
  const [walletErr, setWalletErr] = useState<string>('');
  const [attempt, setAttempt] = useState<SwapAttemptResult | null>(null);
  const [attempting, setAttempting] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchGuardianHookState();
      setState(next);
    } catch {
      /* silently keep stale state */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load]);

  const onConnect = async (): Promise<string | null> => {
    setWalletErr('');
    if (!window.ethereum) {
      setWalletErr('No injected wallet. Install OKX Wallet or MetaMask.');
      return null;
    }
    try {
      const addr = await connectWallet();
      try { await ensureXLayer(); } catch (e) {
        setWalletErr(e instanceof Error ? e.message : 'Approve the chain switch.');
      }
      setWallet(addr);
      return addr;
    } catch (e) {
      setWalletErr(e instanceof Error ? e.message : 'Wallet connect failed');
      return null;
    }
  };

  const runSimulation = async (from: string) => {
    setAttempting(true);
    setAttempt(null);
    try {
      const result = await simulateRugProofSwap(from);
      setAttempt(result);
    } finally {
      setAttempting(false);
    }
  };

  const onAttempt = async () => {
    let from = wallet;
    if (!from) {
      const connected = await onConnect();
      if (!connected) {
        // fall back to no-wallet path so the demo always shows the block
        from = '0x000000000000000000000000000000000000dEaD';
      } else {
        from = connected;
      }
    }
    await runSimulation(from);
  };

  const onAttemptNoWallet = async () => {
    setWalletErr('');
    await runSimulation('0x000000000000000000000000000000000000dEaD');
  };

  const rug = state?.riskOf.rug ?? 0;
  const dangerLive = rug === 3;

  return (
    <div className="mx-auto max-w-5xl">
      <Hero
        dangerLive={dangerLive}
        rugLabel={RISK_LABELS[rug] ?? 'UNKNOWN'}
        attempt={attempt}
        attempting={attempting}
        wallet={wallet}
        walletErr={walletErr}
        onAttempt={() => void onAttempt()}
        onAttemptNoWallet={() => void onAttemptNoWallet()}
        onClear={() => setAttempt(null)}
      />

      <StatsBar state={state} />

      <TokenSimulator />

      <HowItWorks />

      <Timeline />

      <ProofGrid state={state} />

      <Verify show={showVerify} onToggle={() => setShowVerify((v) => !v)} />

      <Footer />
    </div>
  );
}

// ============================================================
// Hero — headline + the killer interactive demo
// ============================================================

function Hero({
  dangerLive,
  rugLabel,
  attempt,
  attempting,
  wallet,
  walletErr,
  onAttempt,
  onAttemptNoWallet,
  onClear,
}: {
  dangerLive: boolean;
  rugLabel: string;
  attempt: SwapAttemptResult | null;
  attempting: boolean;
  wallet: string;
  walletErr: string;
  onAttempt: () => void;
  onAttemptNoWallet: () => void;
  onClear: () => void;
}) {
  return (
    <section className="pt-10 pb-16 border-b border-border">
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-secondary">RUGPROOF</span>
        <span className="text-secondary/40">/</span>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-secondary">Uniswap v4 hook</span>
        <span className="text-secondary/40">/</span>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-secondary">X Layer · 196</span>
        <span className="ml-2 inline-flex items-center gap-2 px-2 py-0.5 border border-accent-danger/40 bg-accent-danger/5">
          <span className={`h-1.5 w-1.5 rounded-full bg-accent-danger ${dangerLive ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-[9px] tracking-widest uppercase text-accent-danger">RUG = {rugLabel}</span>
        </span>
      </div>

      <h1 className="font-sans text-5xl sm:text-6xl font-bold text-primary tracking-tight leading-[1.05] max-w-3xl">
        The Uniswap pool that <span className="text-accent-danger">refuses to sell you a rug.</span>
      </h1>

      <p className="font-sans text-lg text-secondary mt-6 max-w-2xl leading-relaxed">
        A live v4 pool on X Layer mainnet. Every swap is checked against the RUGNOT risk oracle.
        Buy a flagged honeypot — the pool reverts your transaction. Get rugged anyway — claim from the on-chain reserve.
      </p>

      {/* CTA + result */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <button
            onClick={onAttempt}
            disabled={attempting}
            className="group relative w-full inline-flex items-center justify-between gap-4 px-6 py-5 border-2 border-accent-danger bg-accent-danger/5 hover:bg-accent-danger/10 active:bg-accent-danger/20 transition disabled:opacity-50"
          >
            <div className="text-left">
              <div className="font-mono text-[10px] uppercase tracking-widest text-accent-danger/70">Interactive proof</div>
              <div className="font-sans text-xl font-bold text-primary mt-1">
                {attempting ? 'Simulating swap…' : 'Try buying the rug →'}
              </div>
            </div>
            <span className="font-mono text-[10px] text-accent-danger group-hover:translate-x-0.5 transition">↪</span>
          </button>

          <div className="mt-3 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-secondary/60">
            <button onClick={onAttemptNoWallet} className="hover:text-accent-safe transition">
              › run without wallet
            </button>
            {wallet && (
              <span className="inline-flex items-center gap-1.5 text-accent-safe">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-safe animate-pulse" />
                {shortAddr(wallet)}
              </span>
            )}
            {attempt && (
              <button onClick={onClear} className="hover:text-primary transition ml-auto">clear</button>
            )}
          </div>

          {walletErr && (
            <p className="mt-2 font-mono text-[11px] text-accent-danger">{walletErr}</p>
          )}
        </div>

        {/* Result panel */}
        <div className="min-h-[140px]">
          {!attempt && (
            <div className="h-full flex items-center justify-center border border-dashed border-border p-6">
              <p className="font-mono text-[11px] text-secondary/60 text-center max-w-xs">
                Click the button. We&apos;ll send an <code className="text-secondary">eth_call</code> to the live pool attempting
                to swap 50 BASE → RUG. The hook should revert it.
              </p>
            </div>
          )}
          {attempt && attempt.kind === 'reverted' && (
            <div className="h-full border border-accent-safe bg-accent-safe/5 p-5 animate-in">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent-safe">
                <span className="text-base">✓</span> Hook blocked the swap
              </div>
              <div className="font-mono text-[15px] text-primary mt-3 break-all">
                {attempt.reason}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[9px] uppercase tracking-widest text-secondary/70">
                <div><div className="text-accent-safe">eth_call</div>no gas</div>
                <div><div className="text-accent-safe">beforeSwap</div>fired</div>
                <div><div className="text-accent-safe">0 tokens</div>moved</div>
              </div>
            </div>
          )}
          {attempt && attempt.kind === 'reverted-unknown' && (
            <div className="h-full border border-accent-caution bg-accent-caution/5 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-accent-caution">Reverted (decode failed)</div>
              <p className="font-mono text-[11px] text-secondary mt-3 break-all">{attempt.rawError}</p>
            </div>
          )}
          {attempt && attempt.kind === 'no-wallet' && (
            <div className="h-full border border-accent-danger bg-accent-danger/5 p-5">
              <div className="font-mono text-[11px] text-accent-danger">No wallet detected. Try “run without wallet”.</div>
            </div>
          )}
          {attempt && attempt.kind === 'wrong-chain' && (
            <div className="h-full border border-accent-caution bg-accent-caution/5 p-5">
              <div className="font-mono text-[11px] text-accent-caution">Switch to X Layer (196). Currently on {attempt.chainIdSeen}.</div>
            </div>
          )}
          {attempt && attempt.kind === 'succeeded-unexpected' && (
            <div className="h-full border border-accent-danger bg-accent-danger/5 p-5">
              <div className="font-mono text-[11px] text-accent-danger">Unexpected — the swap did NOT revert. Verify RUG state on the oracle.</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Quick stats bar
// ============================================================

function StatsBar({ state }: { state: GuardianHookState | null }) {
  return (
    <section className="py-8 border-b border-border">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
        <Stat
          label="Live verdict (RUG)"
          value={state ? RISK_LABELS[state.riskOf.rug] : '—'}
          valueClass={state?.riskOf.rug === 3 ? 'text-accent-danger' : 'text-primary'}
          hint={state ? `${state.scoreBps} score bps` : 'loading…'}
        />
        <Stat
          label="Shield Reserve"
          value={state ? formatEther(state.reserveWei, 0) : '—'}
          unit="BASE"
          hint={state ? `cap ${(state.guards.refundCapBps / 100).toFixed(0)}% per claimant` : 'loading…'}
        />
        <Stat
          label="Agent exposure"
          value={state ? formatEther(state.exposureWei, 0) : '—'}
          unit="BASE"
          hint={state ? (state.claimedByAgent ? 'refund claimed ✓' : 'pending') : 'loading…'}
        />
        <Stat
          label="Pool initialised"
          value={state ? (state.guards.initialized ? 'YES' : 'NO') : '—'}
          valueClass="text-accent-safe"
          hint={state ? `oracle wired ✓` : 'loading…'}
        />
      </div>
    </section>
  );
}

function Stat({ label, value, unit, valueClass, hint }: { label: string; value: string; unit?: string; valueClass?: string; hint?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-secondary/70">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`font-sans text-3xl font-bold tracking-tight ${valueClass ?? 'text-primary'}`}>{value}</span>
        {unit && <span className="font-mono text-[11px] text-secondary">{unit}</span>}
      </div>
      {hint && <div className="mt-1 font-mono text-[10px] text-secondary/60">{hint}</div>}
    </div>
  );
}

// ============================================================
// Token simulator — paste any X Layer token, see what the hook would do
// ============================================================

function TokenSimulator() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [err, setErr] = useState('');

  const run = async (addressOverride?: string) => {
    const addr = (addressOverride ?? input).trim();
    if (!addr) {
      setErr('Paste an X Layer token address.');
      return;
    }
    setBusy(true);
    setErr('');
    setOutcome(null);
    if (addressOverride) setInput(addressOverride);
    try {
      const r = await scanTokenForSimulation(addr);
      setOutcome(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="py-14 border-t border-border">
      <SectionHeader
        eyebrow="Test it on any X Layer token"
        title="Paste a token. See what the hook would do."
        subtitle="The exact same RUGNOT Guardian that powers the live pool, run against any address you give it. On-chain oracle read + agent verdict — no hardcoded list."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input column */}
        <div className="lg:col-span-7">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && void run()}
              placeholder="0x… any token address on X Layer"
              className="flex-1 bg-bg-surface border border-border focus:border-accent-safe outline-none px-4 py-3 font-mono text-xs text-primary placeholder:text-secondary/40 transition"
              disabled={busy}
            />
            <button
              onClick={() => void run()}
              disabled={busy}
              className="border border-accent-safe/60 bg-accent-safe/10 hover:bg-accent-safe/20 px-6 py-3 font-mono text-[11px] font-bold tracking-widest uppercase text-accent-safe transition disabled:opacity-50"
            >
              {busy ? 'Scanning…' : 'Scan & simulate →'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary/60">Try:</span>
            {SAMPLE_TOKENS.map((t) => (
              <button
                key={t.address}
                onClick={() => void run(t.address)}
                disabled={busy}
                className="font-mono text-[10px] uppercase tracking-widest text-secondary hover:text-accent-safe border border-border hover:border-accent-safe/40 px-2 py-1 transition disabled:opacity-40"
              >
                {t.label}
              </button>
            ))}
          </div>

          {err && <p className="mt-3 font-mono text-[11px] text-accent-danger">{err}</p>}

          <p className="mt-6 font-mono text-[10px] text-secondary/50 leading-relaxed max-w-md">
            The simulator reads the RiskOracle directly on-chain, and (if the RUGNOT agent backend is reachable) also runs a live 5-layer Guardian scan. The hook decision below is what the actual pool contract would do.
          </p>
        </div>

        {/* Output column */}
        <div className="lg:col-span-5">
          {!outcome && !busy && (
            <div className="h-full min-h-[200px] border border-dashed border-border flex items-center justify-center p-6">
              <p className="font-mono text-[11px] text-secondary/50 text-center max-w-xs">
                Paste a token and click scan. We&apos;ll show the agent verdict, the on-chain oracle state, and the hook&apos;s decision.
              </p>
            </div>
          )}
          {busy && (
            <div className="h-full min-h-[200px] border border-border flex items-center justify-center">
              <div className="font-mono text-[11px] text-secondary/60 animate-pulse">running 5-layer scan…</div>
            </div>
          )}
          {outcome && <SimulatorOutcome outcome={outcome} />}
        </div>
      </div>
    </section>
  );
}

function SimulatorOutcome({ outcome }: { outcome: ScanOutcome }) {
  const decision = outcome.hookDecision;
  const decisionLabel =
    decision === 'BLOCK' ? 'Hook would REVERT this swap' :
    decision === 'ALLOW' ? 'Hook would ALLOW this swap' :
    "No verdict yet — push to oracle to enable";

  const containerCls =
    decision === 'BLOCK' ? 'border-accent-danger/60 bg-accent-danger/5' :
    decision === 'ALLOW' ? 'border-accent-safe/60 bg-accent-safe/5' :
    'border-accent-caution/60 bg-accent-caution/5';

  const labelCls =
    decision === 'BLOCK' ? 'text-accent-danger' :
    decision === 'ALLOW' ? 'text-accent-safe' :
    'text-accent-caution';

  return (
    <div className={`border p-5 ${containerCls}`}>
      <div className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${labelCls}`}>
        Hook decision
      </div>
      <div className="font-sans text-xl font-bold text-primary leading-tight">
        {decisionLabel}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[10px] uppercase tracking-widest">
        <div>
          <div className="text-secondary/70">On-chain oracle</div>
          <div className={`text-sm normal-case mt-0.5 font-bold ${outcome.onchain.risk === 3 ? 'text-accent-danger' : outcome.onchain.risk === 2 ? 'text-accent-caution' : outcome.onchain.risk === 1 ? 'text-accent-safe' : 'text-secondary'}`}>
            {outcome.onchain.label}
          </div>
          {outcome.onchain.updatedAt > 0 && (
            <div className="text-secondary/50 normal-case mt-0.5">
              updated {new Date(outcome.onchain.updatedAt * 1000).toLocaleString()}
            </div>
          )}
        </div>

        <div>
          <div className="text-secondary/70">Live agent (5-layer)</div>
          {outcome.agent ? (
            <>
              <div className={`text-sm normal-case mt-0.5 font-bold ${outcome.agent.level === 'DANGER' ? 'text-accent-danger' : outcome.agent.level === 'CAUTION' ? 'text-accent-caution' : 'text-accent-safe'}`}>
                {outcome.agent.level} · {outcome.agent.score}/100
              </div>
              <div className="text-secondary/50 normal-case mt-0.5">
                {outcome.agent.passedChecks}/{outcome.agent.totalChecks} checks · {outcome.agent.executionTimeMs}ms
              </div>
            </>
          ) : (
            <div className="text-secondary/50 normal-case mt-0.5">
              backend not running
            </div>
          )}
        </div>
      </div>

      {outcome.agentError && (
        <p className="mt-4 font-mono text-[10px] text-secondary/40">
          agent: {outcome.agentError} — using on-chain oracle only
        </p>
      )}
    </div>
  );
}

// ============================================================
// How it works — 3-step diagram
// ============================================================

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'RUGNOT scans',
      body: 'An autonomous agent runs 5 risk checks per token: contract safety, holders, smart money, liquidity depth, and a simulated buy/sell.',
      tag: 'off-chain',
      accent: 'safe' as const,
    },
    {
      n: '02',
      title: 'Verdict goes on-chain',
      body: 'The agent writes the verdict (OK / CAUTION / DANGER) to a RiskOracle contract on X Layer. Anyone can read it.',
      tag: 'on-chain',
      accent: 'info' as const,
    },
    {
      n: '03',
      title: 'Pool enforces it',
      body: 'A Uniswap v4 hook reads the oracle inside beforeSwap. DANGER → revert. Refunds from a Shield Reserve cover users hit by post-trade flips.',
      tag: 'hook',
      accent: 'danger' as const,
    },
  ];
  return (
    <section className="py-14">
      <SectionHeader eyebrow="Mechanism" title="How it works" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mt-8">
        {steps.map((s, i) => (
          <div key={s.n} className="bg-bg p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-secondary/70">{s.n}</span>
              <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
                s.accent === 'safe' ? 'border-accent-safe/40 text-accent-safe' :
                s.accent === 'info' ? 'border-accent-info/40 text-accent-info' :
                'border-accent-danger/40 text-accent-danger'
              }`}>{s.tag}</span>
            </div>
            <h3 className="font-sans text-xl font-bold text-primary mb-3">{s.title}</h3>
            <p className="font-mono text-[11px] text-secondary leading-relaxed">{s.body}</p>
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-secondary/40 text-xs z-10">→</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Demo timeline — story of the 4 mainnet txs
// ============================================================

function Timeline() {
  const beats = [
    { tx: DEMO_TXS[0], state: 'RUG = OK', tone: 'safe' as const, narrative: 'A buyer swaps 100 BASE for RUG. Pool allows it. Their exposure is tracked.' },
    { tx: DEMO_TXS[1], state: 'oracle flip', tone: 'caution' as const, narrative: 'RUGNOT detects risk and writes DANGER to the oracle.' },
    { tx: DEMO_TXS[2], state: 'RUG = DANGER', tone: 'danger' as const, narrative: 'Same swap, again. Hook reverts in beforeSwap. GuardianBlocked(RUG).' },
    { tx: DEMO_TXS[3], state: 'claim refund', tone: 'safe' as const, narrative: 'The original buyer recovers BASE from the on-chain Shield Reserve.' },
  ];
  return (
    <section className="py-14 border-t border-border">
      <SectionHeader eyebrow="On-chain proof" title="A four-transaction story" subtitle="Every line below is a real, verifiable transaction on X Layer mainnet." />
      <ol className="mt-8 relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        {beats.map((b, i) => (
          <li key={b.tx.hash} className="relative pl-12 pb-8 last:pb-0">
            <span className={`absolute left-0 top-0 h-8 w-8 flex items-center justify-center font-mono text-[11px] font-bold border-2 bg-bg ${
              b.tone === 'safe' ? 'border-accent-safe text-accent-safe' :
              b.tone === 'caution' ? 'border-accent-caution text-accent-caution' :
              'border-accent-danger text-accent-danger'
            }`}>{b.tx.step}</span>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h4 className="font-sans text-base font-bold text-primary">{b.tx.label}</h4>
              <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ${
                b.tone === 'safe' ? 'text-accent-safe' :
                b.tone === 'caution' ? 'text-accent-caution' :
                'text-accent-danger'
              }`}>{b.state}</span>
            </div>
            <p className="font-mono text-[11px] text-secondary mt-2 leading-relaxed">{b.narrative}</p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <a href={okLinkTx(b.tx.hash)} target="_blank" rel="noreferrer"
                 className={`inline-flex items-center gap-2 px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest transition ${
                   b.tone === 'safe'
                     ? 'border-accent-safe/40 text-accent-safe hover:bg-accent-safe/10'
                     : b.tone === 'caution'
                       ? 'border-accent-caution/40 text-accent-caution hover:bg-accent-caution/10'
                       : 'border-accent-danger/40 text-accent-danger hover:bg-accent-danger/10'
                 }`}>
                <span>View tx on OKLink</span>
                <span>↗</span>
              </a>
              <code className="font-mono text-[10px] text-secondary/50 break-all">{b.tx.hash}</code>
            </div>
          </li>
        ))}
        <li className="relative pl-12 pt-4 border-t border-border/40">
          <span className="absolute left-0 top-4 h-8 w-8 flex items-center justify-center font-mono text-[9px] font-bold border-2 border-accent-info/60 text-accent-info bg-bg">★</span>
          <div className="font-sans text-sm font-bold text-primary">RUGNOT agent writes a verdict</div>
          <p className="font-mono text-[11px] text-secondary mt-1">Same agent wallet, autonomous push from the off-chain runtime.</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <a href={okLinkTx(AGENT_PUSH_TX)} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 px-3 py-1.5 border border-accent-info/40 text-accent-info hover:bg-accent-info/10 font-mono text-[10px] uppercase tracking-widest transition">
              <span>View tx on OKLink</span>
              <span>↗</span>
            </a>
            <code className="font-mono text-[10px] text-secondary/50 break-all">{AGENT_PUSH_TX}</code>
          </div>
        </li>
      </ol>
    </section>
  );
}

// ============================================================
// Proof grid — deployments + wiring (compact, scannable)
// ============================================================

function ProofGrid({ state }: { state: GuardianHookState | null }) {
  const ownerOk = state && state.oracleOwner.toLowerCase() === ADDR.agent.toLowerCase();
  const hookWiredOk = state && state.hookOracle.toLowerCase() === ADDR.riskOracle.toLowerCase();
  return (
    <section className="py-14 border-t border-border">
      <SectionHeader eyebrow="System wiring" title="Live reads, every 15s" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-secondary/70 mb-3">Deployments (chainId 196)</h4>
          <dl className="font-mono text-[11px]">
            <Row label="RiskOracle" value={<AddrLink a={ADDR.riskOracle} />} />
            <Row label="GuardianHook" value={<AddrLink a={ADDR.guardianHook} />} />
            <Row label="PoolManager" value={<AddrLink a={ADDR.poolManager} />} />
            <Row label="BASE token" value={<AddrLink a={ADDR.base} />} />
            <Row label="RUG token" value={<AddrLink a={ADDR.rug} />} />
            <Row label="Pool ID" value={shortAddr(POOL_ID, 10, 8)} />
          </dl>
        </div>
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-secondary/70 mb-3">Wiring checks</h4>
          <dl className="font-mono text-[11px]">
            <Row label="Oracle owner = agent" value={state ? (ownerOk ? <Ok /> : <Bad />) : <Loading />} />
            <Row label="Hook → oracle" value={state ? (hookWiredOk ? <Ok /> : <Bad />) : <Loading />} />
            <Row label="Pool initialised" value={state ? (state.guards.initialized ? <Ok /> : <Bad />) : <Loading />} />
            <Row label="Protected token" value={state ? shortAddr(state.guards.protectedToken) : '—'} />
            <Row label="Refund cap" value={state ? `${(state.guards.refundCapBps / 100).toFixed(0)}%` : '—'} />
            <Row label="Hook BASE balance" value={state ? `${formatEther(state.baseBalanceOfHookWei, 0)} BASE` : '—'} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40">
      <span className="text-secondary uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-primary">{value}</span>
    </div>
  );
}
function AddrLink({ a }: { a: string }) {
  return (
    <a href={okLinkAddr(a)} target="_blank" rel="noreferrer" className="text-primary hover:text-accent-safe transition">
      {shortAddr(a)}
    </a>
  );
}
function Ok() { return <span className="text-accent-safe">✓ verified</span>; }
function Bad() { return <span className="text-accent-danger">mismatch</span>; }
function Loading() { return <span className="text-secondary/50">…</span>; }

// ============================================================
// Verify yourself — collapsible CLI
// ============================================================

function Verify({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <section className="py-14 border-t border-border">
      <div className="flex items-center justify-between">
        <SectionHeader eyebrow="Trust" title="Verify it yourself" subtitle="Don't trust this page. Ask the chain." inline />
        <button onClick={onToggle} className="font-mono text-[10px] uppercase tracking-widest text-secondary hover:text-accent-safe transition">
          {show ? '— hide commands' : '+ show commands'}
        </button>
      </div>
      {show && (
        <pre className="mt-6 font-mono text-[11px] text-primary bg-bg-surface border border-border p-5 overflow-x-auto leading-relaxed">{`# X Layer mainnet — anyone can run these.

cast chain-id --rpc-url ${XLAYER_RPC}                  # → 196

cast call ${ADDR.riskOracle} \\
  "riskOf(address)(uint8)" ${ADDR.rug} \\
  --rpc-url ${XLAYER_RPC}                              # → 3 (DANGER)

cast call ${ADDR.guardianHook} \\
  "guards(bytes32)(address,address,uint16,bool)" \\
  ${POOL_ID} \\
  --rpc-url ${XLAYER_RPC}
# → RUG, BASE, 5000, true`}</pre>
      )}
    </section>
  );
}

// ============================================================
// Section header
// ============================================================

function SectionHeader({ eyebrow, title, subtitle, inline = false }: { eyebrow: string; title: string; subtitle?: string; inline?: boolean }) {
  return (
    <div className={inline ? '' : ''}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary/70">{eyebrow}</div>
      <h2 className="font-sans text-3xl font-bold text-primary tracking-tight mt-1">{title}</h2>
      {subtitle && <p className="font-mono text-[12px] text-secondary mt-2 max-w-2xl">{subtitle}</p>}
    </div>
  );
}

// ============================================================
// Footer
// ============================================================

function Footer() {
  return (
    <section className="py-10 border-t border-border">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-secondary/60">
          Built with <span className="text-primary">Uniswap v4</span> · deployed on <span className="text-primary">X Layer</span> · powered by <span className="text-primary">RUGNOT</span>
        </div>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest">
          <a href="https://github.com/Madhav-Gupta-28/RUGPROOF" target="_blank" rel="noreferrer" className="text-secondary hover:text-accent-safe transition">Repo ↗</a>
          <a href={okLinkAddr(ADDR.guardianHook)} target="_blank" rel="noreferrer" className="text-secondary hover:text-accent-safe transition">Hook ↗</a>
          <a href="https://www.oklink.com/x-layer" target="_blank" rel="noreferrer" className="text-secondary hover:text-accent-safe transition">X Layer ↗</a>
        </div>
      </div>
    </section>
  );
}
