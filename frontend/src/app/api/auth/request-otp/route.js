import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

const SUPABASE_URL = "https://kvjvnrktnkenlsaatmxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo";

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `"Kapi Adda" <${SMTP_USER}>` : undefined);

const createMailTransporter = () => {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Email delivery is not configured. Please contact Kapi Adda support.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

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
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ detail: 'Email address is required.' }, { status: 400 });
    }

    const emailNormalized = String(email).trim().toLowerCase();

    // 1. Check if user exists
    const users = await supabaseRest('users', `select=*&email=eq.${encodeURIComponent(emailNormalized)}&limit=1`);
    if (!users || !users[0]) {
      return NextResponse.json({ detail: 'Email address not found.' }, { status: 404 });
    }
    const user = users[0];

    // Confirm the provider is reachable before creating a code the user cannot receive.
    const transporter = createMailTransporter();
    await transporter.verify();

    // 2. Generate random 6-digit OTP code
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // 3. Store OTP in user_activity_logs using activity_type 'search'
    await supabaseRest('user_activity_logs', '', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        activity_type: 'search',
        search_query: `otp_code:${otp}`
      })
    });

    const mailOptions = {
      from: SMTP_FROM,
      to: emailNormalized,
      subject: 'Kapi Adda - Password Reset Verification Code',
      text: `Hello,\n\nYour Kapi Adda password reset verification code is: ${otp}\n\nThis code is valid for 15 minutes.\n\nBrew On,\nKapi Adda Team ☕`,
    };

    const delivery = await transporter.sendMail(mailOptions);
    if (!delivery.messageId) throw new Error('Email provider did not accept the verification message.');
    console.log(`[SERVERLESS OTP] Verification email accepted with message ID ${delivery.messageId}`);

    return NextResponse.json({ message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('[SERVERLESS OTP] Error:', error);
    return NextResponse.json({ detail: error.message || 'Failed to send verification code.' }, { status: 500 });
  }
}
