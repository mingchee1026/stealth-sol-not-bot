import { MenuTemplate } from 'grammy-inline-menu';

import { MainContext } from '../context';
import liquidityPoolMenu from './create-liquidity-pool-menu';
import createTokenMenu from './create-token-menu';
import openMarketMenu from './open-market-menu';

const mainMenu = new MenuTemplate<MainContext>((ctx) => {
  return ctx.t('main-greetings', {
    name: ctx.from!.first_name,
  });
});

mainMenu.submenu('token-creator', createTokenMenu, {
  text: 'Token Creator',
});

// mainMenu.submenu('token-multisender', createTokenMenu, {
//   text: 'Token Multisender',
// });

mainMenu.submenu('openmarket-creator', openMarketMenu, {
  text: 'OpenMarket Settings',
});

mainMenu.submenu('token-liquidity-pool', liquidityPoolMenu, {
  text: 'Token Liquidity & Swap',
});

export default mainMenu;
