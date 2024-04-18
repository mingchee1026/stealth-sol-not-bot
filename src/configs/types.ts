export type CreateBundleTokenInput = {
  privateKey: string;
  name: string;
  symbol: string;
  image: string;
  decimals: number;
  description: string;
  supply: number;
  immutable?: boolean;
  revokeMint?: boolean;
  revokeFreeze?: boolean;
  socialLinks?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
};

export type MarketSettings = {
  quoteTokenAddress: string;
  baseLogSize: number;
  tickSize: number;
};

export type BuyerInfo = {
  id: number;
  amount: number;
  privateKey: string;
};

export type BundleSetup = {
  baseliquidityAmount: number;
  quoteliquidityAmount: number;
  deployWallet: string;
  buyers: BuyerInfo[];
  existedCount: number;
  buyerCount: number;
};

// export type BundlerInputData = {
//   createBundleTokenInput: CreateBundleTokenInput;
//   createTokenInfo: CreateToken;
//   marketSettings: MarketSettings;
//   bundleSetup: BundleSetup;
// };

export type BundlerInputData = {
  createTokenInfo: {
    address: string;
    supply: number;
  };
  marketSettings: {
    marketId: string;
    quoteTokenAddress: string;
    baseLogSize: number;
    tickSize: number;
  };
  bundleSetup: {
    baseliquidityAmount: number;
    quoteliquidityAmount: number;
    bundleTip: number;
    deployWallet: string;
    buyerCount: number;
    buyers: BuyerInfo[];
    blockEngin: string;
  };
};
