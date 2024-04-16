import { Route as WalletsRoute } from '@root/composers/wallets';
import { Route as SettingsRoute } from '@root/composers/settings';
import { Route as CreateTokenRoute } from '@root/composers/create-token';
import { Route as CreateMarketRoute } from '@root/composers/create-market';

type Step =
  | 'IDLE'
  | WalletsRoute
  | SettingsRoute
  | CreateTokenRoute
  | CreateMarketRoute;

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
      baseMint: '',
      quoteMint: 'SOL',
      baseLogSize: 0,
      tickSize: 0,
      eventLength: 0,
      requestLength: 0,
      orderbookLength: 0,
    },
  };
}
