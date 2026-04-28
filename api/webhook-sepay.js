// api/webhook-sepay.js — FINAL v5 (super verbose logging)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTION_LINK = 'https://www.notion.so/AI2B8rain-M-u-b631c4cec0b821b97f881db2823341s3?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9wljHjll1';
const FROM_EMAIL = 'noreply@hoangtiendung.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── ENV CHECK ──────────────────────────────────────────
    console.log('🔧 ENV CHECK:');
    console.log('  SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0,40) : '❌ MISSING');
    console.log('  SUPABASE_KEY:', SUPABASE_KEY ? SUPABASE_KEY.substring(0,20) + '...' : '❌ MISSING');
    console.log('  RESEND_API_KEY:', RESEND_API_KEY ? RESEND_API_KEY.substring(0,12) + '...' : '❌ MISSING');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('❌ FATAL: Missing Supabase env vars!');
      return res.status(500).json({ error: 'Server config error: missing SUPABASE env vars' });
    }

    // ── PARSE PAYLOAD ──────────────────────────────────────
    const body = req.body;
    console.log('🔔 [WEBHOOK] Payload:', JSON.stringify(body));

    const transactionId = body.id || '';
    const description   = body.description || body.content || '';
    const amount        = parseInt(body.transferAmount || body.amount) || 0;
    const referenceCode = body.referenceCode || body.reference_code || '';

    // ── EXTRACT ORDER CODE ─────────────────────────────────
    // Ưu tiên 1: body.code (SePay tự detect)
    // Ưu tiên 2: Regex DH\d+ từ description
    let orderCode = (body.code && String(body.code).startsWith('DH')) ? String(body.code) : null;

    if (!orderCode) {
      const dhMatch = description.match(/DH\d{8,}/);
      if (dhMatch) {
        orderCode = dhMatch[0];
        console.log(`🔍 Regex extracted: ${orderCode} from "${description}"`);
      }
    } else {
      console.log(`✅ body.code = ${orderCode}`);
    }

    console.log(`📝 orderCode="${orderCode}" | amount=${amount} | desc="${description}"`);

    let lead = null;

    // ── LOOKUP BY DH CODE ──────────────────────────────────
    if (orderCode) {
      const url = `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderCode}&select=*&limit=1`;
      console.log(`🔍 Supabase query: ${url}`);

      const r = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Supabase status: ${r.status}`);
      const rawText = await r.text();
      console.log(`📊 Supabase response: ${rawText}`);

      if (r.ok) {
        try {
          const rows = JSON.parse(rawText);
          console.log(`📊 Rows found: ${rows.length}`);
          if (rows.length > 0) {
            lead = rows[0];
            console.log(`✅ Lead found: ${lead.full_name} (${lead.email}) status=${lead.payment_status}`);
          }
        } catch(e) {
          console.error('❌ JSON parse error:', e.message);
        }
      } else {
        console.error(`❌ Supabase query failed: ${r.status} ${rawText}`);
      }
    }

    // ── FALLBACK: LOOKUP BY PHONE ──────────────────────────
    if (!lead) {
      const phoneMatch = description.match(/0\d{9}/);
      const phone = phoneMatch ? phoneMatch[0] : null;
      console.log(`📱 Fallback phone: ${phone}`);

      if (phone) {
        const url = `${SUPABASE_URL}/rest/v1/leads?phone=eq.${phone}&payment_status=eq.pending&select=*&order=created_at.desc&limit=1`;
        const r = await fetch(url, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const rawText = await r.text();
        console.log(`📊 Phone fallback (${r.status}): ${rawText}`);

        if (r.ok) {
          const rows = JSON.parse(rawText);
          if (rows.length > 0) {
            lead = rows[0];
            console.log(`✅ Found by phone: ${lead.full_name}`);
          }
        }
      }
    }

    if (!lead) {
      console.error(`❌ LEAD NOT FOUND. orderCode=${orderCode} | desc="${description}"`);
      return res.status(404).json({ error: 'Lead not found', orderCode, description });
    }

    const { full_name: fullName, email, id: leadId, order_id: orderId, payment_status } = lead;

    if (payment_status === 'completed') {
      console.log(`⚠️ Already completed: ${orderId}`);
      return res.status(200).json({ success: true, message: 'Already processed', orderId });
    }

    // ── UPDATE SUPABASE ─────────────────────────────────────
    console.log(`🔄 Updating lead ${leadId} → completed`);
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: 'completed',
        reference_code: referenceCode || String(transactionId),
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    const updText = await upd.text();
    console.log(`📊 Update result (${upd.status}): ${updText}`);

    if (!upd.ok) {
      return res.status(500).json({ error: 'Update failed', status: upd.status, detail: updText });
    }
    console.log(`✅ Updated → completed (${orderId})`);

    // ── SEND EMAIL ──────────────────────────────────────────
    let emailSent = false;
    let emailError = null;

    if (!RESEND_API_KEY) {
      emailError = 'RESEND_API_KEY missing';
      console.error('❌ RESEND_API_KEY not set!');
    } else {
      try {
        console.log(`📧 Sending email → ${email} | from: ${FROM_EMAIL}`);

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: '✅ Thanh Toán Thành Công - 2Brain',
            html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h1 style="color:#FF6B2C;">🎉 Thanh Toán Thành Công!</h1>
              <p>Xin chào <strong>${fullName}</strong>,</p>
              <p>Đã xác nhận thanh toán <strong style="color:#16a34a;">299.000đ</strong>.</p>
              <hr style="border:1px solid #e5e7eb;margin:20px 0;">
              <p><strong>Bạn nhận được:</strong></p>
              <ul style="line-height:2;">
                <li>📚 Notion: <a href="${NOTION_LINK}" style="color:#FF6B2C;">Xem tại đây</a></li>
                <li>👥 Telegram VIP: <a href="${TELEGRAM_LINK}" style="color:#FF6B2C;">Vào nhóm ngay</a></li>
              </ul>
              <p>Mã đơn: <code>${orderId}</code></p>
              <p>Zalo hỗ trợ: <a href="https://zalo.me/0931546814">0931546814</a></p>
            </body></html>`
          })
        });

        const emailData = await emailRes.json();
        console.log(`📧 Resend response (${emailRes.status}):`, JSON.stringify(emailData));

        if (!emailRes.ok) {
          emailError = emailData?.message || `HTTP ${emailRes.status}`;
          console.error(`❌ Email failed: ${emailError}`);
        } else {
          emailSent = true;
          console.log(`✅ Email sent! ID: ${emailData?.id}`);
        }
      } catch (emailErr) {
        emailError = emailErr.message;
        console.error('❌ Email exception:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true, orderId, email,
      emailSent, emailError: emailError || null,
      message: 'Payment processed ✅'
    });

  } catch (err) {
    console.error('❌ FATAL:', err.stack);
    return res.status(500).json({ error: err.message });
  }
}
