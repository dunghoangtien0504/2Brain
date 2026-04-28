// api/create-order-sepay.js
// ✅ FIXED v3:
// - orderId dùng tiền tố DH (khớp cấu hình SePay)
// - VietQR tạo QR trực tiếp (không qua Sepay Gateway → luôn hoạt động)
// - Transfer content = orderId (DH...) → SePay tự nhận diện code

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, amount, fullName, email } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: 'Missing phone or amount' });
    }

    // ✅ FIX 1: orderId dùng DH prefix để SePay nhận diện đúng
    // Ví dụ: DH1777391893418 → SePay sẽ tự detect code = "DH1777391893418"
    const orderId = 'DH' + Date.now();

    // ✅ FIX 2: Dùng VietQR API trực tiếp — KHÔNG qua Sepay Gateway
    // VietQR luôn hoạt động, không cần API key
    // addInfo = orderId → đây là nội dung chuyển khoản khách sẽ ghi
    const addInfo = encodeURIComponent(orderId);
    const qrCode = `https://img.vietqr.io/image/MB-333303838-compact2.jpg?amount=${Math.floor(amount)}&addInfo=${addInfo}&accountName=HOANG%20TIEN%20DUNG`;

    console.log(`✅ [CREATE-ORDER] orderId=${orderId}, amount=${amount}, phone=${phone}`);
    console.log(`✅ [CREATE-ORDER] QR URL: ${qrCode}`);

    // ✅ Return thành công
    return res.status(200).json({
      success: true,
      orderId,       // "DH1777391893418"
      qrCode,        // VietQR image URL
      amount,
      phone,
      transferContent: orderId  // Nội dung KH cần ghi khi CK
    });

  } catch (error) {
    console.error('❌ [CREATE-ORDER] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
