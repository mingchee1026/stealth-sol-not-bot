import { web3, Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

import { ENV } from '@root/configs';
import { Connectivity, CreateTokenInput } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { web3ErrorToStr } from '@root/web3/errors';

let isLaunched = false;

export async function createToken(
  deployWallet: string,
  inputData: CreateTokenInput,
) {
  if (isLaunched) {
    return;
  }

  isLaunched = true;

  const rpcEndpoint = process.env.RPC_END_POINT || '';
  const walletkeyPair = getKeypairFromStr(deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    throw 'Wallet not found';
  }

  const wallet = new Wallet(walletkeyPair);

  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: WalletAdapterNetwork.Testnet,
  });

  connectivity
    .createToken(inputData)
    .then((res) => {
      if (res?.Err) {
        const errorInto = web3ErrorToStr(res.Err);
        throw errorInto;
      }
      if (!res || !res?.Ok) {
        throw 'Tx was failed.';
      }

      console.log('Token successfully created', 'success');

      const createTokenInfo = {
        address: res.Ok.tokenAddress,
        tx: res.Ok.txSignature,
        supply: inputData.supply,
      };

      return createTokenInfo;
    })
    .catch((createTokenError) => {
      if (ENV.LOG_ERROR) {
        console.log({ createTokenError });
      }
      throw createTokenError;
    });
}
