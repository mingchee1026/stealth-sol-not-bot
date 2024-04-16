import { Schema, model } from 'mongoose';

export interface ISetting {
  chatId: number;
  solTxTip: number;
  bundleTip: number;
  isAntiMev: boolean;
  timestamp?: Date;
}

const settingSchema = new Schema<ISetting>({
  chatId: {
    type: Number,
    required: true,
  },
  solTxTip: {
    type: Number,
    required: true,
  },
  bundleTip: {
    type: Number,
    required: true,
  },
  isAntiMev: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Setting = model<ISetting>('Setting', settingSchema);

export default Setting;
