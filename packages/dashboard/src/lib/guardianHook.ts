// Live mainnet constants for the RUGPROOF Guardian Hook on X Layer (chainId 196).
// All reads/writes go directly to the public RPC — no agent backend required.

export const XLAYER_RPC = 'https://rpc.xlayer.tech';
export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CHAIN_ID_HEX = '0xc4';

export const ADDR = {
  agent: '0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c',
  riskOracle: '0x999499a47495bA2005E5ceB06f192F45Bbcd2F50',
  guardianHook: '0xC68E22886fA481AD38bC4810b12Bdf9991F350C0',
  base: '0xb437E753142759A386548Ef00e8E1775d1A2A338',
  rug: '0xB585ABBB035832c0b357a66F1c338C0A34d41482',
  swapHelper: '0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5',
  poolManager: '0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32',
} as const;

export const POOL_ID =
  '0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2';

export const HOOK_SALT =
  '0x000000000000000000000000000000000000000000000000000000000000068d';

// Function selectors (computed offline with `cast sig`).
export const SEL = {
  riskOf: '0x9192724e',
  scoreBpsOf: '0xcf4bec05',
  updatedAt: '0xe46f7d51',
  reserve: '0x432ced04',
  exposure: '0xfbab20a1',
  claimed: '0xdfcae622',
  guards: '0xc9ffc90c',
  owner: '0x8da5cb5b',
  balanceOf: '0x70a08231',
  setRisk: '0x95d0504b',
  // GuardianBlocked(address) custom error
  guardianBlocked: '0xcd02b39b',
} as const;

// Prebuilt calldata for PoolSwapTest.swap(BASE→RUG, exactIn 50e18).
// Will revert with GuardianBlocked(RUG) while RUG = DANGER on the oracle.
export const SWAP_CALLDATA_RUG_BUY =
  '0x2229d0b4000000000000000000000000b437e753142759a386548ef00e8e1775d1a2a338000000000000000000000000b585abbb035832c0b357a66f1c338c0a34d414820000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000c68e22886fa481ad38bc4810b12bdf9991f350c00000000000000000000000000000000000000000000000000000000000000001fffffffffffffffffffffffffffffffffffffffffffffffd4a1c50e94e78000000000000000000000000000000000000000000000000000000000001000276a40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000';

export const RISK_LABELS = ['UNKNOWN', 'OK', 'CAUTION', 'DANGER'] as const;
export type RiskLevel = (typeof RISK_LABELS)[number];

// ---------- RPC primitives ----------

type RpcParam = unknown;

let _id = 1;
async function rpc<T = unknown>(method: string, params: RpcParam[] = []): Promise<T> {
  const res = await fetch(XLAYER_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: _id++, method, params }),
  });
  const json = await res.json();
  if (json.error) {
    const err: Error & { data?: string } = new Error(json.error.message || 'RPC error');
    err.data = json.error.data;
    throw err;
  }
  return json.result;
}

