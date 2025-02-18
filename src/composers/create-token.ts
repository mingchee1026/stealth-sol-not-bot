import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage } from './helpers';
import { getPrimaryWallet } from '@root/services/wallet-service';
import { CreateTokenInput } from '@root/web3';
import { serviceSettings, serviceToken } from '@root/services';
import { command } from './constants';
import { generateCreateTokenMessage } from './helpers';
import { chargeToSite } from '@root/services/utils';

export enum Route {
  TOKEN_NAME = 'CREATE_TOKEN|TOKEN_NAME',
  TOKEN_SYMBOL = 'CREATE_TOKEN|TOKEN_SYMBOL',
  TOKEN_DECIMALS = 'CREATE_TOKEN|TOKEN_DECIMALS',
  TOKEN_SUPPLY = 'CREATE_TOKEN|TOKEN_SUPPLY',
  TOKEN_IMAGE_URL = 'CREATE_TOKEN|TOKEN_IMAGE_URL',
  TOKEN_DESCRIPTION = 'CREATE_TOKEN|TOKEN_DESCRIPTION',
  TOKEN_WEBSITE = 'CREATE_TOKEN|TOKEN_WEBSITE',
  TOKEN_TELEGRAM = 'CREATE_TOKEN|TOKEN_TELEGRAM',
  TOKEN_TWITTER = 'CREATE_TOKEN|TOKEN_TWITTER',
}

const debug = Debug(`bot:create token`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const createTokenMenu = new Menu<MainContext>('create-token-menu')
  .text((ctx) => ctx.t('label-name'), inputNameCbQH)
  .text((ctx) => ctx.t('label-symbol'), inputSymbolCbQH)
  .row()
  .submenu((ctx) => ctx.t('label-decimals'), 'custom-decimals-menu')
  .submenu((ctx) => ctx.t('label-supply'), 'custom-supply-menu')
  .row()
  .text((ctx) => ctx.t('label-logo'), inputLogoImageCbQH)
  .text((ctx) => ctx.t('label-description'), inputDescriptionCbQH)
  .row()
  .text(
    (ctx) => '--- LINKS ---',
    (ctx: any) => {
      return false;
    },
  )
  .row()
  .text((ctx) => ctx.t('label-website'), inputWebsiteCbQH)
  .text((ctx) => ctx.t('label-telegram'), inputTelegramCbQH)
  .text((ctx) => ctx.t('label-twitter'), inputTwitterCbQH)
  .row()
  .text(
    async (ctx: any) => {
      const value = ctx.session.createToken.immutable;
      return `${value ? '✅ ' : '❌ '} Immutable`;
    },
    async (ctx: any) => {
      ctx.session.createToken.immutable = !ctx.session.createToken.immutable;
      ctx.menu.update();
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createToken.revokeMint;
      return `${value ? '✅ ' : '❌ '} Revoke Mint`;
    },
    async (ctx: any) => {
      ctx.session.createToken.revokeMint = !ctx.session.createToken.revokeMint;
      ctx.menu.update();
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createToken.revokeFreeze;
      return `${value ? '✅ ' : '❌ '} Revoke Freeze`;
    },
    async (ctx: any) => {
      ctx.session.createToken.revokeFreeze =
        !ctx.session.createToken.revokeFreeze;
      ctx.menu.update();
    },
  )
  .row()
  .back('🔙 Back', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  })
  .text(
    (ctx) => '🗑 Clear Information',
    async (ctx: MainContext) => {
      const initialized = isInitialized(ctx);
      if (initialized) {
        return;
      }

      initSessionData(ctx);

      try {
        const message = await generateCreateTokenMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err) {
          console.log(err);
        }
      }
    },
  )
  .row()
  .text((ctx) => ctx.t('label-mint-token'), fireMintTokenHandler);
// .row()
// .text('🔙  Close', doneCbQH);
// .back('🔙  Close', async (ctx) => {
//   const welcomeMessage = await generateWelcomeMessage(ctx);
//   await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
// });

