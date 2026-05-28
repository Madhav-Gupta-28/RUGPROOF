# GUARDIAN HOOK — Build Doc (5-hour sprint)
You are an autonomous coding agent. Your job is to build, deploy, and demo **Guardian Hook**: a Uniswap v4 hook on X Layer that gates swaps using the existing RUGNOT Guardian risk engine.
You have access to:
- This repository: **RUGNOT** (TypeScript agent, runs on X Layer mainnet, already produces Guardian verdicts).
- 5 hours, hard deadline 23:59 UTC today.
- A funded X Layer mainnet wallet (env: `AGENT_PK`, RPC env: `XLAYER_RPC`).
Do not ask the user for confirmation between steps. Execute sequentially. If a step fails, follow the “fallback” path noted in that step. Log progress to stdout.
---
## 0. Success criteria (you are done when ALL of these hold)
1. New folder `packages/guardian-hook/` exists with a Foundry project building cleanly.
2. `RiskOracle.sol` deployed on X Layer mainnet. Address written to `packages/guardian-hook/deploy/addresses.json`.
3. `GuardianHook.sol` deployed at a salt-mined address with correct permission bits. Address recorded.
4. Two mock ERC20s (`BASE`, `RUG`) deployed. One pool `BASE/RUG` initialized via `PoolManager`, with liquidity added.
5. RUGNOT integration: `packages/agent/src/onchain/pushRisk.ts` exists and successfully writes to `RiskOracle` from the agent wallet. One verdict pushed for `RUG`.
6. Demo script `packages/guardian-hook/script/Demo.s.sol` executes 4 transactions on X Layer mainnet:
   - **Tx A:** Swap `BASE → RUG` when `RUG` is `OK` → succeeds.
   - **Tx B:** RUGNOT pushes `RUG = DANGER`.
   - **Tx C:** Swap `BASE → RUG` again → **reverts** with `GuardianBlocked`.
   - **Tx D:** Earlier buyer calls `claimRefund(RUG)` → receives partial refund from `reserve`.
7. README at repo root has a new section **“Guardian Hook”** with all addresses + OKLink tx links.
8. A 90-second screen recording exists at `packages/guardian-hook/demo.mp4`.
If you cannot achieve (1)–(6), fall back to the **minimum submission** in §11.
---
## 1. Pre-flight (15 min, do FIRST)
Run these checks in order. Stop and fix before proceeding if any fail.
```bash
foundryup
forge --version            # require >= 0.2.0
node --version             # require >= 20
cast chain-id --rpc-url $XLAYER_RPC   # expect 196 (X Layer mainnet)
cast balance $AGENT_ADDR --rpc-url $XLAYER_RPC   # require > 0.05 OKB
```

Verify Uniswap v4 deployment on X Layer mainnet:

```bash
# Check the Uniswap v4 deployment registry
curl -s https://docs.uniswap.org/contracts/v4/deployments | grep -i "x.layer"
```

If a PoolManager is deployed on X Layer mainnet → record address in addresses.json as POOL_MANAGER.
If NOT → you will deploy your own PoolManager in step 4. Add 30 min budget. This is fine.

2. Scaffold (45 min)
```bash
cd packages/
git clone https://github.com/uniswapfoundation/v4-template guardian-hook
cd guardian-hook
rm -rf .git
forge install
forge build
```

Replace src/Counter.sol and all template demo files. Keep lib/, foundry.toml, remappings.txt, and script/utils/HookMiner.sol.

Create directory layout:

