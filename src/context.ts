import type { Context, SessionFlavor } from 'grammy';
import { FileFlavor } from '@grammyjs/files';
import { I18nFlavor } from '@grammyjs/i18n';
// import { CutiResponse, Employee, Pengaturan } from './services/models';
import { ConversationFlavor } from '@grammyjs/conversations';
import { v4 as uuidv4 } from 'uuid';

export type SessionData = {
  step: string;
  bundleId: string;
  dbField: string;
  blockEngine: string;
  runningBundle: boolean;
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
  launchBundleInput: {
    marketSettings: {
      baseMint: string;
      quoteMint: string;
      lotSize: number;
      tickSize: number;
    };
    bundleSetup: {
      baseAmount: number;
      quoteAmount: number;
      deployWallet: string;
      buyers: { buyAmount: number; buyerAuthority: string }[];
    };
  };
};

export function initialData(): SessionData {
  console.log(uuidv4());
  return {
    step: '',
    bundleId: '',
    dbField: '',
    blockEngine: 'Amsterdam',
    runningBundle: false,
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
    launchBundleInput: {
      marketSettings: {
        baseMint: '',
        quoteMint: '',
        lotSize: 10,
        tickSize: 10,
      },
      bundleSetup: {
        baseAmount: 10,
        quoteAmount: 10,
        deployWallet: '',
        buyers: [
          {
            buyAmount: 10,
            buyerAuthority: '',
          },
        ],
      },
    },
  };
}

export type MainContext = Context &
  SessionFlavor<SessionData> &
  I18nFlavor &
  ConversationFlavor &
  FileFlavor<Context>;
