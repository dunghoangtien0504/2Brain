export default async function handler(req, res) {
  return res.status(200).json({
    smtp_pass_exists: !!process.env.SMTP_PASS,
    smtp_pass_prefix: process.env.SMTP_PASS?.substring(0, 8) || 'MISSING',
    sepay_merchant_exists: !!process.env.SEPAY_MERCHANT_ID,
    sepay_secret_exists: !!process.env.SEPAY_SECRET_KEY
  });
}
