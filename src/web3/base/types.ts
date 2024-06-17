import { web3 } from '@coral-xyz/anchor';
import { RawMint } from '@solana/spl-token';
import { TxFailResult } from '../errors';

export type BaseRayInput = {
  rpcEndpointUrl: string;
};
export type Result<T, E = any> = {
  Ok?: T;
  Err?: E;
};
export type TxPassResult = {
  txSignature: string;
};
export type MPLTokenInfo = {
  address: web3.PublicKey;
  mintInfo: RawMint;
  metadata: any;
};

export type Web3SendTxInput = {
  ixs: web3.TransactionInstruction[];
  signers?: web3.Keypair[];
  lutsInfo?: web3.AddressLookupTableAccount[];
};
export type Web3SendTxOpt = {
  txFee?: number;
  skipWalletsign?: boolean;
  passInfo?: any;
  skipSimulation?: boolean;
  skipIncTxFee?: boolean;
};
export type Web3SignedSendTxOpt = {
  passInfo?: any;
  skipSimulation?: boolean;
  blockhashInfo: Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
    skipSimulation?: boolean;
  }>;
};
export type Web3SendTxResult = Result<Web3PassTxResult, TxFailResult>;

export type Web3PassTxResult = TxPassResult & {
  input: Web3SendTxInput;
  passInfo?: any;
};
export type TransferInfoFromIxs = {
  address: string;
  amount: number;
  ata: string;
};
