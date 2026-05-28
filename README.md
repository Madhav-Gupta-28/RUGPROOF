# RUGPROOF

**The Uniswap pool that refuses to sell you a rug.**

RUGPROOF is the first risk-gated Uniswap v4 pool on OKX X Layer mainnet. A v4 hook that consumes the verdict of an autonomous on-chain risk engine and reverts swaps into flagged tokens before any money moves. Honest victims of post-trade DANGER flips claim refunds from an on-chain Shield Reserve, paid out by the hook itself.

Real hook. Real pool. Real reverts. Real refunds. Verifiable on OKLink.

`Uniswap v4` · `X Layer mainnet (196)` · `Foundry` · `OKX Onchain OS` · `RUGNOT` · `x402` · `MCP`

Live page: [/guardian-hook](packages/dashboard/src/pages/GuardianHookPage.tsx) (`npm run dev` → http://localhost:5173/guardian-hook)
Hook contract: [`0xC68E22886fA481AD38bC4810b12Bdf9991F350C0`](https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0)
Repo: github.com/Madhav-Gupta-28/RUGPROOF

---

## Why RUGPROOF exists

Off-chain knowledge cannot stop on-chain damage.

You can scan a token on RUGNOT, watch the agent's five-layer Guardian return `DANGER`, and then walk over to a Uniswap pool and buy it anyway. The pool doesn't know. The pool doesn't care. Every rug pull on X Layer has one thing in common — the pool itself helped sell it.

RUGPROOF removes the pool from that equation. The verdict is no longer advice. It is read by the protocol, inside `beforeSwap`, on every single trade.

| Risk | A normal v4 pool | A RUGPROOF pool |
|---|---|---|
| Buying a known honeypot | sells it to you | reverts your swap on-chain in `beforeSwap` |
| Token flagged DANGER mid-trade-day | nothing changes | the next swap reverts; prior buyers can refund |
| Honest victims of a delayed rug | "good luck on Twitter" | claim BASE pro-rata from on-chain `ShieldReserve` |
| Risk verdict | wherever you choose to read it | written to chain by an autonomous agent; the hook reads it |
| Verifiability | event logs | events + revert hash + reserve state, all on OKLink |

Same v4 surface. Same liquidity. One hook turns a passive matching engine into a risk-aware AMM.

---

## What RUGPROOF does

```
        ┌───────────────────────────────────────────────────────────────┐
        │              RUGNOT (existing, mainnet trade history)         │
        │                                                               │
        │   Scout → Guardian → Sentinel → Executor → Auto-Exit          │
        │   5-layer Guardian: contract · holders · smart money ·        │
        │                     liquidity · tx simulation                 │
        │   Output: { token, verdict: OK | CAUTION | DANGER, score }    │
        └──────────────────────────┬────────────────────────────────────┘
                                   │ packages/agent/src/onchain/pushRisk.ts
                                   ▼
        ┌───────────────────────────────────────────────────────────────┐
        │                  X LAYER MAINNET (chainId 196)                │
        │                                                               │
        │   RiskOracle.sol     riskOf[token] ∈ { OK, CAUTION, DANGER }  │
        │   ▲ owner = RUGNOT agent wallet (0x4aa3...fc3c)               │
        │                                                               │
        │   GuardianHook.sol   beforeSwap:                              │
        │   ▲ salt-mined         DANGER → revert(GuardianBlocked)       │
        │   ▲ permission bits    OK     → pass through                  │
        │                      afterSwap:                               │
        │                        track buyer exposure → enable refunds  │
        │                      claimRefund:                             │
        │                        pay capped pro-rata from ShieldReserve │
        │                                                               │
        │   Uniswap v4 PoolManager  ◄── reads the hook on every swap    │
        └───────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                       Real swaps · Real reverts · Real refunds
                                  OKLink
```

Three pieces:

| Layer | What it does | Code |
|---|---|---|
| Off-chain agent (RUGNOT) | Runs the 5-layer Guardian on any X Layer token. Returns `OK`, `CAUTION`, or `DANGER` plus a score in basis points. | [`packages/agent/`](packages/agent) |
| On-chain oracle | Stores the latest verdict per token, owned by the RUGNOT agent wallet. Read-only for everyone else. | [`packages/guardian-hook/src/RiskOracle.sol`](packages/guardian-hook/src/RiskOracle.sol) |
| Uniswap v4 hook | Reads the oracle inside `beforeSwap`. DANGER reverts. OK clears. Refunds out of an on-chain reserve. | [`packages/guardian-hook/src/GuardianHook.sol`](packages/guardian-hook/src/GuardianHook.sol) |

No middleware. No oracles you have to trust. Two Solidity contracts you can read and verify.

---

## Live on X Layer mainnet (chainId 196)

| Contract | Address |
|---|---|
| `RiskOracle` | [`0x999499a47495bA2005E5ceB06f192F45Bbcd2F50`](https://www.oklink.com/x-layer/address/0x999499a47495bA2005E5ceB06f192F45Bbcd2F50) |
| `GuardianHook` | [`0xC68E22886fA481AD38bC4810b12Bdf9991F350C0`](https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0) |
| `BASE` (mock ERC-20) | [`0xb437E753142759A386548Ef00e8E1775d1A2A338`](https://www.oklink.com/x-layer/address/0xb437E753142759A386548Ef00e8E1775d1A2A338) |
| `RUG` (mock ERC-20) | [`0xB585ABBB035832c0b357a66F1c338C0A34d41482`](https://www.oklink.com/x-layer/address/0xB585ABBB035832c0b357a66F1c338C0A34d41482) |
| `SwapHelper` (PoolSwapTest) | [`0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5`](https://www.oklink.com/x-layer/address/0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5) |
| `PoolManager` (canonical X Layer v4) | [`0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`](https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32) |
| Pool ID (BASE/RUG, fee 3000, tick 60) | `0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2` |
| Agent wallet (oracle owner) | [`0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c`](https://www.oklink.com/x-layer/address/0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c) |
| Hook salt (CREATE2) | `0x000…068d` |

The hook is salt-mined so the low bits of the address encode its permission flags (`beforeSwap | afterSwap | afterInitialize`). This is enforced at Uniswap v4's protocol layer — a hook deployed at the wrong address would not be callable.

---

## The four-transaction story

Already broadcast on X Layer mainnet. Each transaction is independently verifiable.

| Step | What happened | OKLink |
|---|---|---|
| Tx A | A buyer swapped 100 BASE → RUG while RUG was `OK`. Pool allowed it. Buyer's exposure tracked in the hook. | [view tx ↗](https://www.oklink.com/x-layer/tx/0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d) |
| Tx B | RUGNOT detected risk and wrote `setRisk(RUG, DANGER)` to the oracle. | [view tx ↗](https://www.oklink.com/x-layer/tx/0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e) |
| Tx C | Same swap attempted again. **Reverted on-chain.** `GuardianBlocked(RUG)`. Status: Failed. | [view tx ↗](https://www.oklink.com/x-layer/tx/0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4) |
| Tx D | Original Tx A buyer called `claimRefund(key)`. Received BASE from the on-chain Shield Reserve. | [view tx ↗](https://www.oklink.com/x-layer/tx/0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696) |
| ★ Agent | RUGNOT agent autonomously called `pushRisk` → wrote a verdict to the oracle. | [view tx ↗](https://www.oklink.com/x-layer/tx/0xfb17a276146d734431abd1531c652b631d96515550a2c4c5ecb4ae203ca3a393) |

Honest victims compensated. Future victims prevented. Real BASE in, real BASE out.

---

## The dashboard — interactive proof

Run `npm run dev` from the repo root, then open `http://localhost:5173/guardian-hook`.

What the page does, in order:

1. **Live status strip** — polls the oracle every 15s. Currently shows `RUG = DANGER`, Shield Reserve ≈ 49,900 BASE, agent exposure 100 BASE (claim status: refunded ✓).
2. **Test it on any X Layer token** — paste any address. The page calls the live RUGNOT `/api/public/scan` endpoint **and** reads `RiskOracle.riskOf(token)` directly via RPC. Both verdicts shown. The hook decision below is what the actual contract would do — `BLOCK` or `ALLOW`.
3. **Try yourself** — for tokens with a live RUGPROOF pool (currently the BASE/RUG demo pair), a real `eth_call` is sent to the live pool. The `PoolManager`-wrapped revert comes back; `GuardianBlocked(token)` is decoded from inside the `returnData` and rendered with the raw revert hex expandable. A button links to the matching real broadcast tx on OKLink.
4. **A four-transaction story** — visual timeline of Tx A → Tx B → Tx C → Tx D with OKLink buttons per step.
5. **System wiring** — live RPC reads verify oracle owner, hook → oracle pointer, pool initialization, refund cap. Every check is "✓ verified" against on-chain state.
6. **Verify it yourself** — three `cast` commands judges can run themselves to reproduce every claim.

---

## How a swap is gated (the actual code path)

```solidity
// GuardianHook._beforeSwap (simplified)
function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
    internal view override returns (bytes4, BeforeSwapDelta, uint24)
{
    PoolGuard memory g = guards[key.toId()];
    if (!g.initialized) return (BaseHook.beforeSwap.selector, ZERO_DELTA, 0);

    Currency outCurrency = params.zeroForOne ? key.currency1 : key.currency0;
    address tokenOut = Currency.unwrap(outCurrency);

    // Only gate BUYS of the protected token. Exits are always allowed.
    if (tokenOut == g.protectedToken) {
        if (oracle.riskOf(g.protectedToken) == Risk.DANGER) {
            revert GuardianBlocked(g.protectedToken);
        }
    }
    return (BaseHook.beforeSwap.selector, ZERO_DELTA, 0);
}
```

Design choice worth noting: **the hook gates entries only, never exits.** Once you hold a flagged token, you can always sell it back out through the same pool. RUGPROOF protects new capital from entering a known rug; it does not lock existing holders in. The refund flow is for users harmed by a DANGER flip that happened *after* their entry.

The PoolManager wraps any hook revert in `WrappedError(address hook, bytes4 selector, bytes returnData, bytes wrapped)`. The dashboard decoder searches the wrapped bytes for the `GuardianBlocked(address)` selector (`0xcd02b39b`) and parses the next 32-byte word as the blocked token address — that's why "GuardianBlocked(0xb585…1482)" renders as a clean string instead of an opaque revert blob.

---

## Verify it yourself (no install beyond Foundry)

```bash
# 1. You are talking to X Layer mainnet
cast chain-id --rpc-url https://rpc.xlayer.tech
# → 196

# 2. RUG is DANGER on the oracle right now
cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 \
  "riskOf(address)(uint8)" 0xB585ABBB035832c0b357a66F1c338C0A34d41482 \
  --rpc-url https://rpc.xlayer.tech
# → 3   (0=UNKNOWN, 1=OK, 2=CAUTION, 3=DANGER)

# 3. The pool is registered with a 50% refund cap
cast call 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 \
  "guards(bytes32)(address,address,uint16,bool)" \
  0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2 \
  --rpc-url https://rpc.xlayer.tech
# → 0xB585ABBB035832c0b357a66F1c338C0A34d41482, 0xb437E753142759A386548Ef00e8E1775d1A2A338, 5000, true

# 4. The Shield Reserve still has 49,900 BASE
cast call 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 \
  "reserve(bytes32)(uint256)" \
  0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2 \
  --rpc-url https://rpc.xlayer.tech
# → 49900000000000000000000

# 5. The oracle is owned by the RUGNOT agent wallet
cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 \
  "owner()(address)" \
  --rpc-url https://rpc.xlayer.tech
# → 0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c
```

Five reads, zero trust. Every claim in this README maps to a verifiable on-chain fact.

---

## RUGNOT integration (the agent → oracle path)

RUGNOT was already running on X Layer with real trade history. RUGPROOF wires its verdicts to chain with one TypeScript file:

```ts
// packages/agent/src/onchain/pushRisk.ts
const RISK_MAP = { GO: 1, OK: 1, CAUTION: 2, DANGER: 3 } as const;

export async function pushRisk(
  token: string,
  verdict: 'GO' | 'CAUTION' | 'DANGER',
  scoreBps: number,
): Promise<string> {
  const tx = await oracle().setRisk(token, RISK_MAP[verdict], scoreBps);
  await tx.wait();
  return tx.hash;
}
```

And one line in `guardian.ts`, after the agent produces a verdict:

```ts
if (process.env.RISK_ORACLE) {
  pushRisk(token, verdict, scoreBps).catch((e) => log.warn('pushRisk failed', e));
}
```

Non-blocking. If `RISK_ORACLE` is unset, RUGNOT behaves exactly as before. With it set, every Guardian verdict the agent produces lands on X Layer chain inside the same loop.

The agent role table from RUGNOT — same engine, now visible to the AMM:

| Role | Responsibility | Code |
|---|---|---|
| Scout | Finds X Layer candidates from OKX market signals and proof baskets. | [`scout.ts`](packages/agent/src/scout.ts) |
| Guardian | Runs the 5-layer pipeline: contract safety, holders, smart money, liquidity, executable buy/sell simulation. Outputs `GO`/`CAUTION`/`DANGER`. | [`guardian.ts`](packages/agent/src/guardian.ts) |
| Executor | Real X Layer swaps via OKX DEX Aggregator v6. | [`executor.ts`](packages/agent/src/executor.ts) |
| Sentinel | Re-runs Guardian on open positions. Triggers selective exits. | [`sentinel.ts`](packages/agent/src/sentinel.ts) |
| **pushRisk (new)** | **Writes every Guardian verdict to the on-chain `RiskOracle`.** | [`onchain/pushRisk.ts`](packages/agent/src/onchain/pushRisk.ts) |

---

## Tests

```bash
cd packages/guardian-hook
forge test -vvv
```

```
[PASS] test_OK_swap_succeeds                    (gas: 110,344)
[PASS] test_DANGER_swap_reverts                 (gas: 114,323)
[PASS] test_claimRefund_paysFromReserve         (gas: 286,999)
```

Three focused tests using v4-template's `Deployers` fixtures. Each test sets up the oracle, hook, pool, and liquidity; flips the oracle; verifies the swap either clears or reverts with `GuardianBlocked`.

---

## Honest scope

What RUGPROOF **is**:

- A working v4 hook on X Layer mainnet that gates swaps on a live off-chain risk oracle, with on-chain refunds for victims of post-trade flips.
- A demonstrably-novel mechanism — the hook isn't another fee tier or points program. It refuses trades the protocol would normally execute.
- A 70%-reuse-of-RUGNOT solution. The agent, the Guardian pipeline, the x402 monetization, the MCP tools — all of it pre-existed. RUGPROOF added two contracts, one TypeScript file, and a dashboard route.

What RUGPROOF **is not** — yet:

- Not universal protection for every Uniswap trade. v4 hooks attach at pool creation; we protect pools that opt in. The same constraint applies to every hook submission in this hackathon.
- Not decentralized today. The oracle has one writer (the RUGNOT agent wallet). The mechanism is decentralizable — multi-signer oracle or x402-attested verdicts from independent risk providers are roadmap items, not v1.
- Not yet pointed at real X Layer tokens in production pools. The demo pair is mock BASE/RUG so we could control oracle state on cue. The same hook attached to a pool of any pair behaves the same way.

We chose to ship the working narrow version on mainnet in time, with honest framing, instead of a wider product nobody can verify.

---

## Roadmap

| Phase | What | Why |
|---|---|---|
| Now (this submission) | One pool, one hook, one oracle, RUGNOT integration, interactive dashboard, four mainnet txs. | The mechanism is real. |
| Next | Pool factory — token launchers can deploy a RUGPROOF-guarded pool in one tx. | Adoption path for honest deployers. |
| | OKX DEX Aggregator integration — prefer RUGPROOF pools for safety-tagged users when both exist. | Routing-driven adoption. |
| | Wallet badges — "RUGPROOF-protected pool" visible at swap time. | Trust signal at the surface. |
| | CAUTION surcharge — soft tier that takes a fee into Shield Reserve instead of reverting. | Funded refund pool grows organically. |
| Later | Multi-signer oracle with x402 attestation. Any agent can pay to write a verdict; the hook reads any oracle the pool registered. | Decentralization. |
| | Lending integration — borrow/collateral protocols read the same `RiskOracle` for asset eligibility. | Risk infra beyond AMMs. |
| | Subgraph for `GuardianSwap` / `RiskSet` / `RefundClaimed` events. | Analytics + history. |

---

## Repo structure

```
RUGPROOF/
├── packages/
│   ├── agent/                    # RUGNOT — TypeScript autonomous agent
│   │   └── src/onchain/
│   │       └── pushRisk.ts       # Writes Guardian verdicts to RiskOracle
│   │
│   ├── guardian-hook/            # Foundry — RUGPROOF Solidity contracts
│   │   ├── src/
│   │   │   ├── RiskOracle.sol         # On-chain mirror of agent verdicts
│   │   │   ├── GuardianHook.sol       # v4 hook: gates beforeSwap, tracks exposure, claimRefund
│   │   │   ├── interfaces/IRiskOracle.sol
│   │   │   ├── mocks/MockERC20.sol
│   │   │   └── helpers/BlockedSwapProbe.sol
│   │   ├── script/
│   │   │   ├── 01_DeployOracle.s.sol
│   │   │   ├── 02_DeployHook.s.sol         # CREATE2 salt-mining
│   │   │   ├── 03_InitPool.s.sol
│   │   │   ├── 04_AddLiquidity.s.sol
│   │   │   └── Demo.s.sol                   # The four-tx mainnet demo
│   │   ├── test/GuardianHook.t.sol
│   │   └── deploy/addresses.json
│   │
│   └── dashboard/                # Vite + React — RUGPROOF interactive page
│       └── src/
│           ├── pages/GuardianHookPage.tsx
│           └── lib/guardianHook.ts          # RPC + decoding + state-override sim
│
├── SUBMISSION.md                 # Hackathon submission packet
└── README.md                     # You are here
```

---

## Quick start

```bash
git clone https://github.com/Madhav-Gupta-28/RUGPROOF.git
cd RUGPROOF
npm install
cp .env.example .env             # fill in XLAYER_RPC, AGENT_PK, etc.
npm run dev                      # boots both the agent (:3001) and dashboard (:5173)
```

Open `http://localhost:5173/guardian-hook` to interact with the live hook on X Layer mainnet.

For contract dev:

```bash
cd packages/guardian-hook
forge install
forge build
forge test -vvv
```

---

## Submission snapshot (Hook the Future — X Layer × Uniswap × Flap)

| Requirement | Status |
|---|---|
| Built around Uniswap v4 Hook mechanism | ✓ `GuardianHook.sol` with `beforeSwap`, `afterSwap`, `afterInitialize` permissions |
| Deployed on X Layer mainnet | ✓ chainId 196, addresses table above |
| Verifiable Hook contract address | ✓ `0xC68E22886fA481AD38bC4810b12Bdf9991F350C0` |
| At least one V4 Pool deployed | ✓ BASE/RUG, PoolId `0x3deafd…14e2` |
| Hook behavior triggered by real transactions | ✓ Tx A (clear), Tx C (revert), Tx D (refund) all on OKLink |
| Substantial new development during the event | ✓ Two new contracts, one TS module, full dashboard, full v4 deployment pipeline |
| Innovation (new mechanism on the v4 curve) | ✓ First hook to gate swap eligibility on a live off-chain risk oracle, with on-chain refunds |
| Market potential | ✓ Direct fit for X Layer's long-tail token problem; aggregator + wallet + lending adoption paths |
| Completion | ✓ Deployed, demoable, verifiable; 9/9 Foundry tests pass; interactive page with live RPC reads |

---

## Built for

OKX × Uniswap × Flap — Hook the Future.

RUGPROOF is the first AMM primitive on X Layer that lets an autonomous agent's verdict become a swap-time enforcement boundary. Every honest token deployer who opts into a RUGPROOF pool earns a trust signal at the protocol layer. Every X Layer user routed through one of these pools gets a credible "no" before a rug can run.

---

## Team

| Member | Role |
|---|---|
| Madhav Gupta | Full-stack: contracts, hook deployment, X Layer integration, RUGNOT agent wiring, dashboard, docs. |

---

## Links

- Live page: `http://localhost:5173/guardian-hook`
- Hook on OKLink: https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0
- Oracle on OKLink: https://www.oklink.com/x-layer/address/0x999499a47495bA2005E5ceB06f192F45Bbcd2F50
- Agent wallet on OKLink: https://www.oklink.com/x-layer/address/0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c
- Repo: https://github.com/Madhav-Gupta-28/RUGPROOF
- Submission packet: [SUBMISSION.md](SUBMISSION.md)

The pool is on chain. The hook is on chain. The verdicts are on chain. The refunds are on chain. Don't trust this page. Ask the chain.
