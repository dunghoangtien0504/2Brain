// vercel/functions/webhook-sepay.js
// Hàm xử lý webhook từ Sepay khi khách thanh toán thành công

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SMTP_USER = process.env.SMTP_USER; // Email gửi (Gmail, Resend, etc)
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// Template email gửi file
const emailTemplate = (name, email, fileLink, groupLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF6B2C, #FF8A3D); color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; margin: 20px 0; border-radius: 10px; }
    .btn { display: inline-block; background: #FF6B2C; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 10px 5px; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Chúc mừng ${name}!</h1>
      <p>Thanh toán thành công. File của bạn đang chờ!</p>
    </div>
    
    <div class="content">
      <h2>Hé ${name},</h2>
      <p>Cảm ơn bạn đã tin tưởng Content OS. Dưới đây là những gì bạn nhận được:</p>
      
      <h3>📦 File Notion + 8 Module:</h3>
      <p style="margin:20px 0;"><a href="${fileLink}" class="btn" style="display:inline-block;">↓ Lấy File Notion Tại Đây</a></p>
      
      <h3>👥 Nhóm VIP Hỗ Trợ 24/7:</h3>
      <p style="margin:20px 0;"><a href="${groupLink}" class="btn" style="display:inline-block;">↳ Tham Gia Nhóm VIP Telegram</a></p>
      
      <p><strong>Lưu ý quan trọng:</strong></p>
      <ul>
        <li>File Notion sẽ mở trong tab mới khi bạn click link trên</li>
        <li>Nhấn nút "Duplicate" để copy file vào Notion workspace của bạn</li>
        <li>Hôm nay mình sẽ nhắn tin Zalo (0901234567) để hỗ trợ setup</li>
      </ul>
      
      <p style="background:#fff3cd;padding:15px;border-radius:6px;border-left:4px solid #ffc107;">
        <strong>⏰ Bước tiếp theo:</strong> Join nhóm Telegram → Sau 7 ngày sẽ được vào Group VIP hỗ trợ thêm
      </p>
    </div>
    
    <div class="footer">
      <p>Content OS by Dũng Hoàng · Hệ thống xây dựng personal brand</p>
      <p>Zalo: 0901234567 | Email: hoangtiendung@example.com</p>
    </div>
  </div>
</body>
</html>
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceCode, accountNo, transferAmount, memo, description, initiateName } = req.body;

    console.log('🔔 Webhook received:', { referenceCode, transferAmount, memo });

    // 1. Find lead by reference code
    const { data: leads, error: findError } = await supabase
      .from('leads')
      .select('*')
      .eq('reference_code', referenceCode)
      .single();

    if (findError || !leads) {
      console.error('❌ Lead not found:', referenceCode);
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Verify amount
    if (transferAmount < PAYMENT_CONFIG.amount) {
      console.error('❌ Amount mismatch:', transferAmount, 'vs', PAYMENT_CONFIG.amount);
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    // 3. Update lead: payment_status = completed
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        payment_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('reference_code', referenceCode);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // 4. Send email with file link + group link
    const fileLink = 'https://www.notion.so/AI2Brain-M-u-b631c4caec0b821b97f881db282341a5?source=copy_link';
    const groupLink = 'https://t.me/+4JQYxuCd9WljMjll';
    
    const htmlEmail = emailTemplate(leads.full_name, leads.email, fileLink, groupLink);

    await transporter.sendMail({
      from: SMTP_USER,
      to: leads.email,
      subject: `🎉 Content OS V2 - File Notion + Hướng Dẫn - ${referenceCode}`,
      html: htmlEmail
    });

    console.log('✅ Email sent to:', leads.email);

    // 5. Send Zalo notification (optional - nếu có Zalo API)
    // await sendZaloNotification(leads.phone, fileLink, groupLink);

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed and email sent',
      leadId: leads.id,
      referenceCode: referenceCode
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