packages/guardian-hook/
├── src/
│   ├── RiskOracle.sol
│   ├── GuardianHook.sol
│   ├── interfaces/IRiskOracle.sol
│   └── mocks/MockERC20.sol
├── script/
│   ├── 01_DeployOracle.s.sol
│   ├── 02_DeployHook.s.sol
│   ├── 03_InitPool.s.sol
│   ├── 04_AddLiquidity.s.sol
│   └── Demo.s.sol
├── test/
│   └── GuardianHook.t.sol
├── deploy/
│   └── addresses.json
└── README.md
3. Contracts
3.1 src/interfaces/IRiskOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
interface IRiskOracle {
    enum Risk { UNKNOWN, OK, CAUTION, DANGER }
    function riskOf(address token) external view returns (Risk);
    function scoreBpsOf(address token) external view returns (uint16);
    function updatedAt(address token) external view returns (uint256);
}
3.2 src/RiskOracle.sol (~80 LOC)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {IRiskOracle} from "./interfaces/IRiskOracle.sol";
/// @notice On-chain mirror of RUGNOT Guardian verdicts. Owner = RUGNOT agent wallet.
contract RiskOracle is IRiskOracle {
    address public owner;
    mapping(address => Risk)    private _risk;
    mapping(address => uint16)  private _score;
    mapping(address => uint256) private _updatedAt;
    event RiskSet(address indexed token, Risk risk, uint16 scoreBps, uint256 at);
    event OwnerTransferred(address indexed previous, address indexed next);
    error NotOwner();
    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    constructor(address _owner) { owner = _owner; emit OwnerTransferred(address(0), _owner); }
    function transferOwnership(address next) external onlyOwner {
        emit OwnerTransferred(owner, next);
        owner = next;
    }
    function setRisk(address token, Risk r, uint16 scoreBps) public onlyOwner {
        _risk[token] = r;
        _score[token] = scoreBps;
        _updatedAt[token] = block.timestamp;
        emit RiskSet(token, r, scoreBps, block.timestamp);
    }
    function setRiskBatch(address[] calldata tokens, Risk[] calldata risks, uint16[] calldata scores)
        external onlyOwner
    {
        require(tokens.length == risks.length && tokens.length == scores.length, "len");
        for (uint256 i = 0; i < tokens.length; i++) setRisk(tokens[i], risks[i], scores[i]);
    }
    function riskOf(address token)      external view returns (Risk)    { return _risk[token]; }
    function scoreBpsOf(address token)  external view returns (uint16)  { return _score[token]; }
    function updatedAt(address token)   external view returns (uint256) { return _updatedAt[token]; }
}
3.3 src/GuardianHook.sol (~220 LOC)
Use Uniswap v4-periphery BaseHook. Permissions: beforeSwap, afterSwap, afterInitialize.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IRiskOracle} from "./interfaces/IRiskOracle.sol";
/// @title GuardianHook — risk-gated Uniswap v4 hook
/// @notice Reverts swaps for tokens flagged DANGER by RUGNOT. Tracks user exposure
///         so victims of a later DANGER flip can claim refunds from on-chain reserve.
contract GuardianHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    IRiskOracle public immutable oracle;
    address public immutable owner;
    struct PoolGuard {
        address protectedToken;   // the "risky" side of the pair
        address baseToken;        // the "trusted" side (used for refunds)
        uint16  refundCapBps;     // max % of reserve a single user can claim (e.g. 5000 = 50%)
        bool    initialized;
    }
    mapping(PoolId => PoolGuard) public guards;
    mapping(PoolId => uint256)   public reserve;     // accumulated baseToken (mock USDC) for refunds
    mapping(PoolId => mapping(address => uint256)) public exposure; // user => baseToken spent on protectedToken
    mapping(PoolId => mapping(address => bool))    public claimed;
    event GuardSet(PoolId indexed poolId, address protectedToken, address baseToken);
    event GuardianSwap(PoolId indexed poolId, address indexed user, address tokenIn, address tokenOut, IRiskOracle.Risk risk);
    event ReserveFunded(PoolId indexed poolId, uint256 amount);
    event RefundClaimed(PoolId indexed poolId, address indexed user, uint256 amount);
    error GuardianBlocked(address token);
    error NotOwner();
    error AlreadyInit();
    error NoExposure();
    error NotDanger();
    constructor(IPoolManager _pm, IRiskOracle _oracle, address _owner) BaseHook(_pm) {
        oracle = _oracle;
        owner = _owner;
    }
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
    /// @notice Owner registers which side of a pool is the "risky" token. Must be called once after init.
    function registerPool(PoolKey calldata key, address protectedToken, address baseToken, uint16 refundCapBps) external {
        if (msg.sender != owner) revert NotOwner();
        PoolId id = key.toId();
        if (guards[id].initialized) revert AlreadyInit();
        guards[id] = PoolGuard(protectedToken, baseToken, refundCapBps, true);
        emit GuardSet(id, protectedToken, baseToken);
    }
    function _afterInitialize(address, PoolKey calldata, uint160, int24) internal override returns (bytes4) {
        return BaseHook.afterInitialize.selector;
    }
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) internal view override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolGuard memory g = guards[key.toId()];
        if (!g.initialized) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        // Determine direction: if user is swapping zeroForOne, tokenOut is currency1; else currency0.
        Currency outCurrency = params.zeroForOne ? key.currency1 : key.currency0;
        address tokenOut = Currency.unwrap(outCurrency);
        // Only gate buys of the protected token
        if (tokenOut == g.protectedToken) {
            IRiskOracle.Risk r = oracle.riskOf(g.protectedToken);
            if (r == IRiskOracle.Risk.DANGER) revert GuardianBlocked(g.protectedToken);
        }
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolGuard memory g = guards[key.toId()];
        if (g.initialized) {
            Currency outCurrency = params.zeroForOne ? key.currency1 : key.currency0;
            Currency inCurrency  = params.zeroForOne ? key.currency0 : key.currency1;
            address tokenOut = Currency.unwrap(outCurrency);
            address tokenIn  = Currency.unwrap(inCurrency);
            // Track exposure: amount of baseToken the user spent to acquire protectedToken
            if (tokenOut == g.protectedToken && tokenIn == g.baseToken) {
                // amountSpecified is negative for exactIn; absolute value = base spent
                int128 baseSpent = params.zeroForOne ? delta.amount0() : delta.amount1();
                uint256 spent = uint256(int256(baseSpent < 0 ? -baseSpent : baseSpent));
                exposure[key.toId()][sender] += spent;
            }
            emit GuardianSwap(key.toId(), sender, tokenIn, tokenOut, oracle.riskOf(g.protectedToken));
        }
        return (BaseHook.afterSwap.selector, 0);
    }
    /// @notice Anyone may donate baseToken to fund the per-pool refund reserve.
    function fundReserve(PoolKey calldata key, uint256 amount) external {
        PoolGuard memory g = guards[key.toId()];
        require(g.initialized, "not registered");
        // pull baseToken from caller
        (bool ok,) = g.baseToken.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        require(ok, "transfer");
        reserve[key.toId()] += amount;
        emit ReserveFunded(key.toId(), amount);
    }
    /// @notice Victims of a DANGER flip claim pro-rata refunds (capped).
    function claimRefund(PoolKey calldata key) external {
        PoolId id = key.toId();
        PoolGuard memory g = guards[id];
        require(g.initialized, "not registered");
        if (oracle.riskOf(g.protectedToken) != IRiskOracle.Risk.DANGER) revert NotDanger();
        uint256 spent = exposure[id][msg.sender];
        if (spent == 0 || claimed[id][msg.sender]) revert NoExposure();
        uint256 cap = reserve[id] * g.refundCapBps / 10_000;
        uint256 payout = spent > cap ? cap : spent;
        require(payout > 0, "no reserve");
        claimed[id][msg.sender] = true;
        reserve[id] -= payout;
        (bool ok,) = g.baseToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, payout)
        );
        require(ok, "transfer");
        emit RefundClaimed(id, msg.sender, payout);
    }
}
3.4 src/mocks/MockERC20.sol
Use OpenZeppelin ERC20 with a public mint(address,uint256). Standard, ~30 LOC.

