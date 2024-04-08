import { web3 } from '@coral-xyz/anchor';
import { bundle } from 'jito-ts';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';
import { toBigIntLE } from 'bigint-buffer';

import {
  debug,
  ENV,
  JITO_TIPS_ACCOIUNTS as JITO_TIPS_ACCOUNTS,
} from '../configs';

import { Result } from './base/types';
import { sleep } from './base/utils';

export function getPubkeyFromStr(key: string) {
  try {
    return new web3.PublicKey(key);
  } catch (error) {
    return null;
  }
}

export function generateKeypairs(count = 1) {
  const keypairs: web3.Keypair[] = [];
  for (let i = 0; i < count; ++i) {
    keypairs.push(web3.Keypair.generate());
  }
  return keypairs;
}

export async function getBlockhash(
  connection: web3.Connection,
  opt?: { retry?: number },
): Promise<string | undefined> {
  const retry = opt?.retry ?? 2;
  try {
    for (let i = 0; i < retry; ++i) {
      const blockhash = (
        await connection
          .getLatestBlockhash()
          .catch((getLatestBlockhashError) => {
            debug(getLatestBlockhashError);
            return null;
          })
      )?.blockhash;
      if (blockhash) return blockhash;
      await sleep(1_000);
    }
  } catch (getBlockhashError) {
    debug({ getBlockhashError });
    return undefined;
  }
}

export async function sendBundleTest(
  txs: web3.VersionedTransaction[],
  poolId: web3.PublicKey,
  connection: web3.Connection,
): Promise<
  Result<
    {
      bundleId: string;
      txsSignature: string[];
      bundleStatus: number;
    },
    string
  >
> {
  try {
    const txsResHandler: Promise<string | null>[] = [];
    for (const tx of txs) {
      txsResHandler.push(
        connection
          .sendRawTransaction(Buffer.from(tx.serialize()), {
            maxRetries: 10,
            skipPreflight: true,
          })
          .catch((sendTestTxError) => {
            debug({ sendTestTxError });
            return null;
          }),
      );

      await sleep(3_000);
    }
    const txsSignature: string[] = [];
    for (const handler of txsResHandler) {
      const txSignature = await handler;
      txSignature && txsSignature.push(txSignature);
    }
    //confirm tx signature
    await sleep(30_000);
    for (let i = 0; i < txsSignature.length; ++i) {
      const sign = txsSignature[i];
      const statusRes = await connection.getSignatureStatus(sign);
      const err = statusRes.value?.err;
      const status = statusRes.value?.confirmationStatus;
      if (err || !status) {
        debug(`${i + 1} UnVerified Tx signature :${sign}`);
      }
    }
    return {
      Ok: {
        bundleId: '',
        bundleStatus: 1,
        txsSignature: txsSignature,
      },
    };
  } catch (innerBundlerError) {
    return { Err: JSON.stringify(innerBundlerError) };
  }
}

export async function sendBundle(
  txs: web3.VersionedTransaction[],
  poolId: web3.PublicKey,
  connection: web3.Connection,
  jitoBlockEngineUrl: string,
): Promise<
  Result<
    { bundleId: string; txsSignature: string[]; bundleStatus: number },
    string
  >
> {
  try {
    // const rawTxs = txs.map((e) => {
    //   return Array.from(e.serialize());
    // });
    // const result = await axios
    //   .post('/api/sendBundle', { rawTxs: rawTxs })
    //   .catch((apiSendBundleError) => {
    //     debug({ apiSendBundleError });
    //     return null;
    //   });
    const result = await processBundle(txs, jitoBlockEngineUrl);
    if (!result) return { Err: 'failed to send bunlde(api)' };

    debug({ sendBundleApiRes: result });

    const bundleRes: Result<{ bundleId: string }, string> | undefined = result;

    debug({ bundleRes });

    let bundleId = '';
    if (!bundleRes) {
      return { Err: 'failed to send bunlde(api)' };
    }

    if (bundleRes?.Ok) {
      await sleep(2_000);

      bundleId = bundleRes.Ok.bundleId;

      const bundleInfo = await getBundleInfo(bundleId)
        .catch(() => null)
        .then(async (res) => {
          if (res) {
            return res;
          }

          await sleep(10_000);

          return getBundleInfo(bundleId)
            .catch(() => null)
            .then(async (res) => {
              if (res) {
                return res;
              }

              await sleep(10_000);

              return getBundleInfo(bundleId).catch((getBunderInfoError) => {
                debug({ getBunderInfoError });
                return null;
              });
            });
        });

      if (bundleInfo) {
        const { status, transactions } = bundleInfo;
        return {
          Ok: {
            bundleId,
            bundleStatus: status,
            txsSignature: transactions,
          },
        };
      }
    }

    const err = bundleRes.Err;

    debug(`SendBundle Error : ${err}`);

    await sleep(3_000);

    const poolInfo = await connection
      .getAccountInfo(poolId)
      .catch(() => null)
      .then(async (poolInfo) => {
        if (poolInfo) return poolInfo;
        await sleep(15_000);
        return await connection
          .getAccountInfo(poolId)
          .catch(() => null)
          .then(async (poolInfo) => {
            if (poolInfo) return poolInfo;
            await sleep(10_000);
            return await connection
              .getAccountInfo(poolId)
              .catch((getAccountInfoError) => {
                debug({ getAccountInfoError });
                return undefined;
              })
              .then(async (poolInfo) => {
                // if (poolInfo?.value) return poolInfo
                return poolInfo;
              });
          });
      });

    if (!poolInfo) {
      return { Err: 'Bundle Failed' };
    }

    return {
      Ok: {
        bundleId,
        bundleStatus: 0,
        txsSignature: ['', '', '', '', '', ''],
      },
    };
  } catch (error) {
    debug({ innerBundleError: error });
  }

  return { Err: 'failed to send bunlde(api)' };
}

