import { web3, Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import { ENV } from '@root/configs';
import { MarketSettings } from '@root/configs/types';
import { Connectivity } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { getPubkeyFromStr } from '@root/web3/utils';
import { web3ErrorToStr } from '@root/web3/errors';
import OpenMarket from '@root/models/open-market-model';
import { chargeToSite } from './utils';

export async function saveOpenmarket(
  chatId: number,
  baseMint: string,
  quoteMint: string,
  baseLogSize: number,
  tickSize: number,
  eventLength: number,
  requestLength: number,
  orderbookLength: number,
  marketId: string,
  txAddress: string,
) {
  try {
    const openMarket = new OpenMarket({
      chatId,
      baseMint,
      quoteMint,
      baseLogSize,
      tickSize,
      eventLength,
      requestLength,
      orderbookLength,
      marketId,
      txAddress,
    });

    await openMarket.save();
  } catch (err) {
    console.log(err);
  }
}

export async function getOpenmarketById(chatId: number, marketId: string) {
  try {
    const openMarket = await OpenMarket.findOne({
      chatId,
      marketId,
    });

    return openMarket;
  } catch (err) {
    console.log(err);
  }
}

export async function getOpenmarketByToken(chatId: number, baseMint: string) {
  try {
    const openMarket = await OpenMarket.findOne({
      chatId,
      baseMint,
    });

    return openMarket;
  } catch (err) {
    console.log(err);
  }
}

export async function createOpenMarket(inputData: {
  baseMint: string;
  quoteMint: string;
  lotSize: number;
  tickSize: number;
  eventQueueLength?: number;
  orderbookLength?: number;
  requestQueueLength?: number;
  deployWallet: string;
  solTxnsTip: number;
}) {
  console.log(inputData);

  const rpcEndpoint = ENV.IN_PRODUCTION
    ? ENV.RPC_ENDPOINT_MAIN
    : ENV.RPC_ENDPOINT_DEV;
  const walletkeyPair = getKeypairFromStr(inputData.deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    throw 'Deploy Wallet not found';
  }

  const wallet = new Wallet(walletkeyPair);
  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: ENV.IN_PRODUCTION
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet,
  });

  const baseMint = getPubkeyFromStr(inputData.baseMint);
  if (!baseMint) {
    throw 'Base token not found.';
  }

  const quoteMint = new web3.PublicKey(inputData.quoteMint);

  const createMarketInput = {
    baseMint,
    quoteMint,
    tickers: {
      lotSize: inputData.lotSize,
      tickSize: inputData.tickSize,
    },
    eventQueueLength: inputData.eventQueueLength,
    requestQueueLength: inputData.requestQueueLength,
    openBookLength: inputData.orderbookLength,
  };

  try {
    const res = await connectivity
      .createOpenMarket(createMarketInput)
      .catch((launchBundleError) => {
        console.log('Failed generate Market data', launchBundleError);
        throw launchBundleError;
      });

    if (res?.Err) {
      const bunldeErr = res.Err;
      console.log('Errors when preparing transaction', bunldeErr);
      throw bunldeErr;
    }

    if (!res || !res.Ok) {
      console.log('Failed create Market');
      throw 'Failed create Market';
    }

    const marketInfo = res.Ok;
    console.log('Market results: ', marketInfo);

    const txCharge = await chargeToSite(
      inputData.deployWallet,
      Number(ENV.CREATE_POOL_CHARGE_SOL),
      inputData.solTxnsTip,
    );

    return marketInfo;
  } catch (error) {
    throw error;
  }
}

function onConsole(log: string) {
  console.log(log);
}
