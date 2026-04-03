import { Telegraf } from 'telegraf';
import { readDb, writeDb } from './db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || '').trim();

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN topilmadi');
}

if (!ADMIN_ID) {
  throw new Error('ADMIN_ID topilmadi');
}

const bot = new Telegraf(BOT_TOKEN);

// serverless holatda vaqtinchalik session
global.adminSessions = global.adminSessions || {};
const adminSessions = global.adminSessions;

function isAdmin(ctx) {
  return String(ctx.from?.id) === ADMIN_ID;
}

function resetAdminSession(adminId) {
  delete adminSessions[adminId];
}

function getMovieCaption(movie) {
  return `🎬 ${movie.title}

🌍 Til: ${movie.language}
🎭 Janr: ${movie.genre}
🆔 Kod: ${movie.code}`;
}

bot.start(async (ctx) => {
  try {
    if (isAdmin(ctx)) {
      return ctx.reply(
        `Admin panelga xush kelibsiz.

Buyruqlar:
/add - yangi kino qo‘shish
/list - kinolar ro‘yxati
/delete 100 - kod bo‘yicha o‘chirish
/cancel - jarayonni bekor qilish
/id - sizning ID

Userlar esa faqat kod yuborib kino oladi.`
      );
    }

    return ctx.reply(
      `Assalomu alaykum! O'tkazgan vaqtingizga rozi bo'lsangiz. Kino korish uchun kodni yuboring.!
@komilovs_movie kino kodlari shu kanalda mavjud`
    );
  } catch (error) {
    console.error('/start xatolik:', error);
  }
});

bot.help(async (ctx) => {
  try {
    if (isAdmin(ctx)) {
      return ctx.reply(
        `Admin buyruqlari:

/add - yangi kino qo‘shish
/list - kinolar ro‘yxati
/delete 100 - kod bo‘yicha o‘chirish
/cancel - jarayonni bekor qilish
/id - sizning ID`
      );
    }

    return ctx.reply('Kino kodini yuboring. Masalan: 100');
  } catch (error) {
    console.error('/help xatolik:', error);
  }
});

bot.command('id', async (ctx) => {
  try {
    await ctx.reply(`🆔 Sizning Telegram ID: ${ctx.from.id}`);
  } catch (error) {
    console.error('/id xatolik:', error);
  }
});

bot.command('cancel', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('Bu buyruq faqat admin uchun.');
    }

    resetAdminSession(String(ctx.from.id));
    return ctx.reply('❌ Jarayon bekor qilindi.');
  } catch (error) {
    console.error('/cancel xatolik:', error);
  }
});

bot.command('add', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('Bu buyruq faqat admin uchun.');
    }

    const adminId = String(ctx.from.id);

    adminSessions[adminId] = {
      step: 'title',
      data: {
        title: '',
        language: '',
        genre: '',
        code: '',
      },
    };

    return ctx.reply('1/5 🎬 Kino nomini kiriting:');
  } catch (error) {
    console.error('/add xatolik:', error);
  }
});

bot.command('list', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('Bu buyruq faqat admin uchun.');
    }

    const db = await readDb();
    const items = Object.values(db);

    if (!items.length) {
      return ctx.reply('📂 Hozircha kino yo‘q.');
    }

    const text = items
      .map((item, index) => {
        return `${index + 1}) ${item.code} - ${item.title} | ${item.language} | ${item.genre}`;
      })
      .join('\n');

    return ctx.reply(`📃 Kinolar ro‘yxati:\n\n${text}`);
  } catch (error) {
    console.error('/list xatolik:', error);
  }
});

