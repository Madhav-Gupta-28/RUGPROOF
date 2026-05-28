import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const ABI = [
  'function setRisk(address token, uint8 risk, uint16 scoreBps) external',
  'function riskOf(address) view returns (uint8)',
];

const RISK_MAP = {
  GO: 1,
  OK: 1,
  CAUTION: 2,
  DANGER: 3,
} as const;

let _oracle: Contract | null = null;

function getOracle(): Contract {
  if (_oracle) return _oracle;

  const rpcUrl = process.env.XLAYER_RPC ?? process.env.RPC_URL;
  const privateKey = process.env.AGENT_PK ?? process.env.PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    throw new Error('XLAYER_RPC (or RPC_URL) and AGENT_PK (or PRIVATE_KEY) are required');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  _oracle = new Contract(process.env.RISK_ORACLE!, ABI, signer);
  return _oracle;
}

export async function pushRisk(
  token: string,
  verdict: 'GO' | 'CAUTION' | 'DANGER',
  scoreBps: number,
): Promise<string> {
  const tx = await getOracle().setRisk(token, RISK_MAP[verdict], scoreBps);
  await tx.wait();
  return tx.hash as string;
}