function pad32(hex: string): string {
  return hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

function encodeCall(selector: string, args: string[] = []): string {
  return selector + args.map(pad32).join('');
}

async function ethCall(to: string, data: string, from?: string): Promise<string> {
  const call: Record<string, string> = { to, data };
  if (from) call.from = from;
  return rpc<string>('eth_call', [call, 'latest']);
}

// ---------- Decoders ----------

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function hexToAddress(hex: string): string {
  return '0x' + hex.slice(-40);
}

function hexToBool(hex: string): boolean {
  return BigInt(hex) !== 0n;
}

// ---------- Read API ----------

export type GuardianHookState = {
  oracleOwner: string;
  hookOwner: string;
  hookOracle: string;
  riskOf: { rug: number; base: number };
  scoreBps: number;
  reserveWei: bigint;
  exposureWei: bigint; // agent address (the demo buyer)
  claimedByAgent: boolean;
  guards: {
    protectedToken: string;
    baseToken: string;
    refundCapBps: number;
    initialized: boolean;
  };
  baseBalanceOfHookWei: bigint;
  fetchedAt: number;
};

export async function fetchGuardianHookState(): Promise<GuardianHookState> {
  const id = pad32(POOL_ID);
  const agentArg = pad32(ADDR.agent);

  const [
    oracleOwner,
    hookOwner,
    hookOracleAddr,
    riskRug,
    riskBase,
    score,
    reserveHex,
    exposureHex,
    claimedHex,
    guardsHex,
    baseBalHookHex,
  ] = await Promise.all([
    ethCall(ADDR.riskOracle, SEL.owner).then(hexToAddress),
    ethCall(ADDR.guardianHook, SEL.owner).then(hexToAddress),
    ethCall(ADDR.guardianHook, '0x7dc0d1d0' /* oracle() */).catch(() => '0x').then(hexToAddress),
    ethCall(ADDR.riskOracle, encodeCall(SEL.riskOf, [ADDR.rug])).then((h) => Number(hexToBigInt(h))),
    ethCall(ADDR.riskOracle, encodeCall(SEL.riskOf, [ADDR.base])).then((h) => Number(hexToBigInt(h))),
    ethCall(ADDR.riskOracle, encodeCall(SEL.scoreBpsOf, [ADDR.rug])).then((h) => Number(hexToBigInt(h))),
    ethCall(ADDR.guardianHook, SEL.reserve + id),
    ethCall(ADDR.guardianHook, SEL.exposure + id + agentArg),
    ethCall(ADDR.guardianHook, SEL.claimed + id + agentArg),
    ethCall(ADDR.guardianHook, SEL.guards + id),
    ethCall(ADDR.base, encodeCall(SEL.balanceOf, [ADDR.guardianHook])),
  ]);

  // guards layout: (address, address, uint16, bool) — 4 x 32-byte words
  const w0 = guardsHex.slice(2, 66);
  const w1 = guardsHex.slice(66, 130);
  const w2 = guardsHex.slice(130, 194);
  const w3 = guardsHex.slice(194, 258);

  return {
    oracleOwner,
    hookOwner,
    hookOracle: hookOracleAddr,
    riskOf: { rug: riskRug, base: riskBase },
    scoreBps: score,
    reserveWei: hexToBigInt(reserveHex),
    exposureWei: hexToBigInt(exposureHex),
    claimedByAgent: hexToBool(claimedHex),
    guards: {
      protectedToken: hexToAddress('0x' + w0),
      baseToken: hexToAddress('0x' + w1),
      refundCapBps: Number(hexToBigInt('0x' + w2)),
      initialized: hexToBool('0x' + w3),
    },
    baseBalanceOfHookWei: hexToBigInt(baseBalHookHex),
    fetchedAt: Date.now(),
  };
}

// ---------- Wallet: "Try the rug-proof swap" ----------

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

export type SwapAttemptResult =
  | { kind: 'reverted'; reason: string; rawData?: string }
  | { kind: 'reverted-unknown'; rawError: string }
  | { kind: 'succeeded-unexpected'; txHash: string }
  | { kind: 'no-wallet' }
  | { kind: 'wrong-chain'; chainIdSeen: string };

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error('No injected wallet found. Install MetaMask / OKX Wallet.');
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  return accounts[0];
}

export async function ensureXLayer(): Promise<void> {
  if (!window.ethereum) throw new Error('No injected wallet');
  const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
  if (chainId.toLowerCase() === XLAYER_CHAIN_ID_HEX) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: XLAYER_CHAIN_ID_HEX }],
    });
  } catch {
    // Add chain if missing
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: XLAYER_CHAIN_ID_HEX,
          chainName: 'X Layer',
          rpcUrls: [XLAYER_RPC],
          nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
          blockExplorerUrls: ['https://www.oklink.com/x-layer'],
        },
      ],
    });
  }
}

