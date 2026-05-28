import { useCallback, useEffect, useState } from 'react';

import {
  ADDR,
  AGENT_PUSH_TX,
  DEMO_TXS,
  HOOK_SALT,
  POOL_ID,
  RISK_LABELS,
  XLAYER_RPC,
  connectWallet,
  ensureXLayer,
  fetchGuardianHookState,
  formatEther,
  okLinkAddr,
  okLinkTx,
  shortAddr,
  simulateRugProofSwap,
  type GuardianHookState,
  type SwapAttemptResult,
} from '../lib/guardianHook';

const RISK_COLOR: Record<number, string> = {
  0: 'text-secondary',
  1: 'text-accent-safe',
  2: 'text-accent-caution',
  3: 'text-accent-danger',
};

function StatRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-[12px] text-primary text-right break-all`}>{value}</span>
    </div>
  );
}

function StatusBadge({ risk }: { risk: number }) {
  const label = RISK_LABELS[risk] ?? 'UNKNOWN';
  const colorClass = RISK_COLOR[risk] ?? 'text-secondary';
  const dot = risk === 3
    ? 'bg-accent-danger animate-pulse'
    : risk === 2
      ? 'bg-accent-caution'
      : risk === 1
        ? 'bg-accent-safe'
        : 'bg-secondary';
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest uppercase ${colorClass}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function GuardianHookPage() {
  const [state, setState] = useState<GuardianHookState | null>(null);
  const [loadErr, setLoadErr] = useState<string>('');
  const [wallet, setWallet] = useState<string>('');
  const [walletErr, setWalletErr] = useState<string>('');
  const [attempt, setAttempt] = useState<SwapAttemptResult | null>(null);
  const [attempting, setAttempting] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchGuardianHookState();
      setState(next);
      setLoadErr('');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to fetch on-chain state');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [load]);

  const onConnect = async () => {
    setWalletErr('');
    try {
      const addr = await connectWallet();
      await ensureXLayer();
      setWallet(addr);
    } catch (e) {
      setWalletErr(e instanceof Error ? e.message : 'Wallet connect failed');
    }
  };

  const onTry = async () => {
    if (!wallet) {
      await onConnect();
      return;
    }
    setAttempting(true);
    setAttempt(null);
    try {
      const result = await simulateRugProofSwap(wallet);
      setAttempt(result);
    } finally {
      setAttempting(false);
    }
  };

  const ownerOk = state && state.oracleOwner.toLowerCase() === ADDR.agent.toLowerCase();
  const hookWiredOk = state && state.hookOracle.toLowerCase() === ADDR.riskOracle.toLowerCase();
  const rug = state?.riskOf.rug ?? 0;

  return (
    <div className="mx-auto max-w-5xl mt-4">
      {/* Hero */}
      <div className="mb-8 border-b border-[#1a1a1a] pb-6">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase text-secondary mb-2">
          <span>RUGPROOF · UNISWAP V4 HOOK · X LAYER MAINNET</span>
          {state && <StatusBadge risk={rug} />}
        </div>
        <h1 className="font-sans text-3xl font-bold text-primary tracking-tight">
          Guardian Hook
        </h1>
        <p className="font-mono text-[12px] text-secondary mt-2 max-w-3xl">
          The first rug-resistant Uniswap v4 pool on X Layer. Swaps into tokens flagged{' '}
          <span className="text-accent-danger font-bold">DANGER</span> by the RUGNOT Guardian engine
          revert in <code className="text-primary">beforeSwap</code>. Users harmed by a later DANGER
          flip can claim refunds from an on-chain <code className="text-primary">ShieldReserve</code>.
        </p>
        {loadErr && (
          <p className="font-mono text-[11px] text-accent-danger mt-3">{loadErr}</p>
        )}
      </div>

      {/* Live status grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="terminal-panel rounded-md p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">RUG (protected token)</div>
          {state ? (
            <>
              <div className="flex items-baseline gap-3">
                <StatusBadge risk={rug} />
                <span className="font-mono text-[11px] text-secondary">score {state.scoreBps} bps</span>
              </div>
              <p className="font-mono text-[10px] text-secondary mt-3 leading-relaxed">
                {rug === 3
                  ? 'Hook will revert any swap attempting to acquire RUG. Try the simulator below.'
                  : rug === 2
                    ? 'CAUTION — swaps allowed but flagged. (DANGER flip needed for demo.)'
                    : rug === 1
                      ? 'OK — swaps pass through normally.'
                      : 'No verdict on-chain yet.'}
              </p>
            </>
          ) : (
            <div className="font-mono text-[11px] text-secondary">loading…</div>
          )}
        </div>

        <div className="terminal-panel rounded-md p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">Shield Reserve</div>
          {state ? (
            <>
              <div className="font-mono text-2xl text-primary font-bold">{formatEther(state.reserveWei, 2)} <span className="text-[12px] text-secondary">BASE</span></div>
              <p className="font-mono text-[10px] text-secondary mt-3">
                Paid out pro-rata to buyers harmed by a DANGER flip. Refund cap: {(state.guards.refundCapBps / 100).toFixed(0)}%.
              </p>
            </>
          ) : (
            <div className="font-mono text-[11px] text-secondary">loading…</div>
          )}
        </div>

        <div className="terminal-panel rounded-md p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">Agent exposure (demo buyer)</div>
          {state ? (
            <>
              <div className="font-mono text-2xl text-primary font-bold">{formatEther(state.exposureWei, 2)} <span className="text-[12px] text-secondary">BASE</span></div>
              <div className="font-mono text-[10px] text-secondary mt-3">
                Refund {state.claimedByAgent ? <span className="text-accent-safe">CLAIMED</span> : <span className="text-accent-caution">PENDING</span>}
              </div>
            </>
          ) : (
            <div className="font-mono text-[11px] text-secondary">loading…</div>
          )}
        </div>
      </div>

      {/* Try the rug-proof swap */}
      <div className="terminal-panel rounded-md p-6 mb-8 border-l-2 border-l-accent-danger">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-1">Interactive proof</div>
            <h2 className="font-sans text-xl font-bold text-primary">Try the rug-proof swap</h2>
          </div>
          {wallet ? (
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent-safe flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-safe animate-pulse" /> {shortAddr(wallet)}
            </div>
          ) : (
            <button
              onClick={() => void onConnect()}
              className="border border-border bg-transparent px-4 py-2 font-mono text-[10px] font-bold tracking-widest uppercase text-secondary transition hover:border-accent-safe hover:text-accent-safe"
            >
              Connect wallet
            </button>
          )}
        </div>

        <p className="font-mono text-[11px] text-secondary leading-relaxed mb-4">
          This sends an <code className="text-primary">eth_call</code> (no gas, no signature) from your wallet
          attempting to swap 50 BASE → RUG via the live pool. Because RUG is flagged DANGER, the hook
          reverts in <code className="text-primary">beforeSwap</code> with <code className="text-accent-danger">GuardianBlocked(RUG)</code>.
          You should see that error below.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => void onTry()}
            disabled={attempting}
            className="border border-accent-danger/60 bg-accent-danger/10 px-5 py-2.5 font-mono text-[11px] font-bold tracking-widest uppercase text-accent-danger transition hover:bg-accent-danger/20 disabled:opacity-50"
          >
            {attempting ? 'Simulating…' : wallet ? 'Attempt rug-buy (will revert)' : 'Connect & attempt rug-buy'}
          </button>
          {attempt && (
            <button
              onClick={() => setAttempt(null)}
              className="border border-border bg-transparent px-3 py-2.5 font-mono text-[10px] tracking-widest uppercase text-secondary hover:text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {walletErr && (
          <div className="font-mono text-[11px] text-accent-danger">{walletErr}</div>
        )}

        {attempt && (
          <div className={`mt-2 border p-4 rounded ${attempt.kind === 'reverted' ? 'border-accent-safe/40 bg-accent-safe/5' : attempt.kind === 'reverted-unknown' ? 'border-accent-caution/40 bg-accent-caution/5' : 'border-accent-danger/40 bg-accent-danger/5'}`}>
            {attempt.kind === 'reverted' && (
              <>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent-safe mb-2">✓ Hook blocked the swap</div>
                <div className="font-mono text-[13px] text-primary break-all">{attempt.reason}</div>
                <div className="font-mono text-[10px] text-secondary mt-2">
                  Custom error selector 0xcd02b39b. The hook fired in beforeSwap. No tokens moved. No gas spent (eth_call).
                </div>
              </>
            )}
            {attempt.kind === 'reverted-unknown' && (
              <>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent-caution mb-2">Reverted (could not decode reason)</div>
                <div className="font-mono text-[11px] text-secondary break-all">{attempt.rawError}</div>
                <div className="font-mono text-[10px] text-secondary mt-2">
                  Likely still a Guardian revert — your wallet didn't surface the error data. Check the console.
                </div>
              </>
            )}
            {attempt.kind === 'no-wallet' && (
              <div className="font-mono text-[11px] text-accent-danger">No injected wallet detected. Install MetaMask or OKX Wallet.</div>
            )}
            {attempt.kind === 'wrong-chain' && (
              <div className="font-mono text-[11px] text-accent-danger">
                Wrong chain — switch to X Layer (chainId 196). Got {attempt.chainIdSeen}.
              </div>
            )}
            {attempt.kind === 'succeeded-unexpected' && (
              <div className="font-mono text-[11px] text-accent-danger">
                Unexpected: the call did not revert. Verify RUG is still DANGER on the oracle.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deployments + system wiring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="terminal-panel rounded-md p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">Deployments (chainId 196)</div>
          <StatRow label="RiskOracle" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.riskOracle)} target="_blank" rel="noreferrer">{shortAddr(ADDR.riskOracle)}</a>} />
          <StatRow label="GuardianHook" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.guardianHook)} target="_blank" rel="noreferrer">{shortAddr(ADDR.guardianHook)}</a>} />
          <StatRow label="PoolManager" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.poolManager)} target="_blank" rel="noreferrer">{shortAddr(ADDR.poolManager)}</a>} />
          <StatRow label="BASE token" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.base)} target="_blank" rel="noreferrer">{shortAddr(ADDR.base)}</a>} />
          <StatRow label="RUG token" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.rug)} target="_blank" rel="noreferrer">{shortAddr(ADDR.rug)}</a>} />
          <StatRow label="SwapHelper" value={<a className="hover:text-accent-safe" href={okLinkAddr(ADDR.swapHelper)} target="_blank" rel="noreferrer">{shortAddr(ADDR.swapHelper)}</a>} />
          <StatRow label="PoolId" value={shortAddr(POOL_ID, 8, 6)} />
          <StatRow label="Hook salt" value={HOOK_SALT.slice(-6)} />
        </div>

        <div className="terminal-panel rounded-md p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">Wiring (live reads)</div>
          {state ? (
            <>
              <StatRow label="Oracle owner = agent" value={ownerOk ? <span className="text-accent-safe">✓ verified</span> : <span className="text-accent-danger">mismatch</span>} />
              <StatRow label="Hook → Oracle" value={hookWiredOk ? <span className="text-accent-safe">✓ verified</span> : <span className="text-accent-danger">mismatch</span>} />
              <StatRow label="Hook owner" value={shortAddr(state.hookOwner)} />
              <StatRow label="Protected token" value={shortAddr(state.guards.protectedToken)} />
              <StatRow label="Base token" value={shortAddr(state.guards.baseToken)} />
              <StatRow label="Refund cap" value={`${(state.guards.refundCapBps / 100).toFixed(0)}%`} />
              <StatRow label="Pool initialised" value={state.guards.initialized ? <span className="text-accent-safe">✓</span> : <span className="text-accent-danger">no</span>} />
              <StatRow label="Hook BASE balance" value={`${formatEther(state.baseBalanceOfHookWei, 2)} BASE`} />
            </>
          ) : (
            <div className="font-mono text-[11px] text-secondary">loading…</div>
          )}
        </div>
      </div>

      {/* Demo tx proof */}
      <div className="terminal-panel rounded-md p-5 mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">On-chain demo proof (X Layer mainnet)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DEMO_TXS.map((tx) => (
            <a
              key={tx.hash}
              href={okLinkTx(tx.hash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 border border-border/60 bg-bg-surface/40 p-3 hover:border-accent-safe hover:bg-accent-safe/5 transition"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">Tx {tx.step}</div>
                <div className="font-mono text-[11px] text-primary">{tx.label}</div>
              </div>
              <div className="font-mono text-[10px] text-secondary">{shortAddr(tx.hash, 8, 6)}</div>
            </a>
          ))}
          <a
            href={okLinkTx(AGENT_PUSH_TX)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 border border-border/60 bg-bg-surface/40 p-3 hover:border-accent-safe hover:bg-accent-safe/5 transition md:col-span-2"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">RUGNOT agent</div>
              <div className="font-mono text-[11px] text-primary">pushRisk() — agent writes Guardian verdict to oracle</div>
            </div>
            <div className="font-mono text-[10px] text-secondary">{shortAddr(AGENT_PUSH_TX, 8, 6)}</div>
          </a>
        </div>
      </div>

      {/* CLI verification */}
      <div className="terminal-panel rounded-md p-5 mb-12">
        <div className="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3">Verify it yourself</div>
        <pre className="font-mono text-[11px] text-primary bg-[#0a0a0a] border border-border/60 p-4 overflow-x-auto leading-relaxed">{`# Anyone can run this — no install beyond Foundry's cast.

# 1. You're talking to X Layer
cast chain-id --rpc-url ${XLAYER_RPC}                  # 196

# 2. RUG is DANGER (3) per the oracle
cast call ${ADDR.riskOracle} \\
  "riskOf(address)(uint8)" ${ADDR.rug} \\
  --rpc-url ${XLAYER_RPC}                                # 3

# 3. The pool is registered with refund cap 50%
cast call ${ADDR.guardianHook} \\
  "guards(bytes32)(address,address,uint16,bool)" \\
  ${POOL_ID} \\
  --rpc-url ${XLAYER_RPC}
# → ${ADDR.rug}, ${ADDR.base}, 5000, true`}</pre>
      </div>
    </div>
  );
}
