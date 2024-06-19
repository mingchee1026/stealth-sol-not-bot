import { AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { TOKEN_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';
import {
  Liquidity,
  LiquidityPoolInfo,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
} from '@raydium-io/raydium-sdk';
import {
  getAccount,
  AccountLayout,
  AccountLayout as TokenAccountLayout,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createBurnInstruction,
  createCloseAccountInstruction,
  MintLayout,
  NATIVE_MINT,
} from '@solana/spl-token';
import {
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair,
} from '@solana/web3.js';

import { debug, ENV, TX_FEE, ATA_INIT_COST, MAX_TX_FEE } from '@root/configs';

import { BaseMpl } from './base/baseMpl';
import { BaseRay, CreateMarketInput } from './base/baseRay';
import { BaseSpl } from './base/baseSpl';
import {
  TransferInfoFromIxs as TransferInfoFromIxs,
  Web3PassTxResult,
  Web3SendTxInput,
  Web3SendTxOpt,
  Web3SendTxResult,
  Web3SignedSendTxOpt,
  Result,
  TxPassResult,
} from './base/types';
import {
  calcNonDecimalValue,
  deployDataToIPFS,
  getKeypairFromStr,
  getKeypairFromUint8Array,
  sleep,
} from './base/utils';
import {
  TxFailReason,
  TxFailResult,
  Web3BundleError,
  Web3Error,
} from './errors';
import {
  getBlockhash,
  isBlockhashExpired,
  getJitoTipsAccount,
  getPubkeyFromStr,
  sendBundle,
  sendBundleTest,
  getFundReceiversInfoFromIxs,
} from './utils';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { getPriorityFee } from './priorityFee';

const log = console.log;
const incTxFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: TX_FEE,
});

export type CreateTokenInput = {
  name: string;
  symbol: string;
  image: string;
  decimals: number;
  description: string;
  supply: number;
  immutable?: boolean;
  revokeMint?: boolean;
  revokeFreeze?: boolean;
  socialLinks?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
};

export type RevokeTokenAuthorityInput = {
  minting?: boolean;
  freezing?: boolean;
  mint: string;
};

export type AllUserTokens = {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  decimals: number;
  supply: number;
  balance: number;
  description: string;
  mintingAuthority: string;
  isMintingAuthRevoke: boolean;
  freezingAuthority: string;
  isFreezingAuthRevoke: boolean;
};
export type AirdropInput = {
  mint: string;
  receivers: { wallet: string; amount: number }[];
};
export type LaunchBundleRes = {
  deployerAddress?: string;
  marketId?: string;
  poolId?: string;
  bundleId?: string;
  err?: string;
  bundleRes?: {
    bundleId: string;
    poolCreateTxSignature: string;
    marketCreateTxSignature: string;
    buyTxsSignature: string[];
    bundleStatus: number;
  };
  tokenAddress?: string;
  buyersInfo?: {
    address: string;
    amount: number;
  }[];
};

export type LaunchBundleInput = {
  marketSettings: {
    marketId: string;
    baseMint: web3.PublicKey;
    quoteMint: web3.PublicKey;
    lotSize: number;
    tickSize: number;
  };
  bundleSetup: {
    baseAmount: number;
    quoteAmount: number;
    bundleTip: number;
    buyers: { buyAmount: number; buyerAuthority: web3.Keypair }[];
    blockEngineUrl: string;
  };
};

export class Connectivity {
  private provider: AnchorProvider;
  private connection: web3.Connection;
  private baseMpl: BaseMpl;
  private baseSpl: BaseSpl;
  private baseRay: BaseRay;
  private readonly network: WalletAdapterNetwork;
  private txCooldownLockGuard: boolean;

  constructor(input: {
    wallet: Wallet | AnchorProvider;
    rpcEndpoint: string;
    network: WalletAdapterNetwork;
  }) {
    const { rpcEndpoint, wallet, network } = input;
    this.connection = new web3.Connection(rpcEndpoint);
    if (wallet instanceof AnchorProvider) this.provider = wallet;
    else this.provider = new AnchorProvider(this.connection, wallet, {});
    this.baseMpl = new BaseMpl(wallet, {
      endpoint: this.connection.rpcEndpoint,
    });
    this.baseSpl = new BaseSpl(this.connection);
    this.baseRay = new BaseRay({ rpcEndpointUrl: this.connection.rpcEndpoint });
    this.network = network;
    this.txCooldownLockGuard = false;
  }

  private async sendTransaction(
    ixs: web3.TransactionInstruction[],
    signers?: web3.Keypair[],
    opt?: { logErrorMsg?: boolean },
  ) {
    const tx = new web3.Transaction().add(...ixs);
    tx.feePayer = this.provider.publicKey;
    const recentBlockhash = (await this.connection.getLatestBlockhash())
      .blockhash;
    tx.recentBlockhash = recentBlockhash;

    if (signers && signers.length > 0) tx.sign(...signers);
    const signedTxs = await this.provider.wallet.signTransaction(tx);

    // const fees = await signedTxs.getEstimatedFee(this.connection);
    // console.log('signedTxs fees:', fees);

    // throw 'Tx Failed';

    const rawTx = Buffer.from(signedTxs.serialize());
    const txSignature = await web3
      .sendAndConfirmRawTransaction(this.connection, rawTx)
      .catch(async () => {
        await sleep(2_000);
        return web3
          .sendAndConfirmRawTransaction(this.connection, rawTx)
          .catch((sendRawTransactionError) => {
            // const logErrorMsg = opt?.logErrorMsg ?? !ENV.IN_PRODUCTION;
            // if (logErrorMsg) log({ sendRawTransactionError });
            // return undefined;
            log(sendRawTransactionError);
            throw sendRawTransactionError.message; // .split(':').pop().trim();
          });
      });
    if (!txSignature) throw 'Tx Failed';
    return txSignature;
  }

