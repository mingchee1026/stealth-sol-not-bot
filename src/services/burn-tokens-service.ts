import {
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAccount,
  getMint,
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

import { ENV, RPC_ENDPOINT_MAIN, RPC_ENDPOINT_DEV } from '@root/configs';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { chargeToSite } from './utils';

// const WALLET = Keypair.fromSecretKey(new Uint8Array(secret));

// const MINT_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // USDC-Dev from spl-token-faucet.com | replace with the mint you would like to burn
// const MINT_DECIMALS = 6; // Value for USDC-Dev from spl-token-faucet.com | replace with the no. decimals of mint you would like to burn
// const BURN_QUANTITY = 1; // Number of tokens to burn (feel free to replace with any number - just make sure you have enough)

export const burnTokens = async (
  walletPrivateKey: string,
  mintAddress: string,
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

    const balanceOfToken = await getTokenBalanceSpl(
      connection,
      new PublicKey(mintAddress),
    );

    console.log(`Token Balance: ${balanceOfToken}`);

    const burnAmount = (balanceOfToken * burnPercent) / 100;

    console.log(`Burn Tokens Amount: ${burnAmount}`);

    const burnIx = createBurnCheckedInstruction(
      account, // PublicKey of Owner's Associated Token Account
      new PublicKey(mintAddress), // Public Key of the Token Mint Address
      burnWallet.publicKey, // Public Key of Owner's Wallet
      burnAmount * 10 ** mintDecimals, // Number of tokens to burn
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

    const messageV0 = new TransactionMessage({
      payerKey: burnWallet.publicKey,
      recentBlockhash: blockhash,
      instructions: [burnIx],
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
    console.log(err);
    return null;
  }
};

const getTokenBalanceSpl = async (
  connection: Connection,
  tokenAccount: PublicKey,
) => {
  const info = await getAccount(connection, tokenAccount);
  console.log('info:', info);
  const amount = Number(info.amount);
  console.log('amount:', amount);
  const mint = await getMint(connection, info.mint);
  const balance = amount / 10 ** mint.decimals;
  console.log('Balance (using Solana-Web3.js): ', balance);
  return balance;
};
