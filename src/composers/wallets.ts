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
  createWallets,
  removeAllWallets,
  sendSOLToPrimaryWallet,
} from '@root/services/wallet-service';
import {
  getKeypairFromUint8Array,
  getKeypairFromStr,
} from '@root/web3/base/utils';
import { command } from './constants';
import { generateWelcomeMessage, generateWalletsMessage } from './helpers';

export enum Route {
  WALLET_PRIMARYKEY = 'WALLETS|WALLET_PRIMARYKEY',
}

const debug = Debug(`bot:wallet`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const walletsMenu = new Menu<MainContext>('wallets-menu')
  .dynamic(async (ctx: any) => {
    const range = new MenuRange<MainContext>();

    const wallets = await getWalletsByUser(ctx.chat.id);

    for (const wallet of wallets) {
      range
        .text(
          {
            text: wallet.isPrimary ? ' ✅' : '❌',
          },
          async (ctx: any) => {
            await setPrimaryWallet(ctx.chat.id, wallet.publicKey);
            // ctx.menu.update();
            const walletsMessage = await generateWalletsMessage(ctx);
            await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
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
    (ctx) => ctx.t('label-create-wallet'),
    async (ctx: any) => {
      // Generate a new wallet
      const walletKeyPair = Keypair.generate();
      const privateKey = getKeypairFromUint8Array(walletKeyPair.secretKey);
      const publicKey = walletKeyPair.publicKey.toBase58();

      if (!privateKey) {
        return;
      }

      // Save user wallet info to the database
      await createWallet(ctx.chat.id, privateKey, publicKey);

      // ctx.menu.update();

      const walletsMessage = await generateWalletsMessage(ctx);
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
        const privateKey = getKeypairFromUint8Array(walletKeyPair.secretKey);
        const publicKey = walletKeyPair.publicKey.toBase58();

        if (!privateKey) {
          return;
        }

        // Save user wallet info to the database
        await createWallet(ctx.chat.id, privateKey, publicKey);
      }

      // ctx.menu.update();
      const walletsMessage = await generateWalletsMessage(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .text(
    (ctx) => ctx.t('label-gen-5-wallet'),
    async (ctx: any) => {
      for (let idx = 0; idx < 5; idx++) {
        const walletKeyPair = Keypair.generate();
        const privateKey = getKeypairFromUint8Array(walletKeyPair.secretKey);
        const publicKey = walletKeyPair.publicKey.toBase58();

        if (!privateKey) {
          return;
        }

        // Save user wallet info to the database
        await createWallet(ctx.chat.id, privateKey, publicKey);
      }

      // ctx.menu.update();
      const walletsMessage = await generateWalletsMessage(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .text(
    (ctx) => ctx.t('label-transfer-all-sol'),
    async (ctx: any) => {
      try {
        await sendSOLToPrimaryWallet(ctx.chat.id);

        ctx.menu.update();
        const walletsMessage = await generateWalletsMessage(ctx);
        await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
      } catch (err) {
        debug(err);
      }
    },
  )
  .row()
  .text(
    (ctx) => ctx.t('label-reload-list'),
    async (ctx: any) => {
      // ctx.menu.update();
      const walletsMessage = await generateWalletsMessage(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .text(
    (ctx) => ctx.t('label-delete-all'),
    async (ctx: any) => {
      // Remove user walletsfrom the database
      await removeAllWallets(ctx.chat.id);

      // ctx.menu.update();
      const walletsMessage = await generateWalletsMessage(ctx);
      await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  // .text('❌  Close', doneCbQH);
  .back('❌  Close', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  });

const cancelMenu = new Menu<MainContext>('wallets-cancel').back(
  '🔙',
  async (ctx) => {
    ctx.session.step = 'IDLE';
    const walletsMessage = await generateWalletsMessage(ctx);
    await ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
  },
);
// ← back arrow
// walletsMenu.register(cancelMenu);
bot.use(walletsMenu);

bot.command(command.WALLETS, walletCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.WALLET_PRIMARYKEY, fireWalletPrimaryKeyRouteHandler);

bot.use(router);

export { bot, walletsMenu };

export async function walletCommandHandler(ctx: MainContext) {
  const welcomeMessage = await generateWalletsMessage(ctx);
  const ret = await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: walletsMenu,
  });
}

async function doneCbQH(ctx: MainContext) {
  ctx.session.step = 'IDLE';
  return ctx.deleteMessage();
}

async function inputWalletPrimaryKeyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.WALLET_PRIMARYKEY;

    await ctx.reply(ctx.t('wallets-enter-privateKey'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });

    // await ctx.editMessageText(ctx.t('wallets-enter-privateKey'), {
    //   parse_mode: 'HTML',
    //   reply_markup: cancelMenu,
    // });
  } catch (err: any) {
    debug(err);
  }
}

async function fireWalletPrimaryKeyRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    const privateKeys = text.split(';');
    let wallets: IWallet[] = [];

    for (const privateKey of privateKeys) {
      const walletKeyPair = getKeypairFromStr(privateKey);

      // Check valid primaryKey
      if (!walletKeyPair || !walletKeyPair?.publicKey) {
        continue;
      }

      const publicKey = walletKeyPair.publicKey.toBase58();

      wallets.push({
        chatId: ctx.chat!.id,
        privateKey,
        publicKey,
        isPrimary: false,
      });
    }

    // Save user wallets info to the database
    await createWallets(wallets);
  } catch (err: any) {
    console.log(err);
  } finally {
    // ctx.session.step = 'IDLE';

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        ctx.update.message!.reply_to_message!.message_id,
      );
    } catch (err) {}

    const walletsMessage = await generateWalletsMessage(ctx);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      ctx.session.topMsgId,
      walletsMessage,
      {
        parse_mode: 'HTML',
        reply_markup: walletsMenu,
      },
    );
  }
}