type TxReceipt = {
  transactionHash: string;
  status: '0x0' | '0x1';
  gasUsed?: string;
  blockNumber?: string;
};

async function waitForReceipt(txHash: string, timeoutMs = 120_000): Promise<TxReceipt> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const receipt = await rpc<TxReceipt | null>('eth_getTransactionReceipt', [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error('Timed out waiting for transaction receipt');
}

async function sendWalletTx(input: { from: string; to: string; data: string; gas: string }): Promise<string> {
  if (!window.ethereum) throw new Error('No injected wallet found');
  const txHash = (await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from: input.from, to: input.to, data: input.data, gas: input.gas }],
  })) as string;
  return txHash;
}

export type BroadcastSwapResult = {
  txHash: string;
  status: 'reverted' | 'success';
  gasUsedHex?: string;
};

export type AgentSwapBroadcastResult = {
  txHash: string;
  status: 'reverted' | 'success';
  from?: string;
  to?: string;
  gasUsed?: string;
  blockNumber?: number;
};

export async function triggerAgentWalletSwap(): Promise<AgentSwapBroadcastResult> {
  const res = await fetch('/api/public/guardian-hook/try-swap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(typeof json?.message === 'string' ? json.message : 'Agent swap broadcast failed');
  }
  return {
    txHash: json.txHash as string,
    status: json.status as 'reverted' | 'success',
    from: typeof json.from === 'string' ? json.from : undefined,
    to: typeof json.to === 'string' ? json.to : undefined,
    gasUsed: typeof json.gasUsed === 'string' ? json.gasUsed : undefined,
    blockNumber: typeof json.blockNumber === 'number' ? json.blockNumber : undefined,
  };
}

export async function broadcastRealSwap(from: string): Promise<BroadcastSwapResult> {
  const txHash = await sendWalletTx({
    from,
    to: ADDR.swapHelper,
    data: SWAP_CALLDATA_RUG_BUY,
    gas: '0x7a120', // 500k
  });
  const receipt = await waitForReceipt(txHash);
  return {
    txHash,
    status: receipt.status === '0x1' ? 'success' : 'reverted',
    gasUsedHex: receipt.gasUsed,
  };
}

export async function broadcastSetRisk(
  from: string,
  risk: 1 | 2 | 3,
  scoreBps = risk === 1 ? 9000 : risk === 2 ? 5000 : 1000,
): Promise<BroadcastSwapResult> {
  const data = encodeCall(SEL.setRisk, [ADDR.rug, `0x${risk.toString(16)}`, `0x${scoreBps.toString(16)}`]);
  const txHash = await sendWalletTx({
    from,
    to: ADDR.riskOracle,
    data,
    gas: '0x186a0', // 100k
  });
  const receipt = await waitForReceipt(txHash);
  return {
    txHash,
    status: receipt.status === '0x1' ? 'success' : 'reverted',
    gasUsedHex: receipt.gasUsed,
  };
}

/**
 * Simulate the rug-buy swap from the user's wallet via eth_call.
 * No tokens move. No gas spent. The hook reverts BEFORE token transfer in beforeSwap,
 * so users without BASE balance still see GuardianBlocked(RUG) as the failure reason.
 */
export async function simulateRugProofSwap(from: string): Promise<SwapAttemptResult> {
  // Check chain if a wallet is connected, but don't require one — direct RPC works either way.
  if (window.ethereum) {
    try {
      const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      if (chainId.toLowerCase() !== XLAYER_CHAIN_ID_HEX) {
        return { kind: 'wrong-chain', chainIdSeen: chainId };
      }
    } catch {
      // ignore, fall through to direct RPC
    }
  }

  // Direct RPC eth_call. We get clean JSON-RPC error with the wrapped revert data
  // so decoding GuardianBlocked is reliable across wallets.
  try {
    const result = await rpc<string>('eth_call', [
      { from, to: ADDR.swapHelper, data: SWAP_CALLDATA_RUG_BUY },
      'latest',
    ]);
    return { kind: 'succeeded-unexpected', txHash: result };
  } catch (err: unknown) {
    return decodeSwapError(err);
  }
}

