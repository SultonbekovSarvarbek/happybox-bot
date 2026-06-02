import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  // Telegram bot token from @BotFather. The happybox_back backend uses the SAME
  // token to send OTP codes / push notifications.
  botToken: required('BOT_TOKEN'),
  // Base URL of the happybox_back API, e.g. https://happybox.uz (no trailing /api).
  backendUrl: required('BACKEND_URL').replace(/\/$/, ''),
  // Shared secret sent in the x-bot-secret header on internal /api/bot/* calls.
  botApiSecret: required('BOT_API_SECRET'),
};
