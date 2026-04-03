import bot from '../lib/bot.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram webhook endpoint');
  }

  try {
    await bot.handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook xatolik:', error);
    return res.status(500).json({
      ok: false,
      error: 'Webhook error',
    });
  }
}