function extractErrorData(err: unknown): string | undefined {
  const anyErr = err as { data?: unknown; message?: string; error?: { data?: unknown; message?: string } };
  if (typeof anyErr?.data === 'string') return anyErr.data;
  if (anyErr?.data && typeof anyErr.data === 'object') {
    const inner = anyErr.data as { data?: unknown; originalError?: { data?: string } };
    if (typeof inner.data === 'string') return inner.data;
    if (inner.originalError?.data) return inner.originalError.data;
  }
  if (anyErr?.error && typeof anyErr.error === 'object') {
    const e = anyErr.error;
    if (typeof e.data === 'string') return e.data;
  }
  return undefined;
}

function decodeSwapError(err: unknown): SwapAttemptResult {
  const anyErr = err as { message?: string };
  const dataHex = extractErrorData(err);

  // The PoolManager wraps hook reverts in WrappedError(address,bytes4,bytes,bytes)
  // so GuardianBlocked(address) lives inside the returnData field.
  // Search for the selector anywhere in the hex blob and pull the next 32-byte word.
  if (dataHex) {
    const sel = SEL.guardianBlocked.slice(2).toLowerCase();
    const cleaned = dataHex.toLowerCase();
    const idx = cleaned.indexOf(sel);
    if (idx >= 0) {
      const tokenWord = cleaned.slice(idx + 8, idx + 8 + 64);
      const token = '0x' + tokenWord.slice(-40);
      return {
        kind: 'reverted',
        reason: `GuardianBlocked(${token})`,
        rawData: dataHex,
      };
    }
  }

  // Some wallets stringify the revert reason into the message.
  if (anyErr?.message && /GuardianBlocked/i.test(anyErr.message)) {
    return { kind: 'reverted', reason: 'GuardianBlocked(RUG)', rawData: dataHex };
  }

  return {
    kind: 'reverted-unknown',
    rawError: anyErr?.message ?? JSON.stringify(err),
  };
}

// ---------- Demo transactions ----------

export const DEMO_TXS = [
  {
    step: 'A',
    label: 'OK swap succeeds (100 BASE → RUG)',
    hash: '0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d',
  },
  {
    step: 'B',
    label: 'setRisk(RUG, DANGER)',
    hash: '0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e',
  },
  {
    step: 'C',
    label: 'Swap reverts → GuardianBlocked(RUG)',
    hash: '0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4',
  },
  {
    step: 'D',
    label: 'claimRefund — buyer recovers BASE from reserve',
    hash: '0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696',
  },
] as const;

export const AGENT_PUSH_TX =
  '0xfb17a276146d734431abd1531c652b631d96515550a2c4c5ecb4ae203ca3a393';

export function okLinkTx(hash: string): string {
  return `https://www.oklink.com/x-layer/tx/${hash}`;
}

export function okLinkAddr(addr: string): string {
  return `https://www.oklink.com/x-layer/address/${addr}`;
}

export function formatEther(wei: bigint, decimals = 4): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals);
  return `${whole.toString()}.${fracStr}`;
}

