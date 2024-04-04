import { MenuTemplate } from 'grammy-inline-menu';
import { MainContext } from '../context';
import menuBack from './general';
import Token from '@root/models/token-model';
import { CreateTokenInput } from '@root/web3';
import { serviceToken } from '@root/services';

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Input informations to create Token:';
});

menu.interact('token-name', {
  text: 'Token Name',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-name';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-symbol', {
  text: 'Token Symbol',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-symbol';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('token-decimals', {
  text: 'Decimals',
  async do(ctx) {
    ctx.session.step = 'msg-input-token-decimal';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-supply', {
  text: 'Token Supply',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-supply';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('logo-url', {
  text: 'Logo URL',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-logo';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('description', {
  text: 'Description',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-description';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-website', {
  text: 'Website',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-website';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-twitter', {
  text: 'Twitter',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-twitter';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('token-telegram', {
  text: 'Telegram',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-telegram';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-discord', {
  text: 'Discord',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-discord';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('deploy-wallet', {
  text: 'Deploy Wallet (Private Key)',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-deploy-wallet';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('create-token', {
  text: 'Create Token',
  do: async (ctx) => {
    try {
      const bundleId = ctx.session.bundleId;
      const token = await Token.findOne({ bundleId });
      if (!token) {
        await ctx.reply('Please input token information.');
        return true;
      }

      const tokenInfo: CreateTokenInput = {
        name: token.name,
        symbol: token.symbol,
        image: token.logo,
        decimals: token.decimal,
        description: token.description,
        supply: token.supply,
        immutable: false,
        revokeMint: false,
        revokeFreeze: false,
        socialLinks: {
          website: token.website,
          twitter: token.twitter,
          telegram: token.telegram,
          discord: token.discord,
        },
      };

      const ret = await serviceToken.createToken(token.deployWallet, tokenInfo);
      await ctx.reply(JSON.stringify(ret));
    } catch (error: any) {
      await ctx.reply(error.message);
    }

    return true;
  },
});

menu.manualRow(menuBack);

export default menu;
