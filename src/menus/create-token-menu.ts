import { MenuTemplate } from 'grammy-inline-menu';
import fs from 'fs';

import { MainContext } from '@root/context';
import menuBack from './general';
import Token from '@root/models/token-model';
import { CreateTokenInput } from '@root/web3';
import { serviceToken } from '@root/services';
import { deployDataToIPFS } from '@root/web3/base/utils';
import { ENV } from '@root/configs';

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Please enter information to create a token:';
});

menu.interact('token-name', {
  text: (ctx) => {
    console.log(ctx.session.createToken);
    return `(${ctx.session.createToken.name || '...'})Name`;
  },
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-name';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-symbol', {
  text: (ctx) => {
    return `(${ctx.session.createToken.symbol || '...'})Symbol`;
  },
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-symbol';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('token-supply', {
  text: (ctx) => {
    return `(${ctx.session.createToken.supply || '...'})Supply`;
  },
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-supply';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('token-decimals', {
  text: (ctx) => {
    return `(${ctx.session.createToken.decimals})Decimals`;
  },
  async do(ctx) {
    ctx.session.step = 'msg-input-token-decimal';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('logo-url', {
  text: 'Image URL',
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
  joinLastRow: true,
});

menu.interact('links', {
  text: '--- LINKS ---',
  do: async (ctx) => {
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

menu.interact('token-telegram', {
  text: 'Telegram',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-token-telegram';
    await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
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

// menu.interact('token-discord', {
//   text: 'Discord',
//   do: async (ctx) => {
//     ctx.session.step = 'msg-input-token-discord';
//     await ctx.conversation.enter('create-token-convo');

//     return true;
//   },
//   joinLastRow: true,
// });

// menu.interact('deploy-wallet', {
//   text: 'Deploy Wallet (Private Key)',
//   do: async (ctx) => {
//     ctx.session.step = 'msg-input-token-deploy-wallet';
//     await ctx.conversation.enter('create-token-convo');

//     return true;
//   },
// });

let immutable = false;
menu.toggle('immutable', {
  text: 'Immutable',
  set(ctx, choice) {
    immutable = !immutable;
    ctx.session.createToken.immutable = immutable;
    ctx.session.createToken.name = immutable + '';
    return true;
  },
  isSet(ctx) {
    return immutable;
  },
});

let revokeMint = false;
menu.toggle('revoke-mint', {
  text: 'Revoke Mint',
  set(ctx, choice) {
    revokeMint = !revokeMint;
    ctx.session.createToken.revokeMint = revokeMint;
    return true;
  },
  isSet(ctx) {
    return revokeMint;
  },
  joinLastRow: true,
});

let revokeFreeze = false;
menu.toggle('revoke-freeze', {
  text: 'Revoke Freeze',
  set(ctx, choice) {
    revokeFreeze = !revokeFreeze;
    ctx.session.createToken.revokeFreeze = revokeFreeze;
    return true;
  },
  isSet(ctx) {
    return revokeFreeze;
  },
  joinLastRow: true,
});

menu.interact('create-token', {
  text: 'Mint Token',
  do: async (ctx) => {
    try {
      const bundleId = ctx.session.bundleId;
      const token = await Token.findOne({ bundleId });
      if (!token) {
        await ctx.reply('Please input token information.');
        return true;
      }
      /*
      // upload Token image
      const filePath = token.logo;
      // Read the file synchronously
      const logoFile = fs.readFileSync(filePath);

      // Convert Buffer to Blob
      const blobData = new Blob([logoFile]);

      // Create a form data object
      const formData = new FormData();
      formData.append('file', blobData);

      let logoUrl = '';
      const ipfsHash = await deployDataToIPFS(formData, 'File');
      if (ipfsHash) {
        logoUrl = `https://${ENV.PINATA_DOMAIN}/ipfs/${ipfsHash}`;
      }

      console.log('logoUrl:', logoUrl);
*/
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
          website: token.website || '',
          twitter: token.twitter || '',
          telegram: token.telegram || '',
          discord: token.discord || '',
        },
      };

      console.log(tokenInfo);

      const ret = await serviceToken.createToken(token.deployWallet, tokenInfo);
      console.log('ret:', ret);
      await ctx.reply(JSON.stringify(ret));
    } catch (error: any) {
      console.log('error:', error);
      await ctx.reply(error);
    }

    return true;
  },
});

menu.manualRow(menuBack);

export default menu;
