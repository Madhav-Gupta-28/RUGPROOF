# RugProof Guardian Hook

Uniswap v4 hook for X Layer **mainnet** (chainId `196`). Gates swaps using the RugProof / RUGNOT Guardian risk oracle.

## Setup

```bash
cd packages/guardian-hook
git submodule update --init --recursive
forge build
```

## Preflight (mainnet)

```bash
export XLAYER_RPC=https://rpc.xlayer.tech   # or reuse RPC_URL from repo root .env
export AGENT_PK=$PRIVATE_KEY               # funded X Layer mainnet wallet

forge --version    # >= 0.2.0
cast chain-id --rpc-url $XLAYER_RPC        # expect 196
cast balance $(cast wallet address --private-key $AGENT_PK) --rpc-url $XLAYER_RPC
```

Uniswap v4 is deployed on X Layer mainnet (chainId `196`). Canonical addresses are in `script/base/XLayerConfig.sol`.

## Live mainnet deployments

| Contract | Address |
|----------|---------|
| RiskOracle | `0x999499a47495bA2005E5ceB06f192F45Bbcd2F50` |
| GuardianHook v2 | `0xC68E22886fA481AD38bC4810b12Bdf9991F350C0` |
| PoolManager | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` |
| BASE (mock) | `0xb437E753142759A386548Ef00e8E1775d1A2A338` |
| RUG (mock) | `0xB585ABBB035832c0b357a66F1c338C0A34d41482` |
| Swap helper | `0xBfac0c2d0275e904c9724A2f5c175d3c683cD5E5` |

Full demo tx hashes are in the root [README](../../README.md#guardian-hook-uniswap-v4--rugproof).

## Deploy order (mainnet)

```bash
forge script script/01_DeployOracle.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
export RISK_ORACLE=$(jq -r .RISK_ORACLE deploy/addresses.json)

export POOL_MANAGER=0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32
export POSITION_MANAGER=0xcF1EAFC6928dC385A342E7C6491d371d2871458b
export PERMIT2=0x000000000022D473030F116dDEE9F6B43aC78BA3

forge script script/02_DeployHook.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
export GUARDIAN_HOOK=$(jq -r .GUARDIAN_HOOK deploy/addresses.json)

forge script script/03_InitPool.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
forge script script/04_AddLiquidity.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
forge script script/Demo.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
```

## Tests

```bash
forge test -vvv
```
