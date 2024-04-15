import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import Wallet, { IWallet } from '@root/models/wallet-model';
import { ENV } from '@root/configs';
import { connection } from 'mongoose';

const FROM_KEY_PAIR = Keypair.fromSecretKey(new Uint8Array(secret));
const NUM_DROPS_PER_TX = 10;
const TX_INTERVAL = 1000;

export const createWallet = async (
  chatId: number,
  privateKey: string,
  publicKey: string,
): Promise<boolean> => {
  try {
    const wallet = new Wallet({
      chatId,
      privateKey,
      publicKey,
      isPrimary: false,
    });

    await wallet.save();

    return true;
  } catch (error) {
    return false;
  }
};

export const getWalletsByUser = async (chatId: number): Promise<IWallet[]> => {
  try {
    const wallets = await Wallet.find({ chatId });
    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        return {
          chatId: wallet.chatId,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          isPrimary: wallet.isPrimary,
          balance: 0.2,
        };
      }),
    );

    return walletsWithBalance;
  } catch (error) {
    return [];
  }
};

export const setPrimaryWallet = async (
  chatId: number,
  publicKey: string,
): Promise<boolean> => {
  try {
    await Wallet.updateMany({ chatId }, { $set: { isPrimary: false } });

    const wallet = await Wallet.findOne({ chatId, publicKey });
    if (wallet) {
      wallet.isPrimary = true;
      await wallet.save();
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const removeAllWallets = async (chatId: number): Promise<boolean> => {
  try {
    await Wallet.deleteMany({ chatId });

    return true;
  } catch (error) {
    return false;
  }
};

export const sendSOLToPrimaryWallet = async (chatId: number) => {
  console.log(`Initiating SOL drop from ${FROM_KEY_PAIR.publicKey.toString()}`);

  // let primaryWallet: IWallet = null;
  let dropList: IWallet[] = [];

  const wallets = await Wallet.find({ chatId });
  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  dropList = wallets.filter((wallet) => !wallet.isPrimary);

  const RPC_ENDPOINT = ENV.IN_PRODUCTION
    ? ENV.RPC_ENDPOINT_MAIN
    : ENV.RPC_ENDPOINT_DEV;
  const connection = new Connection(RPC_ENDPOINT);

  const transactionList = generateTransactions(
    NUM_DROPS_PER_TX,
    dropList,
    FROM_KEY_PAIR.publicKey,
  );

  const txResults = await executeTransactions(
    connection,
    transactionList,
    FROM_KEY_PAIR,
  );
  console.log(await txResults);
};

function generateTransactions(
  batchSize: number,
  dropList: IWallet[],
  primaryWallet: PublicKey,
): Transaction[] {
  let result: Transaction[] = [];
  let txInstructions: TransactionInstruction[] = dropList
    .map((drop) => {
      if (drop.balance && drop.balance > 0) {
        return SystemProgram.transfer({
          fromPubkey: new PublicKey(drop.publicKey),
          toPubkey: primaryWallet,
          lamports: drop.balance,
        });
      }
    })
    .filter(
      (instruction): instruction is TransactionInstruction =>
        instruction !== undefined,
    );

  const numTransactions = Math.ceil(txInstructions.length / batchSize);
  for (let i = 0; i < numTransactions; i++) {
    let bulkTransaction = new Transaction();
    let lowerIndex = i * batchSize;
    let upperIndex = (i + 1) * batchSize;
    for (let j = lowerIndex; j < upperIndex; j++) {
      if (txInstructions[j]) bulkTransaction.add(txInstructions[j]);
    }
    result.push(bulkTransaction);
  }
  return result;
}

async function executeTransactions(
  solanaConnection: Connection,
  transactionList: Transaction[],
  payer: Keypair,
): Promise<PromiseSettledResult<string>[]> {
  let result: PromiseSettledResult<string>[] = [];
  let staggeredTransactions: Promise<string>[] = transactionList.map(
    (transaction, i, allTx) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Requesting Transaction ${i + 1}/${allTx.length}`);
          solanaConnection
            .getLatestBlockhash()
            .then(
              (recentHash) =>
                (transaction.recentBlockhash = recentHash.blockhash),
            )
            .then(() =>
              sendAndConfirmTransaction(solanaConnection, transaction, [payer]),
            )
            .then(resolve);
        }, i * TX_INTERVAL);
      });
    },
  );
  result = await Promise.allSettled(staggeredTransactions);
  return result;
}

const getBalance = async (
  walletAddress: string,
  connection: Connection,
  isSOL = true,
) => {
  if (!connection) {
    const RPC_ENDPOINT = ENV.IN_PRODUCTION
      ? ENV.RPC_ENDPOINT_MAIN
      : ENV.RPC_ENDPOINT_DEV;
    connection = new Connection(RPC_ENDPOINT);
  }

  const balance = await connection.getBalance(new PublicKey(walletAddress));

  if (isSOL) {
    console.log(`Wallet Balance: ${balance / LAMPORTS_PER_SOL}`);
    return balance / LAMPORTS_PER_SOL;
  }

  return balance;
};
