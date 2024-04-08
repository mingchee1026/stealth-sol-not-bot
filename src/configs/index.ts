import { web3 } from '@coral-xyz/anchor';
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@coral-xyz/anchor/dist/cjs/utils/token';
import { SystemProgram } from '@solana/web3.js';

import { getKeypairFromStr } from '../web3/base/utils';

export const RPC_ENDPOINT_MAIN =
  'https://greatest-cosmological-diamond.solana-mainnet.quiknode.pro/911eeb4f80ca21426f9d8cb6a743d84545db73fa/'; //'https://api.mainnet-beta.solana.com';
export const RPC_ENDPOINT_TEST = 'https://api.testnet.solana.com';
export const RPC_ENDPOINT_DEV = 'https://api.devnet.solana.com';
export const RPC_ENDPOINT_LOCAL = 'http://127.0.0.1:8899';

const IS_LOCAL_NET = process.env.IS_LOCAL_NET == '1' ? true : false;
const PINATA_API_kEY = process.env.PINATA_API_KEY;
const PINATA_DOMAIN = process.env.PINATA_DOMAIN;
const PINATA_API_SECRET_KEY = process.env.PINATA_API_SECRET_KEY;
const SKIP_DEPLOY_JSON_METADATA =
  process.env.SKIP_DEPLOY_JSON_METADATA == '1' ? true : false;
export const IN_PRODUCTION = process.env.PRODUCTION == '1' ? true : false;
const LOG_ERROR = !IN_PRODUCTION;

const CUSTOM_RPC_ENDPOINT_MAIN = process.env.CUSTOM_RPC_ENDPOINT_MAIN;

const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL;
const JITO_AUTH_KEYPAIR = getKeypairFromStr(
  process.env.JITO_AUTH_KEYPAIR || '',
);
const BUNDLE_FEE = Number(process.env.BUNDLE_FEE);
if (!BUNDLE_FEE || Number.isNaN(BUNDLE_FEE)) throw 'Invalid bundle fee env';

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
  PINATA_API_kEY,
  PINATA_API_SECRET_KEY,
  PINATA_DOMAIN,
  IN_PRODUCTION,
  RPC_ENDPOINT_DEV,
  RPC_ENDPOINT_MAIN,
  CUSTOM_RPC_ENDPOINT_MAIN,
  RPC_ENDPOINT_LOCAL,
  RPC_ENDPOINT_TEST,
  RPC_ENDPOINT: IN_PRODUCTION ? CUSTOM_RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV,
  SKIP_DEPLOY_JSON_METADATA,
  LOG_ERROR,
  JITO_BLOCK_ENGINE_URL,
  JITO_AUTH_KEYPAIR,
  BUNDLE_FEE,
};
if (IS_LOCAL_NET) ENV.RPC_ENDPOINT = RPC_ENDPOINT_LOCAL;

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

export const TX_FEE = 400_000;
export const ATA_INIT_COST = 2_100_000;

const log = console.log;
export const debug = log;
export const info = log;
export const error = log;
