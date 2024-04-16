import { Schema, model } from 'mongoose';

interface IOpenMarket {
  chartId: number;
  baseMint: string;
  quoteMint: string;
  baseLogSize: number;
  tickSize: number;
  eventLength: number;
  requestLength: number;
  orderbookLength: number;
  marketId: string;
  timestamp: Date;
}

const openMarketSchema = new Schema<IOpenMarket>({
  chartId: { type: Number, required: true },
  baseMint: { type: String, required: true },
  quoteMint: { type: String, required: true },
  baseLogSize: { type: Number, require: true },
  tickSize: { type: Number, require: false },
  eventLength: { type: Number, require: false },
  requestLength: { type: Number, require: false },
  orderbookLength: { type: Number, require: false },
  marketId: { type: String, required: false },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const OpenMarket = model<IOpenMarket>('OpenMarket', openMarketSchema);

export default OpenMarket;
