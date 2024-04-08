import { Schema, model } from 'mongoose';

interface IBuyerInfo {
  id: number;
  buyAmount: number;
  buyerAuthority: string;
}

interface ILiquidityPool {
  chartId: number;
  bundleId: string;
  deployWallet: string;
  baseToken: string;
  quoteToken: string;
  tokenLiquidity: number;
  amountOfPercentage: number;
  bundleTip: number;
  solTxnsTip: number;
  buyerInfos: Array<IBuyerInfo>;
  bolckEngine: string;
  timestamp: Date;
}

const liquidityPoolSchema = new Schema<ILiquidityPool>({
  chartId: { type: Number, required: true },
  bundleId: { type: String, required: true },
  deployWallet: { type: String, require: false },
  baseToken: { type: String, require: false },
  quoteToken: { type: String, require: false },
  tokenLiquidity: { type: Number, require: false },
  amountOfPercentage: { type: Number, require: false },
  bundleTip: { type: Number, require: false },
  solTxnsTip: { type: Number, require: false },
  buyerInfos: [{ id: Number, buyAmount: Number, buyerAuthority: String }],
  bolckEngine: { type: String, require: false },
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
