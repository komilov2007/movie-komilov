import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { Telegraf } from 'telegraf';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || '').trim();
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN topilmadi');
  process.exit(1);
}

if (!ADMIN_ID) {
  console.error('ADMIN_ID topilmadi');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'movies.json');

const adminSessions = {};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDb();

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('DB oqishda xatolik:', error);
    return {};
  }
}

function writeDb(data) {
  ensureDb();

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('DB yozishda xatolik:', error);
  }
}

function isAdmin(ctx) {
  return String(ctx.from?.id) === ADMIN_ID;
}

function getMovieCaption(movie) {
  return `🎬 ${movie.title}

🌍 Til: ${movie.language}
🎭 Janr: ${movie.genre}
🆔 Kod: ${movie.code}`;
}

function parseMovieText(text) {
  const lines = text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const data = {
    title: '',
    language: '',
    genre: '',
    code: '',
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith('nomi:')) {
      data.title = line.slice(5).trim();
    } else if (lower.startsWith('til:')) {
      data.language = line.slice(4).trim();
    } else if (lower.startsWith('janr:')) {
      data.genre = line.slice(5).trim();
    } else if (lower.startsWith('kod:')) {
      data.code = line.slice(4).trim();
    }
  }

  if (!data.title || !data.language || !data.genre || !data.code) {
    return null;
  }

  return data;
}

app.get('/', (req, res) => {
  res.send('Bot ishlayapti');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT} portda ishlayapti`);
});

bot.start(async (ctx) => {
  try {
    if (isAdmin(ctx)) {
      return ctx.reply(
        `Admin panelga xush kelibsiz.

Kino qo'shish:
1) quyidagicha text yuboring

Nomi: Fast X
Til: Uzbek
Janr: Jangari
Kod: 101

2) keyin videoni yuboring

Buyruqlar:
/list - ro'yxat
/delete 101 - o'chirish
/id - sizning ID`
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
        `Format:

Nomi: Fast X
Til: Uzbek
Janr: Jangari
Kod: 101

Keyin videoni yuborasiz.`
      );
    }

    return ctx.reply('Kino kodini yuboring. Masalan: 101');
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

bot.command('list', async (ctx) => {
  try {
    if (!isAdmin(ctx)) {
      return ctx.reply('Bu buyruq faqat admin uchun.');
    }

    const db = readDb();
    const items = Object.values(db);

    if (!items.length) {
      return ctx.reply('📂 Hozircha kino yo‘q.');
    }

    const text = items
      .map(
        (item, index) =>
          `${index + 1}) ${item.code} - ${item.title} | ${item.language} | ${item.genre}`
      )
      .join('\n');

    return ctx.reply(`📃 Kinolar ro'yxati:\n\n${text}`);
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
      return ctx.reply('⚠️ Misol: /delete 101');
    }

    const db = readDb();

    if (!db[code]) {
      return ctx.reply('❌ Bunday kod topilmadi.');
    }

    delete db[code];
    writeDb(db);

    return ctx.reply(`🗑 O‘chirildi: ${code}`);
  } catch (error) {
    console.error('/delete xatolik:', error);
  }
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) return;

    if (isAdmin(ctx)) {
      const parsed = parseMovieText(text);

      if (parsed) {
        const db = readDb();

        if (db[parsed.code]) {
          return ctx.reply('⚠️ Bu kod band. Boshqa kod yozing.');
        }

        adminSessions[ctx.from.id] = parsed;

        return ctx.reply(
          `✅ Ma'lumot olindi:

${getMovieCaption(parsed)}

Endi videoni yuboring.`
        );
      }
    }

    const db = readDb();
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
    if (!isAdmin(ctx)) return;

    const tempMovie = adminSessions[ctx.from.id];

    if (!tempMovie?.code) {
      return ctx.reply("⚠️ Avval kino ma'lumotini yuboring.");
    }

    const db = readDb();

    db[tempMovie.code] = {
      ...tempMovie,
      file_id: ctx.message.video.file_id,
      send_type: 'video',
      created_at: new Date().toISOString(),
    };

    writeDb(db);
    delete adminSessions[ctx.from.id];

    return ctx.reply(`✅ Kino saqlandi

${getMovieCaption(db[tempMovie.code])}`);
  } catch (error) {
    console.error('video handler xatolik:', error);
    return ctx.reply('⚠️ Videoni saqlashda xatolik bo‘ldi.');
  }
});

bot.on('document', async (ctx) => {
  try {
    if (!isAdmin(ctx)) return;

    const tempMovie = adminSessions[ctx.from.id];

    if (!tempMovie?.code) {
      return ctx.reply("⚠️ Avval kino ma'lumotini yuboring.");
    }

    const doc = ctx.message.document;
    const isVideoFile =
      doc?.mime_type?.startsWith('video/') ||
      /\.(mp4|mkv|mov|avi|webm)$/i.test(doc?.file_name || '');

    if (!isVideoFile) {
      return ctx.reply('⚠️ Bu video fayl emas.');
    }

    const db = readDb();

    db[tempMovie.code] = {
      ...tempMovie,
      file_id: doc.file_id,
      send_type: 'document',
      created_at: new Date().toISOString(),
    };

    writeDb(db);
    delete adminSessions[ctx.from.id];

    return ctx.reply(`✅ Kino saqlandi

${getMovieCaption(db[tempMovie.code])}`);
  } catch (error) {
    console.error('document handler xatolik:', error);
    return ctx.reply('⚠️ Faylni saqlashda xatolik bo‘ldi.');
  }
});

bot.catch((err, ctx) => {
  console.error(`Bot error (${ctx.updateType}):`, err);
});

bot
  .launch()
  .then(() => console.log('✅ Bot ishga tushdi'))
  .catch((error) => console.error('Bot launch xatolik:', error));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
