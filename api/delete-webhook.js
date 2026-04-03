const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export default async function handler(req, res) {
  try {
    const key = req.query.key;

    if (!WEBHOOK_SECRET || key !== WEBHOOK_SECRET) {
      return res.status(401).json({
        ok: false,
        message: 'Unauthorized',
      });
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
      {
        method: 'POST',
      }
    );

    const data = await tgRes.json();

    return res.status(200).json({
      ok: true,
      telegram: data,
    });
  } catch (error) {
    console.error('delete-webhook xatolik:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
