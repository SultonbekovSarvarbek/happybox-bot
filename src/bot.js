import { Bot, Keyboard, InlineKeyboard, session } from 'grammy';
import { config } from './config.js';
import { registerUser, getUserByTelegram } from './backend.js';

export const bot = new Bot(config.botToken);

// Simple in-memory session: enough for the short registration wizard.
bot.use(session({ initial: () => ({ phone: null }) }));

/** Normalize a shared phone to +998XXXXXXXXX, or return null if it isn't a UZ number. */
function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  return null;
}

const contactKeyboard = new Keyboard()
  .requestContact('📱 Поделиться номером')
  .resized()
  .oneTime();

const genderKeyboard = new InlineKeyboard()
  .text('👨 Мужской', 'gender:MALE')
  .text('👩 Женский', 'gender:FEMALE')

// id-form of the App Store link (no Cyrillic in the URL — safer for Telegram).
const APP_STORE_URL = 'https://apps.apple.com/uz/app/id6758584836'
const INSTAGRAM_URL = 'https://www.instagram.com/happybox.sovga/'
const appStoreKeyboard = new InlineKeyboard()
  .url('📲 Скачать приложение HappyBox', APP_STORE_URL)
  .row()
  .url('📷 Мы в Instagram', INSTAGRAM_URL);

bot.command('start', async (ctx) => {
  ctx.session.phone = null;
  await ctx.reply(
    `Привет, ${ctx.from?.first_name ?? 'друг'}! 👋\n\n` +
      'Я помогу создать твою ссылку HappyBox — её можно вставить в Telegram-био, ' +
      'и друзья смогут дарить тебе подарочные сертификаты.\n\n' +
      'Для начала поделись своим номером телефона 👇',
    { reply_markup: contactKeyboard },
  );
});

bot.command('link', async (ctx) => {
  try {
    const user = await getUserByTelegram(String(ctx.from.id));
    if (!user.found) {
      await ctx.reply('Ты ещё не зарегистрирован. Нажми /start, чтобы создать ссылку.');
      return;
    }
    await ctx.reply(`Твоя ссылка:\n${user.link}\n\nВставь её в Telegram-био.`, {
      reply_markup: appStoreKeyboard,
    });
  } catch (err) {
    await ctx.reply('Не получилось получить ссылку. Попробуй позже.');
    console.error('link error:', err.message);
  }
});

bot.command('app', async (ctx) => {
  await ctx.reply('Приложение HappyBox — все твои сертификаты в одном месте 👇', {
    reply_markup: appStoreKeyboard,
  });
});

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact;
  // Guard: the shared contact must be the user's own number.
  if (contact.user_id && contact.user_id !== ctx.from.id) {
    await ctx.reply('Пожалуйста, поделись своим собственным номером.', {
      reply_markup: contactKeyboard,
    });
    return;
  }

  const phone = normalizePhone(contact.phone_number);
  if (!phone) {
    await ctx.reply(
      'Не удалось распознать номер. Нужен узбекский номер (+998...). Попробуй ещё раз.',
      { reply_markup: contactKeyboard },
    );
    return;
  }

  ctx.session.phone = phone;
  await ctx.reply('Отлично! Теперь укажи свой пол:', {
    reply_markup: genderKeyboard,
  });
});

bot.callbackQuery(/^gender:(MALE|FEMALE)$/, async (ctx) => {
  const gender = ctx.match[1];
  await ctx.answerCallbackQuery();

  const phone = ctx.session.phone;
  if (!phone) {
    await ctx.reply('Сессия истекла. Нажми /start, чтобы начать заново.');
    return;
  }

  // Grab the largest size of the user's current Telegram profile photo, if any.
  let photoFileId
  try {
    const photos = await ctx.api.getUserProfilePhotos(ctx.from.id, { limit: 1 })
    const sizes = photos.photos?.[0]
    if (sizes?.length) photoFileId = sizes[sizes.length - 1].file_id
  } catch {
    // user has no photo or it's hidden by privacy settings — ignore
  }

  try {
    const result = await registerUser({
      telegramId: String(ctx.from.id),
      phone,
      firstName: ctx.from.first_name ?? 'User',
      lastName: ctx.from.last_name ?? undefined,
      gender,
      telegramUsername: ctx.from.username ?? undefined,
      photoFileId,
    });

    ctx.session.phone = null;
    await ctx.editMessageText('Готово! 🎉');
    await ctx.reply(
      `Твоя персональная ссылка готова 👇\n\n` +
        `${result.link}\n\n` +
        `Вставь её в Telegram-био. Любой, кто откроет ссылку, сможет подарить тебе ` +
        `сертификат — и он появится здесь, в боте.\n\n` +
        `Скачай приложение HappyBox, чтобы видеть свои сертификаты 👇`,
      { reply_markup: appStoreKeyboard },
    );
  } catch (err) {
    console.error('register error:', err.message);
    await ctx.reply('Что-то пошло не так при регистрации. Попробуй позже.');
  }
});

bot.catch((err) => {
  console.error('Bot error:', err.error?.message ?? err.message ?? err);
});
