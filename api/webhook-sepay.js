// api/webhook-sepay.js - FIXED VERSION
// Xử lý đúng Sepay webhook payload

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTION_LINK = 'https://www.notion.so/AI2B8rain-M-u-b631c4cec0b821b97f881db2823341s3?source=copy_link';
const TELEGRAM_LINK = 'https://t.me/+4JQYxuCd9wljHjll1';
const FROM_EMAIL = 'onboarding@resend.dev';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('🔔 [WEBHOOK] Sepay IPN received:', JSON.stringify(body, null, 2));

    // Extract order code from Sepay payload
    // Sepay sends: order_code, id, transaction_id, etc.
    const orderId = body.order_code || body.transaction_id || body.id || '';
    const amount = parseInt(body.amount) || 0;
    const status = body.status || 'unknown';

    console.log(`📝 [WEBHOOK] Parsed: orderId=${orderId}, amount=${amount}, status=${status}`);

    if (!orderId) {
      console.log('⚠️ [WEBHOOK] Missing order identifier');
      return res.status(400).json({ error: 'Missing order_code' });
    }

    // 🔑 FIX: Try multiple search strategies
    let lead = null;
    let queryUrl = '';

    // Strategy 1: Search by order_id (exact match)
    queryUrl = `${SUPABASE_URL}/rest/v1/leads?order_id=eq.${orderId}&select=*`;
    console.log(`🔍 [WEBHOOK] Strategy 1 - Search by order_id=${orderId}`);
    
    let queryRes = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (queryRes.ok) {
      const leads = await queryRes.json();
      if (leads && leads.length > 0) {
        lead = leads[0];
        console.log(`✅ [WEBHOOK] Found by order_id`);
      }
    }

    // Strategy 2: If not found, search by reference_code
    if (!lead) {
      queryUrl = `${SUPABASE_URL}/rest/v1/leads?reference_code=eq.${orderId}&select=*`;
      console.log(`🔍 [WEBHOOK] Strategy 2 - Search by reference_code=${orderId}`);
      
      queryRes = await fetch(queryUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (queryRes.ok) {
        const leads = await queryRes.json();
        if (leads && leads.length > 0) {
          lead = leads[0];
          console.log(`✅ [WEBHOOK] Found by reference_code`);
        }
      }
    }

    // Strategy 3: If still not found, log all recent leads (for debugging)
    if (!lead) {
      console.error(`❌ [WEBHOOK] Lead not found with orderId=${orderId}`);
      console.log('📋 [WEBHOOK] Fetching recent leads for debugging...');
      
      const debugUrl = `${SUPABASE_URL}/rest/v1/leads?order=created_at.desc&limit=5&select=id,order_id,reference_code,full_name,email`;
      const debugRes = await fetch(debugUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (debugRes.ok) {
        const recentLeads = await debugRes.json();
        console.log('📋 [WEBHOOK] Recent leads:', JSON.stringify(recentLeads, null, 2));
      }

      return res.status(404).json({ 
        error: 'Lead not found',
        searchedId: orderId,
        message: 'Check logs for recent leads'
      });
    }

    const fullName = lead.full_name || 'Customer';
    const email = lead.email;
    const phone = lead.phone;

    console.log(`✅ [WEBHOOK] Lead found: ${fullName} (${email})`);

    // Check if already completed
    if (lead.payment_status === 'completed') {
      console.log(`⚠️ [WEBHOOK] Payment already processed: ${lead.order_id}`);
      return res.status(200).json({ 
        success: true, 
        orderId: lead.order_id,
        message: 'Already processed' 
      });
    }

    // Validate payment status
    const validStatuses = ['success', 'completed', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      console.log(`⚠️ [WEBHOOK] Invalid payment status: ${status}`);
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    if (amount !== 299000 && amount !== 0) { // Allow 0 for manual tests
      console.warn(`⚠️ [WEBHOOK] Amount mismatch: ${amount} (expected 299000)`);
    }

    console.log(`✅ [WEBHOOK] Valid payment confirmed: ${amount}đ`);

    // Update payment status
    const updateUrl = `${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: 'completed',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      console.error(`❌ [WEBHOOK] Supabase update error: ${updateRes.status}`);
      return res.status(500).json({ error: 'Update failed' });
    }

    console.log(`✅ [WEBHOOK] Database updated: payment_status=completed`);

    // Send email
    let emailSent = false;
    let emailError = null;

    try {
      console.log(`📧 [EMAIL] Sending to: ${email}`);
      console.log(`📧 [EMAIL] API Key exists: ${!!RESEND_API_KEY}`);
      if (RESEND_API_KEY) {
        console.log(`📧 [EMAIL] API Key prefix: ${RESEND_API_KEY.substring(0, 15)}...`);
      }

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
          html: `
            <h1>🎉 Thanh Toán Thành Công!</h1>
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi đã xác nhận thanh toán của bạn. Bạn sẽ nhận được:</p>
            <ul>
              <li>📚 Notion Database đầy đủ: <a href="${NOTION_LINK}">Xem tại đây</a></li>
              <li>👥 Nhóm Telegram VIP: <a href="${TELEGRAM_LINK}">Vào nhóm</a></li>
            </ul>
            <p><strong>Nếu cần hỗ trợ:</strong> Liên hệ Zalo: 0931546814</p>
            <p>Cảm ơn bạn đã tin tưởng 2Brain!</p>
          `
        })
      });

      console.log(`📧 [EMAIL] Response status: ${emailRes.status}`);
      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        console.error(`❌ [EMAIL] Resend error (${emailRes.status}):`, emailData);
        emailError = emailData?.message || `HTTP ${emailRes.status}`;
      } else {
        console.log(`✅ [EMAIL] Sent successfully:`, emailData?.id);
        emailSent = true;
      }
    } catch (emailErr) {
      console.error(`❌ [EMAIL] Exception:`, emailErr.message);
      emailError = emailErr.message;
    }

    return res.status(200).json({
      success: true,
      orderId: lead.order_id,
      email,
      emailSent,
      emailError: emailError || null,
      message: 'Payment processed'
    });

  } catch (err) {
    console.error(`❌ [WEBHOOK] Fatal error: ${err.message}`);
    console.error(`❌ [WEBHOOK] Stack:`, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
