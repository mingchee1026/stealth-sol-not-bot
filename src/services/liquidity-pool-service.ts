import { web3, Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ComputeBudgetProgram } from '@solana/web3.js';

import { Connectivity, LaunchBundleInput, LaunchBundleRes } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { getPubkeyFromStr } from '@root/web3/utils';
import { BundlerInputData } from '@root/configs/types';

import { ENV } from '@root/configs';

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

export async function launchLiquidityPool(
  inputData: BundlerInputData,
  solTxnsTip: number,
) {
  const rpcEndpoint = ENV.IN_PRODUCTION
    ? ENV.RPC_ENDPOINT_MAIN
    : ENV.RPC_ENDPOINT_TEST;
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
      : WalletAdapterNetwork.Testnet,
  });

  try {
    /*    const processBundleRes = await preProcessBundleData(inputData).catch(
      (preProcessBundleDataError) => {
        // console.log({ preProcessBundleDataError });
        console.log(
          `Failed generate Bundle data: ${preProcessBundleDataError}`,
        );
        throw preProcessBundleDataError;
      },
    );

    if (!processBundleRes) {
      throw 'Failed generate Bundle data';
    }

    const bundleInput = processBundleRes;
    const bundleRes = await connectivity
      .launchBundle(bundleInput, onConsole)
      .catch((launchBundleError) => {
        console.log('Failed generate Bundle data', launchBundleError);
        throw launchBundleError;
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
    console.log('Bundle results: ', bundleInfo);
*/
    // charge to site 0.025 SOL
    await chargeToSite(walletkeyPair, chargeAddress, solTxnsTip);

    return null; //bundleInfo;
  } catch (error) {
    throw error;
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

export async function chargeToSite(
  from: web3.Keypair,
  chargeAddress: string,
  solTxnsTip: number,
) {
  const connection = new web3.Connection(
    ENV.IN_PRODUCTION ? ENV.RPC_ENDPOINT_MAIN : ENV.RPC_ENDPOINT_DEV,
  );

  const to = new web3.PublicKey(chargeAddress);

  // Generate base and priority transactions
  const solForCharging = process.env.CHARGE_SOL || '0.25';
  console.log('solForCharging:', solForCharging);
  const txBase = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: web3.LAMPORTS_PER_SOL * parseFloat(solForCharging),
    }),
  );

  // const signature1 = await web3.sendAndConfirmTransaction(connection, txBase, [
  //   from,
  // ]);

  // console.log('SIGNATURE', signature1);

  // return;

  solTxnsTip = 0.000001;
  console.log('PriorFee:', solTxnsTip / 0.000000001);
  const priorityFeeIX = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: Math.ceil(
      1000000, //(web3.LAMPORTS_PER_SOL * solTxnsTip * 1000000) / 300,
    ),
  });
  const txPriority = txBase.add(priorityFeeIX);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  txBase.recentBlockhash = blockhash;
  txPriority.recentBlockhash = blockhash;
  txBase.lastValidBlockHeight = lastValidBlockHeight;
  txPriority.lastValidBlockHeight = lastValidBlockHeight;

  const signature = await web3.sendAndConfirmTransaction(connection, txBase, [
    from,
  ]);
  console.log('SIGNATURE', signature);
  const txBaseResult = await connection.getTransaction(signature);
  console.log(txBaseResult);
  console.log(`txPriority Fee: ${txBaseResult?.meta?.fee} Lamports`);
  return;

  // Generate promises for each transaction
  const [txBaseRequest, txPriorityRequest] = [txBase, txPriority].map((tx) =>
    web3.sendAndConfirmTransaction(connection, tx, [from]),
  );

  try {
    // Step 3 - Send transactions to the cluster
    const [txBaseId, txPriorityId] = await Promise.all([
      txBaseRequest,
      txPriorityRequest,
    ]);

    // Step 4 - Fetch tx results, and log fees
    const [txBaseResult, txPriorityResult] = await Promise.all([
      connection.getTransaction(txBaseId),
      connection.getTransaction(txPriorityId),
    ]);

    console.log(txBaseResult);
    console.log(
      `txBase URL: https://explorer.solana.com/tx/${txBaseId}?cluster=devnet`,
    );
    console.log(`txBase Fee: ${txBaseResult?.meta?.fee} Lamports`);

    console.log(txPriorityResult);
    console.log(
      `txPriority URL: https://explorer.solana.com/tx/${txPriorityId}?cluster=devnet`,
    );
    console.log(`txPriority Fee: ${txPriorityResult?.meta?.fee} Lamports`);
  } catch (error) {
    console.log(error);
  }
}

function onConsole(log: string) {
  console.log(log);
}
