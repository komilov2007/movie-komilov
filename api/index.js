export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    app: 'telegram-video-code-bot-vercel',
  });
}
