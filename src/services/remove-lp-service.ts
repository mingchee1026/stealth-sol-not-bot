import {
  ApiPoolInfoV4,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  Market,
  SPL_MINT_LAYOUT,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  TokenAccount,
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID,
  TxVersion,
  LOOKUP_TABLE_CACHE,
  buildSimpleTransaction,
  Token,
  TokenAmount,
} from '@raydium-io/raydium-sdk';
import {
  Connection,
  PublicKey,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';

import { ENV, RPC_ENDPOINT_MAIN, RPC_ENDPOINT_DEV } from '@root/configs';
import { getKeypairFromStr } from '@root/web3/base/utils';
import { chargeToSite } from './utils';

const makeTxVersion = TxVersion.V0;

export const removeLiquidityPool = async (
  walletPrivateKey: string,
  tokenAddress: string,
  poolId: string,
  solTxnsTip: number,
): Promise<string | null> => {
  try {
    const rpcEndpoint = ENV.IN_PRODUCTION
      ? RPC_ENDPOINT_MAIN
      : RPC_ENDPOINT_DEV;
    const connection = new Connection(rpcEndpoint);

    const wallet = getKeypairFromStr(walletPrivateKey);
    if (!wallet) {
      throw 'Not found wallet';
    }

    // Step 1 - Fetch basic info
    const walletTokenAccounts = await getWalletTokenAccount(
      connection,
      wallet.publicKey,
    );

    console.log(
      `    ✅ - Wallet Token Accounts: ${walletTokenAccounts.length}`,
    );

    // const removeLpTokenAccount = walletTokenAccounts.find(
    //   (walletTokenAccount) =>
    //     walletTokenAccount.pubkey === new PublicKey(tokenAddress),
    // );

    const targetPoolInfo = await formatAmmKeysById(poolId, connection);

    if (!targetPoolInfo) {
      throw 'cannot find the target pool';
    }

    console.log(`    ✅ - Taget Pool Info: ${targetPoolInfo}`);

    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

    const removeLpToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys.lpMint,
      poolKeys.lpDecimals,
    );

    console.log(`    ✅ - Remove LP Token: ${removeLpToken}`);

    const tokenBalance = await getTokenBalanceSpl(connection, tokenAddress);

    console.log(`    ✅ - Token Balance: ${tokenBalance}`);

    const amountIn = new TokenAmount(removeLpToken, 100);

    console.log(`    ✅ - Token Amount: ${amountIn}`);

    // Step 2 - Make instructions
    const removeLiquidityInstructionResponse =
      await Liquidity.makeRemoveLiquidityInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
          owner: wallet.publicKey,
          payer: wallet.publicKey,
          tokenAccounts: walletTokenAccounts,
        },
        amountIn: amountIn,
        makeTxVersion,
      });

    console.log(
      `    ✅ - Make instructions: ${removeLiquidityInstructionResponse.address}`,
    );

    // Step 3 - Create Burn Instructions
    const willSendTx = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: removeLiquidityInstructionResponse.innerTransactions,
      addLookupTableInfo: LOOKUP_TABLE_CACHE,
    });

    const txids = await sendTx(connection, wallet, willSendTx, {
      skipPreflight: false,
      maxRetries: 30,
    });

    console.log(`    ✅ - Transaction sent to network`);

    await chargeToSite(
      walletPrivateKey,
      Number(ENV.REMOVE_LP_CHARGE_SOL),
      solTxnsTip,
    );

    return txids[0];
  } catch (err) {
    console.log(err);
    return null;
  }
};

async function formatAmmKeysById(
  id: string,
  connection: Connection,
): Promise<ApiPoolInfoV4> {
  const account = await connection.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error(' get id info error ');
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null) throw Error(' get market info error');
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = info.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(' get lp mint info error');
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint.toString(),
    quoteMint: info.quoteMint.toString(),
    lpMint: info.lpMint.toString(),
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: account.owner,
    }).publicKey.toString(),
    openOrders: info.openOrders.toString(),
    targetOrders: info.targetOrders.toString(),
    baseVault: info.baseVault.toString(),
    quoteVault: info.quoteVault.toString(),
    withdrawQueue: info.withdrawQueue.toString(),
    lpVault: info.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: info.marketProgramId.toString(),
    marketId: info.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
}

async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey,
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

async function sendTx(
  connection: Connection,
  payer: Keypair | Signer,
  txs: (VersionedTransaction | Transaction)[],
  options?: SendOptions,
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}

export const getTokenBalanceSpl = async (
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
