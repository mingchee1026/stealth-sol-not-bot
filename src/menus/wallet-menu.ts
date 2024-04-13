import { MenuTemplate, deleteMenuFromContext } from 'grammy-inline-menu';
const { Keypair } = require('@solana/web3.js');

import { MainContext } from '@root/context';
import menuBack from './general';
import { getWalletsByUser } from '@root/services/wallet-service';
import Wallet, { IWallet } from '@root/models/wallet-model';

let wallets1: IWallet[] = [];

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  let wallets: IWallet[] = [];
  if (ctx.chat) {
    wallets = await getWalletsByUser(ctx.chat?.id);
  }

  ctx.session.wallets = wallets;
  wallets1 = wallets;
  console.log('wallet1:', wallets1.length);

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  const totalSol = wallets.reduce(
    (total, wallet) => total + (wallet.balance || 0),
    0,
  );

  for (const wallet of wallets) {
    console.log('wallet.publicKey:', wallet.publicKey);
    menu.toggle(`wallet-${wallet.publicKey}`, {
      text: ` ${wallet.publicKey} `,
      set(ctx, choice) {
        // Perform any necessary actions when the toggle is set
        // For example, update session data
        // ctx.session.createToken.immutable = !ctx.session.createToken.immutable;
        // ctx.session.createToken.name = ctx.session.createToken.immutable.toString();
        return true; // Return true to indicate the toggle is set
      },
      isSet(ctx) {
        // Define the condition to determine if the toggle is set
        // For example, return true if the toggle should be set based on certain criteria
        return false;
      },
    });
  }

  const text = ctx.t('wallet-menu-title', {
    countOfWallet: wallets.length,
    sol: 0.02,
    primaryWallet: primaryWallet?.publicKey || '',
    totalSol: totalSol,
  });

  return { text, parse_mode: 'HTML' };
});

for (const wallet of wallets1) {
  console.log('wallet.publicKey:', wallet.publicKey);
  menu.toggle(`wallet-${wallet.publicKey}`, {
    text: ` ${wallet.publicKey} `,
    set(ctx, choice) {
      // Perform any necessary actions when the toggle is set
      // For example, update session data
      // ctx.session.createToken.immutable = !ctx.session.createToken.immutable;
      // ctx.session.createToken.name = ctx.session.createToken.immutable.toString();
      return true; // Return true to indicate the toggle is set
    },
    isSet(ctx) {
      // Define the condition to determine if the toggle is set
      // For example, return true if the toggle should be set based on certain criteria
      return false;
    },
  });
}

menu.interact('import-wallet', {
  text: '➕ Import Wallet',
  do: async (ctx) => {
    await ctx.answerCallbackQuery('go to parent menu after doing some logic');

    return true;
  },
});

menu.interact('connect-wallet', {
  text: '➕ Connect Wallet',
  do: async (ctx) => {
    // Generate a new wallet
    const walletKeyPair = Keypair.generate();
    const privateKey = walletKeyPair.secretKey; //.toString();
    const publicKey = walletKeyPair.publicKey.toBase58();

    // Save user wallet info to the database
    const wallet = new Wallet({
      chatId: ctx.chat?.id,
      privateKey,
      publicKey,
      isPrimary: false,
    });

    wallet
      .save()
      .then(() => console.log('User wallet info saved to the database'))
      .catch((error) =>
        console.error('Error saving user wallet info to the database:', error),
      );

    await ctx.reply(`🔐Your Private Key: ${privateKey}`);
    await ctx.reply(`🔑Your Public Key: ${publicKey}`);

    return '.';
  },
  joinLastRow: true,
});

menu.interact('create-3-wallet', {
  text: '➕ Create 3 New Wallet',
  do: async (ctx) => {
    // ctx.session.step = 'msg-input-token-name';
    // await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('create-5-wallet', {
  text: '➕ Create 5 New Wallet',
  do: async (ctx) => {
    // ctx.session.step = 'msg-input-token-name';
    // await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('transfer-all-sol-to-primary-wallet', {
  text: 'Transfer All Sol To Primary Wallet',
  do: async (ctx) => {
    // ctx.session.step = 'msg-input-token-name';
    // await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('reload-list', {
  text: 'Reload List',
  do: async (ctx) => {
    // ctx.session.step = 'msg-input-token-name';
    // await ctx.conversation.enter('create-token-convo');

    return true;
  },
});

menu.interact('delete-all', {
  text: 'Delete All',
  do: async (ctx) => {
    // ctx.session.step = 'msg-input-token-name';
    // await ctx.conversation.enter('create-token-convo');

    return true;
  },
  joinLastRow: true,
});
/*
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
*/

menu.manualRow(menuBack);

export default menu;
