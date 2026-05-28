# RUGPROOF — Hook the Future Submission Packet

Everything you need to submit. Copy/paste from each section.

---

## 1. One-line pitch

**RUGPROOF — the first rug-resistant Uniswap v4 pool on X Layer. Powered by the RUGNOT Guardian engine: swaps into honeypots revert in `beforeSwap`, and victims of later DANGER flips claim on-chain refunds.**

---

## 2. Live mainnet deployments (chainId 196)

| Contract | Address | OKLink |
|---|---|---|
| RiskOracle | `0x999499a47495bA2005E5ceB06f192F45Bbcd2F50` | https://www.oklink.com/x-layer/address/0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 |
| GuardianHook (v2) | `0xC68E22886fA481AD38bC4810b12Bdf9991F350C0` | https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 |
| BASE (mock ERC20) | `0xb437E753142759A386548Ef00e8E1775d1A2A338` | https://www.oklink.com/x-layer/address/0xb437E753142759A386548Ef00e8E1775d1A2A338 |
| RUG (mock ERC20) | `0xB585ABBB035832c0b357a66F1c338C0A34d41482` | https://www.oklink.com/x-layer/address/0xB585ABBB035832c0b357a66F1c338C0A34d41482 |
| Swap helper | `0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5` | https://www.oklink.com/x-layer/address/0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5 |
| PoolManager (canonical) | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` | https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32 |
| Pool ID (BASE/RUG) | `0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2` | — |
| Agent wallet (oracle owner) | `0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c` | https://www.oklink.com/x-layer/address/0x4aa3af8C732a19Ec9534Fb56316497215E52Fc3c |

---

## 3. On-chain demo proof (4 txs + agent push)

| Step | What | Tx hash | OKLink |
|---|---|---|---|
| Tx A | 100 BASE → RUG swap **succeeds** (RUG = OK) | `0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d` | https://www.oklink.com/x-layer/tx/0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d |
| Tx B | `setRisk(RUG, DANGER)` | `0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e` | https://www.oklink.com/x-layer/tx/0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e |
| Tx C | Swap **reverts** — `GuardianBlocked(RUG)` | `0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4` | https://www.oklink.com/x-layer/tx/0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4 |
| Tx D | `claimRefund` — buyer recovers BASE from on-chain reserve | `0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696` | https://www.oklink.com/x-layer/tx/0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696 |
| Agent | RUGNOT `pushRisk` writes to oracle | `0xfb17a276146d734431abd1531c652b631d96515550a2c4c5ecb4ae203ca3a393` | https://www.oklink.com/x-layer/tx/0xfb17a276146d734431abd1531c652b631d96515550a2c4c5ecb4ae203ca3a393 |
| State reset | Re-flip RUG → DANGER for judge verification | `0x5797fcb35eb4044fc0b34128d58f6577ebbeb0cd94a12c796c8234d23c8cefed` | https://www.oklink.com/x-layer/tx/0x5797fcb35eb4044fc0b34128d58f6577ebbeb0cd94a12c796c8234d23c8cefed |

**Judge verification command** (anyone can run this — proves the system is live):

```bash
cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 \
  "riskOf(address)(uint8)" \
  0xB585ABBB035832c0b357a66F1c338C0A34d41482 \
  --rpc-url https://rpc.xlayer.tech
# returns 3 == DANGER
```

---

## 4. Tweet (paste verbatim, replace `<VIDEO>` after recording)

```
🛡️ Introducing RUGPROOF — the first rug-resistant Uniswap v4 pool on @XLayerOfficial.

A v4 hook gated by @RUGNOT Guardian:
• Swap a honeypot → tx REVERTS in beforeSwap
• Get rugged anyway → claim on-chain refund

Live on X Layer mainnet. Real txs. Real reverts. Real refunds.

🎥 <VIDEO>
🔗 github.com/Madhav-Gupta-28/RUGPROOF
⛓️ Hook: 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0

#HookTheFuture @Uniswap @flapdotsh
```

Backup short version (if the above is too long):

```
🛡️ RUGPROOF: first rug-resistant Uniswap v4 pool on @XLayerOfficial, powered by @RUGNOT.

Honeypot swap → reverts in beforeSwap. Rugged anyway → claim refund onchain.