export function shortAddr(a: string, left = 6, right = 4): string {
  if (!a || a.length < left + right + 2) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

// ---------- Real broadcast: sign a swap, broadcast it, show its receipt ----------

export type BroadcastReceipt = {
  status: '0x0' | '0x1';
  gasUsed: string;
  blockNumber: string;
};

export type BroadcastStep =
  | { kind: 'idle' }
  | { kind: 'awaiting-signature' }
  | { kind: 'submitted'; txHash: string }
  | { kind: 'reverted'; txHash: string; receipt: BroadcastReceipt }
  | { kind: 'succeeded'; txHash: string; receipt: BroadcastReceipt }
  | { kind: 'rejected'; reason: string };

/**
 * Send a real, signed BASE→RUG swap to the live SwapHelper.
 * Returns the tx hash the moment the wallet broadcasts it.
 * We pass an explicit `gas` to bypass the wallet's pre-flight simulation —
 * otherwise wallets won't broadcast a tx they think will revert.
 */
export async function broadcastBuyRug(from: string): Promise<string> {
  if (!window.ethereum) throw new Error('No injected wallet');
  const txHash = (await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: ADDR.swapHelper,
        data: SWAP_CALLDATA_RUG_BUY,
        gas: '0x7a120', // 500_000 gas — enough for the failure or success path
      },
    ],
  })) as string;
  return txHash;
}

// ---------- "What if RUG were OK?" — state-override simulation ----------

// Storage slot of `_risk[RUG]` inside RiskOracle.
//   keccak256(abi.encode(RUG_ADDRESS, uint256(1)))
//   slot 1 because layout is: 0=owner, 1=_risk, 2=_score, 3=_updatedAt
export const ORACLE_RUG_RISK_SLOT =
  '0x57231386ff59acdcc7604cf4c1efccbca5e9c6270b1c50e90a29ec7705821fe5';

export type AllowCaseResult =
  | { kind: 'succeeded'; baseIn: bigint; rugOut: bigint; rawResult: string }
  | { kind: 'reverted-still'; reason: string }
  | { kind: 'override-not-supported'; message: string };

/**
 * Simulate the same BASE→RUG swap, but pretend RUG is OK on the oracle.
 * Uses eth_call's `stateDiff` override — no real state change, no gas, no tx.
 * Shows judges the SAME call succeeds when only the oracle bit changes.
 */
export async function simulateAllowCaseSwap(from: string): Promise<AllowCaseResult> {
  try {
    const result = await rpc<string>('eth_call', [
      { from, to: ADDR.swapHelper, data: SWAP_CALLDATA_RUG_BUY },
      'latest',
      {
        [ADDR.riskOracle]: {
          stateDiff: {
            [ORACLE_RUG_RISK_SLOT]:
              '0x0000000000000000000000000000000000000000000000000000000000000001',
          },
        },
      },
    ]);

    // Decode BalanceDelta = int256 packing two int128:
    //   amount0 = upper 128 bits (BASE)
    //   amount1 = lower 128 bits (RUG)
    const hex = result.replace(/^0x/, '').padStart(64, '0');
    const amount0 = signedInt128(hex.slice(0, 32));
    const amount1 = signedInt128(hex.slice(32, 64));
    // BASE is currency0, RUG is currency1 (BASE address < RUG address numerically).
    const baseIn = amount0 < 0n ? -amount0 : amount0;
    const rugOut = amount1 < 0n ? -amount1 : amount1;
    return { kind: 'succeeded', baseIn, rugOut, rawResult: result };
  } catch (err) {
    const anyErr = err as { message?: string };
    const msg = anyErr?.message ?? String(err);
    if (/state override|not supported|invalid argument/i.test(msg)) {
      return { kind: 'override-not-supported', message: msg };
    }
    const decoded = decodeSwapError(err);
    return {
      kind: 'reverted-still',
      reason: decoded.kind === 'reverted' ? decoded.reason : msg,
    };
  }
}

function signedInt128(hex32: string): bigint {
  const u = BigInt('0x' + hex32);
  const signBit = 1n << 127n;
  return u & signBit ? u - (1n << 128n) : u;
}

// ---------- Arbitrary-token scan simulator ----------

