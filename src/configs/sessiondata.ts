import { Route as WalletsRoute } from '@root/composers/wallets';
import { Route as SettingsRoute } from '@root/composers/settings';
import { Route as CreateTokenRoute } from '@root/composers/create-token';
import { Route as CreateMarketRoute } from '@root/composers/create-market';
import { Route as CreatePoolRoute } from '@root/composers/create-pool';

type Step =
  | 'IDLE'
  | WalletsRoute
  | SettingsRoute
  | CreateTokenRoute
  | CreateMarketRoute
  | CreatePoolRoute;

export interface SessionData {
  step: Step;
  topMsgId: number;
  createToken: {
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
    baseMint: string;
    quoteMint: string;
    baseLogSize: number;
    tickSize: number;
    eventLength: number;
    requestLength: number;
    orderbookLength: number;
  };
  createPool: {
    marketId: string;
    baseToken: string;
    quoteToken: string;
    baseLogSize: number;
    tickSize: number;
    tokenLiquidity: number;
    amountOfPercentage: number;
    buyerInfos: { id: number; buyAmount: number; buyerAuthority: string }[];
    blockEngine: string;
  };
}

export function createInitialSessionData() {
  return {
    step: 'IDLE' as Step,
    topMsgId: 0,
    createToken: {
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
      baseMint: 'CgAC6A5a7H7A9chf33EyQdcdnUakLeUjCeTagGyWbYfq',
      quoteMint: 'SOL',
      baseLogSize: 1,
      tickSize: 1,
      eventLength: 128,
      requestLength: 63,
      orderbookLength: 201,
    },
    createPool: {
      marketId: '35J5uLAqKbbyjrqmz88xMotWx2bEh8FWe6uNkBymsg4h',
      baseToken: '',
      quoteToken: 'SOL',
      baseLogSize: 0,
      tickSize: 0,
      tokenLiquidity: 0,
      amountOfPercentage: 0,
      buyerInfos: [
        { id: 0, buyAmount: 0, buyerAuthority: '' },
        { id: 1, buyAmount: 0, buyerAuthority: '' },
        { id: 2, buyAmount: 0, buyerAuthority: '' },
      ],
      blockEngine: 'Amsterdam',
    },
  };
}