Live mainnet: github.com/Madhav-Gupta-28/RUGPROOF

#HookTheFuture @Uniswap @flapdotsh
```

---

## 5. Google Form answer block

**Project name**
```
RUGPROOF (Guardian Hook)
```

**One-line summary**
```
The first risk-gated Uniswap v4 pool on X Layer mainnet — swaps into honeypot tokens revert in beforeSwap, and victims of later DANGER flips claim on-chain refunds from a Shield Reserve. Powered by the RUGNOT Guardian engine. Live interactive demo: /guardian-hook dashboard (connect wallet → Attempt rug-buy → GuardianBlocked decoded on-screen).
```

**Live demo URL** (run `npm run dev -w @rugnot/dashboard`, then open)
```
http://localhost:5173/guardian-hook
```
Judges: connect MetaMask/OKX Wallet on X Layer (196), click **Attempt rug-buy** — page eth_calls the live SwapHelper and decodes `GuardianBlocked(RUG)` from the PoolManager-wrapped revert.

**GitHub repo**
```
https://github.com/Madhav-Gupta-28/RUGPROOF
```

**X (Twitter) account**
```
@RUGNOT (also see pinned tweet for RUGPROOF launch)
```

**Network + chainId**
```
X Layer mainnet (chainId 196)
```

**Hook contract address**
```
0xC68E22886fA481AD38bC4810b12Bdf9991F350C0
```

**Pool address / ID**
```
PoolId 0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2
(via PoolManager 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32)
```

**Additional contracts**
```
RiskOracle: 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50
BASE token: 0xb437E753142759A386548Ef00e8E1775d1A2A338
RUG  token: 0xB585ABBB035832c0b357a66F1c338C0A34d41482
Swap helper: 0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5
```

**4 demo transaction hashes**
```
Tx A (OK swap succeeds):   0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d
Tx B (setRisk DANGER):     0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e
Tx C (DANGER swap reverts):0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4
Tx D (claimRefund):        0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696
```

**Demo video URL**
```
<paste YouTube unlisted or direct mp4 link after recording>
```

**Description / What we built**
```
RUGPROOF is the first risk-gated Uniswap v4 pool deployed on X Layer mainnet. A v4 Hook (with afterInitialize + beforeSwap + afterSwap permissions, salt-mined to the correct address) calls into an on-chain RiskOracle owned by the RUGNOT agent wallet. Every swap is checked:

• DANGER → the hook reverts the swap with GuardianBlocked(token).
• OK → swap proceeds normally and per-user exposure (base token spent) is recorded.
• If a token is later flipped to DANGER, prior buyers call claimRefund() and receive base tokens from the on-chain Shield Reserve, capped at a configurable percentage.

RUGNOT — our existing autonomous defense agent for X Layer with real mainnet trade history — pushes Guardian verdicts to the oracle via packages/agent/src/onchain/pushRisk.ts. This turns Uniswap v4 on X Layer from a passive matching engine into a risk-aware AMM.

What's novel:
1. First v4 hook that gates swap eligibility on a live off-chain risk oracle (not just fees).
2. First hook with a swap-funded refund mechanism for users harmed by post-trade risk flips.
3. Reuses RUGNOT's 5-layer Guardian pipeline (contract safety, holders, smart money, liquidity, simulation) as the oracle signal.

All 4 demo transactions are verifiable on OKLink. Three Foundry tests pass (forge test). Repo: github.com/Madhav-Gupta-28/RUGPROOF.

Live dashboard at packages/dashboard — route /guardian-hook polls mainnet every 15s (RUG verdict, reserve, exposure), shows all deployment addresses + OKLink tx grid, and includes an interactive rug-proof swap panel that decodes GuardianBlocked from WrappedError revert data via direct RPC eth_call (no tx sent, no gas).
```

---

## 6. Video recording script (90 seconds, one take, OBS or QuickTime)

**Recommended setup (dashboard-first — highest visual impact):**
- Browser: `http://localhost:5173/guardian-hook` (run `npm run dev -w @rugnot/dashboard`)
- OKX Wallet or MetaMask on X Layer (196)
- Second browser tab on OKLink for tx tiles