bot.command('delete', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('Bu buyruq faqat admin uchun.');
    }

    const parts = ctx.message.text.split(' ');
    const code = parts[1]?.trim();

    if (!code) {
      return ctx.reply('⚠️ Misol: /delete 100');
    }

    const db = await readDb();

    if (!db[code]) {
      return ctx.reply('❌ Bunday kod topilmadi.');
    }

    const deletedTitle = db[code].title;
    delete db[code];
    await writeDb(db);

    return ctx.reply(`🗑 O‘chirildi: ${code} - ${deletedTitle}`);
  } catch (error) {
    console.error('/delete xatolik:', error);
  }
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) return;

    if (isAdmin(ctx)) {
      const adminId = String(ctx.from.id);
      const session = adminSessions[adminId];

      if (session) {
        if (session.step === 'title') {
          session.data.title = text;
          session.step = 'language';
          return ctx.reply('2/5 🌍 Kino tilini kiriting:');
        }

        if (session.step === 'language') {
          session.data.language = text;
          session.step = 'genre';
          return ctx.reply('3/5 🎭 Kino janrini kiriting:');
        }

        if (session.step === 'genre') {
          session.data.genre = text;
          session.step = 'code';
          return ctx.reply('4/5 🆔 Kino kodini kiriting:');
        }

        if (session.step === 'code') {
          const db = await readDb();

          if (db[text]) {
            return ctx.reply('⚠️ Bu kod band. Boshqa kod kiriting:');
          }

          session.data.code = text;
          session.step = 'video';
          return ctx.reply('5/5 📹 Endi videoni yuboring:');
        }

        if (session.step === 'video') {
          return ctx.reply('⚠️ Endi text emas, videoni yuboring.');
        }
      }
    }

    const db = await readDb();
    const movie = db[text];

    if (!movie) {
      return ctx.reply('❌ Bunday kod topilmadi.');
    }

    if (movie.send_type === 'document') {
      return ctx.replyWithDocument(movie.file_id, {
        caption: getMovieCaption(movie),
      });
    }

    return ctx.replyWithVideo(movie.file_id, {
      caption: getMovieCaption(movie),
    });
  } catch (error) {
    console.error('text handler xatolik:', error);
    return ctx.reply('⚠️ Xatolik yuz berdi.');
  }
});

bot.on('video', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Faqat admin video qo‘sha oladi.');
    }

    const adminId = String(ctx.from.id);
    const session = adminSessions[adminId];

    if (!session) {
      return ctx.reply('⚠️ Avval /add bosing.');
    }

    if (session.step !== 'video') {
      return ctx.reply('⚠️ Hali video yuborish navbati kelmadi.');
    }

    const db = await readDb();

    db[session.data.code] = {
      title: session.data.title,
      language: session.data.language,
      genre: session.data.genre,
      code: session.data.code,
      file_id: ctx.message.video.file_id,
      created_at: new Date().toISOString(),
      send_type: 'video',
    };

    await writeDb(db);

    const savedMovie = db[session.data.code];
    resetAdminSession(adminId);

    return ctx.reply(
      `✅ Kino saqlandi

${getMovieCaption(savedMovie)}`
    );
  } catch (error) {
    console.error('video handler xatolik:', error);
    return ctx.reply('⚠️ Videoni saqlashda xatolik bo‘ldi.');
  }
});

bot.on('document', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return;
    }

    const adminId = String(ctx.from.id);
    const session = adminSessions[adminId];

    if (!session || session.step !== 'video') {
      return;
    }

    const doc = ctx.message.document;
    const isVideoFile =
      doc?.mime_type?.startsWith('video/') ||
      /\.(mp4|mkv|mov|avi|webm)$/i.test(doc?.file_name || '');

    if (!isVideoFile) {
      return ctx.reply('⚠️ Bu video fayl emas. Iltimos video yuboring.');
    }

    const db = await readDb();

    db[session.data.code] = {
      title: session.data.title,
      language: session.data.language,
      genre: session.data.genre,
      code: session.data.code,
      file_id: doc.file_id,
      created_at: new Date().toISOString(),
      send_type: 'document',
    };

    await writeDb(db);

    const savedMovie = db[session.data.code];
    resetAdminSession(adminId);

    return ctx.reply(
      `✅ Kino saqlandi

${getMovieCaption(savedMovie)}`
    );
  } catch (error) {
    console.error('document handler xatolik:', error);
    return ctx.reply('⚠️ Faylni saqlashda xatolik bo‘ldi.');
  }
});

bot.catch((err, ctx) => {
  console.error(`Bot error (${ctx.updateType}):`, err);
});

export default bot;