4. Deploy scripts
All scripts use forge script ... --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK.

4.1 script/01_DeployOracle.s.sol
Deploy RiskOracle(owner = AGENT_ADDR). Save to addresses.json.

4.2 script/02_DeployHook.s.sol
Use HookMiner from v4-template:

uint160 flags = uint160(
    Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
);
(address hookAddr, bytes32 salt) = HookMiner.find(
    CREATE2_DEPLOYER, flags, type(GuardianHook).creationCode,
    abi.encode(POOL_MANAGER, ORACLE, AGENT_ADDR)
);
GuardianHook hook = new GuardianHook{salt: salt}(POOL_MANAGER, oracle, AGENT_ADDR);
require(address(hook) == hookAddr, "salt mismatch");
4.3 script/03_InitPool.s.sol
Deploy BASE (1M mint to deployer) and RUG (1M mint).
Sort tokens to determine currency0/currency1.
PoolKey with fee = 3000, tickSpacing = 60, hooks = address(hook).
Call poolManager.initialize(key, sqrtPriceX96 = 79228162514264337593543950336) (1:1).
Call hook.registerPool(key, RUG, BASE, 5000) (50% refund cap).
4.4 script/04_AddLiquidity.s.sol
Use PositionManager or LiquidityRouter from v4-template’s helpers. Add 100k BASE + 100k RUG of liquidity in range [-600, 600] ticks around current.

If the periphery router isn’t available on X Layer, deploy a minimal PoolModifyLiquidityTest from v4-core test helpers — v4-template includes one.

4.5 script/Demo.s.sol
Full demo orchestration. Logs every tx hash so you can copy them into README.