**Dashboard beat sheet (preferred):**
```
0:00 — Show hero: DANGER badge pulsing, live reserve + exposure cards
0:15 — Click Connect wallet → Attempt rug-buy → green "Hook blocked the swap" with GuardianBlocked(RUG)
0:35 — Click each of the 4 OKLink tx tiles (Tx A–D) — tabs open on OKLink
0:75 — Scroll verification CLI block; paste one cast call, show riskOf=3
0:90 — Cut. Repo URL on screen.
```

**Fallback setup (terminal + OKLink):**
- Terminal window, ~24pt font, dark background
- Browser tab on https://www.oklink.com/x-layer (X Layer explorer)
- Have these copied into the clipboard buffer (use `pbpaste`/`pbcopy`):
  - The 4 demo tx hashes (one per beat)
  - `cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 "riskOf(address)(uint8)" 0xB585ABBB035832c0b357a66F1c338C0A34d41482 --rpc-url https://rpc.xlayer.tech`
- Pre-paste `cat packages/guardian-hook/deploy/addresses.json` ready to run

**Beat sheet (read aloud, no music):**

```
0:00 — [terminal, big font]
Voice: "RUGPROOF — the first rug-resistant Uniswap v4 pool on X Layer."
Show:  cat packages/guardian-hook/deploy/addresses.json
       (point: hook, oracle, pool — all live mainnet)

0:12 — Voice: "Every swap into a guarded pool calls into a risk oracle owned by RUGNOT."
       cast call ... riskOf(RUG) --rpc-url https://rpc.xlayer.tech
       (returns 3 — DANGER)

0:22 — [browser, OKLink Tx A]
Voice: "Before RUG was flagged, a buyer swapped 100 BASE for RUG. That succeeded —"
       (paste Tx A link, scroll to event logs, point to GuardianSwap event)

0:35 — [browser, OKLink Tx B]
Voice: "Then RUGNOT pushed a DANGER verdict to the oracle."
       (paste Tx B link, point to RiskSet event)

0:48 — [browser, OKLink Tx C]
Voice: "The same swap now reverts inside beforeSwap — GuardianBlocked. The hook stops the rug at the protocol layer."
       (paste Tx C link, point to revert reason)

1:05 — [browser, OKLink Tx D]
Voice: "And the original buyer claims a refund from the on-chain Shield Reserve. Real BASE, paid out by the hook."
       (paste Tx D link, point to RefundClaimed event)

1:20 — [terminal]
Voice: "Hook salt-mined to the right permission bits. Three Foundry tests pass. Real verifiable transactions on X Layer mainnet."
       forge test --root packages/guardian-hook -vv | tail -20

1:30 — Cut.
```

**Recording tips:**
- Speak before you click. If you click then talk, dead air.
- Don't show your terminal prompt with the private key. Source `.env` before recording so it's just in memory.
- If you flub a beat, keep going. Editing a 90-sec hackathon demo costs more time than re-recording.
- After recording, upload to YouTube as **Unlisted** (not Private). Judges need to view without login.

**Save as:** `packages/guardian-hook/demo.mp4` (also keep the YouTube link).

---

## 7. Final checklist before hitting submit

- [ ] Video recorded and uploaded (Unlisted YouTube)
- [ ] Tweet posted with all three tags (@XLayerOfficial @Uniswap @flapdotsh)
- [ ] Tweet URL added to Google Form
- [ ] Google Form submitted before **23:59 UTC**
- [ ] Repo is public on GitHub
- [ ] README links resolve

---

## 8. If a judge asks "how do I verify this?"

Hand them these three commands. Each one returns ground truth from X Layer mainnet:

```bash
# 1. Chain is X Layer mainnet
cast chain-id --rpc-url https://rpc.xlayer.tech                 # → 196

# 2. RUG is DANGER per the oracle
cast call 0x999499a47495bA2005E5ceB06f192F45Bbcd2F50 \
  "riskOf(address)(uint8)" \
  0xB585ABBB035832c0b357a66F1c338C0A34d41482 \
  --rpc-url https://rpc.xlayer.tech                              # → 3 (DANGER)

# 3. The hook owns the registered pool with refund cap 50%
cast call 0xC68E22886fA481AD38bC4810b12Bdf9991F350C0 \
  "guards(bytes32)(address,address,uint16,bool)" \
  0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2 \
  --rpc-url https://rpc.xlayer.tech
# → (RUG, BASE, 5000, true)
```
