import { NextResponse } from 'next/server';

const SUPABASE_URL = "https://kvjvnrktnkenlsaatmxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo";

const supabaseRest = async (table, query = 'select=*', options = {}) => {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Supabase ${table} request failed`);
  }
  return res.status === 204 ? null : res.json();
};

export async function POST(request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) {
      return NextResponse.json({ detail: 'Email and verification code are required.' }, { status: 400 });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    const otpCode = String(otp).trim();

    // 1. Fetch user
    const users = await supabaseRest('users', `select=*&email=eq.${encodeURIComponent(emailNormalized)}&limit=1`);
    if (!users || !users[0]) {
      return NextResponse.json({ detail: 'Email address not found.' }, { status: 404 });
    }
    const user = users[0];

    // 2. Fetch latest OTP log (activity_type 'search', search_query starting with 'otp_code:')
    const logs = await supabaseRest(
      'user_activity_logs',
      `select=*&user_id=eq.${encodeURIComponent(user.id)}&activity_type=eq.search&search_query=like.otp_code:*&order=created_at.desc&limit=1`
    );

    if (!logs || !logs[0]) {
      return NextResponse.json({ detail: 'Invalid or expired verification code.' }, { status: 400 });
    }

    const latestLog = logs[0];
    const logTime = new Date(latestLog.created_at).getTime();
    const isExpired = Date.now() - logTime > 15 * 60 * 1000; // 15 minutes validity

    const loggedCode = latestLog.search_query.replace('otp_code:', '').trim();

    if (isExpired || loggedCode !== otpCode) {
      return NextResponse.json({ detail: 'Invalid or expired verification code.' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Verification code verified successfully!' });
  } catch (error) {
    console.error('[SERVERLESS VERIFY OTP] Error:', error);
    return NextResponse.json({ detail: error.message || 'Verification failed.' }, { status: 500 });
  }
}
