import { web3 } from '@coral-xyz/anchor';
import { MenuTemplate } from 'grammy-inline-menu';
import { v4 as uuidv4 } from 'uuid';

import { MainContext } from '@root/context';
import menuBack from './general';

import { BundlerInputData } from '@root/configs/types';
import { serviceLiquidityPool } from '@root/services';
import LiquidityPool from '@root/models/liquidity-pool-model';
import OpenMarket from '@root/models/open-market-model';

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Input informations to create liquidity pool:';
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

menu.interact('bundle', {
  text: 'Bundle',
  do: async (ctx) => {
    const bundleId = ctx.session.bundleId;
    const openMarket = await OpenMarket.findOne({ bundleId });

    if (
      !openMarket ||
      openMarket.baseLogSize === 0 ||
      openMarket.tickSize === 0
    ) {
      await ctx.reply('Please input market information.');
      return true;
    }

    const liquidityPool = await LiquidityPool.findOne({ bundleId });
    if (
      !liquidityPool ||
      liquidityPool.baseToken === '' ||
      liquidityPool.quoteToken === '' ||
      liquidityPool.tokenLiquidity === 0 ||
      liquidityPool.deployWallet === ''
    ) {
      await ctx.reply('Please input Pool information.');
      return true;
    }

    for (const buyer of liquidityPool.buyerInfos) {
      if (buyer.buyAmount === 0 || buyer.buyerAuthority === '') {
        await ctx.reply('Please input Pool information.');
        return true;
      }
    }

    const supply = 1000000; // from token creator

    try {
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
          baseliquidityAmount: supply,
          quoteliquidityAmount: liquidityPool.tokenLiquidity,
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
        },
      };
      const doBundle =
        await serviceLiquidityPool.launchLiquidityPool(inputData);

      await ctx.reply(JSON.stringify(doBundle));
    } catch (error: any) {
      await ctx.reply(error);
    }

    return true;
  },
});

menu.manualRow(menuBack);

export default menu;
