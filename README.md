# RugProof

**The DeFi agent that won't get you rugged.**

RugProof (built on the RUGNOT Guardian engine) is an autonomous defense agent for OKX X Layer.

Real wallet. Real OKX routes. Real X Layer transactions. No backtest theater.

`X Layer` · `OKX Onchain OS` · `OKX DEX Aggregator v6` · `Gemini tool use` · `x402` · `MCP`


## Why RUGNOT Exists

Most trading agents optimize for buying. Rug pulls happen because they do not optimize for surviving.

| Risk | Normal bot | RUGNOT |
|---|---|---|
| Honeypot | Buys the chart. | Blocks failed contract, tax, and simulation checks. |
| Insider supply | Enters before whales exit. | Scores top-holder and smart-money pressure. |
| Thin liquidity | Shows paper profit. | Tests exit route depth before and after entry. |
| Risk drift | Trusts the first scan forever. | Re-runs Guardian on open positions. |
| Autonomy | Keeps compounding mistakes. | Enforces caps, pause, manual sell, sell-all, and selective auto-exit. |

```text
Do not enter unless exitability is proven.
Do not keep holding if exitability deteriorates.
```


## What RUGNOT Does

RUGNOT is one coordinated runtime with specialized agent roles. They share one StateStore and one X Layer Agentic Wallet, but each role owns a separate part of the defense loop.

| Agent role | Responsibility | Code |
|---|---|---|
| Scout | Finds OKX X Layer candidates from live market signals, token metadata, and curated proof baskets. It ignores sell-side noise and only forwards candidates with enough signal strength. | `scout.ts`, `okx-api.ts` |
| Guardian | Runs the five-layer risk pipeline: contract safety, holders, smart money, liquidity, and executable buy/sell simulation. Outputs `GO`, `CAUTION`, or `DANGER`. | `guardian.ts` |
| Executor | Converts a `GO` verdict into a capped X Layer trade: quote, approve, swap, sign, broadcast, persist, and link to OKLink. | `executor.ts` |
| Sentinel | Watches open positions after entry. If price, liquidity, smart-money flow, or security visibility breaks, it escalates the specific token. | `sentinel.ts` |
| Auto-Exit | Sells only the affected position. The rest of the portfolio remains untouched and visible. | `auto-exit.ts` |
| Analyst | Gemini chat that can call live tools instead of giving generic replies. | `llm.ts`, `routes.ts` |
| Security API | Exposes Guardian as a paid x402 endpoint and as MCP tools for other agents. | `x402.ts`, `mcp.ts` |


## Architecture

```text
                         X LAYER AGENTIC WALLET
                  0x4aa3af8c732a19ec9534fb56316497215e52fc3c
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                RUGNOT CORE                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ DATA PLANE                                                                   │
│ OKX signals ─ OKX token data ─ OKX holders ─ OKX prices ─ wallet balances    │
├──────────────────────────────────────────────────────────────────────────────┤
│ DECISION PLANE                                                               │
│ Scout candidates -> Guardian verdict -> Sentinel threat model                │
│ Guardian = contract + holders + smart money + liquidity + tx simulation      │
├──────────────────────────────────────────────────────────────────────────────┤
│ EXECUTION PLANE                                                              │
│ position caps -> OKX quote -> OKX approval -> OKX swap -> ethers signer      │
│ nonce mutex -> fee policy -> X Layer broadcast -> OKLink proof               │
├──────────────────────────────────────────────────────────────────────────────┤
│ INTERFACE PLANE                                                              │
│ Dashboard WS stream | Gemini tools | MCP tools | x402 paid security API      │
└──────────────────────────────────────────────────────────────────────────────┘
```

```text
Scout -> Guardian -> Executor -> Position
                         │
                         ▼
                   Sentinel -> Auto-Exit
```


## Working Mechanics

### Scout

Scout turns OKX market activity into candidate tokens:

```text
OKX signal/list -> normalize token -> score signal -> candidate queue
```

It uses smart-money, whale, KOL, volume, liquidity, and token metadata signals. Sell-side activity is treated as risk, not alpha.

### Guardian

Guardian is the pre-trade and post-trade immune system.

| Check | Signal | Risk response |
|---|---|---|
| Contract safety | Honeypot, tax, metadata, route sanity. | Hard block on dangerous metadata. |
| Holder analysis | Top holder and top-10 concentration. | Downgrade concentrated supply. |
| Smart money | Net buy/sell pressure. | Warn or block aggressive exits. |
| Liquidity depth | OKX route depth and price impact. | Block poor exitability. |
| Tx simulation | Buy/sell route can be built. | Hard block if execution is unproven. |

```text
GO       eligible under caps
CAUTION  visible, not safe enough for entry
DANGER   block entry or exit if already held
```

### Executor

Executor sends real X Layer transactions through OKX DEX Aggregator v6:

```text
quote -> approval tx -> swap tx -> signer -> broadcast -> OKLink
```

It also handles nonce serialization, X Layer fee normalization, exact raw-balance sell clamping, USDT token selection, position sizing, and trade persistence.

### Sentinel

Sentinel keeps defending after the buy:

```text
open position -> fresh price -> fresh Guardian check -> threat model -> selective exit
```

Threats include whale dump, price crash, liquidity pull, contract risk change, and lost observability. If one token trips risk, Sentinel sells that token only.


## Token Scan + AI Experience

RUGNOT has two ways to ask "is this token safe?"

| Surface | What happens |
|---|---|
| Public Scan page | Paste an X Layer token address. RUGNOT runs Guardian and returns a structured verdict. |
| Gemini chat | Ask in natural language. Gemini can call RUGNOT tools for token safety, portfolio risk, and opportunity discovery. |

Gemini tools:

| Tool | Result |
|---|---|
| `check_token_safety` | Guardian verdict for any X Layer token. |
| `get_portfolio_risks` | Re-checks every open position. |
| `find_safe_opportunities` | Pulls OKX signals and returns Guardian-filtered candidates. |

If no Gemini key is configured, the chat falls back to local state summaries without pretending to be an LLM.


## Onchain OS Skill Usage

RUGNOT is OKX/X Layer-native. The project uses OKX Onchain OS-style modules across discovery, verification, execution, and monitoring.

| Skill / module | How RUGNOT uses it | Code |
|---|---|---|
| `okx-dex-swap` | Quotes, approvals, swap data, and real X Layer execution through the agent wallet. | `executor.ts`, `okx-api.ts` |
| `okx-security` | Contract safety, honeypot/tax context, and buy/sell simulation inside Guardian. | `guardian.ts` |
| `okx-dex-signal` | Smart-money, whale, and KOL market signals for Scout. | `okx-api.ts`, `scout.ts` |
| `okx-dex-token` | Holder concentration and token-level risk context. | `okx-api.ts`, `guardian.ts` |
| `okx-dex-market` | Token price, liquidity, volume, 24h change, and Sentinel marks. | `okx-api.ts`, `sentinel.ts` |
| `okx-wallet-portfolio` | Wallet USDT balance, token balances, and position reconciliation. | `okx-api.ts`, `index.ts` |
| `x402 payment rail` | Paid Guardian checks for other agents. | `x402.ts` |
| `MCP tools` | Agent-to-agent access to Guardian, portfolio risk, and safe opportunities. | `mcp.ts` |


## X Layer Mainnet Proof

RUGNOT has already executed through the same runtime path used by the dashboard and API.

