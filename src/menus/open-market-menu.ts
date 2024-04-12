import { MenuTemplate, getMenuOfPath } from 'grammy-inline-menu';
import { MainContext } from '../context';
import menuBack from './general';

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Input information to create OpenMarket:';
});

// menu.interact('base-token', {
//   text: 'Base Token',
//   do: async (ctx) => {
//     return true;
//   },
// });

// menu.interact('quote-token', {
//   text: 'Quote Token',
//   do: async (ctx) => {
//     return true;
//   },
//   joinLastRow: true,
// });

menu.interact('base-lot-size', {
  text: 'Base Lot Size',
  async do(ctx) {
    ctx.session.step = 'msg-input-market-base-lot-size';
    await ctx.conversation.enter('set-open-market-convo');

    return true;
  },
});

menu.interact('tick-size', {
  text: 'Tick Size',
  do: async (ctx) => {
    ctx.session.step = 'msg-input-market-tick-size';
    await ctx.conversation.enter('set-open-market-convo');

    return true;
  },
  joinLastRow: true,
});

// menu.interact('create-market', {
//   text: 'Create Market',
//   do: async (ctx) => {
//     return true;
//   },
// });

menu.manualRow(menuBack);

export default menu;
