import { bot } from './bot.js';

async function main() {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Создать ссылку HappyBox' },
    { command: 'link', description: 'Показать мою ссылку' },
    { command: 'app', description: 'Скачать приложение HappyBox' },
  ]);
  console.log('HappyBox bot started (long polling)...');
  await bot.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
