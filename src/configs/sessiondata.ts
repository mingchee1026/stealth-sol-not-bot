import { Route as WalletsRoute } from '@root/composers/wallets';
import { Route as SettingsRoute } from '@root/composers/settings';
import { Route as CreateTokenRoute } from '@root/composers/create-token';
import { Route as CreateMarketRoute } from '@root/composers/create-market';
import { Route as CreatePoolRoute } from '@root/composers/create-pool';
import { Route as RemoveLiquidityRoute } from '@root/composers/remove_liquidity';
import { Route as BurnLiquidityRoute } from '@root/composers/burn-liquidity';

type Step =
  | 'IDLE'
  | WalletsRoute
  | SettingsRoute
  | CreateTokenRoute
  | CreateMarketRoute
  | CreatePoolRoute
  | RemoveLiquidityRoute
  | BurnLiquidityRoute;

export interface SessionData {
  step: Step;
  topMsgId: number;
  solPrice: number;
  priceUpdated: number;
  createToken: {
    msgId: number;
    name: string;
    symbol: string;
    supply: number;
    decimals: number;
    image: string;
    description: string;
    socials: {
      website: string;
      telegram: string;
      twitter: string;
      discord: string;
    };
    immutable: boolean;
    revokeMint: boolean;
    revokeFreeze: boolean;
  };
  createMarket: {
    msgId: number;
    baseMint: string;
    quoteMint: string;
    baseLogSize: number;
    tickSize: number;
    eventLength: number;
    requestLength: number;
    orderbookLength: number;
  };
  createPool: {
    msgId: number;
    marketId: string;
    baseToken: string;
    quoteToken: string;
    baseLogSize: number;
    tickSize: number;
    tokenLiquidity: number;
    amountOfPercentage: number;
    buyerInfos: { id: number; amount: number; privateKey: string }[];
    blockEngine: string;
  };
  removeLiquidity: {
    msgId: number;
    tokenAddress: string;
  };
  burnLiquidity: {
    msgId: number;
    tokenAddress: string;
    burnAmount: number;
  };
}

export function createInitialSessionData() {
  return {
    step: 'IDLE' as Step,
    topMsgId: 0,
    solPrice: 0,
    priceUpdated: 0,
    createToken: {
      msgId: 0,
      name: '',
      symbol: '',
      supply: 100_000_000,
      decimals: 6,
      image: '',
      description: '',
      socials: {
        website: '',
        telegram: '',
        twitter: '',
        discord: '',
      },
      immutable: false,
      revokeMint: false,
      revokeFreeze: false,
    },
    createMarket: {
      msgId: 0,
      baseMint: '',
      quoteMint: 'SOL',
      baseLogSize: 100,
      tickSize: 0.0000001,
      eventLength: 128,
      requestLength: 63,
      orderbookLength: 201,
    },
    createPool: {
      msgId: 0,
      marketId: '',
      baseToken: '',
      quoteToken: 'SOL',
      baseLogSize: 0,
      tickSize: 0,
      tokenLiquidity: 0.01,
      amountOfPercentage: 30,
      buyerInfos: [
        // {
        //   id: 0,
        //   amount: 0.001,
        //   privateKey:
        //     '2Dg2VAWQ2mZ1vZoYPnq8yiM5MD9eZq2hPwj5GDJy5GD8yQQAieSjd9RGrrDprdnjXsJGYNoeyY7EozssMr2yDvPt',
        // },
      ],
      blockEngine: 'Amsterdam',
    },
    removeLiquidity: {
      msgId: 0,
      tokenAddress: '',
    },
    burnLiquidity: {
      msgId: 0,
      tokenAddress: '',
      burnAmount: 100,
    },
  };
}
