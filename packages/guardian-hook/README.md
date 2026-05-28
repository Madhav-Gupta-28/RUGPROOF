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

Uniswap v4 is **not** listed for X Layer in the official deployment registry. Set `POOL_MANAGER` to a deployed PoolManager on X Layer mainnet, or deploy your own before running hook/pool scripts.

## Deploy order (mainnet)

```bash
forge script script/01_DeployOracle.s.sol --broadcast --rpc-url $XLAYER_RPC --private-key $AGENT_PK
export RISK_ORACLE=$(jq -r .RISK_ORACLE deploy/addresses.json)

# Set POOL_MANAGER to your X Layer v4 PoolManager address
export POOL_MANAGER=0x...

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
