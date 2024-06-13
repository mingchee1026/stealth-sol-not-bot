import { web3 } from '@coral-xyz/anchor';
import { ComputeBudgetProgram } from '@solana/web3.js';

import { ENV, TX_FEE, ATA_INIT_COST } from '@root/configs';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { getPriorityFee } from '@root/web3/priorityFee';

export async function chargeToSite(
  fromPrivateKey: string,
  solForChage: number,
  solTxnsTip: number,
) {
  try {
    const rpc = ENV.IN_PRODUCTION
      ? ENV.RPC_ENDPOINT_MAIN
      : ENV.RPC_ENDPOINT_DEV;
    const chargeWallet = ENV.CHARGE_WALLET_ADDRESS;

    const from = getKeypairFromStr(fromPrivateKey);
    const to = new web3.PublicKey(chargeWallet);

    const connection = new web3.Connection(rpc);

    // Generate base and priority transactions

    const priorityFee = getPriorityFee();
    let txFee = (priorityFee as any)['medium'];
    const priorityFeeIX = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: txFee,
    });

    const txBase = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: from!.publicKey,
        toPubkey: to,
        lamports: web3.LAMPORTS_PER_SOL * solForChage,
      }),
    );

    const txPriority = txBase.add(priorityFeeIX);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    // txBase.recentBlockhash = blockhash;
    txPriority.recentBlockhash = blockhash;
    // txBase.lastValidBlockHeight = lastValidBlockHeight;
    txPriority.lastValidBlockHeight = lastValidBlockHeight;

    console.log(`Sending charging tx: ${solForChage} SOL, Fees: ${txFee}  `);

    const signature = await web3.sendAndConfirmTransaction(
      connection,
      txPriority,
      [from!],
      { skipPreflight: true, maxRetries: 20 },
    );

    console.log('Charge Signature:', signature);

    return signature;
  } catch (err) {
    console.log('charge error:', err);
    return null;
  }
}
