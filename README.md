# RUGPROOF

**The Uniswap pool that refuses to sell you a rug.**

The first risk-gated Uniswap v4 pool on OKX X Layer mainnet. A v4 hook reads an on-chain risk oracle inside `beforeSwap` — flagged tokens cannot be bought, and victims of post-trade DANGER flips claim refunds from an on-chain Shield Reserve, paid by the hook itself.

Real hook. Real pool. Real reverts. Real refunds. Verifiable on OKLink.

| | |
|---|---|
| Hook | [`0xC68E22886fA481AD38bC4810b12Bdf9991F350C0`](https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0) |
| Pool | `0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2` |
| Chain | X Layer mainnet · 196 |
| Live page | `npm run dev` → `localhost:5173/guardian-hook` |
| Stack | Uniswap v4 · Foundry · X Layer · RUGNOT · x402 · MCP |

---

## The gap RUGPROOF closes

You can scan a token, see `DANGER` from an autonomous agent, and still walk over to a Uniswap pool and buy it. The pool doesn't know. Every rug pull on X Layer has one thing in common — **the pool itself helped sell it.**

RUGPROOF moves the verdict from "advice you read" to "enforcement the protocol applies."

| | Normal v4 pool | RUGPROOF pool |
|---|---|---|
| Known honeypot | sells to you | reverts in `beforeSwap` |
| Token flipped to DANGER post-entry | nothing changes | next swap reverts; prior buyers refund |
| Honest victims | Twitter rant | claim BASE from on-chain `ShieldReserve` |
| Verifiability | event logs | full lifecycle on OKLink |

---

## How it works

Three pieces, no middleware:

1. **RUGNOT** (off-chain agent) runs a 5-layer Guardian on any X Layer token → emits `OK` / `CAUTION` / `DANGER` + score.
2. **RiskOracle** (on-chain) — agent writes each verdict here. Read-only for everyone else.
3. **GuardianHook** (Uniswap v4) — reads the oracle inside `beforeSwap`. DANGER reverts. OK clears. Refunds paid from `ShieldReserve` via `claimRefund`.

```
RUGNOT agent ──pushRisk()──► RiskOracle ◄──riskOf()── GuardianHook ◄── PoolManager
                          (X Layer mainnet)              (beforeSwap revert / pass)
```

**Entries only, never exits.** The hook gates buys of flagged tokens. Holders can always exit. Refunds compensate users harmed by a flip that happened *after* their entry.

---

## Live on X Layer mainnet

