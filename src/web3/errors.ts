import { web3 } from '@coral-xyz/anchor';

export type TxFailResult = {
  txInfo: {
    ixs: web3.TransactionInstruction[];
    signer?: web3.Keypair[];
  };
  reason: TxFailReason;
  txSignature?: string;
  msg?: string;
  passInfo?: any; //PERF any type for now
};

export enum TxFailReason {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  NETWORK_ISSUE = 'NETWORK_ISSUE',
  EXPIRED = 'TRANSACTION_EXPIRED',
  INSUFFICIENT_FUND = 'INSUFFICIENT_FUND',
  TX_FAILED = 'TX_FAILED',
  TX_SIGNER_NOT_FOUND = 'TX_SIGNER_NOT_FOUND',
  FAILED_TO_SIGN_TX = 'FAILED_TO_SIGN_TX',
  SIGNER_NOT_FOUND = 'SIGNER_NOT_FOUND',
  UNKNOWN = 'UNKNOWN ISSUE',
  SIGNATURE_VERIFICATION_FAILD = 'SIGNATURE_VERIFICATION_FAILD',
}

export enum Web3BundleError {
  //BUNDLER
  BUNDLER_MARKET_CREATION_FAILED = 'Market creation failed.',
  BUNDLER_MARKET_ID_FAILED = 'Market Id is failed.',
  BUNDLER_POOL_TX_SETUP_FAILED = 'Transaction setup failed.',
  BUNDLER_BUY_TX_SETUP_FAILED = 'Buy transaction setup failed.',
  BUNDLER_AIRDROP_TXS_SETUP_FAILED = 'Airdrop transactions setup failed.',
  BUNDLER_FAILED_TO_PREPARE = 'Failed to prepare transaction.',
  BUNDLER_FAILED_TO_SEND = 'Failed to send transaction.',
}

export enum Web3Error {
  WALLET_NOT_FOUND,
  TRANSACTION_FAILED,
  INVALID_PUBKEY_STR,
  FAILED_TO_FETCH_DATA,
  FAILED_TO_DEPLOY_METADATA,
  FAILED_TO_PREPARE_TX,
  TX_SIGN_FAILED,

  //TOKEN
  TOKEN_NOT_FOUND,
  AUTHORITY_ALREADY_REVOKED,
  NOT_ENOUGH_TOKEN,
  UNAUTHORISED,
}

export function web3BundleErrorToStr(error: Web3BundleError) {
  switch (error) {
    case Web3BundleError.BUNDLER_MARKET_CREATION_FAILED:
      return Web3BundleError.BUNDLER_MARKET_CREATION_FAILED;
    case Web3BundleError.BUNDLER_POOL_TX_SETUP_FAILED:
      return Web3BundleError.BUNDLER_POOL_TX_SETUP_FAILED;
    case Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED:
      return Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED;
    case Web3BundleError.BUNDLER_AIRDROP_TXS_SETUP_FAILED:
      return Web3BundleError.BUNDLER_AIRDROP_TXS_SETUP_FAILED;
    case Web3BundleError.BUNDLER_FAILED_TO_PREPARE:
      return Web3BundleError.BUNDLER_FAILED_TO_PREPARE;
    case Web3BundleError.BUNDLER_FAILED_TO_SEND:
      return Web3BundleError.BUNDLER_FAILED_TO_SEND;
  }
}

export function web3ErrorToStr(error: Web3Error) {
  switch (error) {
    case Web3Error.WALLET_NOT_FOUND:
      return 'WALLET_NOT_FOUND';
    case Web3Error.TRANSACTION_FAILED:
      return 'TRANSACTION_FAILED';
    case Web3Error.INVALID_PUBKEY_STR:
      return 'INVALID_PUBKEY_STR';
    case Web3Error.FAILED_TO_FETCH_DATA:
      return 'FAILED_TO_FETCH_DATA';
    case Web3Error.FAILED_TO_DEPLOY_METADATA:
      return 'FAILED_TO_DEPLOY_METADATA';
    case Web3Error.FAILED_TO_PREPARE_TX:
      return 'FAILED_TO_PREPARE_TX';
    case Web3Error.TX_SIGN_FAILED:
      return 'TX_SIGN_FAILED';
    case Web3Error.TOKEN_NOT_FOUND:
      return 'TOKEN_NOT_FOUND';
    case Web3Error.AUTHORITY_ALREADY_REVOKED:
      return 'AUTHORITY_ALREADY_REVOKED';
    case Web3Error.NOT_ENOUGH_TOKEN:
      return 'NOT_ENOUGH_TOKEN';
    case Web3Error.UNAUTHORISED:
      return 'UNAUTHORISED';
  }
}
