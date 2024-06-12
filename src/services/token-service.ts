import { Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import FormData from 'form-data';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import { ENV } from '@root/configs';
import { Connectivity, CreateTokenInput } from '@root/web3';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { deployDataToIPFS } from '@root/web3/base/utils';
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

export const saveLogoImage = async (file_path: string, filePath: string) => {
  try {
    const fileUrl = `https://api.telegram.org/file/bot${ENV.BOT_TOKEN}/${file_path}`;
    console.log('file Url', fileUrl);
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    await response.data.pipe(fs.createWriteStream(filePath));
  } catch (error) {
    console.error(error);
  }
};

export async function mintToken(
  deployWallet: string,
  inputData: CreateTokenInput,
  logoPath: string,
  solTxnsTip: number,
): Promise<{ address: string; tx: string; err: string }> {
  const rpcEndpoint = ENV.IN_PRODUCTION
    ? ENV.RPC_ENDPOINT_MAIN
    : ENV.RPC_ENDPOINT_DEV;
  const walletkeyPair = getKeypairFromStr(deployWallet);

  if (!walletkeyPair || !walletkeyPair?.publicKey) {
    // throw 'Wallet not found';
    return { address: '', tx: '', err: 'Primary Wallet not found.' };
  }

  const wallet = new Wallet(walletkeyPair);

  if (logoPath !== '') {
    const fileData = fs.createReadStream(logoPath);
    const logoFile = {
      buffer: fileData,
      name: path.basename(logoPath),
      type: path.extname(logoPath.slice(1)),
    };
    const formData = new FormData();
    formData.append('file', logoFile.buffer, {
      filename: logoFile.name,
      contentType: logoFile.type,
    });

    const ipfsHash = await deployDataToIPFS(formData, 'File');
    if (ipfsHash) {
      // inputData.image = `https://${ENV.PINATA_DOMAIN}/ipfs/${ipfsHash}`;
      inputData.image = `https://ipfs.io/ipfs/${ipfsHash}`;
    }
  }

  const connectivity = new Connectivity({
    wallet: wallet,
    rpcEndpoint: rpcEndpoint,
    network: ENV.IN_PRODUCTION
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet,
  });

  try {
    const res = await connectivity.createToken(inputData);

    // if (!res || !res.Ok) {
    //   return { address: '', tx: '', err: res.Err };
    // }

    if (res.Err) {
      return { address: '', tx: '', err: res.Err };
    }

    console.log('Token successfully created.');

    const txCharge = await chargeToSite(
      deployWallet,
      Number(ENV.CREATE_TOKEN_CHARGE_SOL),
      solTxnsTip,
    );

    return {
      address: res.Ok!.tokenAddress,
      tx: res.Ok!.txSignature,
      err: '',
    };
  } catch (err) {
    // console.log(err);
    // return { address: '', tx: '', err: 'Token minting failed.' };
    throw err;
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