| Contract | Address |
|---|---|
| `RiskOracle` | [`0x999499…2F50`](https://www.oklink.com/x-layer/address/0x999499a47495bA2005E5ceB06f192F45Bbcd2F50) |
| `GuardianHook` | [`0xC68E22…50C0`](https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0) |
| `BASE` (mock) | [`0xb437E7…A338`](https://www.oklink.com/x-layer/address/0xb437E753142759A386548Ef00e8E1775d1A2A338) |
| `RUG` (mock) | [`0xB585AB…1482`](https://www.oklink.com/x-layer/address/0xB585ABBB035832c0b357a66F1c338C0A34d41482) |
| `PoolManager` (canonical) | [`0x360E68…FB32`](https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32) |
| Pool ID | `0x3deafd…14e2` |
| Agent wallet (oracle owner) | [`0x4aa3af…fc3c`](https://www.oklink.com/x-layer/address/0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c) |

Hook is **CREATE2 salt-mined** so its low-bit permissions match `beforeSwap | afterSwap | afterInitialize`. Enforced at the v4 protocol layer.

---

## The four-transaction story

Already broadcast. Each row is independently verifiable on OKLink.

| Tx | Event | Proof |
|---|---|---|
| **A** | 100 BASE → RUG cleared while RUG was OK | [view ↗](https://www.oklink.com/x-layer/tx/0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d) |
| **B** | RUGNOT wrote `setRisk(RUG, DANGER)` | [view ↗](https://www.oklink.com/x-layer/tx/0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e) |
| **C** | Same swap attempted again → **Reverted on-chain.** `GuardianBlocked(RUG)` | [view ↗](https://www.oklink.com/x-layer/tx/0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4) |
| **D** | Original buyer called `claimRefund` → received BASE from Shield Reserve | [view ↗](https://www.oklink.com/x-layer/tx/0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696) |
| **★** | Agent autonomously wrote a verdict via `pushRisk` | [view ↗](https://www.oklink.com/x-layer/tx/0xfb17a276146d734431abd1531c652b631d96515550a2c4c5ecb4ae203ca3a393) |

Honest victims compensated. Future victims prevented. Real BASE in, real BASE out.

---

## Verify it yourself

```bash
# RUG is DANGER on the oracle right now
cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 \
  "riskOf(address)(uint8)" 0xB585ABBB035832c0b357a66F1c338C0A34d41482 \
  --rpc-url https://rpc.xlayer.tech
# → 3

# Pool is registered, refund cap 50%
cast call 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 \
  "guards(bytes32)(address,address,uint16,bool)" \
  0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2 \
  --rpc-url https://rpc.xlayer.tech
# → RUG, BASE, 5000, true

# Shield Reserve balance
cast call 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 \
  "reserve(bytes32)(uint256)" \
  0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2 \
  --rpc-url https://rpc.xlayer.tech
# → 49,900 BASE
```

Three reads. Zero trust. Every claim above maps to one of these.

---

## Interactive demo

`npm run dev` → http://localhost:5173/guardian-hook

- **Live state** — `RUG = DANGER`, Shield Reserve ≈ 49,900 BASE, polled every 15s
- **Test any X Layer token** — pastes into the simulator → live agent scan + on-chain oracle read → hook would `BLOCK` or `ALLOW`
- **Try yourself** — sends a real `eth_call` to the live pool. `GuardianBlocked(RUG)` decoded from the `PoolManager`-wrapped revert
- **Verify** — same `cast` commands above, one click to copy

---

## Tests

```bash
cd packages/guardian-hook && forge test
```

```
[PASS] test_OK_swap_succeeds              (gas: 110,344)
[PASS] test_DANGER_swap_reverts           (gas: 114,323)
[PASS] test_claimRefund_paysFromReserve   (gas: 286,999)
```

---

## Hackathon compliance — Hook the Future (X Layer × Uniswap × Flap)

| Requirement | Status |
|---|---|
| Built around Uniswap v4 Hook | ✓ `GuardianHook.sol`, salt-mined permissions |
| Deployed on X Layer mainnet | ✓ chainId 196 |
| Verifiable Hook contract address | ✓ `0xC68E22886fA481AD38bC4810b12Bdf9991F350C0` |
| At least one V4 Pool | ✓ BASE/RUG, PoolId `0x3deafd…14e2` |
| Hook behavior triggered by real txs | ✓ Tx A, C, D on OKLink |
| Substantial new development | ✓ 2 contracts, RUGNOT on-chain bridge, full dashboard, deployment pipeline |
| **Innovation** | First v4 hook to gate swap eligibility on a **live off-chain risk oracle**, with on-chain refunds. Not a fee tier, not a points program — refuses trades the protocol would normally execute. |
| **Market potential** | X Layer's long-tail token problem: rugs are the #1 trust killer. Adoption paths: token launchers signaling trust, LPs hunting clean flow, OKX DEX aggregator routing safety-tagged users, wallet badges, lending markets reading the same `RiskOracle`. |
| **Completion** | Deployed, demoable, verifiable. 3/3 hook tests pass. Interactive dashboard with live RPC reads + real broadcast tx as the revert proof. |

---

## Roadmap

- **Pool factory** — one-tx deploy of a RUGPROOF-guarded pool for any token launcher
- **OKX DEX Aggregator** routes safety-tagged users into RUGPROOF pools when both exist
- **CAUTION surcharge tier** — soft fee into the Shield Reserve instead of revert
- **Multi-signer oracle + x402 attestation** — independent risk providers can write verdicts the hook reads
- **Lending integration** — collateral protocols read the same `RiskOracle`
- **Subgraph** for `GuardianSwap` / `RiskSet` / `RefundClaimed`

---

## Honest scope

RUGPROOF protects pools that **opt in** to the hook — same constraint applies to every v4 hook in this hackathon. The oracle has one writer today (the RUGNOT agent wallet); multi-signer and x402-attested verdicts are roadmap. Demo pair is mock BASE/RUG so we could control oracle state on cue; the same hook attached to any real pair behaves the same way.

We shipped the working narrow version on mainnet with honest framing, instead of a wider product nobody can verify.

---

## Quick start

```bash
git clone https://github.com/Madhav-Gupta-28/RUGPROOF.git
cd RUGPROOF && npm install
cp .env.example .env             # XLAYER_RPC, AGENT_PK, RISK_ORACLE, GUARDIAN_HOOK
npm run dev                      # agent :3001 + dashboard :5173
```

Contracts: `cd packages/guardian-hook && forge build && forge test`

---

## Team

| | |
|---|---|
| Madhav Gupta | Contracts, hook deployment, X Layer integration, RUGNOT wiring, dashboard, docs |

Built for **OKX × Uniswap × Flap — Hook the Future**. RUGPROOF is the first AMM primitive on X Layer where an autonomous agent's verdict becomes a swap-time enforcement boundary.

> The pool is on chain. The hook is on chain. The verdicts are on chain. The refunds are on chain. **Don't trust this page. Ask the chain.**
