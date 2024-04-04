import { Schema, model } from 'mongoose';

interface IOpenMarket {
  chartId: number;
  bundleId: string;
  baseLogSize: number;
  tickSize: number;
  timestamp: Date;
}

const openMarketSchema = new Schema<IOpenMarket>({
  chartId: { type: Number, required: true },
  bundleId: { type: String, required: true },
  baseLogSize: { type: Number, require: false },
  tickSize: { type: Number, require: false },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const OpenMarket = model<IOpenMarket>('OpenMarket', openMarketSchema);

export default OpenMarket;
