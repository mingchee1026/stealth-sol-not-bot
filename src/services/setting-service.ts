import Setting, { ISetting } from '@root/models/setting-model';

export const createSettings = async (chatId: number) => {
  const settings = new Setting({
    chatId,
    solTxTip: 0,
    bundleTip: 0,
    isAntiMev: false,
  });

  return await settings.save();
};

export const getSettings = async (chatId: number) => {
  const settings = await Setting.findOne({ chatId });
  if (!settings) {
    await createSettings(chatId);
  }
  return await Setting.findOne({ chatId });
};

export const saveSolTxTip = async (chatId: number, solTip: number) => {
  try {
    let settings = await Setting.findOne({ chatId });
    if (settings) {
      settings.solTxTip = solTip;
      await settings?.save();
    }

    return true;
  } catch (err) {
    return false;
  }
};

export const saveBundleTip = async (chatId: number, bundleTip: number) => {
  try {
    let settings = await Setting.findOne({ chatId });
    if (settings) {
      settings.bundleTip = bundleTip;
      await settings?.save();
    }

    return true;
  } catch (err) {
    return false;
  }
};

export const saveAntiMev = async (chatId: number) => {
  try {
    let settings = await Setting.findOne({ chatId });
    if (settings) {
      settings.isAntiMev = !settings.isAntiMev;
      await settings?.save();
    }

    return true;
  } catch (err) {
    return false;
  }
};
