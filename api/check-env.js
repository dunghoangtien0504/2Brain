export default async function handler(req, res) {
  return res.status(200).json({
    supabase_key_exists: !!process.env.SUPABASE_KEY,
    supabase_key_first_20: process.env.SUPABASE_KEY?.substring(0, 20) || 'MISSING',
    expected_prefix: 'eyJhbGciOiJIUzI1NiIsI'
  });
}