const customDecimalsMenu = new Menu<MainContext>('custom-decimals-menu')
  .back('6 Decimals', async (ctx) => {
    ctx.session.createToken.decimals = 6;
    const message = await generateCreateTokenMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .back('9 Decimals', async (ctx) => {
    ctx.session.createToken.decimals = 9;
    const message = await generateCreateTokenMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .text((ctx) => ctx.t('label-custom-decimals'), inputDecimalsCbQH)
  .row()
  .back('🔙  Go back');

const customSupplyMenu = new Menu<MainContext>('custom-supply-menu')
  .back('100 Million', async (ctx) => {
    ctx.session.createToken.supply = 100000000;
    const message = await generateCreateTokenMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .back('1 Billion', async (ctx) => {
    ctx.session.createToken.supply = 1000000000;
    const message = await generateCreateTokenMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .text((ctx) => ctx.t('label-custom-supply'), inputSupplyCbQH)
  .row()
  .back('🔙  Go back');

createTokenMenu.register(customDecimalsMenu);
createTokenMenu.register(customSupplyMenu);

bot.use(createTokenMenu);

bot.command(command.CREATE_TOKEN, createTokenCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.TOKEN_NAME, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_SYMBOL, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_DECIMALS, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_SUPPLY, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_IMAGE_URL, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_DESCRIPTION, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_WEBSITE, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_TELEGRAM, fireTokenInfomationRouteHandler);
router.route(Route.TOKEN_TWITTER, fireTokenInfomationRouteHandler);

bot.use(router);

export { bot, createTokenMenu };

export async function createTokenCommandHandler(ctx: MainContext) {
  ctx.session.topMsgId = 0;
  const message = await generateCreateTokenMessage(ctx);
  const ret = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: createTokenMenu,
  });

  ctx.session.createToken.msgId = ret.message_id;
}

async function inputNameCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_NAME;

    await ctx.reply(ctx.t('create-token-enter-name'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputSymbolCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_SYMBOL;

    await ctx.reply(ctx.t('create-token-enter-symbol'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputDecimalsCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_DECIMALS;

    await ctx.reply(ctx.t('create-token-enter-decimals'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputSupplyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_SUPPLY;

    await ctx.reply(ctx.t('create-token-enter-supply'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputLogoImageCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_IMAGE_URL;

    await ctx.reply(ctx.t('create-token-enter-logo'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputDescriptionCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_DESCRIPTION;

    await ctx.reply(ctx.t('create-token-enter-description'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputWebsiteCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_WEBSITE;

    await ctx.reply(ctx.t('create-token-enter-website'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputTelegramCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_TELEGRAM;

    await ctx.reply(ctx.t('create-token-enter-telegram'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputTwitterCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.TOKEN_TWITTER;

    await ctx.reply(ctx.t('create-token-enter-twitter'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function fireTokenInfomationRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    switch (ctx.session.step) {
      case Route.TOKEN_NAME:
        ctx.session.createToken.name = text;
        break;
      case Route.TOKEN_SYMBOL:
        ctx.session.createToken.symbol = text;
        break;
      case Route.TOKEN_DECIMALS:
        ctx.session.createToken.decimals = Number(text);
        break;
      case Route.TOKEN_SUPPLY:
        ctx.session.createToken.supply = Number(text);
        break;
      case Route.TOKEN_IMAGE_URL:
        if (ctx.msg && ctx.msg.document && ctx.msg.document.file_name) {
          const allowedExtensions = ['.jpg', '.jpeg', '.png'];
          const file = await ctx.api.getFile(ctx.msg.document.file_id);
          if (file.file_path) {
            const path = await file.file_path;
            const fileExtension = path.slice(path.lastIndexOf('.'));

            // Check if the file extension is allowed
            if (allowedExtensions.includes(fileExtension)) {
              const logoPath = `./src/assets/${ctx.chat!.id}_${Date.now()}${fileExtension}`;
              await serviceToken.saveLogoImage(path, logoPath);
              console.log(
                'File extension is allowed.',
                ctx.msg.document.file_name,
              );
              ctx.session.createToken.image = ctx.msg.document.file_name;
              ctx.session.createToken.imagePath = logoPath;
              break;
            } else {
              await ctx.reply('🔴 File extension is not allowed.');
              break;
            }
          }
        }

        await ctx.reply('🔴 Please upload correct file.');
        break;
      case Route.TOKEN_DESCRIPTION:
        ctx.session.createToken.description = text;
        break;
      case Route.TOKEN_WEBSITE:
        ctx.session.createToken.socials.website = text;
        break;
      case Route.TOKEN_TELEGRAM:
        ctx.session.createToken.socials.telegram = text;
        break;
      case Route.TOKEN_TWITTER:
        ctx.session.createToken.socials.twitter = text;
        break;
      default:
        break;
    }
  } catch (err: any) {
    console.log(err);
  } finally {
    ctx.session.step = 'IDLE';

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        ctx.update.message!.reply_to_message!.message_id,
      );

      debug('ctx.session.topMsgId', ctx.session.topMsgId);
      debug('ctx.session.createToken.msgId', ctx.session.createToken.msgId);

      const message = await generateCreateTokenMessage(ctx);
      debug(ctx.session.createToken.image);
      if (ctx.session.topMsgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.topMsgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createTokenMenu,
          },
        );
      }

      if (ctx.session.createToken.msgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.createToken.msgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createTokenMenu,
          },
        );
      }
    } catch (err) {}
  }
}

async function fireMintTokenHandler(ctx: MainContext) {
  let processMessageId = 0;

  // await chargeToSite(
  //   '26cxXRQDbbtMFmviHXMxdFJRGX8CGAbVQxwsSYcge9hRhpFSGMp1so6LFstY7fRyyArGoGqg6uXGAPDbYA6zAxp8',
  //   0.025,
  //   0.0003,
  // );

  try {
    if (!ctx.session.createToken.name) {
      await ctx.reply('🔴 Please enter Token Name.');
      return;
    }

    if (!ctx.session.createToken.symbol) {
      await ctx.reply('🔴 Please enter Token Symbol.');
      return;
    }

    if (!ctx.session.createToken.decimals) {
      await ctx.reply('🔴 Please enter Token Decimals.');
      return;
    }

    if (!ctx.session.createToken.supply) {
      await ctx.reply('🔴 Please enter Token Supply.');
      return;
    }

    const tokenInfo: CreateTokenInput = {
      name: ctx.session.createToken.name,
      symbol: ctx.session.createToken.symbol,
      decimals: ctx.session.createToken.decimals,
      supply: ctx.session.createToken.supply,
      image: ctx.session.createToken.image,
      description: ctx.session.createToken.description,
      immutable: ctx.session.createToken.immutable,
      revokeMint: ctx.session.createToken.revokeMint,
      revokeFreeze: ctx.session.createToken.revokeFreeze,
      socialLinks: ctx.session.createToken.socials,
    };

    // debug(tokenInfo);

    const deployWallet = await getPrimaryWallet(ctx.chat!.id);
    if (!deployWallet) {
      await ctx.reply('🔴 Please select Primary Wallet!');
      return;
    }

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);

    const msg = await ctx.reply(
      'Token minting in progress. Please wait a moment...',
    );

    processMessageId = msg.message_id;

    const res = await serviceToken.mintToken(
      deployWallet.privateKey,
      tokenInfo,
      ctx.session.createToken.imagePath,
      botSettings?.solTxTip || 0.0001,
    );

    if (res.err) {
      throw res.err;
    } else {
      const message = `🟢 Token successfully created. Check <a href="https://explorer.solana.com/address/${res.address}">Token</a> and <a href="https://explorer.solana.com/tx/${res.tx}">Transaction</a>.`;
      if (processMessageId > 0) {
        await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
          parse_mode: 'HTML',
        });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }

      await serviceToken.saveToken(
        ctx.chat!.id,
        deployWallet.publicKey,
        tokenInfo,
        res.address,
        res.tx,
      );

      // initSessionData(ctx);
    }
  } catch (err: any) {
    console.log(err);
    const message = `🔴 Token minting failed. ${err || ''}`;
    if (processMessageId > 0) {
      await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message);
    }
  }
}

const initSessionData = (ctx: MainContext) => {
  ctx.session.createToken.name = '';
  ctx.session.createToken.symbol = '';
  ctx.session.createToken.decimals = 6;
  ctx.session.createToken.supply = 100_000_000;
  ctx.session.createToken.image = '';
  ctx.session.createToken.imagePath = '';
  ctx.session.createToken.description = '';
  ctx.session.createToken.immutable = false;
  ctx.session.createToken.revokeMint = false;
  ctx.session.createToken.revokeFreeze = false;
  ctx.session.createToken.socials.website = '';
  ctx.session.createToken.socials.telegram = '';
  ctx.session.createToken.socials.twitter = '';
};

const isInitialized = (ctx: MainContext) => {
  if (
    ctx.session.createToken.name !== '' ||
    ctx.session.createToken.symbol !== '' ||
    ctx.session.createToken.decimals !== 6 ||
    ctx.session.createToken.supply !== 100_000_000 ||
    ctx.session.createToken.image !== '' ||
    ctx.session.createToken.imagePath !== '' ||
    ctx.session.createToken.description !== '' ||
    ctx.session.createToken.immutable !== false ||
    ctx.session.createToken.revokeMint !== false ||
    ctx.session.createToken.revokeFreeze !== false ||
    ctx.session.createToken.socials.website !== '' ||
    ctx.session.createToken.socials.telegram !== '' ||
    ctx.session.createToken.socials.twitter !== ''
  ) {
    return false;
  }
  return true;
};