function run() external {
    // 1. RUG is OK by default (UNKNOWN). Set to OK explicitly for clarity.
    oracle.setRisk(RUG, OK, 8500);
    // 2. Swap 100 BASE → RUG (succeeds)
    _swap(100e18, true);   // zeroForOne depends on token ordering
    // 3. Flip RUG to DANGER
    oracle.setRisk(RUG, DANGER, 1000);
    // 4. Try same swap (will revert, capture with try/catch and log)
    try this._externalSwap(50e18, true) { revert("expected revert"); }
    catch { console.log("Tx C: reverted as expected"); }
    // 5. Claim refund from earlier exposure
    // Fund reserve first (do this in step 04 ideally)
    hook.claimRefund(key);
}
5. Tests (test/GuardianHook.t.sol)
Write three Foundry tests. Don’t aim for more — time is the constraint.

test_OK_swap_succeeds
test_DANGER_swap_reverts
test_claimRefund_paysFromReserve
Use v4-template’s test fixtures (Deployers.sol). Each test is ~30 LOC.

6. RUGNOT integration (45 min)
6.1 New file packages/agent/src/onchain/pushRisk.ts
import { Contract, Wallet, JsonRpcProvider } from "ethers";
const ABI = [
  "function setRisk(address token, uint8 risk, uint16 scoreBps) external",
  "function riskOf(address) view returns (uint8)"
];
const RISK_MAP = { GO: 1, OK: 1, CAUTION: 2, DANGER: 3 } as const;
let _oracle: Contract | null = null;
function oracle(): Contract {
  if (_oracle) return _oracle;
  const provider = new JsonRpcProvider(process.env.XLAYER_RPC!);
  const signer = new Wallet(process.env.AGENT_PK!, provider);
  _oracle = new Contract(process.env.RISK_ORACLE!, ABI, signer);
  return _oracle;
}
export async function pushRisk(
  token: string,
  verdict: "GO" | "CAUTION" | "DANGER",
  scoreBps: number
): Promise<string> {
  const tx = await oracle().setRisk(token, RISK_MAP[verdict], scoreBps);
  await tx.wait();
  return tx.hash;
}
6.2 Wire into Guardian
In packages/agent/src/guardian.ts, after a verdict is produced, call:

import { pushRisk } from "./onchain/pushRisk";
if (process.env.RISK_ORACLE) {
  pushRisk(token, verdict, scoreBps).catch(e => log.warn("pushRisk failed", e));
}
Non-blocking. If the env var is missing, RUGNOT behaves exactly as before.

6.3 Env additions
Add to .env.example:

XLAYER_RPC=https://rpc.xlayer.tech
AGENT_PK=
RISK_ORACLE=
GUARDIAN_HOOK=
POOL_MANAGER=
7. Run order (the actual 5 hours)
# Hour 0:00 – 0:45 — Scaffold + RiskOracle
cd packages/guardian-hook
forge build
forge script script/01_DeployOracle.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
# Hour 0:45 – 2:00 — Hook + tests
forge test -vvv
forge script script/02_DeployHook.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
# Hour 2:00 – 3:00 — Pool + liquidity
forge script script/03_InitPool.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
forge script script/04_AddLiquidity.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
# Hour 3:00 – 4:00 — RUGNOT wiring + demo
cd ../agent
npm run build
# Manually trigger Guardian on the RUG token and confirm `setRisk` tx fires
node dist/cli/scan.js <RUG_ADDR>
# Run the on-chain demo
cd ../guardian-hook
forge script script/Demo.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
# Hour 4:00 – 4:45 — Record video, write README section, draft tweet
# Hour 4:45 – 5:00 — Submit Google Form, post tweet
8. README section to append at repo root
## Guardian Hook (Uniswap v4 × RUGNOT)
The first risk-gated Uniswap v4 pool on X Layer. Swaps into tokens flagged
DANGER by RUGNOT's Guardian engine revert in `beforeSwap`. Users harmed by
later DANGER flips claim refunds from an on-chain `ShieldReserve`.
**Deployments (X Layer mainnet, chainId 196):**
| Contract       | Address |
|----------------|---------|
| RiskOracle     | `0x999499a47495bA2005E5ceB06f192F45Bbcd2F50` |
| GuardianHook   | `0xC68E22886fA481AD38bC4810b12Bdf9991F350C0` |
| BASE (mock)    | `0xb437E753142759A386548Ef00e8E1775d1A2A338` |
| RUG  (mock)    | `0xB585ABBB035832c0b357a66F1c338C0A34d41482` |
| Pool (BASE/RUG)| `0x3deafd666a3c89135451dc888e3ee158fbeb0e6ea55ba4cd8f94e8561d5a14e2` (PoolId) |
**On-chain proof:**
| Step | Tx |
|------|----|
| OK swap (success)   | [OKLink](https://www.oklink.com/xlayer/tx/0xc1e000adb73abc2161cc540d767fd8459fac1e95556715631a2520343880845d) |
| Flip to DANGER      | [OKLink](https://www.oklink.com/xlayer/tx/0x08b3d9bf745a8cdd5a2d68a67d41930588cd5526ec6c5168d055420ac04c0f5e) |
| DANGER swap (revert)| [OKLink](https://www.oklink.com/xlayer/tx/0xea871ff345cfe4c79ea58a18c08da45088166236676b34ff8184352e265e9c0b) |
| Refund claim        | [OKLink](https://www.oklink.com/xlayer/tx/0x5ce473dcb5027700d6b4f993563f1c63530b40ec6fbce507baea3433f1950696) |
Run: `cd packages/guardian-hook && forge script script/Demo.s.sol --broadcast`
9. Demo video script (record in OBS, 90 seconds)
0:00 — [Terminal] "Guardian Hook — the first rug-resistant Uniswap v4 pool on X Layer."
0:08 — [Dashboard] Show RUGNOT live Guardian feed.
0:18 — [Terminal] Run Demo.s.sol. Narrate as txs land.
0:25 — Tx A: 100 BASE → RUG succeeds. Show OKLink.
0:40 — Guardian flags RUG as DANGER (whale dump simulated). setRisk tx.
0:55 — Tx C: same swap → REVERTS with GuardianBlocked(RUG). Highlight error.
1:10 — Tx D: claimRefund. User recovers from reserve. OKLink.
1:25 — "Built with RUGNOT, deployed on X Layer. Live now."
1:30 — End card with repo + addresses.
No music. No transitions. Raw terminal + browser is more credible.

10. Submission
Push everything to github.com/Madhav-Gupta-28/RUGPROOF (or a new branch in RugProof).

Post X tweet:

Just shipped Guardian Hook for #HookTheFuture — the first rug-resistant Uniswap v4 pool on @XLayerOfficial, powered by @RUGNOT. Swap honeypots → tx reverts in beforeSwap. Real txs on X Layer mainnet. Repo + OKLink: <link> @Uniswap @flapdotsh

Submit Google Form:

Project name: Guardian Hook
Repo: link
Addresses + 4 tx hashes
Video link
1-line summary: “Risk-gated Uniswap v4 hook for X Layer. RUGNOT-powered swap reverts on honeypots, on-chain refunds for victims.”
11. Minimum submission (fallback if you’re behind at hour 3:30)
If liquidity, hook mining, or v4 periphery is fighting you, ship this instead:

RiskOracle deployed ✅
GuardianHook deployed at correct salt ✅
Skip real pool + liquidity. Write test/GuardianHook.t.sol with Deployers fixture and demonstrate revert there. Record the forge test output as the demo.
Submit with: contracts deployed + tests passing on-chain via forge test --fork-url $XLAYER_RPC.
This still meets “deploy at least one V4 Pool and Hook contract on X Layer mainnet or testnet, and submit a verifiable contract address.” You will lose innovation points but retain completion points.

12. Known footguns
Hook address bits: if HookMiner returns mismatched address, you set the wrong flags in getHookPermissions(). Recompute and re-mine.
PoolKey currency ordering: currency0 < currency1 strictly. Sort token addresses before constructing.
sqrtPriceX96 for 1:1: 79228162514264337593543950336 (i.e., 2^96).
X Layer mainnet RPC throttling: if you get 429s, swap to backup RPC https://rpc.xlayer.tech (or any public X Layer mainnet RPC).
OpenZeppelin v5 in v4-template: use OZ v5 ERC20 (constructor takes name, symbol only).
BeforeSwapDelta accounting: we return ZERO_DELTA everywhere. Do not try to skim fees via delta in v1 — too risky in a sprint.
13. What you are NOT building today
CAUTION surcharge logic
Frontend
Subgraph
x402 endpoint that writes to RiskOracle
MCP tool for pool registration
Mainnet deployment
Multi-pool support
These are roadmap. Mention them in the README under “Next”. Do not implement.

14. Final checklist before submitting
[ ] forge test passes (3/3)
[ ] addresses.json populated
[ ] All 4 demo txs on OKLink, all linked in README
[ ] Video uploaded (demo.mp4 or YouTube unlisted)
[ ] Tweet posted with all three tags
[ ] Google Form submitted before 23:59 UTC
[ ] X account dedicated or RUGNOT account used + linked
Ship.

---
That doc is the complete brief. Drop it into the RUGNOT repo as `GUARDIAN_HOOK_BUILD.md`, point your agent at it, and start the clock.
When you say **"go"** in this thread, I'll begin executing it inside this repo — starting with the pre-flight checks and v4-template scaffold.
