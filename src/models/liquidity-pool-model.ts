import { Schema, model } from 'mongoose';

interface IBuyerInfo {
  id: number;
  buyAmount: number;
  buyerAuthority: string;
}

export interface ILiquidityPool {
  chatId: number;
  poolId: string;
  baseToken: string;
  quoteToken: string;
  tokenLiquidity: number;
  amountOfPercentage: number;
  buyerInfos: Array<IBuyerInfo>;
  blockEngine: string;
  deployWallet: string;
  bundleId: string;
  timestamp: Date;
}

const liquidityPoolSchema = new Schema<ILiquidityPool>({
  chatId: { type: Number, required: true },
  poolId: { type: String, require: true },
  baseToken: { type: String, require: false },
  quoteToken: { type: String, require: false },
  tokenLiquidity: { type: Number, require: false },
  amountOfPercentage: { type: Number, require: false },
  buyerInfos: [{ id: Number, buyAmount: Number, buyerAuthority: String }],
  blockEngine: { type: String, require: false },
  deployWallet: { type: String, require: false },
  bundleId: { type: String, required: true },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const LiquidityPool = model<ILiquidityPool>(
  'LiquidityPool',
  liquidityPoolSchema,
);

export default LiquidityPool;
