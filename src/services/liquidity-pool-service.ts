import { web3, Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ComputeBudgetProgram } from '@solana/web3.js';

import { Connectivity, LaunchBundleInput, LaunchBundleRes } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { getPubkeyFromStr } from '@root/web3/utils';
import { BundlerInputData } from '@root/configs/types';

import { ENV } from '@root/configs';
import LiquidityPool from '@root/models/liquidity-pool-model';
import { chargeToSite } from './utils';

const ProcessBundleDataError = {
  BASE_TOKEN_NOT_FOUND: 'BASE_TOKEN_NOT_FOUND',
  QUOTE_TOKEN_NOT_FOUND: 'QUOTE_TOKEN_NOT_FOUND',
  INVALID_BUYER_INFO: 'INVALID_BUYER_INFO',
  INVALID_BUY_AMOUNT: 'INVALID_BUY_AMOUNT',
  BUYERS_ARE_NOT_UNIQUE: 'ALL_BUYER_KEY_SHOULD_BE_UNIQUE',
  INSUFFICIENT_AMOUNT_TO_AIRDROP: 'INSUFFICIENT_AMOUNT_TO_AIRDROP',
  INVALID_LIQUIDITY_AMOUNT_INPUT: 'INVALID_LIQUIDITY_AMOUNT_INPUT',
  INVALID_BUNDLE_INPUT: 'INVALID_BUNDLE_INPUT',
};

export async function saveLiquidityPool(liquidityPool: any) {
  try {
    const pool = new LiquidityPool(liquidityPool);
    await pool.save();
  } catch (err) {}
}

export async function getLiquidityPool(chatId: number, baseToken: string) {
  try {
    const pool = await LiquidityPool.findOne({ chatId, baseToken });
    return pool;
  } catch (err) {}
}

export async function launchLiquidityPool(
  inputData: BundlerInputData,
  solTxnsTip: number,
) {
  const rpcEndpoint = ENV.IN_PRODUCTION
    ? ENV.RPC_ENDPOINT_MAIN
    : ENV.RPC_ENDPOINT_DEV;
  const walletkeyPair = getKeypairFromStr(inputData.bundleSetup.deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    throw 'Deploy Wallet not found';
  }

  const chargeAddress = process.env.CHARGE_WALLET_ADDRESS;
  if (!chargeAddress) {
    throw 'Charge Wallet not found';
  }

  const wallet = new Wallet(walletkeyPair);
  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: ENV.IN_PRODUCTION
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet, //.Testnet,
  });

  try {
    const processBundleRes = await preProcessBundleData(inputData).catch(
      (preProcessBundleDataError) => {
        // console.log({ preProcessBundleDataError });
        console.log(
          `Failed generate Bundle data: ${preProcessBundleDataError}`,
        );
        throw 'Failed generate Bundle data';
      },
    );

    if (!processBundleRes) {
      throw 'Failed generate Bundle data';
    }

    const bundleInput = processBundleRes;
    const bundleRes = await connectivity
      .launchBundleWithMarket(bundleInput, onConsole)
      .catch((launchBundleError) => {
        console.log('Failed generate Bundle data', launchBundleError);
        throw 'Failed generate Bundle data';
      });

    if (bundleRes?.Err) {
      const bunldeErr = bundleRes.Err;
      console.log('Errors when preparing bundle', bunldeErr);
      throw bunldeErr;
    }

    if (!bundleRes || !bundleRes.Ok) {
      console.log('bundle failed');
      throw 'Bundle failed';
    }

    const bundleInfo: LaunchBundleRes = bundleRes.Ok;
    // console.log('Bundle results: ', bundleInfo);

    // charge to site 0.025 SOL
    await chargeToSite(
      inputData.bundleSetup.deployWallet,
      Number(ENV.CREATE_POOL_CHARGE_SOL),
      solTxnsTip,
    );

    return bundleInfo;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function preProcessBundleData(
  bundleData: BundlerInputData,
): Promise<LaunchBundleInput | void> {
  return new Promise((resolve, reject) => {
    const { createTokenInfo, marketSettings, bundleSetup } = bundleData;
    const baseMint = getPubkeyFromStr(createTokenInfo.address);
    if (!baseMint) return reject(ProcessBundleDataError.BASE_TOKEN_NOT_FOUND);
    const quoteMint = getPubkeyFromStr(marketSettings.quoteTokenAddress);
    if (!quoteMint) return reject(ProcessBundleDataError.QUOTE_TOKEN_NOT_FOUND);

    if (!bundleSetup.buyerCount || !bundleSetup.quoteliquidityAmount) {
      return reject(ProcessBundleDataError.INVALID_BUYER_INFO);
    }
    const buyers = [];
    const setBuyers: Set<string> = new Set();
    for (let i = 0; i < bundleSetup.buyerCount; i++) {
      const buyer = bundleSetup.buyers[i];
      const { amount, privateKey } = buyer;
      const buyAmount = Number(amount);
      if (!buyAmount || Number.isNaN(buyAmount))
        return reject(ProcessBundleDataError.INVALID_BUY_AMOUNT);
      const buyerAuthority = getKeypairFromStr(privateKey);
      if (!buyerAuthority)
        return reject(ProcessBundleDataError.INVALID_BUYER_INFO);
      if (setBuyers.has(buyerAuthority.publicKey.toBase58()))
        return reject(ProcessBundleDataError.BUYERS_ARE_NOT_UNIQUE);
      setBuyers.add(buyerAuthority.publicKey.toBase58());
      buyers.push({ buyAmount, buyerAuthority });
    }

    const baseliquidityAmount = createTokenInfo.supply;
    const quoteliquidityAmount = bundleSetup.quoteliquidityAmount;
    const bundleTip = bundleSetup.bundleTip;
    const blockEngine = bundleSetup.blockEngin;
    if (!baseliquidityAmount || !quoteliquidityAmount) {
      return reject(ProcessBundleDataError.INVALID_LIQUIDITY_AMOUNT_INPUT);
    }

    if (!bundleTip || !blockEngine) {
      return reject(ProcessBundleDataError.INVALID_BUNDLE_INPUT);
    }

    resolve({
      marketSettings: {
        marketId: marketSettings.marketId,
        baseMint,
        quoteMint,
        lotSize: marketSettings.baseLogSize,
        tickSize: marketSettings.tickSize,
      },
      //PERF: deployer keypair and more
      bundleSetup: {
        baseAmount: baseliquidityAmount,
        quoteAmount: quoteliquidityAmount,
        bundleTip: bundleTip,
        buyers,
        blockEngineUrl: blockEngine,
      },
    });
  });
}

function onConsole(log: string) {
  console.log(log);
}
