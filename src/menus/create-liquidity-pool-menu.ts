import { web3 } from '@coral-xyz/anchor';
import { MenuTemplate, createBackMainMenuButtons } from 'grammy-inline-menu';
import { v4 as uuidv4 } from 'uuid';

import { MainContext } from '@root/context';
import menuBack from './general';

import { BundlerInputData } from '@root/configs/types';
import { serviceLiquidityPool } from '@root/services';
import LiquidityPool from '@root/models/liquidity-pool-model';
import OpenMarket from '@root/models/open-market-model';

const bolckEngines: Record<string, string> = {
  Amsterdam: 'amsterdam.mainnet.block-engine.jito.wtf',
  Frankfurt: 'frankfurt.mainnet.block-engine.jito.wtf',
  'New York': 'ny.mainnet.block-engine.jito.wtf',
  Tokyo: 'tokyo.mainnet.block-engine.jito.wtf',
};

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Input information to create a Token Liquidity Pool:';
});

menu.interact('base-token', {
  text: 'Base Token',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-base-token';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('quote-token', {
  text: 'Quote Token',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-quote-token';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('quote-token-liquidity', {
  text: 'Quote Token Liquidity',
  async do(ctx) {
    ctx.session.step = 'msg-input-quote-token-liquidity';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('amount-percentage', {
  text: 'Amount Percentage',
  async do(ctx) {
    ctx.session.step = 'msg-input-amount-percentage';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('bundle-tip', {
  text: 'Bundle Tip',
  async do(ctx) {
    ctx.session.step = 'msg-input-bundle-tip';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('sol-txn-tip', {
  text: 'Solana Txn Tip',
  async do(ctx) {
    ctx.session.step = 'msg-input-sol-txn-tip';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('deploy-private-key', {
  text: 'Deploy Wallet (Private Key)',
  async do(ctx) {
    ctx.session.step = 'msg-input-deploy-private-key';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('buyer1-sol-amount', {
  text: 'Buyer 1 SOL Amount',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer1-sol-amount';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('buyer1-private-key', {
  text: 'Buyer 1 Private Key',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer1-private-key';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('buyer2-sol-amount', {
  text: 'Buyer 2 SOL Amount',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer2-sol-amount';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('buyer2-private-key', {
  text: 'Buyer 2 Private Key',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer2-private-key';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

menu.interact('buyer3-sol-amount', {
  text: 'Buyer 3 SOL Amount',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer3-sol-amount';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
});

menu.interact('buyer3-private-key', {
  text: 'Buyer 3 Private Key',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-buyer3-private-key';
    await ctx.conversation.enter('create-liquidity-pool-convo');

    return true;
  },
  joinLastRow: true,
});

let selectedKey = 'Amsterdam';
menu.select('select', {
  choices: ['Amsterdam', 'Frankfurt', 'New York', 'Tokyo'],
  async set(ctx, key) {
    selectedKey = key;
    await ctx.answerCallbackQuery({ text: `you selected ${key}` });
    ctx.session.blockEngine = key;
    return true;
  },
  isSet: (_, key) => key === selectedKey,
});

menu.interact('bundle', {
  text: 'Bundle',
  do: async (ctx) => {
    const initMsg = await ctx.reply('🟣 Intiated Deployment Transaction');

    try {
      const bundleId = ctx.session.bundleId;
      const openMarket = await OpenMarket.findOne({ bundleId });

      if (
        !openMarket ||
        openMarket.baseLogSize === 0 ||
        openMarket.tickSize === 0
      ) {
        // await ctx.reply('Please input market information.');
        // return true;
        throw 'Please input market information.';
      }

      const liquidityPool = await LiquidityPool.findOne({ bundleId });
      if (
        !liquidityPool ||
        liquidityPool.baseToken === '' ||
        liquidityPool.quoteToken === '' ||
        liquidityPool.tokenLiquidity === 0 ||
        liquidityPool.deployWallet === ''
      ) {
        // await ctx.reply('Please input Pool information.');
        // return true;
        throw 'Please input Pool information.';
      }

      for (const buyer of liquidityPool.buyerInfos) {
        if (buyer.buyAmount === 0 || buyer.buyerAuthority === '') {
          // await ctx.reply('Please input Pool information.');
          // return true;
          throw 'Please input Buyers information.';
        }
      }

      const supply = 1000000; // from token creator

      const inputData: BundlerInputData = {
        createTokenInfo: {
          address: liquidityPool.baseToken,
          supply: supply,
        },
        marketSettings: {
          quoteTokenAddress: liquidityPool.quoteToken,
          baseLogSize: openMarket.baseLogSize,
          tickSize: openMarket.tickSize,
        },
        bundleSetup: {
          baseliquidityAmount:
            supply * (liquidityPool.amountOfPercentage / 100),
          quoteliquidityAmount: liquidityPool.tokenLiquidity,
          bundleTip: liquidityPool.bundleTip,
          deployWallet: liquidityPool.deployWallet,
          buyerCount: 3,
          buyers: [
            {
              id: liquidityPool.buyerInfos[0].id,
              amount: liquidityPool.buyerInfos[0].buyAmount,
              privateKey: liquidityPool.buyerInfos[0].buyerAuthority,
            },
            {
              id: liquidityPool.buyerInfos[1].id,
              amount: liquidityPool.buyerInfos[1].buyAmount,
              privateKey: liquidityPool.buyerInfos[1].buyerAuthority,
            },
            {
              id: liquidityPool.buyerInfos[2].id,
              amount: liquidityPool.buyerInfos[2].buyAmount,
              privateKey: liquidityPool.buyerInfos[2].buyerAuthority,
            },
          ],
          blockEngin: bolckEngines[ctx.session.blockEngine],
        },
      };

      const doBundle =
        await serviceLiquidityPool.launchLiquidityPool(inputData);

      console.log(doBundle);

      ctx.api.deleteMessage(
        ctx.chat?.id || liquidityPool.chartId,
        initMsg.message_id,
      );

      await ctx.reply(
        `🟢 Success Transaction, check <a href='https://explorer.jito.wtf/bundle/${doBundle?.bundleRes?.bundleId}' target='_blank'>here</a>.`,
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error: any) {
      if (ctx.chat?.id) {
        ctx.api.deleteMessage(ctx.chat?.id, initMsg.message_id);
      }

      const errMsg = await ctx.reply(`🔴 Transaction Failed : ${error}`);

      await delay(5000);

      if (ctx.chat?.id) {
        ctx.api.deleteMessage(ctx.chat?.id, errMsg.message_id);
      }
    }

    return true;
  },
});

menu.manualRow(menuBack);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default menu;
