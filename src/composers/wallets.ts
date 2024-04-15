import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu, MenuRange } from '@grammyjs/menu';
const { Keypair } = require('@solana/web3.js');

import { MainContext } from '@root/configs/context';
import { IWallet } from '@root/models/wallet-model';
import {
  getWalletsByUser,
  setPrimaryWallet,
  createWallet,
  removeAllWallets,
} from '@root/services/wallet-service';
import { getKeypairFromStr } from '@root/web3/base/utils';

export enum Route {
  WALLET_PRIMARYKEY = 'WALLETS|WALLET_PRIMARYKEY',
}

const debug = Debug(`bot:wallet`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const walletsMenu = new Menu<MainContext>('Wallet')
  .dynamic(async (ctx) => {
    const range = new MenuRange<MainContext>();

    let wallets: IWallet[] = [];
    if (ctx.chat) {
      wallets = await getWalletsByUser(ctx.chat.id);
    }

    debug('wallets: %O', wallets.length);

    for (const wallet of wallets) {
      range
        .text(
          {
            text: wallet.isPrimary ? ' ✅' : '❌',
          },
          async (ctx: any) => {
            await setPrimaryWallet(ctx.chat.id, wallet.publicKey);
            ctx.menu.update();
          },
        )
        .text({
          text: (ctx) => {
            const publicKey = wallet.publicKey.replace(
              /(.{6})(.*?)(.{6})$/,
              '$1...$3',
            );

            return publicKey;
          },
        })
        .text({ text: `${wallet.balance} SOL` })
        .row();
    }

    return range;
  })
  .row()
  .text(
    (ctx) => ctx.t('label-import-wallet'),
    async (ctx: any) => {
      // Generate a new wallet
      const walletKeyPair = Keypair.generate();
      const privateKey = walletKeyPair.secretKey; //.toString();
      const publicKey = walletKeyPair.publicKey.toBase58();

      // Save user wallet info to the database
      await createWallet(ctx.chat.id, privateKey, publicKey);

      // ctx.menu.update();

      const walletsMessage = await walletsTitle(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .text((ctx) => ctx.t('label-connect-wallet'), inputWalletPrimaryKeyCbQH)
  .row()
  .text(
    (ctx) => ctx.t('label-gen-3-wallet'),
    async (ctx: any) => {
      for (let idx = 0; idx < 3; idx++) {
        const walletKeyPair = Keypair.generate();
        const privateKey = walletKeyPair.secretKey; //.toString();
        const publicKey = walletKeyPair.publicKey.toBase58();

        // Save user wallet info to the database
        await createWallet(ctx.chat.id, privateKey, publicKey);
      }

      // ctx.menu.update();
      const walletsMessage = await walletsTitle(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .text(
    (ctx) => ctx.t('label-gen-5-wallet'),
    async (ctx: any) => {
      for (let idx = 0; idx < 5; idx++) {
        const walletKeyPair = Keypair.generate();
        const privateKey = walletKeyPair.secretKey; //.toString();
        const publicKey = walletKeyPair.publicKey.toBase58();

        // Save user wallet info to the database
        await createWallet(ctx.chat.id, privateKey, publicKey);
      }

      // ctx.menu.update();
      const walletsMessage = await walletsTitle(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .text((ctx) => ctx.t('label-transfer-all-sol'))
  .row()
  .text(
    (ctx) => ctx.t('label-reload-list'),
    async (ctx: any) => {
      // ctx.menu.update();
      const walletsMessage = await walletsTitle(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .text(
    (ctx) => ctx.t('label-delete-all'),
    async (ctx: any) => {
      // Remove user walletsfrom the database
      await removeAllWallets(ctx.chat.id);

      // ctx.menu.update();
      const walletsMessage = await walletsTitle(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .text('❌  Close', doneCbQH);

const cancelMenu = new Menu<MainContext>('wallets-cancel').back(
  '🔙',
  async (ctx) => {
    ctx.session.step = 'IDLE';
    const walletsMessage = await walletsTitle(ctx);
    ctx.editMessageText(walletsMessage, { parse_mode: 'Markdown' });
  },
);
// ← back arrow
walletsMenu.register(cancelMenu);
bot.use(walletsMenu);

bot.command('wallet', walletCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.WALLET_PRIMARYKEY, fireWalletPrimaryKeyRouteHandler);
// router.route(Route.FIREFLY_API_URL, fireflyApiUrlRouteHandler);
// router.route(Route.FIREFLY_ACCESS_TOKEN, fireflyAccessTokenRouteHandler);
bot.use(router);

export default bot;

async function walletsTitle(ctx: MainContext) {
  let wallets: IWallet[] = [];
  if (ctx.chat) {
    wallets = await getWalletsByUser(ctx.chat.id);
  }

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  const totalSol = wallets.reduce(
    (total, wallet) => total + (wallet.balance || 0),
    0,
  );
  const primaryWalletSol = primaryWallet?.balance || 0;

  let welcomeMessage: string = ctx.t('wallets-title', {
    countofWallets: wallets.length,
    totalSol: totalSol,
    primarySol: primaryWalletSol,
  });

  return welcomeMessage;
}

async function walletCommandHandler(ctx: MainContext) {
  const log = debug.extend('startCommandHandler');
  log('Entered the startCommandHandler...');

  const welcomeMessage = await walletsTitle(ctx);
  const ret = await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: walletsMenu,
  });

  ctx.session.msgId = ret.message_id;
}

async function doneCbQH(ctx: MainContext) {
  ctx.session.step = 'IDLE';
  return ctx.deleteMessage();
}

async function inputWalletPrimaryKeyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.WALLET_PRIMARYKEY;

    await ctx.reply(ctx.t('wallets-enter-primaryKey'), {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
      },
    });

    // await ctx.editMessageText(ctx.t('wallets-enter-primaryKey'), {
    //   parse_mode: 'Markdown',
    //   reply_markup: cancelMenu,
    // });
  } catch (err: any) {
    debug(err);
  }
}

async function fireWalletPrimaryKeyRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;

    debug(text);

    const walletKeyPair = getKeypairFromStr(text);

    // Check valid primaryKey
    if (!walletKeyPair || !walletKeyPair?.publicKey) {
      return ctx.reply('Invalid primaryKey!');
    }

    const privateKey = walletKeyPair.secretKey; //.toString();
    const publicKey = walletKeyPair.publicKey.toBase58();

    // Save user wallet info to the database
    if (ctx.chat) {
      await createWallet(ctx.chat.id, text, publicKey);
    }

    ctx.session.step = 'IDLE';

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        ctx.update.message!.reply_to_message!.message_id,
      );
    } catch (err) {}

    debug(
      ctx.chat!.id,
      ctx.update.message!.reply_to_message!.message_id,
      ctx.chat!.id,
      ctx.msg!.message_id,
      ctx.session.msgId,
    );

    const walletsMessage = await walletsTitle(ctx);
    return ctx.api.editMessageText(
      ctx.chat!.id,
      ctx.session.msgId,
      walletsMessage,
      {
        parse_mode: 'HTML',
        reply_markup: walletsMenu,
      },
    );
  } catch (err: any) {
    debug(err);
  }
}