  private async sendTransactionWithOpt(
    txInfo: Web3SendTxInput,
    opt?: Web3SendTxOpt,
  ): Promise<Web3SendTxResult> {
    const txSignature: undefined | string = undefined;
    const passInfo = opt?.passInfo;
    txInfo.lutsInfo = txInfo.lutsInfo ?? [];
    // debug({ opt })
    try {
      const { ixs, signers } = txInfo;
      const { skipWalletsign, skipIncTxFee } = opt ?? {};
      const txFee = opt?.txFee ?? MAX_TX_FEE;
      const incTxFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: txFee,
      });
      let payerKey: web3.PublicKey | null = null;
      while (this.txCooldownLockGuard) {
        await sleep(1_000);
      }
      this.txCooldownLockGuard = true;
      await sleep(5_000);
      if (!skipWalletsign) {
        payerKey = this.provider.publicKey;
      } else {
        if (!signers || signers.length < 1) {
          return {
            Err: { reason: TxFailReason.TX_SIGNER_NOT_FOUND, txInfo, passInfo },
          };
        }
        payerKey = signers[0].publicKey;
      }
      const blockhashInfo = await getBlockhash(this.connection);
      if (!blockhashInfo) {
        return {
          Err: { reason: TxFailReason.NETWORK_ISSUE, txInfo, passInfo },
        };
      }
      const recentBlockhash = blockhashInfo.blockhash;
      const msg = new web3.TransactionMessage({
        instructions: skipIncTxFee ? ixs : [incTxFeeIx, ...ixs],
        payerKey,
        recentBlockhash,
      }).compileToV0Message(txInfo.lutsInfo);
      let tx = new web3.VersionedTransaction(msg);
      // debug(`len: ${tx.serialize().length}`)
      if (!skipWalletsign) {
        const signedTx = await this.provider.wallet
          .signTransaction(tx)
          .catch(() => null);
        if (!signedTx) {
          this.txCooldownLockGuard = false;
          return {
            Err: { reason: TxFailReason.FAILED_TO_SIGN_TX, txInfo, passInfo },
          };
        }
        tx = signedTx;
      }
      if (signers && signers.length > 0) tx.sign(signers);
      this.txCooldownLockGuard = false;
      return this.sendSignedTransaction(tx, txInfo, {
        blockhashInfo,
        passInfo,
        skipSimulation: opt?.skipSimulation,
      });
    } catch (sendTransactionError) {
      debug({ sendTransactionError, passInfo });
      this.txCooldownLockGuard = false;
      return {
        Err: { reason: TxFailReason.UNKNOWN, txInfo, txSignature, passInfo },
      };
    }
  }

  private async sendSignedTransaction(
    tx: web3.VersionedTransaction,
    txInfo: Web3SendTxInput,
    opt: Web3SignedSendTxOpt,
  ): Promise<Result<Web3PassTxResult, TxFailResult>> {
    let txSignature: undefined | string = undefined;
    const { passInfo, skipSimulation } = opt ?? {};
    try {
      tx.serialize();
    } catch (e) {
      return {
        Err: {
          reason: TxFailReason.SIGNATURE_VERIFICATION_FAILD,
          txInfo,
          passInfo,
        },
      };
    }
    try {
      const txStatus = {
        // value: false,
        isBlockhashExpired: 0,
        isNetworkIssue: false,
        // isError: false,
      };
      txSignature = await this.connection
        .sendRawTransaction(Buffer.from(tx.serialize()), {
          skipPreflight: true,
          maxRetries: 20,
        })
        .catch((sendTransactionError) => {
          const message = sendTransactionError?.message;
          const stack = sendTransactionError?.stack;
          if (message == 'Failed to fetch') txStatus.isNetworkIssue = true;
          debug({ sendTransactionError });
          return undefined;
        });
      if (!txSignature) {
        if (txStatus.isNetworkIssue) {
          return {
            Err: { reason: TxFailReason.NETWORK_ISSUE, txInfo, passInfo },
          };
        }
        return { Err: { reason: TxFailReason.UNKNOWN, txInfo, passInfo } };
      }
      try {
        if (!skipSimulation) {
          console.log('Transaction Simulating ...');
          const simulationInfo = (
            await this.connection.simulateTransaction(tx).catch(() => null)
          )?.value;
          if (simulationInfo?.err) {
            const err = simulationInfo?.err;
            if (err === 'BlockhashNotFound') {
              // debug({ simulationInfo });
              // return {
              //   Err: {
              //     reason: TxFailReason.EXPIRED,
              //     txInfo,
              //     txSignature,
              //     msg: 'Simulation failed (BlockhashNotFound)',
              //     passInfo,
              //   },
              // };
            } else if (err === 'AlreadyProcessed') {
              // const signatureInfo = (await this.connection.getSignatureStatus(txSignature).catch(() => null))?.value
              // if (signatureInfo?.err) {
              //   return {
              //     Err: {
              //       reason: TxFailReason.UNKNOWN,
              //       txInfo,
              //       txSignature,
              //       msg: 'Simulation failed (AlreadyProcessed)',
              //       passInfo,
              //     },
              //   };
              // }
            } else {
              debug({ simulationInfo });
              return {
                Err: {
                  reason: TxFailReason.UNKNOWN,
                  txInfo,
                  txSignature,
                  msg: 'Simulation failed',
                  passInfo,
                },
              };
            }
          }
        }
      } catch (failedToSimulateTx) {
        debug({ failedToSimulateTx });
      }
      const { lastValidBlockHeight, blockhash } = opt.blockhashInfo;
      for (let i = 0; i < 40; ++i) {
        await sleep(3_000);
        const info = (
          await this.connection
            .getSignatureStatus(txSignature, { searchTransactionHistory: true })
            .catch(async (getSignatureStatusError) => {
              // debug({ getSignatureStatusError })
              return null;
            })
        )?.value;
        if (info) {
          const { err, confirmationStatus } = info;
          if (err) {
            debug({ errTxSignatureStatusInfo: info });
            return {
              Err: {
                reason: TxFailReason.UNKNOWN,
                txInfo,
                msg: 'Tx Signature status error',
                passInfo,
                txSignature,
              },
            };
          }
          if (confirmationStatus) {
            if (
              confirmationStatus == 'confirmed' ||
              confirmationStatus == 'finalized'
            )
              return {
                Ok: {
                  input: txInfo,
                  txSignature,
                  passInfo,
                },
              };
          }
        }
        if (await isBlockhashExpired(this.connection, lastValidBlockHeight)) {
          txStatus.isBlockhashExpired += 1;
        }
        if (txStatus.isBlockhashExpired > 1) {
          debug('blockhash expired : ', i);
          return {
            Err: {
              reason: TxFailReason.EXPIRED,
              txInfo: txInfo,
              msg: 'Transaction blockhash expired',
              passInfo,
              txSignature,
            },
          };
        }
      }

      const signatureInfo = (
        await this.connection
          .getSignatureStatus(txSignature)
          .catch((getSignatureStatusError) => {
            debug({ getSignatureStatusError });
            return null;
          })
      )?.value;
      if (signatureInfo) {
        const err = signatureInfo?.err;
        if (err) {
          debug({ signatureInfo });
          if (err == 'BlockhashNotFound')
            return {
              Err: {
                reason: TxFailReason.EXPIRED,
                txInfo,
                txSignature,
                passInfo,
              },
            };
          return { Err: { reason: TxFailReason.UNKNOWN, txInfo, txSignature } };
        } else return { Ok: { txSignature, input: txInfo, passInfo } };
      }
      return {
        Err: { reason: TxFailReason.EXPIRED, txInfo, txSignature, passInfo },
      };
    } catch (sendSignedTransactionError) {
      debug({ sendSignedTransactionError });
      return { Err: { reason: TxFailReason.UNKNOWN, txInfo, passInfo } };
    }
  }

  private async bundleGetCreateMarketIxsInfo(input: {
    baseMint: web3.PublicKey;
    quoteMint: web3.PublicKey;
    lotSize: number;
    tickSize: number;
    eventQueueLength?: number;
    orderbookLength?: number;
    requestQueueLength?: number;
  }) {
    const user = this.provider.publicKey;
    if (!user) throw 'Wallet not found';
    const {
      baseMint,
      quoteMint,
      lotSize,
      tickSize,
      eventQueueLength,
      orderbookLength,
      requestQueueLength,
    } = input;
    const txsInfoRes = await this.baseRay.createMarket(
      {
        baseMint,
        quoteMint,
        tickers: { lotSize, tickSize },
        eventQueueLength,
        orderbookLength,
        requestQueueLength,
      },
      user,
    );
    if (txsInfoRes.Err) {
      debug({ Err: txsInfoRes.Err });
      throw txsInfoRes.Err;
    }
    if (!txsInfoRes || !txsInfoRes.Ok) {
      debug({ Err: 'Failed to prepare market transaction' });
      throw 'Failed to prepare market transaction';
    }
    return txsInfoRes.Ok;
  }

  private async bundleGetCreatePoolTxInfo(input: {
    marketId: web3.PublicKey;
    baseMint: web3.PublicKey;
    baseMintAmount: number;
    quoteMint: web3.PublicKey;
    quoteMintAmount: number;
  }) {
    const user = this.provider.publicKey;
    if (!user) throw 'Wallet not found';
    const { marketId, baseMint, quoteMint, baseMintAmount, quoteMintAmount } =
      input;
    const createPoolTxInfoRes = await this.baseRay
      .createPool(
        { baseMint, baseMintAmount, quoteMint, quoteMintAmount, marketId },
        user,
      )
      .catch((innerCreatePoolError) => {
        debug({ innerCreatePoolError });
        return null;
      });
    if (createPoolTxInfoRes?.Err) throw createPoolTxInfoRes.Err;
    if (!createPoolTxInfoRes || !createPoolTxInfoRes.Ok)
      throw 'Failed to prepare pool create transaction';
    const createPoolTxInfo = createPoolTxInfoRes.Ok;
    return createPoolTxInfo;
  }

  private async bundleGetBuysIxsInfo(input: {
    buyersInfo: { buyerAuthority: web3.Keypair; buyAmount: number }[];
    poolInfo: LiquidityPoolInfo;
    baseMint: web3.PublicKey;
    quoteMint: web3.PublicKey;
    buyTokenType: 'base' | 'quote';
    fixedSide: 'in' | 'out';
    poolKeys: LiquidityPoolKeys;
    bundleTip: number;
  }) {
    const {
      buyersInfo,
      poolInfo,
      baseMint,
      quoteMint,
      buyTokenType,
      poolKeys,
      fixedSide,
      bundleTip,
    } = input;
    const { baseDecimals, quoteDecimals } = poolInfo;
    let inToken: Token;
    let outToken: Token;
    // let outTokenDecimal;
    // let inTokenDecimal;
    if (buyTokenType == 'base') {
      outToken = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals);
      inToken = new Token(TOKEN_PROGRAM_ID, quoteMint, quoteDecimals);
      // outTokenDecimal = baseDecimals
      // inTokenDecimal = quoteDecimals
    } else {
      outToken = new Token(TOKEN_PROGRAM_ID, quoteMint, quoteDecimals);
      inToken = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals);
      // outTokenDecimal = quoteDecimals
      // inTokenDecimal = quoteDecimals
    }
    const buysIxs: web3.TransactionInstruction[][] = [];
    for (let i = 0; i < buyersInfo.length; ++i) {
      const info = buyersInfo[i];
      const { buyerAuthority, buyAmount } = info;
      // const amount = buyTokenType == 'quote' ? Math.trunc(buyAmount * LAMPORTS_PER_SOL) : calcNonDecimalValue(buyAmount, outTokenDecimal)
      const amount = Math.trunc(buyAmount * LAMPORTS_PER_SOL); // TODO:
      const buyer = buyerAuthority.publicKey;
      const tokenAccountOut = getAssociatedTokenAddressSync(
        outToken.mint,
        buyer,
      );
      const tokenAccountIn = getAssociatedTokenAddressSync(inToken.mint, buyer);
      let buySolCost = 0;
      let amountIn: TokenAmount;
      let amountOut: TokenAmount;
      if (fixedSide == 'in') {
        amountIn = new TokenAmount(inToken, amount.toString(), true);
        // amountOut = Liquidity.computeAmountOut({ amountIn, currencyOut: outToken, poolInfo, poolKeys, slippage: new Percent(1, 100) }).minAmountOut as TokenAmount
        amountOut = new TokenAmount(outToken, 1, true);
      } else {
        amountOut = new TokenAmount(outToken, amount.toString(), true);
        amountIn = Liquidity.computeAmountIn({
          amountOut,
          currencyIn: inToken,
          poolInfo,
          poolKeys,
          slippage: new Percent(1, 100),
        }).maxAmountIn as TokenAmount;
      }
      const preIxs: web3.TransactionInstruction[] = [];
      const accountsInfo = await this.connection
        .getMultipleAccountsInfo([buyer, tokenAccountIn, tokenAccountOut])
        .catch(async () => {
          await sleep(2_000);
          return await this.connection
            .getMultipleAccountsInfo([buyer, tokenAccountIn, tokenAccountOut])
            .catch((getMultipleAccountsInfoError) => {
              log({ getMultipleAccountsInfoError });
              return null;
            });
        });
      if (!accountsInfo) throw 'failed to fetch some data';
      const [buyerInfo, inAtaInfo, outAtaInfo] = accountsInfo;
      if (i == buyersInfo.length - 1) {
        buySolCost = LAMPORTS_PER_SOL * bundleTip; // ENV.BUNDLE_FEE;
      }
      if (!buyerInfo) throw `${buyer.toBase58()} wallet dose not enought sol`;
      if (!inAtaInfo) {
        preIxs.push(
          createAssociatedTokenAccountInstruction(
            buyer,
            tokenAccountIn,
            buyer,
            inToken.mint,
          ),
        );
        buySolCost += 2_100_000;
        if (inToken.mint.toBase58() != NATIVE_MINT.toBase58())
          throw `${buyer.toBase58()} wallet does not have enough fund to buy the tokens`;
      }
      if (!outAtaInfo) {
        preIxs.push(
          createAssociatedTokenAccountInstruction(
            buyer,
            tokenAccountOut,
            buyer,
            outToken.mint,
          ),
        );
        buySolCost += 2_100_000;
      }
      if (inToken.mint.toBase58() == NATIVE_MINT.toBase58()) {
        buySolCost += amountIn.raw.toNumber();
      } else {
        if (!inAtaInfo)
          throw `${buyer.toBase58()} wallet dose not enough find to buy the tokens`;
        const balance = Number(
          AccountLayout.decode(inAtaInfo.data).amount.toString(),
        );
        if (balance < amountIn.raw.toNumber()) {
          throw `${buyer.toBase58()} wallet dose not enough find to buy the tokens`;
        }
      }
      if (buyerInfo.lamports < buySolCost) {
        log(`${buyer.toBase58()} balance : ${buyerInfo.lamports}`);
        throw `${buyer.toBase58()} wallet dose not enought sol (required sol: ${buySolCost})`;
      }
      const buyTxInfo = await this.baseRay
        .buyFromPool({
          amountIn,
          amountOut,
          fixedSide,
          poolKeys,
          tokenAccountIn,
          tokenAccountOut,
          user: buyer,
          skipAtaInit: true,
        })
        .catch((buyFromPoolError) => {
          log(buyFromPoolError);
          return null;
        });
      if (!buyTxInfo)
        throw `Failed to prepare buy transaction for ${buyer.toBase58()} wallet`;
      const ixs = [...preIxs, ...buyTxInfo.ixs];
      buysIxs.push(ixs);
    }
    let totalIxs: web3.TransactionInstruction[] = [];
    let totalBuyers: web3.Keypair[] = [];
    const buysTxInfo: {
      ixs: web3.TransactionInstruction[];
      buyerAuthority: web3.Keypair[];
    }[] = [];
    for (let i = 1; i <= buysIxs.length; ++i) {
      const ixs = buysIxs[i - 1];
      const buyerAuthority = buyersInfo[i - 1].buyerAuthority;
      totalIxs.push(...ixs);
      totalBuyers.push(buyerAuthority);
      if (i % 3 == 0) {
        buysTxInfo.push({ ixs: totalIxs, buyerAuthority: totalBuyers });
        totalIxs = [];
        totalBuyers = [];
      }
    }
    if (totalBuyers.length > 0) {
      buysTxInfo.push({ ixs: totalIxs, buyerAuthority: totalBuyers });
      totalIxs = [];
      totalBuyers = [];
    }
    return buysTxInfo;
  }

  private async bundleCreateLookuptableAndMarketVaults(
    addresses: web3.PublicKey[],
    initMarketVaultsIxs: web3.TransactionInstruction[],
    vaultSigners: web3.Signer[],
  ) {
    const user = this.provider.publicKey;
    const slot = await this.connection.getSlot();
    addresses.push(web3.AddressLookupTableProgram.programId);
    const [lookupTableInst, lookupTableAddress] =
      web3.AddressLookupTableProgram.createLookupTable({
        authority: user,
        payer: user,
        recentSlot: slot - 1,
      });

    const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
      payer: user,
      authority: user,
      lookupTable: lookupTableAddress,
      addresses,
    });

    const recentBlockhash = await getBlockhash(this.connection);

    if (!recentBlockhash) throw 'blockhash not found (luts creation)';
    const msg = new web3.TransactionMessage({
      instructions: [
        incTxFeeIx,
        lookupTableInst,
        extendInstruction,
        ...initMarketVaultsIxs,
      ],
      payerKey: user,
      recentBlockhash: recentBlockhash.blockhash,
    }).compileToV0Message();

    const tx = new web3.VersionedTransaction(msg);

    tx.sign(vaultSigners);

    if (!recentBlockhash) {
      throw 'Blockhash not found (luts creation)';
    }

    const signedTx = await this.provider.wallet.signTransaction(tx);

    debug('creating luts');

    const txSignature = await web3
      .sendAndConfirmRawTransaction(
        this.connection,
        Buffer.from(signedTx.serialize()),
      )
      .catch((createLookUpTableTxError) => {
        console.log({ createLookUpTableTxError });
        throw 'failed to create luts';
      });

    debug(`Create lut tx Signature: ${txSignature}`);

    await sleep(3_000);

    const lutInfoRes = await this.connection
      .getAddressLookupTable(lookupTableAddress)
      .catch(() => null)
      .then(async (lutsInfo) => {
        if (lutsInfo?.value) return lutsInfo;
        await sleep(15_000);
        return await this.connection
          .getAddressLookupTable(lookupTableAddress)
          .catch(() => null)
          .then(async (lutsInfo) => {
            if (lutsInfo?.value) return lutsInfo;
            await sleep(10_000);
            return await this.connection
              .getAddressLookupTable(lookupTableAddress)
              .catch(() => null)
              .then(async (lutsInfo) => {
                if (lutsInfo?.value) return lutsInfo;
                throw 'failed to create lut info';
              });
          });
      });
    const lutInfo = lutInfoRes.value;
    if (!lutInfo) throw 'failed to get luts';
    return lutInfo;
  }

  async launchBundle(
    input: LaunchBundleInput,
    onConsole: (log: string) => void,
  ): Promise<Result<LaunchBundleRes, Web3BundleError>> {
    const finalRes: LaunchBundleRes = {};
    try {
      const jitoTipsAccount = getJitoTipsAccount();
      if (!jitoTipsAccount) {
        debug(`failed to get tips account`);
        onConsole(`failed to get tips account`);
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      // market creation
      const user = this.provider.publicKey;
      const { marketSettings, bundleSetup } = input;
      const { baseMint, quoteMint } = marketSettings;
      finalRes.tokenAddress = baseMint.toBase58();
      finalRes.deployerAddress = user.toBase58();

      debug('prepare market');

      // market creation
      const createMarketInfoRes = await this.bundleGetCreateMarketIxsInfo({
        baseMint,
        quoteMint,
        lotSize: marketSettings.lotSize,
        tickSize: marketSettings.tickSize,
      }).catch((bundleCreateMarketError) => {
        debug(bundleCreateMarketError);
        throw bundleCreateMarketError;
      });

      if (!createMarketInfoRes) {
        return { Err: Web3BundleError.BUNDLER_MARKET_CREATION_FAILED };
      }

      const marketId = createMarketInfoRes.marketId;

      // Pool
      debug('prepare pool');

      const createPoolTxInfo = await this.bundleGetCreatePoolTxInfo({
        baseMint,
        quoteMint,
        baseMintAmount: bundleSetup.baseAmount,
        quoteMintAmount: bundleSetup.quoteAmount,
        marketId,
      }).catch((bundleGetCreatePoolTxInfoError) => {
        debug({ bundleGetCreatePoolTxInfoError });
        return null;
      });
      if (!createPoolTxInfo)
        return { Err: Web3BundleError.BUNDLER_POOL_TX_SETUP_FAILED };
      const {
        poolId,
        baseAmount: initialBaseAmount,
        quoteAmount: initialQuoteAmount,
      } = createPoolTxInfo;

      // Buy
      debug('prepare buy');

      const poolKeys = this.baseRay.getPoolKeysFromCached(poolId);
      if (!poolKeys) {
        debug('failed to get poolkeys from cache');
        onConsole('failed to get poolkeys from cache');
        return { Err: Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED };
      }
      const poolInfo = {
        baseDecimals: poolKeys.baseDecimals,
        quoteDecimals: poolKeys.quoteDecimals,
        lpDecimals: poolKeys.lpDecimals,
        lpSupply: new BN(0),
        baseReserve: initialBaseAmount,
        quoteReserve: initialQuoteAmount,
        startTime: null as any,
        status: null as any,
      };
      const buyersInfo = bundleSetup.buyers;
      const buysTxInfo = await this.bundleGetBuysIxsInfo({
        baseMint,
        quoteMint,
        buyersInfo,
        buyTokenType: 'base',
        poolInfo,
        poolKeys,
        fixedSide: 'in',
        bundleTip: bundleSetup.bundleTip,
      }) //TODO: `buyTokenType` fixed
        .catch((bundleGetBuysIxsInfo) => {
          debug({ bundleGetBuysIxsInfo });
          return null;
        });
      if (!buysTxInfo)
        return { Err: Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED };

      // create lookup table
      debug('prepare luts');

      const lutsAddress = [
        baseMint,
        quoteMint,
        poolKeys.baseVault,
        poolKeys.quoteVault,
        poolKeys.lpMint,
        poolKeys.lpVault,
        marketId,
        // poolKeys.marketBaseVault, poolKeys.marketQuoteVault,
        poolKeys.marketEventQueue,
        poolKeys.marketBids,
        poolKeys.marketAsks,
        poolKeys.authority,
        createPoolTxInfo.poolId,
      ];
      const lutsInfo = await this.bundleCreateLookuptableAndMarketVaults(
        lutsAddress,
        createMarketInfoRes.vaultInstructions,
        createMarketInfoRes.vaultSigners,
      ).catch((bundleCreateLookuptableError) => {
        debug({ bundleCreateLookuptableError });
        return null;
      });

      if (!lutsInfo) return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };

      // create market tx
      debug('create market tx');

      await sleep(2_000);
      const createMarketRecentBlockhash = await getBlockhash(this.connection);
      if (!createMarketRecentBlockhash)
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      const createMarketTxMsg = new web3.TransactionMessage({
        instructions: [...createMarketInfoRes.marketInstructions],
        payerKey: user,
        recentBlockhash: createMarketRecentBlockhash.blockhash,
      }).compileToV0Message([lutsInfo]);
      const _createMarketTx = new web3.VersionedTransaction(createMarketTxMsg);
      _createMarketTx.sign([...createMarketInfoRes.marketSigners]);

      // create pool tx
      await sleep(400);
      // await sleep(1_000)
      debug('create pool tx');

      const createPoolBlockhash = await getBlockhash(this.connection);
      if (!createPoolBlockhash)
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      const createPoolTxMsg = new web3.TransactionMessage({
        instructions: createPoolTxInfo.ixs,
        payerKey: user,
        recentBlockhash: createPoolBlockhash.blockhash,
      }).compileToV0Message();
      const _createPoolTx = new web3.VersionedTransaction(createPoolTxMsg);
      _createPoolTx.sign(createPoolTxInfo.signers);

      // buy txs
      await sleep(400);
      debug('create buy txs');

      const buyBlockhash = await getBlockhash(this.connection);
      if (!buyBlockhash)
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      const buyTxs: web3.VersionedTransaction[] = [];
      for (let i = 0; i < buysTxInfo.length; ++i) {
        const txInfo = buysTxInfo[i];
        const { buyerAuthority, ixs } = txInfo;
        if (i == buysTxInfo.length - 1) {
          const sender = buyerAuthority[buyerAuthority.length - 1].publicKey;
          ixs.push(
            web3.SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: jitoTipsAccount,
              lamports: LAMPORTS_PER_SOL * bundleSetup.bundleTip, // ENV.BUNDLE_FEE,
            }),
          );
        }
        const buyTxMsg = new web3.TransactionMessage({
          instructions: ixs,
          payerKey: buyerAuthority[0].publicKey,
          recentBlockhash: buyBlockhash.blockhash,
        }).compileToV0Message([lutsInfo]);
        const tx = new web3.VersionedTransaction(buyTxMsg);
        tx.sign(buyerAuthority);
        buyTxs.push(tx);
      }
      const recentBlockhashBundle = await getBlockhash(this.connection);
      if (!recentBlockhashBundle)
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };

      // get user signature
      const signedTxsInfo = await this.provider.wallet
        .signAllTransactions([_createMarketTx, _createPoolTx])
        .catch(() => null);
      if (!signedTxsInfo)
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      const [createMarketTx, createPoolTx] = signedTxsInfo;

      // bundle send
      debug('send bundle');

      let bundleRes: Result<
        {
          bundleId: string;
          txsSignature?: string[];
          bundleStatus?: number;
        },
        string
      > | null = null;

      if (this.network == WalletAdapterNetwork.Mainnet) {
        bundleRes = await sendBundle(
          [createMarketTx, createPoolTx, ...buyTxs],
          poolId,
          this.connection,
          bundleSetup.blockEngineUrl,
        ).catch((sendBundleError) => {
          debug({ sendBundleError });
          return null;
        });
      } else {
        bundleRes = await sendBundleTest(
          // [createMarketTx, createPoolTx, ...buyTxs],
          [createPoolTx, ...buyTxs],
          poolId,
          this.connection,
        ).catch((sendBundleError) => {
          debug({ sendBundleError });
          return null;
        });
      }

      debug({ bundleRes });

      if (bundleRes?.Err) {
        const err = bundleRes.Err;
        debug({ sendBundleTestError: err });
        //TODO: verification failed
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_SEND };
      }

      if (!bundleRes || !bundleRes.Ok) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_SEND };
      }

      {
        // const { bundleId, bundleStatus, txsSignature } = bundleRes.Ok;
        const { bundleId } = bundleRes.Ok;
        finalRes.marketId = marketId.toBase58();
        finalRes.poolId = poolId.toBase58();
        finalRes.bundleId = bundleId;
        // finalRes.bundleRes = {
        //   bundleId,
        //   bundleStatus,
        //   marketCreateTxSignature: txsSignature[0],
        //   poolCreateTxSignature: txsSignature[1],
        //   buyTxsSignature: txsSignature.splice(2),
        // };
        finalRes.buyersInfo = buyersInfo.map((e) => {
          return {
            address: e.buyerAuthority.publicKey.toBase58(),
            amount: e.buyAmount,
          };
        });
      }

      onConsole('Confirmed successfully!');

      return { Ok: finalRes };
    } catch (innerLaunchBundleError) {
      debug({ innerLaunchBundleError });
      // return { Ok: finalRes };
      throw innerLaunchBundleError;
    }
  }

  async createToken(
    input: CreateTokenInput,
  ): Promise<Result<{ txSignature: string; tokenAddress: string }, string>> {
    const user = this.provider.publicKey;
    if (!user) return { Err: 'Wallet not found.' }; // Web3Error.WALLET_NOT_FOUND };
    const {
      name,
      symbol,
      image,
      decimals,
      description,
      supply,
      socialLinks,
      immutable,
      revokeMint,
      revokeFreeze,
    } = input;
    let ipfsHash = 'null';
    if (!ENV.SKIP_DEPLOY_JSON_METADATA) {
      const hash = await deployDataToIPFS({
        image,
        description,
        external_url: socialLinks?.website,
        extensions: {
          ...socialLinks,
        },
      });
      if (!hash) return { Err: 'Failed to deploy metadata.' }; // Web3Error.FAILED_TO_DEPLOY_METADATA };
      ipfsHash = hash;
    }

    // const uri = `https://${ENV.PINATA_DOMAIN}/ipfs/${ipfsHash}`;
    const uri = `https://ipfs.io/ipfs/${ipfsHash}`;

    console.log('prepare token tx');

    const createTokenTxInfo = await this.baseMpl.createToken({
      name,
      uri,
      symbol,
      isMutable: !immutable,
      decimals,
      initialSupply: supply,
    });
    if (!createTokenTxInfo) {
      return { Err: 'Failed to prepare transaction.' }; // Web3Error.FAILED_TO_PREPARE_TX };
    }

    console.log('create revokeMint tx');

    if (revokeMint)
      createTokenTxInfo.ixs.push(
        this.baseSpl.revokeAuthority({
          authorityType: 'MINTING',
          currentAuthority: user,
          mint: createTokenTxInfo.mintKeypair.publicKey,
        }),
      );

    console.log('create revokeFreeze tx');

    if (revokeFreeze)
      createTokenTxInfo.ixs.push(
        this.baseSpl.revokeAuthority({
          authorityType: 'FREEZING',
          currentAuthority: user,
          mint: createTokenTxInfo.mintKeypair.publicKey,
        }),
      );

    const mintKeypair = createTokenTxInfo.mintKeypair;
    const tokenAddress = mintKeypair.publicKey.toBase58();

    console.log('tokenAddress:', tokenAddress);

    console.log('sending txs');

    const priorityFee = getPriorityFee();
    const txFee = (priorityFee as any)[ENV.CREATE_TOKEN_PRIORITY_FEE_KEY];

    try {
      let res = null;
      for (let idx = 1; idx < 4; idx++) {
        res = await this.sendTransactionWithOpt(
          {
            ixs: createTokenTxInfo.ixs,
            signers: [createTokenTxInfo.mintKeypair],
          },
          { txFee, skipSimulation: true },
        );

        if (
          res.Err &&
          (res.Err.reason == TxFailReason.EXPIRED || // retry 1
            res.Err.reason == TxFailReason.NETWORK_ISSUE)
        ) {
          console.log(`Retring Token Creation ... ${idx}`);
          continue;
        }

        break;
      }

      debug({ burnLpTxRes: res });

      if (!res) {
        return { Err: 'TRANSACTION FAILED' };
      }

      if (res.Err || !res.Ok) {
        if (res.Err?.reason == TxFailReason.FAILED_TO_SIGN_TX) {
          return { Err: 'TRANSACTION CANCELLED' };
        }
        return { Err: 'TRANSACTION FAILED' };
      }
      return {
        Ok: {
          txSignature: res.Ok?.txSignature,
          tokenAddress,
        },
      };
    } catch (sendTransactionError: any) {
      console.log(sendTransactionError);
      return { Err: sendTransactionError };
    }
  }

  async revokeAuthority(
    input: RevokeTokenAuthorityInput,
  ): Promise<Result<TxPassResult, Web3Error>> {
    const user = this.provider.publicKey;
    if (!user) return { Err: Web3Error.WALLET_NOT_FOUND };
    const mint = getPubkeyFromStr(input.mint);
    if (!mint) return { Err: Web3Error.INVALID_PUBKEY_STR };
    const mintAccountInfo = await this.connection
      .getAccountInfo(mint)
      .catch(async () => {
        await sleep(2_000);
        return await this.connection
          .getAccountInfo(mint)
          .catch((getAccountInfoError) => {
            log({ getAccountInfoError });
            return undefined;
          });
      });
    if (mintAccountInfo === undefined)
      return { Err: Web3Error.FAILED_TO_FETCH_DATA };
    if (
      !mintAccountInfo ||
      mintAccountInfo.owner.toBase58() != TOKEN_PROGRAM_ID.toBase58() ||
      mintAccountInfo.data.length != MintLayout.span
    )
      return { Err: Web3Error.TOKEN_NOT_FOUND };
    const mintInfo = MintLayout.decode(mintAccountInfo.data);
    const ixs: web3.TransactionInstruction[] = [];
    if (input.minting) {
      if (mintInfo.mintAuthorityOption == 0)
        return { Err: Web3Error.AUTHORITY_ALREADY_REVOKED };
      if (mintInfo.mintAuthority.toBase58() != user.toBase58())
        return { Err: Web3Error.UNAUTHORISED };
      ixs.push(
        this.baseSpl.revokeAuthority({
          mint,
          currentAuthority: user,
          authorityType: 'MINTING',
        }),
      );
    }
    if (input.freezing) {
      if (mintInfo.freezeAuthorityOption == 0)
        return { Err: Web3Error.AUTHORITY_ALREADY_REVOKED };
      if (mintInfo.freezeAuthority.toBase58() != user.toBase58())
        return { Err: Web3Error.UNAUTHORISED };
      ixs.push(
        this.baseSpl.revokeAuthority({
          mint,
          currentAuthority: user,
          authorityType: 'FREEZING',
        }),
      );
    }
    if (!ixs) return { Err: Web3Error.AUTHORITY_ALREADY_REVOKED };
    const txSignature = await this.sendTransaction(ixs, [], {
      logErrorMsg: !ENV.IN_PRODUCTION,
    }).catch((sendTransactionError) => {
      log({ sendTransactionError });
      return null;
    });
    if (!txSignature) return { Err: Web3Error.TRANSACTION_FAILED };
    return { Ok: { txSignature } };
  }

  async airdrop(input: AirdropInput) {
    const user = this.provider.publicKey;
    if (!user) return { Err: Web3Error.WALLET_NOT_FOUND };
    const mint = getPubkeyFromStr(input.mint);
    if (!mint) return { Err: Web3Error.INVALID_PUBKEY_STR };
    const _totalAmount = { amount: 0 };
    input.receivers.map(({ amount }) => (_totalAmount.amount += amount));
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const [userAtaAccountInfo, mintAccountInfo] = await this.connection
      .getMultipleAccountsInfo([userAta, mint])
      .catch(async () => {
        await sleep(2_000);
        return await this.connection
          .getMultipleAccountsInfo([userAta, mint])
          .catch(() => [undefined, undefined]);
      });
    if (userAtaAccountInfo === undefined || mintAccountInfo === undefined)
      return { Err: Web3Error.FAILED_TO_FETCH_DATA };
    if (!mintAccountInfo) return { Err: Web3Error.TOKEN_NOT_FOUND };
    if (!userAtaAccountInfo) return { Err: Web3Error.NOT_ENOUGH_TOKEN };
    if (
      mintAccountInfo.owner.toBase58() != TOKEN_PROGRAM_ID.toBase58() ||
      mintAccountInfo.data.length != MintLayout.span
    )
      return { Err: Web3Error.TOKEN_NOT_FOUND };
    const mintInfo = MintLayout.decode(mintAccountInfo.data);
    const userAtaInfo = TokenAccountLayout.decode(userAtaAccountInfo.data);
    const availableTokens = calcNonDecimalValue(
      Number(userAtaInfo.amount.toString()),
      mintInfo.decimals,
    );
    const totalAirdropAmount = calcNonDecimalValue(
      _totalAmount.amount,
      mintInfo.decimals,
    );
    if (availableTokens < totalAirdropAmount)
      return { Err: Web3Error.NOT_ENOUGH_TOKEN };
    const __mlp = 10 ** mintInfo.decimals;
    input.receivers.map((e) => (e.amount = Math.trunc(e.amount * __mlp)));
    const atas: web3.PublicKey[] = [];
    type OneAirdropReceiverInfo = {
      receiverAta: web3.PublicKey;
      receiver: web3.PublicKey;
      amount: number;
      initAta: boolean;
    };
    const airdropTxInfo: OneAirdropReceiverInfo[] = input.receivers.map((e) => {
      const receiver = new web3.PublicKey(e.wallet);
      const receiverAta = getAssociatedTokenAddressSync(mint, receiver);
      atas.push(receiverAta);
      return {
        receiverAta,
        receiver,
        amount: e.amount,
        initAta: false,
      };
    });
    const receiversAtaInfo = await this.connection
      .getMultipleAccountsInfo(atas)
      .catch(async () => {
        await sleep(2_000);
        return await this.connection
          .getMultipleAccountsInfo(atas)
          .catch((getMultipleAccountsInfoError: any) => {
            if (!ENV.IN_PRODUCTION) {
              log({ getMultipleAccountsInfoError });
            }
            return null;
          });
      });
    if (!receiversAtaInfo) return { Err: Web3Error.FAILED_TO_FETCH_DATA };
    let chunkc: OneAirdropReceiverInfo[] = [];
    const airdropTxInfoChunks: OneAirdropReceiverInfo[][] = [];
    for (let i = 1; i <= receiversAtaInfo.length; ++i) {
      const info = airdropTxInfo[i - 1];
      const ataInfo = receiversAtaInfo[i - 1];
      if (!ataInfo) info.initAta = true;
      chunkc.push(info);
      if (i % 10 == 0) {
        airdropTxInfoChunks.push(chunkc);
        chunkc = [];
      }
    }
    if (chunkc.length != 0) airdropTxInfoChunks.push(chunkc);
    const recentBlockhash = (
      await this.connection.getLatestBlockhash().catch(async () => {
        await sleep(2_000);
        return await this.connection
          .getLatestBlockhash()
          .catch((getLatestBlockhashError) => {
            if (!ENV.IN_PRODUCTION) log({ getLatestBlockhashError });
            return null;
          });
      })
    )?.blockhash;
    if (!recentBlockhash) return { Err: Web3Error.FAILED_TO_FETCH_DATA };
    const txs: web3.VersionedTransaction[] = [];
    for (const infoes of airdropTxInfoChunks) {
      const ixs: web3.TransactionInstruction[] = [];
      for (const { amount, initAta, receiver, receiverAta } of infoes) {
        if (initAta)
          ixs.push(
            createAssociatedTokenAccountInstruction(
              user,
              receiverAta,
              receiver,
              mint,
            ),
          );
        ixs.push(
          createTransferInstruction(
            userAta,
            receiverAta,
            user,
            BigInt(amount.toString()),
          ),
        );
      }
      const msg = new web3.TransactionMessage({
        instructions: ixs,
        payerKey: user,
        recentBlockhash,
      }).compileToV0Message();
      const tx = new web3.VersionedTransaction(msg);
      txs.push(tx);
    }
    const signedTxs = await this.provider.wallet
      .signAllTransactions(txs)
      .catch((signAllTransactionsError) => {
        if (!ENV.IN_PRODUCTION) log({ signAllTransactionsError });
        return null;
      });
    if (!signedTxs) return { Err: Web3Error.TX_SIGN_FAILED };
    const txsRes: (string | undefined)[] = [];
    const asyncTxsHandler: Promise<string | undefined>[] = [];
    for (const tx of signedTxs) {
      const rawTx = Buffer.from(tx.serialize());
      const handler = web3
        .sendAndConfirmRawTransaction(this.connection, rawTx)
        .catch(async () => {
          await sleep(2_000);
          return web3
            .sendAndConfirmRawTransaction(this.connection, rawTx)
            .catch((sendRawTransactionError) => {
              if (!ENV.IN_PRODUCTION) log({ sendRawTransactionError });
              return undefined;
            });
        });
      asyncTxsHandler.push(handler);
    }
    for (const handler of asyncTxsHandler) {
      txsRes.push(await handler);
    }
    const passTxReceiver = [];
    const failTxReceiver = [];
    const txsSignature: string[] = [];
    for (let i = 0; i < txsRes.length; ++i) {
      const txRes = txsRes[i];
      const start = i * 10;
      const end = start + 10;
      const _info = input.receivers.slice(start, end);
      const info = _info.map((e) => {
        e.amount = e.amount / __mlp;
        return e;
      });
      if (txRes) {
        txsSignature.push(txRes);
        passTxReceiver.push(...info);
      } else {
        failTxReceiver.push(...info);
      }
    }
    return { passTxReceiver, failTxReceiver, txsSignature };
  }

  async distributeSol(amount: number, receivers: web3.PublicKey[]) {
    const sender = this.provider.publicKey;
    const ixs: web3.TransactionInstruction[] = [];
    const lamports = amount * 1000_000_000;
    for (const receiver of receivers) {
      ixs.push(
        web3.SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: receiver,
          lamports,
        }),
      );
    }
    const recentBlockhash = await getBlockhash(this.connection);
    if (!recentBlockhash) throw 'failed to distribute sols';
    const msg = new web3.TransactionMessage({
      instructions: ixs,
      payerKey: sender,
      recentBlockhash: recentBlockhash.blockhash,
    }).compileToV0Message();
    const tx = new web3.VersionedTransaction(msg);
    const signedTx = await this.provider.wallet.signTransaction(tx);
    const res = await web3.sendAndConfirmRawTransaction(
      this.connection,
      Buffer.from(signedTx.serialize()),
    );
    return res;
  }

  async getAllTokens() {
    const user = this.provider.publicKey;
    if (!user) throw 'Wallet not connected';
    const tokens =
      (await this.baseMpl.getAllTokensWithMetadata(user).catch(() => null)) ??
      [];
    const res: AllUserTokens[] = [];
    const asyncHandlers: Promise<void>[] = [];
    for (const token of tokens) {
      const metadata = token.metadata;
      const tokenInfo = token.tokenInfo;
      const e: AllUserTokens = {
        name: metadata.data.name,
        symbol: metadata.data.symbol,
        image: '',
        description: '',
        decimals: tokenInfo.mintState.decimals,
        mintingAuthority: tokenInfo.mintState.mintAuthority.toBase58(),
        isMintingAuthRevoke:
          tokenInfo.mintState.mintAuthorityOption == 0 ? true : false,
        freezingAuthority: tokenInfo.mintState.freezeAuthority.toBase58(),
        isFreezingAuthRevoke:
          tokenInfo.mintState.freezeAuthorityOption == 0 ? true : false,
        mint: tokenInfo.mint.toBase58(),
        supply: tokenInfo.supply,
        balance: tokenInfo.balance,
      };
      asyncHandlers.push(
        fetch(metadata.data.uri)
          .catch(() => null)
          .then((value) =>
            value?.json().then((jsonMetadata: any) => {
              e.image = jsonMetadata?.image ?? '';
              e.description = jsonMetadata?.description ?? '';
            }),
          ),
      );
    }
    for (const handler of asyncHandlers) await handler;
    return res;
  }

  async burnLiquidity({
    poolId,
    percentageOfBurn,
  }: {
    poolId: web3.PublicKey;
    percentageOfBurn: number;
  }): Promise<Result<TxPassResult, string>> {
    try {
      if (percentageOfBurn > 100) percentageOfBurn = 100;
      const poolKeysRes = await this.baseRay
        .getPoolKeys(this.connection, poolId)
        .catch((getPoolKeysError) => {
          debug({ getPoolKeysError });
          return null;
        });
      if (!poolKeysRes?.Ok) return { Err: 'POOL NOT FOUND' };
      const poolKeys = poolKeysRes.Ok;
      const user = this.provider.publicKey;
      const ata = getAssociatedTokenAddressSync(poolKeys.lpMint, user);
      const ataInfo = await getAccount(this.connection, ata).catch(() => {
        return getAccount(this.connection, ata).catch((getAccountError) => {
          debug({ getAccountError });
          return null;
        });
      });
      if (!ataInfo) return { Err: 'LP TOKEN NOT FOUND' };
      const balance = Number(ataInfo.amount.toString());
      if (!balance) return { Err: 'LP TOKEN NOT FOUND' };
      const amount = Math.trunc((balance * percentageOfBurn) / 100);
      if (!amount) return { Err: 'BURN LP AMOUNT IS TOO LOW' };

      const ix = createBurnInstruction(
        ata,
        poolKeys.lpMint,
        user,
        BigInt(amount.toString()),
      );
      const priorityFeeInfo = getPriorityFee();
      const txFee = (priorityFeeInfo as any)[ENV.BURN_TOKENs_PRIORITY_FEE_KEY];
      let res = await this.sendTransactionWithOpt({ ixs: [ix] }, { txFee });
      if (
        res.Err &&
        (res.Err.reason == TxFailReason.EXPIRED || // retry 1
          res.Err.reason == TxFailReason.NETWORK_ISSUE)
      ) {
        res = await this.sendTransactionWithOpt({ ixs: [ix] }, { txFee });
      }
      if (
        res.Err &&
        (res.Err.reason == TxFailReason.EXPIRED || // return 2
          res.Err.reason == TxFailReason.NETWORK_ISSUE)
      ) {
        res = await this.sendTransactionWithOpt({ ixs: [ix] }, { txFee });
      }
      debug({ burnLpTxRes: res });
      if (res.Err || !res.Ok) {
        if (res.Err?.reason == TxFailReason.FAILED_TO_SIGN_TX) {
          return { Err: 'TRANSACTION CANCELLED' };
        }
        return { Err: 'TRANSACTION FAILED' };
      }
      return {
        Ok: {
          txSignature: res.Ok?.txSignature,
        },
      };
    } catch (burnLpError: any) {
      debug({ burnLpError });
      return { Err: burnLpError };
    }
  }

  async removeLiquidity(
    poolId: web3.PublicKey,
  ): Promise<Result<TxPassResult, string>> {
    try {
      const user = this.provider.publicKey;
      const poolKeysRes = await this.baseRay
        .getPoolKeys(this.connection, poolId)
        .catch((getPoolKeysError) => {
          debug({ getPoolKeysError });
          return null;
        });
      if (!poolKeysRes?.Ok) return { Err: 'POOL NOT FOUND' };
      const poolKeys = poolKeysRes.Ok;
      const ata = getAssociatedTokenAddressSync(poolKeys.lpMint, user);
      const ataInfo = await getAccount(this.connection, ata).catch(() => {
        return getAccount(this.connection, ata).catch((getAccountError) => {
          debug({ getAccountError });
          return null;
        });
      });
      if (!ataInfo) return { Err: 'LP TOKEN NOT FOUND' };
      const balance = Number(ataInfo.amount.toString());
      if (!balance) return { Err: 'LP TOKEN NOT FOUND' };
      const { baseMint, quoteMint } = poolKeys;
      const baseMintAta = getAssociatedTokenAddressSync(baseMint, user);
      const quoteMintAta = getAssociatedTokenAddressSync(quoteMint, user);
      const ixs: web3.TransactionInstruction[] = [];
      const accountsInfo = await this.connection
        .getMultipleAccountsInfo([baseMintAta, quoteMintAta])
        .catch(async () => {
          await sleep(1_000);
          return this.connection
            .getMultipleAccountsInfo([baseMintAta, quoteMintAta])
            .catch((getMultipleAccountsInfoError) => {
              debug({ getMultipleAccountsInfoError });
              return null;
            });
        });
      if (!accountsInfo) return { Err: 'FAILED_TO_FETCH_DATA' };
      const [baseAtaInfo, quoteAtaInfo] = accountsInfo;
      if (!baseAtaInfo)
        ixs.push(
          createAssociatedTokenAccountInstruction(
            user,
            baseMintAta,
            user,
            baseMint,
          ),
        );
      if (!quoteAtaInfo)
        ixs.push(
          createAssociatedTokenAccountInstruction(
            user,
            quoteMintAta,
            user,
            quoteMint,
          ),
        );
      const removeLiqIxs = Liquidity.makeRemoveLiquidityInstruction({
        amountIn: balance.toString(),
        poolKeys,
        userKeys: {
          baseTokenAccount: baseMintAta,
          quoteTokenAccount: quoteMintAta,
          lpTokenAccount: ata,
          owner: user,
        },
      }).innerTransaction.instructions;
      ixs.push(...removeLiqIxs);
      if (quoteMint.toBase58() == NATIVE_MINT.toBase58()) {
        // UnWrapSol
        ixs.push(createCloseAccountInstruction(quoteMintAta, user, user));
      }

      const priorityFeeInfo = getPriorityFee();
      const txFee = (priorityFeeInfo as any)[ENV.REMOVE_LP_PRIORITY_FEE_KEY];
      let res = await this.sendTransactionWithOpt({ ixs }, { txFee });
      if (
        res.Err &&
        (res.Err.reason == TxFailReason.EXPIRED || // retry 1
          res.Err.reason == TxFailReason.NETWORK_ISSUE)
      ) {
        res = await this.sendTransactionWithOpt({ ixs }, { txFee });
      }
      debug({ mintTokenTxRes: res });
      if (res.Err || !res.Ok) {
        if (res.Err?.reason == TxFailReason.FAILED_TO_SIGN_TX) {
          return { Err: 'TX_SIGN_FAILED' };
        }
        return { Err: 'TRANSACTION_FAILED' };
      }
      return {
        Ok: {
          txSignature: res.Ok?.txSignature,
        },
      };
    } catch (removeLiquidityError) {
      debug({ removeLiquidityError });
      return { Err: 'FAILED_TO_PREPARE_TX' };
    }
  }

  async fundWallets(
    receivers: web3.PublicKey[],
    amount: number,
  ): Promise<
    Result<
      {
        fundedWallets: string[];
        nonFundedWallets: string[];
      },
      string
    >
  > {
    try {
      if (amount < 0.001) return { Err: 'FUND AMOUNT IS TOO LOW' };
      amount = Math.trunc(amount * web3.LAMPORTS_PER_SOL);
      const sender = this.provider.publicKey;
      const senderInfo = await this.connection
        .getAccountInfo(sender)
        .catch(async () => {
          await sleep(1000);
          return this.connection.getAccountInfo(sender).catch(() => undefined);
        });
      if (!senderInfo) return { Err: 'SENDER INFO NOT FOUND' };
      let cost = amount * receivers.length;
      const senderBalance = senderInfo.lamports;

      const txsInfo: web3.TransactionInstruction[][] = [];
      const CHUNK_SIZE = 20;
      let ixs: web3.TransactionInstruction[] = [];
      for (let i = 1; i <= receivers.length; ++i) {
        const receiver = receivers[i - 1];
        ixs.push(
          web3.SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: receiver,
            lamports: amount,
          }),
        );
        if (i % CHUNK_SIZE == 0) {
          txsInfo.push(ixs);
          ixs = [];
        }
      }
      if (ixs.length > 0) txsInfo.push(ixs);
      const priorityFeeInfo = getPriorityFee();
      const txFee = (priorityFeeInfo as any)[ENV.REMOVE_LP_PRIORITY_FEE_KEY];
      cost += txFee * txsInfo.length;
      if (cost > senderBalance) {
        const need = (cost - senderBalance) / web3.LAMPORTS_PER_SOL;
        return { Err: `SENDER DOSE NOT HAVE ENOUGH SOL (needed : ${need})` };
      }
      const opt: Web3SendTxOpt = { skipSimulation: true, txFee };

      const txsHandler: Promise<Web3SendTxResult>[] = [];
      for (const info of txsInfo) {
        txsHandler.push(
          this.sendTransactionWithOpt({ ixs: info }, opt).then((res) => {
            if (
              res.Err?.reason == TxFailReason.EXPIRED ||
              res.Err?.reason == TxFailReason.NETWORK_ISSUE
            ) {
              return this.sendTransactionWithOpt(res.Err.txInfo, opt);
            }
            return res;
          }),
        );
      }
      const passIxs: web3.TransactionInstruction[] = [];
      const failIxs: web3.TransactionInstruction[] = [];
      for (const handler of txsHandler) {
        const res = await handler;
        if (res.Ok) passIxs.push(...res.Ok.input.ixs);
        else if (res.Err) failIxs.push(...res.Err.txInfo.ixs);
      }

      const fundedWallets = getFundReceiversInfoFromIxs(passIxs);
      const nonFundedWallets = getFundReceiversInfoFromIxs(failIxs);
      return {
        Ok: {
          fundedWallets,
          nonFundedWallets,
        },
      };
    } catch (fundWalletError) {
      return { Err: 'FAILED TO PREPARE TXS' };
    }
  }

  async sendTestingBundle() {
    const senderAuth = web3.Keypair.fromSecretKey(
      Uint8Array.from(
        bs58.decode(
          'e8rn1XLWifdXeYMY5pbGAkSohZeKDzVaGPjmadLNRyBS3FKN94TVWiSUKEWZKmtbc34osMoojXAU9wZeRTWzGy3',
        ),
      ),
    );
    const sender = senderAuth.publicKey;
    const receiver = web3.Keypair.generate().publicKey;
    const feeReceiver = new web3.PublicKey(
      'B1mrQSpdeMU9gCvkJ6VsXVVoYjRGkNA7TtjMyqxrhecH',
    );
    const ix = web3.SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: receiver,
      lamports: 1_000_000,
    });
    const ix2 = web3.SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: feeReceiver,
      lamports: 2 * 1_500_000,
    });
    const connection = new web3.Connection(ENV.RPC_ENDPOINT_TEST);
    const blockhashInfo = await getBlockhash(connection);
    if (!blockhashInfo) throw 'blockhash not found';
    const msg = new web3.TransactionMessage({
      instructions: [ix, ix2],
      payerKey: sender,
      recentBlockhash: blockhashInfo.blockhash,
    }).compileToV0Message();
    const tx = new web3.VersionedTransaction(msg);
    tx.sign([senderAuth]);
    const bundleRes = await sendBundle([tx], sender, connection, '').catch(
      (sendBundleError) => {
        debug({ sendBundleError });
        return null;
      },
    );
    debug({ bundleRes });
  }

  /***************************************************************************************** */
  async createOpenMarket(
    createMarketInput: CreateMarketInput,
  ): Promise<Result<{ marketId: string; txSignature: string }, string>> {
    try {
      // const finalRes: LaunchBundleRes = {};

      // market creation
      const user = this.provider.publicKey;
      const { baseMint, quoteMint, tickers } = createMarketInput;
      // finalRes.tokenAddress = baseMint.toBase58();
      // finalRes.deployerAddress = user.toBase58();

      debug('prepare market');

      // market creation
      const createMarketInfoRes = await this.bundleGetCreateMarketIxsInfo({
        baseMint,
        quoteMint,
        lotSize: tickers.lotSize,
        tickSize: tickers.tickSize,
        eventQueueLength: createMarketInput.eventQueueLength,
        orderbookLength: createMarketInput.orderbookLength,
        requestQueueLength: createMarketInput.requestQueueLength,
      }).catch((bundleCreateMarketError) => {
        debug(bundleCreateMarketError);
        throw bundleCreateMarketError;
      });

      if (!createMarketInfoRes) {
        return { Err: 'Market transactions creation Failed.' };
      }

      const marketId = createMarketInfoRes.marketId;

      // create lookup table
      debug('prepare luts');

      const lutsAddress = [
        baseMint,
        quoteMint,
        this.baseRay.getCachedMarketInfo(marketId).baseVault, // poolKeys.baseVault,
        this.baseRay.getCachedMarketInfo(marketId).quoteVault, // poolKeys.quoteVault,
        // poolKeys.lpMint,
        // poolKeys.lpVault,
        marketId,
        // poolKeys.marketBaseVault, poolKeys.marketQuoteVault,
        this.baseRay.getCachedMarketInfo(marketId).eventQueue, // poolKeys.marketEventQueue,
        this.baseRay.getCachedMarketInfo(marketId).bids, // poolKeys.marketBids,
        this.baseRay.getCachedMarketInfo(marketId).asks, // poolKeys.marketAsks,
        this.baseRay.getCachedMarketInfo(marketId).vaultOwner, // poolKeys.authority,
        // createPoolTxInfo.poolId,
        this.baseRay.getCachedMarketInfo(marketId).programId,
      ];

      const lutsInfo = await this.createLookupTableAndMarketVaults(
        lutsAddress,
        createMarketInfoRes.vaultInstructions,
        createMarketInfoRes.vaultSigners,
      ).catch((bundleCreateLookuptableError) => {
        debug({ bundleCreateLookuptableError });
        return null;
      });

      if (!lutsInfo) {
        return { Err: 'Failed to prepare the transactions.' };
      }

      // create market tx
      debug('create market tx');

      await sleep(2_000);

      const priorityFee = getPriorityFee();
      let txFee = (priorityFee as any)[ENV.CREATE_MARKET_PRIORITY_FEE_KEY];

      let res = null;
      for (let idx = 1; idx < 4; idx++) {
        res = await this.sendTransactionWithOpt(
          {
            ixs: createMarketInfoRes.marketInstructions,
            signers: createMarketInfoRes.marketSigners,
            lutsInfo: [lutsInfo],
          },
          { txFee, skipSimulation: true },
        );

        if (
          res.Err &&
          (res.Err.reason == TxFailReason.EXPIRED || // retry 1
            res.Err.reason == TxFailReason.NETWORK_ISSUE)
        ) {
          console.log(`Retring Token Creation ... ${idx}`);
          continue;
        }

        break;
      }

      debug({ burnLpTxRes: res });

      if (!res) {
        return { Err: 'TRANSACTION FAILED' };
      }

      if (res.Err || !res.Ok) {
        if (res.Err?.reason == TxFailReason.FAILED_TO_SIGN_TX) {
          return { Err: 'TRANSACTION CANCELLED' };
        }
        return { Err: 'TRANSACTION FAILED' };
      }
      return {
        Ok: {
          txSignature: res.Ok?.txSignature,
          marketId: marketId.toBase58(),
        },
      };

      /*
      const createMarketRecentBlockhash = await getBlockhash(this.connection);
      if (!createMarketRecentBlockhash)
        return { Err: 'Failed to prepare the transactions.' };

      const priorityFee = getPriorityFee();
      let txFee = (priorityFee as any)[ENV.CREATE_MARKET_PRIORITY_FEE_KEY];
      const incMarketCreationTxFeeIx = ComputeBudgetProgram.setComputeUnitPrice(
        {
          microLamports: txFee,
        },
      );

      const createMarketTxMsg = new web3.TransactionMessage({
        instructions: [
          incMarketCreationTxFeeIx,
          ...createMarketInfoRes.marketInstructions,
        ],
        payerKey: user,
        recentBlockhash: createMarketRecentBlockhash.blockhash,
      }).compileToV0Message([lutsInfo]);
      const _createMarketTx = new web3.VersionedTransaction(createMarketTxMsg);
      _createMarketTx.sign([...createMarketInfoRes.marketSigners]);

      // get user signature
      const signedTxsInfo = await this.provider.wallet
        .signTransaction(_createMarketTx)
        .catch(() => null);
      if (!signedTxsInfo)
        return { Err: 'Web3BundleError.BUNDLER_FAILED_TO_PREPARE' };

      const rawTx = Buffer.from(signedTxsInfo.serialize());
      const txSignature = await web3
        .sendAndConfirmRawTransaction(this.connection, rawTx)
        .catch(async () => {
          await sleep(2_000);
          return web3
            .sendAndConfirmRawTransaction(this.connection, rawTx)
            .catch((sendRawTransactionError) => {
              log({ sendRawTransactionError });
              return undefined;
            });
        });

      if (!txSignature) throw 'Tx Failed';

      console.log('Confirmed successfully!');

      return {
        Ok: {
          marketId: marketId.toBase58(),
          txSignature,
        },
      };*/
    } catch (innerLaunchBundleError) {
      debug({ innerLaunchBundleError });
      throw innerLaunchBundleError;
    }
  }

  async launchBundleWithMarket(
    input: LaunchBundleInput,
    onConsole: (log: string) => void,
  ): Promise<Result<LaunchBundleRes, string>> {
    const finalRes: LaunchBundleRes = {};
    try {
      const jitoTipsAccount = getJitoTipsAccount();
      if (!jitoTipsAccount) {
        debug(`failed to get tips account`);
        onConsole(`failed to get tips account`);
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      const user = this.provider.publicKey;
      const { marketSettings, bundleSetup } = input;
      const { baseMint, quoteMint } = marketSettings;
      finalRes.tokenAddress = baseMint.toBase58();
      finalRes.deployerAddress = user.toBase58();

      const marketId = getPubkeyFromStr(marketSettings.marketId);
      if (!marketId) {
        onConsole('failed to get marketId');
        return { Err: Web3BundleError.BUNDLER_MARKET_ID_FAILED };
      }

      // Pool
      debug('prepare pool');

      let bundleGetCreatePoolTxInfoError = '';
      const createPoolTxInfo = await this.bundleGetCreatePoolTxInfo({
        baseMint,
        quoteMint,
        baseMintAmount: bundleSetup.baseAmount,
        quoteMintAmount: bundleSetup.quoteAmount,
        marketId,
      }).catch((error) => {
        debug({ error });
        bundleGetCreatePoolTxInfoError = error;
      });

      if (bundleGetCreatePoolTxInfoError !== '') {
        return { Err: bundleGetCreatePoolTxInfoError };
      }

      if (!createPoolTxInfo) {
        return { Err: Web3BundleError.BUNDLER_POOL_TX_SETUP_FAILED };
      }

      const {
        poolId,
        baseAmount: initialBaseAmount,
        quoteAmount: initialQuoteAmount,
      } = createPoolTxInfo;

      // Buy
      debug('prepare buy');

      const poolKeys = this.baseRay.getPoolKeysFromCached(poolId);
      if (!poolKeys) {
        debug('failed to get poolkeys from cache');
        onConsole('failed to get poolkeys from cache');
        return { Err: Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED };
      }

      const poolInfo = {
        baseDecimals: poolKeys.baseDecimals,
        quoteDecimals: poolKeys.quoteDecimals,
        lpDecimals: poolKeys.lpDecimals,
        lpSupply: new BN(0),
        baseReserve: initialBaseAmount,
        quoteReserve: initialQuoteAmount,
        startTime: null as any,
        status: null as any,
      };

      const buyersInfo = bundleSetup.buyers;

      const buysTxInfo = await this.bundleGetBuysIxsInfo({
        baseMint,
        quoteMint,
        buyersInfo,
        buyTokenType: 'base',
        poolInfo,
        poolKeys,
        fixedSide: 'in',
        bundleTip: bundleSetup.bundleTip,
      }) //TODO: `buyTokenType` fixed
        .catch((bundleGetBuysIxsInfo) => {
          debug({ bundleGetBuysIxsInfo });
          return null;
        });

      if (!buysTxInfo)
        return { Err: Web3BundleError.BUNDLER_BUY_TX_SETUP_FAILED };

      // create lookup table
      debug('prepare luts');

      const lutsAddress = [
        baseMint,
        quoteMint,
        poolKeys.baseVault,
        poolKeys.quoteVault,
        poolKeys.lpMint,
        poolKeys.lpVault,
        marketId,
        // poolKeys.marketBaseVault, poolKeys.marketQuoteVault,
        poolKeys.marketEventQueue,
        poolKeys.marketBids,
        poolKeys.marketAsks,
        poolKeys.authority,
        createPoolTxInfo.poolId,
      ];

      let bundleCreateLookuptableError = '';
      const lutsInfo = await this.bundleCreateLookuptable(lutsAddress).catch(
        (error) => {
          debug({ error });
          bundleCreateLookuptableError = error;
          // return null;
        },
      );

      if (bundleCreateLookuptableError !== '') {
        return { Err: bundleCreateLookuptableError };
      }

      if (!lutsInfo) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      // create pool tx
      await sleep(2_000);
      // await sleep(1_000)
      debug('create pool tx');

      const createPoolBlockhash = await getBlockhash(this.connection);
      if (!createPoolBlockhash) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      const createPoolTxMsg = new web3.TransactionMessage({
        instructions: createPoolTxInfo.ixs,
        payerKey: user,
        recentBlockhash: createPoolBlockhash.blockhash,
      }).compileToV0Message();

      const _createPoolTx = new web3.VersionedTransaction(createPoolTxMsg);
      _createPoolTx.sign(createPoolTxInfo.signers);

      // buy txs
      await sleep(400);

      debug('create buy txs');

      const buyBlockhash = await getBlockhash(this.connection);
      if (!buyBlockhash) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      const buyTxs: web3.VersionedTransaction[] = [];
      for (let i = 0; i < buysTxInfo.length; ++i) {
        const txInfo = buysTxInfo[i];
        const { buyerAuthority, ixs } = txInfo;

        if (i == buysTxInfo.length - 1) {
          const sender = buyerAuthority[buyerAuthority.length - 1].publicKey;
          ixs.push(
            web3.SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: jitoTipsAccount,
              lamports: LAMPORTS_PER_SOL * bundleSetup.bundleTip, // ENV.BUNDLE_FEE,
            }),
          );
        }

        const buyTxMsg = new web3.TransactionMessage({
          instructions: ixs,
          payerKey: buyerAuthority[0].publicKey,
          recentBlockhash: buyBlockhash.blockhash,
        }).compileToV0Message([lutsInfo]);

        const tx = new web3.VersionedTransaction(buyTxMsg);
        tx.sign(buyerAuthority);

        buyTxs.push(tx);
      }

      const recentBlockhashBundle = await getBlockhash(this.connection);
      if (!recentBlockhashBundle) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      // get user signature
      const createPoolTx = await this.provider.wallet
        .signTransaction(_createPoolTx)
        .catch(() => null);
      if (!createPoolTx) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_PREPARE };
      }

      // bundle send
      let bundleRes: Result<
        {
          bundleId: string;
          txsSignature?: string[];
          bundleStatus?: number;
        },
        string
      > | null = null;

      if (this.network == WalletAdapterNetwork.Mainnet) {
        bundleRes = await sendBundle(
          [createPoolTx, ...buyTxs],
          poolId,
          this.connection,
          bundleSetup.blockEngineUrl,
        ).catch((sendBundleError) => {
          debug({ sendBundleError });
          return null;
        });
      } else {
        bundleRes = await sendBundleTest(
          // [createMarketTx, createPoolTx, ...buyTxs],
          [createPoolTx, ...buyTxs],
          poolId,
          this.connection,
        ).catch((sendBundleError) => {
          debug({ sendBundleError });
          return null;
        });
      }

      debug(`sendBundle function results: ${bundleRes}`);

      if (!bundleRes || !bundleRes.Ok) {
        return { Err: Web3BundleError.BUNDLER_FAILED_TO_SEND };
      }

      // const { bundleId, bundleStatus, txsSignature } = bundleRes.Ok;
      const { bundleId } = bundleRes.Ok;

      finalRes.marketId = marketId.toBase58();
      finalRes.poolId = poolId.toBase58();
      finalRes.bundleId = bundleId;
      // finalRes.bundleRes = {
      //   bundleId,
      //   bundleStatus,
      //   marketCreateTxSignature: '',
      //   poolCreateTxSignature: txsSignature[0],
      //   buyTxsSignature: txsSignature.splice(1),
      // };

      finalRes.buyersInfo = buyersInfo.map((e) => {
        return {
          address: e.buyerAuthority.publicKey.toBase58(),
          amount: e.buyAmount,
        };
      });

      onConsole('Confirmed successfully!');

      return { Ok: finalRes };
    } catch (innerLaunchBundleError: any) {
      debug({ innerLaunchBundleError });
      // return { Ok: finalRes };
      return {
        Err: innerLaunchBundleError || Web3BundleError.BUNDLER_FAILED_TO_SEND,
      };
    }
  }

  private async bundleCreateLookuptable(
    addresses: web3.PublicKey[],
    // initMarketVaultsIxs: web3.TransactionInstruction[],
    // vaultSigners: web3.Signer[],
  ) {
    const user = this.provider.publicKey;
    const slot = await this.connection.getSlot();
    addresses.push(web3.AddressLookupTableProgram.programId);
    const [lookupTableInst, lookupTableAddress] =
      web3.AddressLookupTableProgram.createLookupTable({
        authority: user,
        payer: user,
        recentSlot: slot - 1,
      });

    const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
      payer: user,
      authority: user,
      lookupTable: lookupTableAddress,
      addresses,
    });

    const recentBlockhash = await getBlockhash(this.connection);

    if (!recentBlockhash) throw 'Blockhash not found.';
    const msg = new web3.TransactionMessage({
      instructions: [
        incTxFeeIx,
        lookupTableInst,
        extendInstruction,
        // ...initMarketVaultsIxs,
      ],
      payerKey: user,
      recentBlockhash: recentBlockhash.blockhash,
    }).compileToV0Message();

    const tx = new web3.VersionedTransaction(msg);

    // tx.sign(vaultSigners);

    if (!recentBlockhash) {
      throw 'Blockhash not found.';
    }

    const signedTx = await this.provider.wallet.signTransaction(tx);

    debug('creating luts');

    const txSignature = await web3
      .sendAndConfirmRawTransaction(
        this.connection,
        Buffer.from(signedTx.serialize()),
      )
      .catch((createLookUpTableTxError) => {
        console.log({ createLookUpTableTxError });
        throw 'Failed to create lookup table.';
      });

    debug(`Create lut tx Signature: ${txSignature}`);

    await sleep(3_000);

    const lutInfoRes = await this.connection
      .getAddressLookupTable(lookupTableAddress)
      .catch(() => null)
      .then(async (lutsInfo) => {
        if (lutsInfo?.value) return lutsInfo;
        await sleep(15_000);
        return await this.connection
          .getAddressLookupTable(lookupTableAddress)
          .catch(() => null)
          .then(async (lutsInfo) => {
            if (lutsInfo?.value) return lutsInfo;
            await sleep(10_000);
            return await this.connection
              .getAddressLookupTable(lookupTableAddress)
              .catch(() => null)
              .then(async (lutsInfo) => {
                if (lutsInfo?.value) return lutsInfo;
                throw 'Failed to create lookup table info.';
              });
          });
      });
    const lutInfo = lutInfoRes.value;
    if (!lutInfo) throw 'Failed to get lookup table info.';
    return lutInfo;
  }

  private async createLookupTableAndMarketVaults(
    addresses: web3.PublicKey[],
    initMarketVaultsIxs: web3.TransactionInstruction[],
    vaultSigners: web3.Signer[],
  ) {
    const user = this.provider.publicKey;
    const slot = await this.connection.getSlot();
    addresses.push(web3.AddressLookupTableProgram.programId);
    const [lookupTableInst, lookupTableAddress] =
      web3.AddressLookupTableProgram.createLookupTable({
        authority: user,
        payer: user,
        recentSlot: slot - 1,
      });

    const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
      payer: user,
      authority: user,
      lookupTable: lookupTableAddress,
      addresses,
    });

    const recentBlockhash = await getBlockhash(this.connection);

    if (!recentBlockhash) throw 'blockhash not found (luts creation)';

    const priorityFee = getPriorityFee();
    let txFee = (priorityFee as any)[ENV.CREATE_MARKET_PRIORITY_FEE_KEY];
    const incTxsFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: txFee,
    });

    const msg = new web3.TransactionMessage({
      instructions: [
        incTxsFeeIx,
        lookupTableInst,
        extendInstruction,
        ...initMarketVaultsIxs,
      ],
      payerKey: user,
      recentBlockhash: recentBlockhash.blockhash,
    }).compileToV0Message();

    const tx = new web3.VersionedTransaction(msg);

    tx.sign(vaultSigners);

    if (!recentBlockhash) {
      throw 'Blockhash not found (luts creation)';
    }

    const signedTx = await this.provider.wallet.signTransaction(tx);

    debug('creating luts');

    const txSignature = await web3
      .sendAndConfirmRawTransaction(
        this.connection,
        Buffer.from(signedTx.serialize()),
        { skipPreflight: true, maxRetries: 20 },
      )
      .catch((createLookUpTableTxError) => {
        console.log({ createLookUpTableTxError });
        throw 'failed to create luts';
      });

    debug(`Create lut tx Signature: ${txSignature}`);

    await sleep(3_000);

    const lutInfoRes = await this.connection
      .getAddressLookupTable(lookupTableAddress)
      .catch(() => null)
      .then(async (lutsInfo) => {
        if (lutsInfo?.value) return lutsInfo;

        await sleep(10_000);
        return await this.connection
          .getAddressLookupTable(lookupTableAddress)
          .catch(() => null)
          .then(async (lutsInfo) => {
            if (lutsInfo?.value) return lutsInfo;

            await sleep(10_000);
            return await this.connection
              .getAddressLookupTable(lookupTableAddress)
              .catch(() => null)
              .then(async (lutsInfo) => {
                if (lutsInfo?.value) return lutsInfo;
                throw 'failed to create lut info';
              });
          });
      });
    const lutInfo = lutInfoRes.value;
    if (!lutInfo) throw 'failed to get luts';
    return lutInfo;
  }
}
