import { Wallet } from '@coral-xyz/anchor';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
  SendTransactionError,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAccount,
  getMint,
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Connectivity } from '@root/web3';

import {
  ENV,
  RPC_ENDPOINT_MAIN,
  RPC_ENDPOINT_DEV,
  ATA_INIT_COST,
} from '@root/configs';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { chargeToSite } from './utils';
import { getPriorityFee } from '@root/web3/priorityFee';

// const WALLET = Keypair.fromSecretKey(new Uint8Array(secret));

// const MINT_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // USDC-Dev from spl-token-faucet.com | replace with the mint you would like to burn
// const MINT_DECIMALS = 6; // Value for USDC-Dev from spl-token-faucet.com | replace with the no. decimals of mint you would like to burn
// const BURN_QUANTITY = 1; // Number of tokens to burn (feel free to replace with any number - just make sure you have enough)

export const burnTokens = async (
  walletPrivateKey: string,
  poolId: string,
  burnPercent: number,
  solTxnsTip: number,
): Promise<{ Ok: boolean; tx?: string; err?: string }> => {
  try {
    const rpcEndpoint = ENV.IN_PRODUCTION
      ? ENV.RPC_ENDPOINT_MAIN
      : ENV.RPC_ENDPOINT_DEV;
    const walletkeyPair = getKeypairFromStr(walletPrivateKey);

    if (!walletkeyPair || !walletkeyPair?.publicKey) {
      // throw 'Wallet not found';
      throw 'Primary Wallet not found.';
    }

    const wallet = new Wallet(walletkeyPair);

    const connectivity = new Connectivity({
      wallet: wallet,
      rpcEndpoint: rpcEndpoint,
      network: ENV.IN_PRODUCTION
        ? WalletAdapterNetwork.Mainnet
        : WalletAdapterNetwork.Devnet,
    });

    const res = await connectivity.burnLiquidity({
      poolId: new PublicKey(poolId),
      percentageOfBurn: burnPercent,
    });

    if (!res) {
      throw 'Unknown error';
    }

    if (res.Err) {
      throw res.Err;
    }

    return { Ok: true, tx: res.Ok?.txSignature };
  } catch (error: any) {
    console.log(error);
    return { Ok: false, err: error };
  }
};
export const burnTokensBack = async (
  walletPrivateKey: string,
  mintAddress: string,
  supply: number,
  mintDecimals: number,
  burnPercent: number,
  solTxnsTip: number,
): Promise<{ txid: string } | null> => {
  try {
    const rpcEndpoint = ENV.IN_PRODUCTION
      ? RPC_ENDPOINT_MAIN
      : RPC_ENDPOINT_DEV;
    const connection = new Connection(rpcEndpoint);

    const burnWallet = getKeypairFromStr(walletPrivateKey);
    if (!burnWallet) {
      throw 'Not found wallet';
    }

    console.log(
      `Attempting to burn ${burnPercent}% [${mintAddress}] tokens from Owner Wallet: ${burnWallet.publicKey.toString()}`,
    );

    // Step 1 - Fetch Associated Token Account Address
    console.log(`Step 1 - Fetch Token Account`);

    const account = await getAssociatedTokenAddress(
      new PublicKey(mintAddress),
      burnWallet.publicKey,
    );

    console.log(
      `    ✅ - Associated Token Account Address: ${account.toString()}`,
    );

    // Step 2 - Create Burn Instructions
    console.log(`Step 2 - Create Burn Instructions`);

    const balanceOfToken = await getTokenBalanceSpl(connection, mintAddress);

    console.log(`Token Balance: ${balanceOfToken}`);

    const burnAmount = (Number(balanceOfToken * burnPercent) / 100).toFixed(
      mintDecimals,
    );

    // if (burnAmount === 0) {
    //   throw `This wallet doesn't own the token you're trying to burn.`;
    // }

    console.log(`Burn Tokens Amount: ${burnAmount}`);

    const burnIx = createBurnCheckedInstruction(
      account, // PublicKey of Owner's Associated Token Account
      new PublicKey(mintAddress), // Public Key of the Token Mint Address
      burnWallet.publicKey, // Public Key of Owner's Wallet
      Number(burnAmount) * 10 ** mintDecimals, // Number of tokens to burn
      mintDecimals, // Number of Decimals of the Token Mint
    );

    console.log(`    ✅ - Burn Instruction Created`);

    // Step 3 - Fetch Blockhash
    console.log(`Step 3 - Fetch Blockhash`);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('finalized');

    console.log(`    ✅ - Latest Blockhash: ${blockhash}`);

    // Step 4 - Assemble Transaction
    console.log(`Step 4 - Assemble Transaction`);

    const priorityFee = getPriorityFee();
    const txFee =
      (priorityFee as any)[ENV.BURN_TOKENs_PRIORITY_FEE_KEY] +
      2 * ATA_INIT_COST +
      2000000;
    console.log('burntokens', txFee);
    const incTxFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: txFee,
    });

    const messageV0 = new TransactionMessage({
      payerKey: burnWallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [incTxFeeIx, burnIx],
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([burnWallet]);

    console.log(`    ✅ - Transaction Created and Signed`);

    // Step 5 - Execute & Confirm Transaction
    console.log(`Step 5 - Execute & Confirm Transaction`);

    const txid = await connection.sendTransaction(transaction);

    console.log('    ✅ - Transaction sent to network');

    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    });
    if (confirmation.value.err) {
      throw new Error('    ❌ - Transaction not confirmed.');
    }

    console.log(
      '🔥 SUCCESSFUL BURN!🔥',
      '\n',
      `https://explorer.solana.com/tx/${txid}`,
    );

    await chargeToSite(
      walletPrivateKey,
      Number(ENV.BURN_TOKENS_CHARGE_SOL),
      solTxnsTip,
    );

    return { txid };
  } catch (err) {
    // console.log(err);
    if (err instanceof SendTransactionError) {
      throw err.message; //`You don't have enough funds to execute this transaction.`;
    }

    throw err;
  }
};

const getTokenBalanceSpl = async (
  connection: Connection,
  tokenAccount: string,
) => {
  // const rpcEndpoint = ENV.IN_PRODUCTION ? RPC_ENDPOINT_MAIN : RPC_ENDPOINT_DEV;
  // const connection = new Connection(rpcEndpoint);

  // const info = await getAccount(connection, new PublicKey(tokenAccount));
  // console.log('info:', info);
  // const amount = Number(info.amount);
  // console.log('amount:', amount);
  const mint = await getMint(connection, new PublicKey(tokenAccount));
  console.log('Supply: ', mint.supply);
  const balance = Number(mint.supply) / 10 ** mint.decimals;
  console.log('Balance: ', balance);

  return balance;
};