export type ScanOutcome = {
  // From the live RUGNOT agent (if reachable)
  agent?: {
    level: 'GO' | 'CAUTION' | 'DANGER';
    score: number; // 0-100
    executionTimeMs: number;
    passedChecks: number;
    totalChecks: number;
  };
  agentError?: string;
  // On-chain oracle direct read
  onchain: {
    risk: number; // 0=UNKNOWN 1=OK 2=CAUTION 3=DANGER
    label: string;
    scoreBps: number;
    updatedAt: number; // unix
  };
  // Derived: would the hook block this swap?
  hookDecision: 'BLOCK' | 'ALLOW' | 'UNKNOWN';
};

export async function scanTokenForSimulation(token: string): Promise<ScanOutcome> {
  const addr = token.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error('Invalid X Layer address.');
  }

  // Fire both in parallel — agent (if up) + on-chain oracle (always reachable)
  const [agentRes, riskRes, scoreRes, updRes] = await Promise.allSettled([
    fetch(`/api/public/scan?token=${addr}`, { signal: AbortSignal.timeout(10_000) }).then(async (r) => {
      if (!r.ok) throw new Error(`scan API ${r.status}`);
      return r.json() as Promise<{
        level: 'GO' | 'CAUTION' | 'DANGER';
        score: number;
        executionTimeMs: number;
        checks: { passed: boolean }[];
      }>;
    }),
    ethCall(ADDR.riskOracle, encodeCall(SEL.riskOf, [addr])).then((h) => Number(hexToBigInt(h))),
    ethCall(ADDR.riskOracle, encodeCall(SEL.scoreBpsOf, [addr])).then((h) => Number(hexToBigInt(h))),
    ethCall(ADDR.riskOracle, encodeCall(SEL.updatedAt, [addr])).then((h) => Number(hexToBigInt(h))),
  ]);

  const out: ScanOutcome = {
    onchain: {
      risk: riskRes.status === 'fulfilled' ? riskRes.value : 0,
      label: '',
      scoreBps: scoreRes.status === 'fulfilled' ? scoreRes.value : 0,
      updatedAt: updRes.status === 'fulfilled' ? updRes.value : 0,
    },
    hookDecision: 'UNKNOWN',
  };
  out.onchain.label = RISK_LABELS[out.onchain.risk] ?? 'UNKNOWN';

  if (agentRes.status === 'fulfilled') {
    const v = agentRes.value;
    out.agent = {
      level: v.level,
      score: v.score,
      executionTimeMs: v.executionTimeMs,
      passedChecks: v.checks?.filter((c) => c.passed).length ?? 0,
      totalChecks: v.checks?.length ?? 0,
    };
  } else {
    out.agentError =
      agentRes.reason instanceof Error
        ? agentRes.reason.message
        : 'agent backend unreachable';
  }

  // Hook decision: prefer on-chain (that's what the actual contract reads).
  // If on-chain is UNKNOWN, fall back to agent verdict as a what-if.
  const onchainDanger = out.onchain.risk === 3;
  const onchainOk = out.onchain.risk === 1 || out.onchain.risk === 2;
  if (onchainDanger) out.hookDecision = 'BLOCK';
  else if (onchainOk) out.hookDecision = 'ALLOW';
  else if (out.agent?.level === 'DANGER') out.hookDecision = 'BLOCK';
  else if (out.agent && (out.agent.level === 'GO' || out.agent.level === 'CAUTION')) out.hookDecision = 'ALLOW';
  else out.hookDecision = 'UNKNOWN';

  return out;
}

// A few well-known X Layer tokens for one-click demos.
// (Same addresses RUGNOT's existing /scan page uses.)
export const SAMPLE_TOKENS = [
  { label: 'USDT (clean)', address: '0x779ded0c9e1022225f8e0630b35a9b54be713736', expected: 'ALLOW' as const },
  { label: 'WOKB (clean)', address: '0x75E1AB5E0e3BA13b3520349F069350441CF53c0A', expected: 'ALLOW' as const },
  { label: 'RUG (our mock — DANGER)', address: ADDR.rug, expected: 'BLOCK' as const },
];
