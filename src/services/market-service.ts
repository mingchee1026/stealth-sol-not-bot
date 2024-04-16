import { Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import { ENV, RPC_ENDPOINT_MAIN, RPC_ENDPOINT_DEV } from '@root/configs';
import { Connectivity, CreateTokenInput } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { web3ErrorToStr } from '@root/web3/errors';
import OpenMarket from '@root/models/open-market-model';

export async function saveOpenmarket(
  chartId: number,
  baseMint: string,
  quoteMint: string,
  baseLogSize: number,
  tickSize: number,
  eventLength: number,
  requestLength: number,
  orderbookLength: number,
  marketId: string,
) {
  const openMarket = new OpenMarket({
    chartId,
    baseMint,
    quoteMint,
    baseLogSize,
    tickSize,
    eventLength,
    requestLength,
    orderbookLength,
    marketId,
  });

  await openMarket.save();
}

export async function createOpenmarket(
  deployWallet: string,
  inputData: CreateTokenInput,
): Promise<{ address: string; tx: string; err: string }> {
  const rpcEndpoint = ENV.IN_PRODUCTION ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV;
  const walletkeyPair = getKeypairFromStr(deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    // throw 'Wallet not found';
    return { address: '', tx: '', err: 'Primary Wallet not found.' };
  }

  const wallet = new Wallet(walletkeyPair);

  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: ENV.IN_PRODUCTION
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet,
  });

  try {
    const res = await connectivity.createToken(inputData);

    if (res?.Err) {
      return { address: '', tx: '', err: 'Token minting failed.' };
    }

    if (!res || !res?.Ok) {
      return { address: '', tx: '', err: 'Token minting failed.' };
    }

    console.log('Token successfully created.');

    return {
      address: res.Ok.tokenAddress,
      tx: res.Ok.txSignature,
      err: '',
    };
  } catch (err) {
    console.log(err);
    return { address: '', tx: '', err: 'Token minting failed.' };
  }

  // connectivity
  //   .createToken(inputData)
  //   .then((res) => {
  //     if (res?.Err) {
  //       return { address: '', tx: '', err: web3ErrorToStr(res.Err) };
  //     }

  //     if (!res || !res?.Ok) {
  //       return { address: '', tx: '', err: 'Transaction was failed.' };
  //     }

  //     console.log('Token successfully created.');

  //     const createTokenInfo = {
  //       address: res.Ok.tokenAddress,
  //       tx: res.Ok.txSignature,
  //     };

  //     return createTokenInfo;
  //   })
  //   .catch((createTokenError) => {
  //     console.log(createTokenError);
  //     return { address: '', tx: '', err: 'Token minting failed.' };
  //   });
}
