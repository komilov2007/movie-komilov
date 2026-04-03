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

    const host = req.headers.host;
    const protocol =
      req.headers['x-forwarded-proto'] ||
      (host?.includes('localhost') ? 'http' : 'https');

    const webhookUrl = `${protocol}://${host}/api/telegram`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
          drop_pending_updates: true,
        }),
      }
    );

    const data = await tgRes.json();

    return res.status(200).json({
      ok: true,
      webhookUrl,
      telegram: data,
    });
  } catch (error) {
    console.error('set-webhook xatolik:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
