import { web3 } from '@coral-xyz/anchor';
import { ComputeBudgetProgram } from '@solana/web3.js';

import { ENV } from '@root/configs';
import { getKeypairFromStr } from '@root/web3/base/utils';

export async function chargeToSite(
  fromPrivateKey: string,
  solForChage: number,
  solTxnsTip: number,
) {
  const rpc = ENV.IN_PRODUCTION ? ENV.RPC_ENDPOINT_MAIN : ENV.RPC_ENDPOINT_DEV;
  const chargeWallet = ENV.CHARGE_WALLET_ADDRESS;

  const from = getKeypairFromStr(fromPrivateKey);
  const to = new web3.PublicKey(chargeWallet);

  const connection = new web3.Connection(rpc);

  // Generate base and priority transactions

  console.log('prepare charging tx:', solForChage);

  const txBase = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: from!.publicKey,
      toPubkey: to,
      lamports: web3.LAMPORTS_PER_SOL * solForChage,
    }),
  );

  console.log('sending charging tx:', solForChage);

  const signature = await web3.sendAndConfirmTransaction(connection, txBase, [
    from!,
  ]);

  console.log('Charge Signature:', signature);

  return signature;

  const priorityFeeIX = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: web3.LAMPORTS_PER_SOL * solTxnsTip * 0.000001,
  });
  const txPriority = txBase.add(priorityFeeIX);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  txBase.recentBlockhash = blockhash;
  txPriority.recentBlockhash = blockhash;
  txBase.lastValidBlockHeight = lastValidBlockHeight;
  txPriority.lastValidBlockHeight = lastValidBlockHeight;

  // Generate promises for each transaction
  const [txBaseRequest, txPriorityRequest] = [txBase, txPriority].map((tx) =>
    web3.sendAndConfirmTransaction(connection, tx, [from!]),
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
