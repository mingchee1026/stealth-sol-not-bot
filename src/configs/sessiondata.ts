import { Route as WalletsRoute } from '@root/composers/wallets';

type Step = 'IDLE' | WalletsRoute;

export interface SessionData {
  step: Step;
  msgId: number;
  createToken: {
    name: string;
    symbol: string;
  };
}

export function createInitialSessionData() {
  return {
    step: 'IDLE' as Step,
    msgId: 0,
    createToken: {
      name: '',
      symbol: '',
    },
  };
}
