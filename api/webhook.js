import { createClient } from '@supabase/supabase-js';

// 1. Kết nối vào "Kho" Supabase của anh
const supabaseUrl = 'https://qmmiuqztukpagbuigzma.supabase.co';
const supabaseKey = 'sb_publishable_84npGxaLGDO5bH5ArCYVGw_Kb6I9Xse';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Chỉ nhận thông báo POST từ Sepay
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const sepaysData = req.body;
    
    // 2. Lấy nội dung chuyển khoản từ Sepay báo về
    const noiDungCK = sepaysData.transferContent; // Ví dụ: "SecondBrainAI 0901234567"
    
    if (!noiDungCK) {
        return res.status(400).json({ message: 'Không có nội dung chuyển khoản' });
    }

    // 3. Cắt lấy số điện thoại (Lấy phần tử cuối cùng sau khoảng trắng)
    const parts = noiDungCK.trim().split(' ');
    const phone = parts[parts.length - 1]; 

    // 4. Vào Supabase tìm khách có SĐT này và cập nhật trạng thái thành 'paid'
    const { data, error } = await supabase
      .from('leads')
      .update({ status: 'paid' })
      .eq('phone', phone);

    if (error) {
      console.error('Lỗi cập nhật Supabase:', error);
      throw error;
    }

    // Tương lai: Mình sẽ chèn thêm code gửi Email qua Resend ở ngay vị trí này!

    // 5. Trả lời Sepay là "Hệ thống đã nhận lệnh xong"
    return res.status(200).json({ success: true, message: 'Đã cập nhật thanh toán thành công' });
    
  } catch (error) {
    console.error('Lỗi Webhook:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}
