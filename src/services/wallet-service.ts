import Wallet, { IWallet } from '@root/models/wallet-model';

export const getWalletsByUser = async (chatId: number): Promise<IWallet[]> => {
  try {
    const wallets = await Wallet.find({ chatId });
    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        return {
          chatId: wallet.chatId,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey,
          isPrimary: wallet.isPrimary,
          balance: 0.2,
        };
      }),
    );

    return walletsWithBalance;
  } catch (error) {
    return [];
  }
};
