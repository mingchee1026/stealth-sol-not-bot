import { createBackMainMenuButtons } from 'grammy-inline-menu';
import { MainContext } from '../context';

export default createBackMainMenuButtons<MainContext>(
  (ctx) => '🔙 Kembali',
  (ctx) => '🔝 Main Menu',
);
