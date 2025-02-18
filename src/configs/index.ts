import { web3 } from '@coral-xyz/anchor';
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@coral-xyz/anchor/dist/cjs/utils/token';
import { SystemProgram } from '@solana/web3.js';
import Debug from 'debug';

import { getKeypairFromStr } from '../web3/base/utils';

export const RPC_ENDPOINT_MAIN =
  process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
export const RPC_ENDPOINT_TEST = 'https://api.testnet.solana.com';
export const RPC_ENDPOINT_DEV = 'https://api.devnet.solana.com';
export const RPC_ENDPOINT_LOCAL = 'http://127.0.0.1:8899';

if (process.env.DEBUG) {
  Debug.enable(process.env.DEBUG);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw 'Invalid bot env';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw 'Invalid databse env';

const IS_LOCAL_NET = process.env.IS_LOCAL_NET == '1' ? true : false;
const PINATA_API_kEY = process.env.PINATA_API_KEY;
const PINATA_DOMAIN = process.env.PINATA_DOMAIN;
const PINATA_API_SECRET_KEY = process.env.PINATA_API_SECRET_KEY;
const SKIP_DEPLOY_JSON_METADATA =
  process.env.SKIP_DEPLOY_JSON_METADATA == '1' ? true : false;
export const IN_PRODUCTION = process.env.PRODUCTION == '1' ? true : false;
const LOG_ERROR = !IN_PRODUCTION;

const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL;
const JITO_AUTH_KEYPAIR = getKeypairFromStr(
  process.env.JITO_AUTH_KEYPAIR || '',
);
const BUNDLE_FEE = Number(process.env.BUNDLE_FEE);
if (!BUNDLE_FEE || Number.isNaN(BUNDLE_FEE)) {
  throw 'Invalid bundle fee env';
}

const CHARGE_WALLET_ADDRESS = process.env.CHARGE_WALLET_ADDRESS;
if (!CHARGE_WALLET_ADDRESS) {
  throw 'Invalid charge wallet env';
}

const CREATE_TOKEN_CHARGE_SOL = process.env.CREATE_TOKEN_CHARGE_SOL;
const CREATE_MARKET_CHARGE_SOL = process.env.CREATE_MARKET_CHARGE_SOL;
const CREATE_POOL_CHARGE_SOL = process.env.CREATE_POOL_CHARGE_SOL;
const BURN_TOKENS_CHARGE_SOL = process.env.BURN_TOKENS_CHARGE_SOL;
const REMOVE_LP_CHARGE_SOL = process.env.REMOVE_LP_CHARGE_SOL;
if (
  !CREATE_TOKEN_CHARGE_SOL ||
  !CREATE_MARKET_CHARGE_SOL ||
  !CREATE_POOL_CHARGE_SOL ||
  !BURN_TOKENS_CHARGE_SOL ||
  !REMOVE_LP_CHARGE_SOL
) {
  throw 'Invalid charge fees env';
}

const CREATE_TOKEN_TOTAL_FEES_SOL = process.env.CREATE_TOKEN_TOTAL_FEES_SOL;
const CREATE_MARKET_TOTAL_FEES_SOL = process.env.CREATE_MARKET_TOTAL_FEES_SOL;
const CREATE_POOL_TOTAL_FEES_SOL = process.env.CREATE_POOL_TOTAL_FEES_SOL;
const BURN_TOKENS_TOTAL_FEES_SOL = process.env.BURN_TOKENS_TOTAL_FEES_SOL;
const REMOVE_LP_TOTAL_FEES_SOL = process.env.REMOVE_LP_TOTAL_FEES_SOL;
if (
  !CREATE_TOKEN_TOTAL_FEES_SOL ||
  !CREATE_MARKET_TOTAL_FEES_SOL ||
  !CREATE_POOL_TOTAL_FEES_SOL ||
  !BURN_TOKENS_TOTAL_FEES_SOL ||
  !REMOVE_LP_TOTAL_FEES_SOL
) {
  throw 'Invalid total fees env';
}

const CREATE_TOKEN_PRIORITY_FEE_KEY = process.env.CREATE_TOKEN_PRIORITY_FEE_KEY;
const CREATE_MARKET_PRIORITY_FEE_KEY =
  process.env.CREATE_MARKET_PRIORITY_FEE_KEY;
const BURN_TOKENs_PRIORITY_FEE_KEY = process.env.BURN_TOKENs_PRIORITY_FEE_KEY;
const REMOVE_LP_PRIORITY_FEE_KEY = process.env.REMOVE_LP_PRIORITY_FEE_KEY;
if (
  !CREATE_TOKEN_PRIORITY_FEE_KEY ||
  !CREATE_MARKET_PRIORITY_FEE_KEY ||
  !BURN_TOKENs_PRIORITY_FEE_KEY ||
  !REMOVE_LP_PRIORITY_FEE_KEY
) {
  throw 'Invalid priority fees env';
}

if (
  !PINATA_API_kEY ||
  !PINATA_API_SECRET_KEY ||
  !PINATA_DOMAIN ||
  !JITO_AUTH_KEYPAIR ||
  !JITO_BLOCK_ENGINE_URL
) {
  throw 'Some ENV keys and info not found';
}

export const ENV = {
  BOT_TOKEN,
  MONGODB_URI,
  PINATA_API_kEY,
  PINATA_API_SECRET_KEY,
  PINATA_DOMAIN,
  IN_PRODUCTION,
  RPC_ENDPOINT_MAIN,
  RPC_ENDPOINT_DEV,
  RPC_ENDPOINT_TEST,
  RPC_ENDPOINT_LOCAL,
  SKIP_DEPLOY_JSON_METADATA,
  LOG_ERROR,
  JITO_BLOCK_ENGINE_URL,
  JITO_AUTH_KEYPAIR,
  BUNDLE_FEE,
  CHARGE_WALLET_ADDRESS,
  CREATE_TOKEN_CHARGE_SOL,
  CREATE_MARKET_CHARGE_SOL,
  CREATE_POOL_CHARGE_SOL,
  BURN_TOKENS_CHARGE_SOL,
  REMOVE_LP_CHARGE_SOL,
  CREATE_TOKEN_TOTAL_FEES_SOL,
  CREATE_MARKET_TOTAL_FEES_SOL,
  CREATE_POOL_TOTAL_FEES_SOL,
  BURN_TOKENS_TOTAL_FEES_SOL,
  REMOVE_LP_TOTAL_FEES_SOL,
  CREATE_TOKEN_PRIORITY_FEE_KEY,
  CREATE_MARKET_PRIORITY_FEE_KEY,
  BURN_TOKENs_PRIORITY_FEE_KEY,
  REMOVE_LP_PRIORITY_FEE_KEY,
};
// if (IS_LOCAL_NET) ENV.RPC_ENDPOINT = RPC_ENDPOINT_LOCAL;

export const PROGRAMS = {
  associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  tokenProgram: TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
};

export const JITO_TIPS_ACCOIUNTS = [
  new web3.PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
  new web3.PublicKey('HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'),
  new web3.PublicKey('Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY'),
  new web3.PublicKey('ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49'),
  new web3.PublicKey('DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh'),
  new web3.PublicKey('ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt'),
  new web3.PublicKey('DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'),
  new web3.PublicKey('3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'),
];

export const MAX_TX_FEE = 800_000;
export const TX_FEE = 400_000;
export const ATA_INIT_COST = 2_100_000;
export const DEFAULT_TX_COST = 200_000;
export const PRIORITY_FEE_LOCAL_STORAGE_KEY = 'PRIORITY_FEE';

const log = console.log;
export const debug = log;
export const info = log;
export const error = log;

export const QUOTE_ADDRESS = {
  SOL_ADDRESS: 'So11111111111111111111111111111111111111112',
  USDC_ADDRESS: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT_ADDRESS: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};
