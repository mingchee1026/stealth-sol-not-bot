import { Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import { ENV, RPC_ENDPOINT_MAIN, RPC_ENDPOINT_DEV } from '@root/configs';
import { Connectivity, CreateTokenInput } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { web3ErrorToStr } from '@root/web3/errors';
import Token from '@root/models/token-model';
import { chargeToSite } from './utils';

export async function saveToken(
  chatId: number,
  deployWallet: string,
  inputData: CreateTokenInput,
  mintAddress: string,
  txAddress: string,
) {
  try {
    const token = new Token({
      chatId: chatId,
      name: inputData.name,
      symbol: inputData.symbol,
      decimals: inputData.decimals,
      supply: inputData.supply,
      image: inputData.image,
      description: inputData.description,
      socialLinks: inputData.socialLinks,
      immutable: inputData.immutable,
      revokeMint: inputData.revokeMint,
      revokeFreeze: inputData.revokeFreeze,
      deployWallet: deployWallet,
      mintAddress: mintAddress,
      txAddress: txAddress,
    });

    await token.save();
  } catch (err) {
    console.log(err);
  }
}

export async function getMintToken(chatId: number, mintAddress: string) {
  try {
    const mintedToken = await Token.findOne({
      chatId,
      mintAddress,
    });

    return mintedToken;
  } catch (err) {
    console.log(err);
  }
}

export async function mintToken(
  deployWallet: string,
  inputData: CreateTokenInput,
  solTxnsTip: number,
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

    const txCharge = await chargeToSite(
      deployWallet,
      Number(ENV.CREATE_TOKEN_CHARGE_SOL),
      solTxnsTip,
    );

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
