// api/create-order-sepay.js
// Gọi Sepay API để tạo order + QR code động

import crypto from 'crypto';

const SEPAY_MERCHANT_ID = process.env.SEPAY_MERCHANT_ID;
const SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY;
const SEPAY_API_URL = 'https://api.sepay.vn/v2/payment/gateway';

function signRequest(data) {
  const sortedKeys = Object.keys(data).sort();
  const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  return crypto.createHmac('sha256', SEPAY_SECRET_KEY).update(signString).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, amount, fullName, email } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: 'Missing phone or amount' });
    }

    // Tạo order ID unique (phone + timestamp)
    const orderId = `CO${Date.now()}`;

    // Prepare request data
    const requestData = {
      merchant_id: SEPAY_MERCHANT_ID,
      amount: Math.floor(amount), // Phải là số nguyên
      order_code: orderId,
      order_description: `2Brain ${phone}`, // Content CK
      return_url: 'https://2brain.hoangtiendung.com/success',
      notify_url: 'https://2brain.hoangtiendung.com/api/webhook-sepay',
      buyer_name: fullName,
      buyer_email: email,
      buyer_phone: phone
    };

    // Sign request
    requestData.signature = signRequest(requestData);

    console.log('📤 Sepay API request:', orderId, amount);

    // Call Sepay API
    const response = await fetch(SEPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const data = await response.json();
    console.log('📥 Sepay API response:', data);

    if (!data.data || !data.data.qr_code) {
      console.error('❌ Sepay error:', data);
      return res.status(400).json({ error: 'Failed to create order', details: data });
    }

    // Return order info
    return res.status(200).json({
      success: true,
      orderId,
      qrCode: data.data.qr_code,
      amount,
      phone
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