| Action | Token | OKLink proof |
|---|---:|---|
| Buy | FDOG | [0x7cb9dcb91cd33bf60eb65ebe96e72806a8f63c8dfa1a7a8363249a837c8cd843](https://www.oklink.com/x-layer/tx/0x7cb9dcb91cd33bf60eb65ebe96e72806a8f63c8dfa1a7a8363249a837c8cd843) |
| Buy | XDOG | [0x6b198d6718c305099d9838fab5b5d0c10689c7527910935326f1fde67e37e0f5](https://www.oklink.com/x-layer/tx/0x6b198d6718c305099d9838fab5b5d0c10689c7527910935326f1fde67e37e0f5) |
| Buy | SEED | [0x01f32bb67990d639304bdd42d295121a24da43e07c587654059536faaf8c7710](https://www.oklink.com/x-layer/tx/0x01f32bb67990d639304bdd42d295121a24da43e07c587654059536faaf8c7710) |
| Sentinel Exit | FDOG | [0x973a257ab1c583e444cb970ad91914a61be5bed009e821ebfa4e7e313f06fe02](https://www.oklink.com/x-layer/tx/0x973a257ab1c583e444cb970ad91914a61be5bed009e821ebfa4e7e313f06fe02) |
| Manual Exit | XDOG | [0xc6e11139d3ec8ba3e49f50d7675508e11e355328f85f40e0f4cfacf01015983a](https://www.oklink.com/x-layer/tx/0xc6e11139d3ec8ba3e49f50d7675508e11e355328f85f40e0f4cfacf01015983a) |

Agentic Wallet:

[0x4aa3af8c732a19ec9534fb56316497215e52fc3c](https://www.oklink.com/x-layer/address/0x4aa3af8c732a19ec9534fb56316497215e52fc3c)


## x402 Security Checks

RUGNOT sells Guardian verdicts to other agents.

```text
POST /api/v1/security/check
```

The analyzed asset is an X Layer token. Payment settlement uses x402-supported USDC rails, with Base USDC as the default facilitator network.

```text
agent wants to trade -> pays via x402 -> receives Guardian verdict -> avoids unsafe token
```

This turns token safety into an agentic service, not just a dashboard feature.


## MCP Integration

RUGNOT exposes its defense engine through MCP:

| Tool | Output |
|---|---|
| `check_token_safety` | Guardian verdict for a token. |
| `get_portfolio_risks` | Risk report for all positions in a wallet. |
| `find_safe_opportunities` | OKX opportunities that passed Guardian. |

```bash
npm run mcp -w @rugnot/agent
```

Hosted mode exposes `POST /mcp` when `ENABLE_MCP=true` and `MCP_TRANSPORT=http`.


## Submission Snapshot

| Requirement | RUGNOT |
|---|---|
| X Layer build | Agent wallet, balances, approvals, swaps, and proof txs run on X Layer mainnet. |
| Agentic Wallet | [0x4aa3...fc3c](https://www.oklink.com/x-layer/address/0x4aa3af8c732a19ec9534fb56316497215e52fc3c) |
| Onchain OS usage | OKX swap, security, signal, token, market, and wallet modules. |
| GitHub | [github.com/Madhav-Gupta-28/RUGPROOF](https://github.com/Madhav-Gupta-28/RUGPROOF) |
| Architecture | Scout, Guardian, Executor, Sentinel, Auto-Exit, Analyst, x402, MCP. |
| Working mechanics | Live scan, verdict, trade, monitor, selective exit. |
| Team | Madhav Gupta. |
| X Layer position | Shared defense layer for X Layer agents. |


## Safety Controls

| Control | Purpose |
|---|---|
| `MAX_POSITION_SIZE_USDT` | Caps each entry. |
| `MAX_PORTFOLIO_SIZE_USDT` | Caps total exposure. |
| `RISK_TOLERANCE` | Conservative, moderate, or aggressive thresholds. |
| `POST /api/pause` | Stops automation. |
| `POST /api/resume` | Resumes automation. |
| `POST /api/settings` | Updates risk settings. |
| `POST /api/positions/:token/sell` | Exits one position. |
| `POST /api/positions/sell-all` | Exits all positions. |
| `ADMIN_TOKEN` | Protects admin routes. |
| State persistence | Keeps positions, verdicts, threats, trades, and x402 economics across restarts. |


## Quick Start

```bash
git clone https://github.com/Madhav-Gupta-28/RUGPROOF.git
cd RUGPROOF
npm install
cp .env.example .env
npm run dev
```

```text
Dashboard: http://localhost:5173
Agent API: http://localhost:3001
Health:    http://localhost:3001/health
```


## Team

| Member | Role |
|---|---|
| Madhav Gupta | Full-stack engineer: agent runtime, OKX/X Layer integration, dashboard, x402, MCP. |


## X Layer Ecosystem Positioning

X Layer will have more agents, more wallets, and more autonomous execution. That only works if agents can verify risk before they move capital.

RUGNOT is built to become that shared defense layer:

```text
Trading agents use X Layer for execution.
RUGNOT uses X Layer for proof.
Other agents use RUGNOT for safety.
```

The result is a tighter X Layer agent economy: safer entries, faster exits, paid risk checks, reusable MCP tools, and OKLink-verifiable action instead of unverifiable claims.


## Built For

OKX X Layer Arena.

RUGNOT is a security-first agent for the X Layer ecosystem: OKX data for discovery, OKX DEX Aggregator for execution, Gemini for interaction, x402 for paid checks, MCP for agent access, and Sentinel for defense after entry.

## Guardian Hook (Uniswap v4 × RugProof)

The first risk-gated Uniswap v4 pool on X Layer mainnet. Swaps into tokens flagged
DANGER by RugProof's Guardian engine revert in `beforeSwap`. Users harmed by
later DANGER flips claim refunds from an on-chain `ShieldReserve`.

**Deployments (X Layer mainnet, chainId 196):**

| Contract       | Address |
|----------------|---------|
| RiskOracle     | [`0x999499a47495bA2005E5ceB06f192F45Bbcd2F50`](https://www.oklink.com/x-layer/address/0x999499a47495bA2005E5ceB06f192F45Bbcd2F50) |
| GuardianHook   | [`0xC68E22886fA481AD38bC4810b12Bdf9991F350C0`](https://www.oklink.com/x-layer/address/0xC68E22886fA481AD38bC4810b12Bdf9991F350C0) |
| BASE (mock)    | [`0xb437E753142759A386548Ef00e8E1775d1A2A338`](https://www.oklink.com/x-layer/address/0xb437E753142759A386548Ef00e8E1775d1A2A338) |
| RUG  (mock)    | [`0xB585ABBB035832c0b357a66F1c338C0A34d41482`](https://www.oklink.com/x-layer/address/0xB585ABBB035832c0b357a66F1c338C0A34d41482) |
| Pool (BASE/RUG)| `0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2` (PoolId) |

**On-chain proof:**

| Step | Tx |
|------|----|
| OK swap (success)   | [OKLink](https://www.oklink.com/x-layer/tx/0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d) |
| Flip to DANGER      | [OKLink](https://www.oklink.com/x-layer/tx/0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e) |
| DANGER swap (revert)| [OKLink](https://www.oklink.com/x-layer/tx/0xcfc6156518703d0e48d662b2d79105f49557f709bbe4e19d311fbe012674a0e4) |
| Refund claim        | [OKLink](https://www.oklink.com/x-layer/tx/0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696) |

Preflight: `cast chain-id --rpc-url $XLAYER_RPC` must return `196`.

Run: `cd packages/guardian-hook && forge script script/Demo.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK`

### Next

- CAUTION surcharge logic.
- Frontend.
- Subgraph.
- x402 endpoint that writes to RiskOracle.
- MCP tool for pool registration.
- Multi-pool support.
