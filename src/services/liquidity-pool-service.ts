import { web3, Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import { Connectivity, LaunchBundleInput, LaunchBundleRes } from '../web3';
import { getKeypairFromStr } from '../web3/base/utils';
import { getPubkeyFromStr } from '@root/web3/utils';
import { BundlerInputData } from '../configs/types';

const ProcessBundleDataError = {
  BASE_TOKEN_NOT_FOUND: 'BASE_TOKEN_NOT_FOUND',
  QUOTE_TOKEN_NOT_FOUND: 'QUOTE_TOKEN_NOT_FOUND',
  INVALID_BUYER_INFO: 'INVALID_BUYER_INFO',
  INVALID_BUY_AMOUNT: 'INVALID_BUY_AMOUNT',
  BUYERS_ARE_NOT_UNIQUE: 'ALL_BUYER_KEY_SHOULD_BE_UNIQUE',
  INSUFFICIENT_AMOUNT_TO_AIRDROP: 'INSUFFICIENT_AMOUNT_TO_AIRDROP',
  INVALID_LIQUIDITY_AMOUNT_INPUT: 'INVALID_LIQUIDITY_AMOUNT_INPUT',
};

let isLaunched = false;

export async function launchLiquidityPool(inputData: BundlerInputData) {
  if (isLaunched) {
    return;
  }

  isLaunched = true;

  const rpcEndpoint = process.env.RPC_END_POINT || '';
  const walletkeyPair = getKeypairFromStr(inputData.bundleSetup.deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    throw 'Wallet not found';
  }

  const wallet = new Wallet(walletkeyPair);

  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: WalletAdapterNetwork.Testnet,
  });

  try {
    const processBundleRes = await preProcessBundleData(inputData).catch(
      (preProcessBundleDataError) => {
        // console.log({ preProcessBundleDataError });
        console.log(
          `Failed generate Bundle data: ${preProcessBundleDataError}`,
          'error',
        );
        return preProcessBundleDataError;
      },
    );

    if (!processBundleRes) {
      return;
    }

    console.log({ processBundleRes });
    const bundleInput = processBundleRes;
    const bundleRes = await connectivity
      .launchBundle(bundleInput, onConsole)
      .catch((launchBundleError) => {
        console.log('Failed generate Bundle data', { launchBundleError });
        return launchBundleError;
      });

    if (bundleRes?.Err) {
      const bunldeErr = bundleRes.Err;
      console.log({ bunldeErr });
      throw 'Errors when preparing bundle';
    }
    if (!bundleRes || !bundleRes.Ok) {
      console.log('bundle failed');
      throw 'Bundle failed';
    }

    const bundleInfo: LaunchBundleRes = bundleRes.Ok;
    console.log({ bundleInfo });

    isLaunched = false;

    return bundleInfo;
  } catch (error) {
    throw 'error';
  }
}

async function preProcessBundleData(
  bundleData: BundlerInputData,
): Promise<LaunchBundleInput | void> {
  return new Promise((resolve, reject) => {
    const { createTokenInfo, marketSettings, bundleSetup } = bundleData;
    const baseMint = getPubkeyFromStr(createTokenInfo.address);
    if (!baseMint) return reject(ProcessBundleDataError.BASE_TOKEN_NOT_FOUND);
    const quoteMint = new web3.PublicKey(
      'So11111111111111111111111111111111111111112',
    );

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
    if (!baseliquidityAmount || !quoteliquidityAmount) {
      return reject(ProcessBundleDataError.INVALID_LIQUIDITY_AMOUNT_INPUT);
    }

    resolve({
      marketSettings: {
        baseMint,
        quoteMint,
        lotSize: marketSettings.baseLogSize,
        tickSize: marketSettings.tickSize,
      },
      //PERF: deployer keypair and more
      bundleSetup: {
        baseAmount: baseliquidityAmount,
        quoteAmount: quoteliquidityAmount,
        buyers,
      },
    });
  });
}

function onConsole(log: string) {
  console.log(log);
}