export default async function processBundle(
  txs: web3.VersionedTransaction[],
  jitoBlockEngineUrl: string,
) {
  try {
    const bundleResult = { pass: false, info: null as any };
    // const { rawTxs }: { rawTxs: number[][] } = req.body;

    const jitoClient = searcherClient(
      jitoBlockEngineUrl, //ENV.JITO_BLOCK_ENGINE_URL,
      ENV.JITO_AUTH_KEYPAIR,
    );
    // const txs = rawTxs.map((e: any) => {
    //   return web3.VersionedTransaction.deserialize(Uint8Array.from(e));
    // });
    const b = new bundle.Bundle(txs, txs.length);
    if (b instanceof Error) {
      console.log({ bundleError: b });
      return { Err: 'Failed to prepare the bunde transaction' };
    }
    jitoClient.onBundleResult(
      (bundleInfo) => {
        debug({ bundleInfo: JSON.stringify(bundleInfo) });
        if (!bundleResult.pass) {
          if (bundleInfo.accepted) {
            bundleResult.pass = true;
            bundleResult.info = bundleInfo;
          }
        }
      },
      (bundleSendError) =>
        debug({ bundleSendError: JSON.stringify(bundleSendError) }),
    );
    debug('Sending bundle ...');
    const bundleId = await jitoClient.sendBundle(b).catch(async () => {
      await sleep(3_000);
      return await jitoClient.sendBundle(b as any).catch((sendBunderError) => {
        debug({ sendBunderError });
        return null;
      });
    });

    debug('Bundle Sent ...');

    if (!bundleId) {
      return { Err: 'Bundle transaction failed' };
    }

    for (let i = 0; i < 100; ++i) {
      await sleep(1_000);
      if (bundleResult.pass) {
        debug('----- bundle passed -----');
        debug({ bundleResult });
        break;
      }
    }

    return { Ok: { bundleId } };
  } catch (sendBundleError) {
    debug({ sendBundleError });
    return { Err: 'Bundle transaction failed' };
  }
}

const SPL_TRANSFER_IX_DATA = 3;
export function getReceiverFromTransferIxs(
  ixs: web3.TransactionInstruction[],
  ataMapper: Map<string, string>,
  decimals: number,
) {
  const receiversInfo: { address: string; amount: number; ata: string }[] = [];
  const devider = 10 ** decimals;
  for (const ix of ixs) {
    const { data: dataBuffer, keys, programId } = ix;
    if (programId.toBase58() != TOKEN_PROGRAM_ID.toBase58()) continue;
    const data = Uint8Array.from(dataBuffer);
    const instructionData = data[0];
    if (instructionData != SPL_TRANSFER_IX_DATA) continue;
    const amount = Number(toBigIntLE(dataBuffer.slice(1)).toString()) / devider;
    const receiverAta = keys[1]?.pubkey?.toBase58();
    const receiver = ataMapper.get(receiverAta);
    if (amount === undefined || amount === null || !receiverAta || !receiver)
      continue;
    receiversInfo.push({
      address: receiver,
      ata: receiverAta,
      amount,
    });
  }
  return receiversInfo;
}

export function getJitoTipsAccount() {
  try {
    return JITO_TIPS_ACCOUNTS[
      Math.floor(Math.random() * JITO_TIPS_ACCOUNTS.length)
    ];
  } catch (getJitoTipsAccountError) {
    debug({ getJitoTipsAccountError });
    return null;
  }
}

//TODO: can be set as front-end
export type BundleRes = {
  uuid: string;
  timestamp: string;
  validatorIdentity: string;
  transactions: string[];
  slot: number;
  status: number;
  landedTipLamports: number;
  signer: string;
  __typename: string;
};

export async function getBundleInfo(
  bundleId: string,
): Promise<BundleRes | undefined> {
  const bundleRes = await fetch('https://explorer.jito.wtf/api/graphqlproxy', {
    mode: 'no-cors',
    headers: {
      accept: '*/*',
      'accept-language': 'en-GB,en;q=0.5',
      'content-type': 'application/json',
      Referer: `https://explorer.jito.wtf/bundle/${bundleId}`,
    },
    // eslint-disable-next-line no-useless-escape
    body: `{\"operationName\":\"getBundleById\",\"variables\":{\"id\":\"${bundleId}\"},\"query\":\"query getBundleById($id: String!) {\\n  getBundle(req: {id: $id}) {\\n    bundle {\\n      uuid\\n      timestamp\\n      validatorIdentity\\n      transactions\\n      slot\\n      status\\n      landedTipLamports\\n      signer\\n      __typename\\n    }\\n    __typename\\n  }\\n}\"}`,
    method: 'POST',
  }).catch((fetchBundleError) => {
    debug({ fetchBundleError });
    return null;
  });

  const bundleResJ = await bundleRes?.json();

  return bundleResJ?.data?.getBundle?.bundle;
}
