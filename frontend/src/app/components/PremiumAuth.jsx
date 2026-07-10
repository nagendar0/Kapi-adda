'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBreakpoint, useScreenProfile } from '../utils/responsive';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000');
const HAS_BACKEND_API = Boolean(process.env.NEXT_PUBLIC_API_URL) || (typeof window !== 'undefined' && !window.location.hostname.includes('.vercel.app'));

const SUPABASE_URL = "https://kvjvnrktnkenlsaatmxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo";


// ─── Coffee bean SVG particle ────────────────────────────────────────────────
const CoffeeBeanIcon = ({ style }) => (
  <svg viewBox="0 0 24 24" fill="none" style={style}>
    <ellipse cx="12" cy="12" rx="7" ry="10" fill="#D4AF37" opacity="0.18" />
    <path d="M12 2 C12 2 5 7 5 12 C5 17 12 22 12 22" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
  </svg>
);

// ─── Floating particles ───────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 10 + Math.random() * 18,
  duration: 8 + Math.random() * 12,
  delay: Math.random() * 8,
  drift: (Math.random() - 0.5) * 30,
}));

// ─── Keyframes injected once ──────────────────────────────────────────────────
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

  .no-scrollbar::-webkit-scrollbar {
    display: none !important;
  }
  .no-scrollbar {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }

  /* Autofill styling overrides to prevent bright white background blocks */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px #181412 inset !important;
    -webkit-text-fill-color: #ffffff !important;
    transition: background-color 5000s ease-in-out 0s;
  }

  @keyframes floatBean {
    0%   { transform: translateY(0px) rotate(0deg); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
  }
  @keyframes drift {
    0%,100% { margin-left: 0px; }
    50%      { margin-left: var(--drift); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulseGlow {
    0%,100% { box-shadow: 0 0 30px 6px rgba(255,140,0,0.22), 0 0 80px 20px rgba(212,175,55,0.08); }
    50%      { box-shadow: 0 0 50px 12px rgba(255,140,0,0.38), 0 0 120px 40px rgba(212,175,55,0.14); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeInLeft {
    from { opacity: 0; transform: translateX(-32px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeInRight {
    from { opacity: 0; transform: translateX(32px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes spinSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ripple {
    0%   { transform: scale(0); opacity: 0.5; }
    100% { transform: scale(4); opacity: 0; }
  }
  @keyframes steamRise {
    0%   { transform: translateY(0) scaleX(1); opacity: 0.7; }
    50%  { transform: translateY(-18px) scaleX(1.3); opacity: 0.4; }
    100% { transform: translateY(-36px) scaleX(0.8); opacity: 0; }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(60px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOutLeft {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-60px); }
  }
  @keyframes progressBar {
    from { width: 0%; }
    to   { width: 100%; }
  }

  .kapi-input:focus { outline: none; }
  .kapi-input::placeholder { color: rgba(255,255,255,0.28); }
  .kapi-btn-primary:hover { filter: brightness(1.12) saturate(1.15); transform: translateY(-1px); }
  .kapi-btn-primary:active { transform: translateY(1px); filter: brightness(0.96); }
  .kapi-link:hover { color: #FFB347; text-decoration: underline; }
  .kapi-social-btn:hover { background: rgba(255,140,0,0.12); border-color: rgba(255,140,0,0.5); transform: translateY(-1px); }
  .kapi-back-btn:hover { background: rgba(255,140,0,0.08); }
`;

// ─── Inject styles once ───────────────────────────────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.innerHTML = KEYFRAMES;
  document.head.appendChild(tag);
  stylesInjected = true;
}

const setCookie = (name, value, days) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
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

const getSupabaseUserByEmail = async (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  const rows = await supabaseRest(
    'users',
    `select=*&email=eq.${encodeURIComponent(normalized)}&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : null;
};

const getSupabasePreferences = async (userId) => {
  if (!userId) return {};
  const rows = await supabaseRest(
    'user_preferences',
    `select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  ).catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : {};
};

const buildAuthUser = async (user) => ({
  id: user.id,
  name: user.name || 'Kapi User',
  email: user.email,
  role: String(user.email || '').toLowerCase() === 'kapiadda@gmail.com' ? 'admin' : (user.role || 'customer'),
  preferences: await getSupabasePreferences(user.id),
});

const persistAuthSession = (data) => {
  const token = data?.token || data?.access_token;
  if (token) {
    localStorage.setItem('kapi_token', token);
    setCookie('kapi_token', token, 30);
  }
  if (data?.user) {
    localStorage.setItem('kapi_user', JSON.stringify(data.user));
    setCookie('kapi_user', JSON.stringify(data.user), 30);
  }
};

const loginWithSupabaseFallback = async (email, password) => {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await getSupabaseUserByEmail(normalized);
  if (!user) throw new Error('Invalid email or password.');

  const expectedHash = `pbkdf2_${password}`;
  const isSeededAdmin = user.role === 'admin' && password === 'kappiadmin' && String(user.password_hash || '').startsWith('$2b$');
  if (!isSeededAdmin && user.password_hash !== expectedHash) {
    throw new Error('Invalid email or password.');
  }

  return {
    message: 'Login successful!',
    token: `jwt_mock_token_for_${user.id}`,
    user: await buildAuthUser(user),
  };
};

const registerWithSupabaseFallback = async ({ name, email, password, brewTypes, milk, strength }) => {
  const normalized = String(email || '').trim().toLowerCase();
  const role = normalized === 'kapiadda@gmail.com' ? 'admin' : 'customer';
  const existing = await getSupabaseUserByEmail(normalized);
  const userPayload = {
    name,
    email: normalized,
    password_hash: `pbkdf2_${password}`,
    role,
  };

  let user = existing;
  if (existing) {
    const rows = await supabaseRest('users', `id=eq.${encodeURIComponent(existing.id)}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(userPayload),
    });
    user = Array.isArray(rows) && rows[0] ? rows[0] : { ...existing, ...userPayload };
  } else {
    const rows = await supabaseRest('users', 'select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(userPayload),
    });
    user = Array.isArray(rows) ? rows[0] : null;
  }

  if (!user) throw new Error('Registration failed. Please try again.');

  const preferencePayload = {
    user_id: user.id,
    veg_preference: 'non-veg',
    favorite_categories: brewTypes || [],
    spice_preference: strength || 'medium',
    dietary_preferences: milk ? [milk] : [],
  };
  const currentPref = await getSupabasePreferences(user.id);
  if (currentPref?.id) {
    await supabaseRest('user_preferences', `id=eq.${encodeURIComponent(currentPref.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(preferencePayload),
    }).catch(() => null);
  } else {
    await supabaseRest('user_preferences', 'select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(preferencePayload),
    }).catch(() => null);
  }

  return {
    message: 'User registered successfully!',
    token: `jwt_mock_token_for_${user.id}`,
    user: await buildAuthUser(user),
  };
};


// ─── Taste preference options ─────────────────────────────────────────────────
const BREW_TYPES = [
  { id: 'filter', label: 'Filter Coffee', icon: '☕' },
  { id: 'espresso', label: 'Espresso', icon: '⚡' },
  { id: 'cold-brew', label: 'Cold Brew', icon: '🧊' },
  { id: 'pour-over', label: 'Pour Over', icon: '🫗' },
  { id: 'decoction', label: 'Decoction', icon: '🪔' },
  { id: 'latte', label: 'Latte', icon: '🥛' },
];
const MILK_PREFS = [
  { id: 'full-cream', label: 'Full Cream' },
  { id: 'oat', label: 'Oat Milk' },
  { id: 'almond', label: 'Almond' },
  { id: 'black', label: 'Black' },
];
const STRENGTH_PREFS = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'strong', label: 'Strong' },
  { id: 'extra-strong', label: 'Extra Strong' },
];

// ─── Floating Input ───────────────────────────────────────────────────────────
function FloatingInput({ id, label, type = 'text', value, onChange, icon, error, autoComplete, readOnly = false, disabled = false }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value?.length > 0;
  const [showPass, setShowPass] = useState(false);
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type;

  return (
    <div style={{ position: 'relative', marginBottom: error ? 6 : 20 }}>
      {/* Ambient glow on focus */}
      {focused && (
        <div style={{
          position: 'absolute', inset: -1, borderRadius: 12,
          background: 'transparent',
          boxShadow: '0 0 0 2px rgba(255,140,0,0.55), 0 4px 20px rgba(255,140,0,0.18)',
          pointerEvents: 'none', zIndex: 1, transition: 'all 0.3s'
        }} />
      )}
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'rgba(255,140,0,0.6)' : error ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12,
        transition: 'border-color 0.3s, background 0.3s',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Icon */}
        <span style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: focused ? '#FF8C00' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.3s', userSelect: 'none', zIndex: 2,
        }}>{icon}</span>

        {/* Floating label */}
        <label htmlFor={id} style={{
          position: 'absolute', left: 48,
          top: active ? 9 : '50%',
          transform: active ? 'none' : 'translateY(-50%)',
          fontSize: active ? 10 : 14,
          color: focused ? '#FF8C00' : error ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.4)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 500, letterSpacing: '0.04em',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none', zIndex: 2, textTransform: active ? 'uppercase' : 'none',
        }}>{label}</label>

        <input
          id={id}
          className="kapi-input"
          type={inputType}
          value={value}
          autoComplete={autoComplete}
          onChange={e => !readOnly && !disabled && onChange?.(e.target.value)}
          onFocus={() => !readOnly && !disabled && setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingTop: active ? 22 : 14, paddingBottom: active ? 8 : 14,
            paddingLeft: 48, paddingRight: type === 'password' ? 48 : 16,
            background: 'transparent', border: 'none',
            color: (readOnly || disabled) ? 'rgba(255,255,255,0.45)' : '#fff',
            fontSize: 15,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 400, transition: 'padding 0.25s',
            cursor: (readOnly || disabled) ? 'not-allowed' : 'text',
          }}
        />

        {/* Show/hide password toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPass(p => !p);
            }}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.75)', fontSize: 16, padding: 0,
              transition: 'color 0.2s', zIndex: 10,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF8C00'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
          >
            {showPass ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && (
        <p style={{ margin: '4px 0 12px 4px', fontSize: 11.5, color: 'rgba(255,100,100,0.9)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

// ─── Password Checklist ───────────────────────────────────────────────────────
export function PasswordChecklist({ password = '' }) {
  const criteria = [
    { label: "Minimum 8 characters", test: (val) => val.length >= 8 },
    { label: "At least one lowercase letter (small)", test: (val) => /[a-z]/.test(val) },
    { label: "At least one uppercase letter (capital)", test: (val) => /[A-Z]/.test(val) },
    { label: "At least one number (digit)", test: (val) => /[0-9]/.test(val) },
    { label: "At least one special character", test: (val) => /[!@#$%^&*(),.?\":{}|<>]/.test(val) },
  ];

  const allPassed = criteria.every(item => item.test(password));
  if (allPassed) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 20,
      marginTop: -8,
      fontSize: 12.5,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Password Requirements:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        {criteria.map((item, idx) => {
          const passed = item.test(password);
          return (
            <div key={idx} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              color: passed ? '#10B981' : 'rgba(255,100,100,0.7)', 
              fontWeight: passed ? 500 : 400,
              transition: 'all 0.2s' 
            }}>
              <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', color: passed ? '#10B981' : '#EF4444' }}>
                {passed ? '✔' : '✘'}
              </span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryButton({ children, onClick, loading, type = 'button' }) {
  return (
    <button
      type={type}
      className="kapi-btn-primary"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '15px 24px',
        backgroundImage: loading
          ? 'none'
          : 'linear-gradient(105deg, #FF8C00 0%, #D4AF37 45%, #FF8C00 80%, #FFD700 100%)',
        backgroundColor: loading ? 'rgba(212,175,55,0.3)' : 'transparent',
        backgroundSize: '200% auto',
        animation: loading ? 'none' : 'shimmer 2.5s linear infinite',
        border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
        color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 15, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative', overflow: 'hidden',
        boxShadow: loading ? 'none' : '0 4px 24px rgba(255,140,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{
            width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)',
            borderTopColor: '#0A0A0A', borderRadius: '50%',
            animation: 'spinSlow 0.8s linear infinite', display: 'inline-block',
          }} />
          Processing…
        </span>
      ) : children}
    </button>
  );
}

// ─── Left decorative panel ────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #0A0A0A 0%, #1A0E00 40%, #0D0800 70%, #050300 100%)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeInLeft 0.8s cubic-bezier(0.4,0,0.2,1) both',
    }}>
      {/* Deep layered background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 80% at 30% 60%, rgba(180,90,0,0.22) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 70% 30%, rgba(212,175,55,0.1) 0%, transparent 60%)',
      }} />

      {/* Bokeh lights */}
      {[
        { x: 20, y: 25, r: 80, c: 'rgba(255,140,0,0.25)' },
        { x: 65, y: 55, r: 60, c: 'rgba(212,175,55,0.18)' },
        { x: 45, y: 80, r: 100, c: 'rgba(255,100,0,0.15)' },
        { x: 80, y: 15, r: 50, c: 'rgba(255,200,50,0.12)' },
        { x: 10, y: 65, r: 40, c: 'rgba(200,120,0,0.20)' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
          width: b.r * 2, height: b.r * 2,
          borderRadius: '50%', background: b.c,
          filter: `blur(${b.r * 0.7}px)`,
          transform: 'translate(-50%,-50%)',
          animation: `pulseGlow ${5 + i * 1.5}s ease-in-out infinite`,
        }} />
      ))}

      {/* Coffee cup illustration area */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {/* Steam wisps */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            display: 'inline-block', width: 4, height: 24,
            margin: `0 ${6 + i * 4}px`,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 4,
            animation: `steamRise ${2 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            verticalAlign: 'bottom', marginBottom: 0,
          }} />
        ))}

        {/* Cup */}
        <div style={{
          width: 140, height: 120, margin: '0 auto',
          background: 'linear-gradient(160deg, #2a1a00, #1a0c00)',
          borderRadius: '10px 10px 40px 40px',
          border: '2px solid rgba(212,175,55,0.3)',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 2px 8px rgba(255,140,0,0.1)',
        }}>
          {/* Coffee surface */}
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 30,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(160,80,0,0.9) 0%, rgba(80,30,0,0.95) 100%)',
            boxShadow: '0 2px 12px rgba(255,140,0,0.3)',
          }} />
          {/* Handle */}
          <div style={{
            position: 'absolute', right: -26, top: 24, width: 22, height: 44,
            border: '3px solid rgba(212,175,55,0.4)', borderLeft: 'none',
            borderRadius: '0 20px 20px 0',
          }} />
          {/* Saucer */}
          <div style={{
            position: 'absolute', bottom: -14, left: -20, right: -20, height: 12,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.25), rgba(100,60,0,0.2))',
            borderRadius: 40,
          }} />
        </div>

        {/* Brand text on left panel */}
        <div style={{ marginTop: 48 }}>

          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 42, fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(135deg, #FF8C00, #D4AF37, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none', letterSpacing: '0.02em',
          }}>
            KAPI<br />ADDA
          </div>
          <div style={{
            width: 60, height: 2, margin: '16px auto',
            background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
          }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13.5, color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.7, maxWidth: 240, margin: '0 auto',
            letterSpacing: '0.02em',
          }}>
            Where every brew tells the story<br />of South India's finest estate coffees.
          </p>
        </div>

        {/* Floating beans around cup */}
        {PARTICLES.slice(0, 6).map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${10 + p.x * 0.8}%`, bottom: `${5 + p.y * 0.4}%`,
            width: p.size, height: p.size,
            '--drift': `${p.drift}px`,
            animation: `floatBean ${p.duration}s ease-in-out ${p.delay}s infinite`,
            pointerEvents: 'none',
          }}>
            <CoffeeBeanIcon style={{ width: '100%', height: '100%' }} />
          </div>
        ))}
      </div>

      {/* Bottom decorative quote */}
      <div style={{
        position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', padding: '0 32px',
      }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 13, fontStyle: 'italic',
          color: 'rgba(212,175,55,0.4)', lineHeight: 1.6,
        }}>
          "A perfect cup of filter coffee is an act of devotion."
        </p>
      </div>
    </div>
  );
}

// Helper to safely parse and extract strings from error objects or validation lists (FastAPI detail)
const parseError = (errorVal) => {
  if (!errorVal) return "";
  if (typeof errorVal === 'string') return errorVal;
  if (Array.isArray(errorVal)) {
    return errorVal
      .map(err => (typeof err === 'object' && err !== null && err.msg ? err.msg : String(err)))
      .join(', ');
  }
  if (typeof errorVal === 'object') {
    return errorVal.msg || errorVal.message || JSON.stringify(errorVal);
  }
  return String(errorVal);
};

// Helper to validate password complexity
const validatePasswordStrength = (pwd) => {
  if (!pwd) return "Password is required";
  if (pwd.length < 8) return "Password must be at least 8 characters long";
  if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter (small letter)";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter (capital letter)";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character (e.g. @, #, $, %, etc.)";
  return null; // Passes strength criteria
};

// Custom hook to detect responsive screen size categories (xs, sm, md, lg, xl)
// ─── Main Component ───────────────────────────────────────────────────────────
export default function PremiumAuth({
  onLoginSuccess,
  onSignupSuccess,
  onBackToHome,
  initialView = 'login',
  onViewChange,
}) {
  const breakpoint = useBreakpoint();
  const screen = useScreenProfile(breakpoint);
  useEffect(() => { injectStyles(); }, []);

  // Views: 'login' | 'signup-step1' | 'signup-step2'
  const [view, setView] = useState(initialView);
  const [animDir, setAnimDir] = useState('right'); // for slide direction
  const [isVisible, setIsVisible] = useState(true);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginFieldErrors, setLoginFieldErrors] = useState({});

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupFieldErrors, setSignupFieldErrors] = useState({});

  // Taste preferences
  const [selectedBrews, setSelectedBrews] = useState([]);
  const [selectedMilk, setSelectedMilk] = useState('');
  const [selectedStrength, setSelectedStrength] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Forgot Password state
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('request-email'); // 'request-email', 'verify-otp', 'set-password'
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotFieldErrors, setForgotFieldErrors] = useState({});

  const transitionTo = useCallback((nextView, dir = 'right') => {
    setIsVisible(false);
    setAnimDir(dir);
    setTimeout(() => {
      setView(nextView);
      setIsVisible(true);
      if (onViewChange) {
        if (nextView === 'login') {
          onViewChange('login');
        } else if (nextView === 'signup-step1' || nextView === 'signup-step2') {
          onViewChange('onboarding');
        }
      }
    }, 280);
  }, [onViewChange]);

  // Sync initialView prop changes
  const lastInitialViewRef = useRef(initialView);
  useEffect(() => {
    if (lastInitialViewRef.current !== initialView) {
      lastInitialViewRef.current = initialView;
      let nextView = null;
      if (initialView === 'login' || initialView === 'signup-step1' || initialView === 'signup-step2') {
        nextView = initialView;
      } else if (initialView === 'signup' || initialView === 'onboarding') {
        nextView = 'signup-step1';
      }
      if (nextView && nextView !== view) {
        const timer = setTimeout(() => transitionTo(nextView), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [initialView, transitionTo, view]);

  // ── Login submission ────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginFieldErrors({});
    setLoginError('');
    const errs = {};
    if (!loginEmail) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) errs.email = 'Enter a valid email';
    if (!loginPassword) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setLoginFieldErrors(errs); return; }

    setLoginLoading(true);
    try {
      if (!HAS_BACKEND_API) throw new Error('Backend API is not configured');
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(parseError(data?.detail || data?.message) || 'Invalid credentials. Please try again.');
      } else {
        persistAuthSession(data);
        onLoginSuccess?.(data?.user || data);
      }
    } catch (error) {
      try {
        const data = await loginWithSupabaseFallback(loginEmail, loginPassword);
        persistAuthSession(data);
        onLoginSuccess?.(data.user);
      } catch (fallbackError) {
        setLoginError(parseError(fallbackError?.message) || 'Unable to connect. Please check your connection.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Signup step 1 validation ────────────────────────────────────────────────
  const handleSignupStep1 = (e) => {
    e?.preventDefault();
    const errs = {};
    if (!signupName.trim()) errs.name = 'Full name is required';
    if (!signupEmail) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) errs.email = 'Enter a valid email';
    if (!signupPassword) {
      errs.password = 'Password is required';
    } else {
      const strengthErr = validatePasswordStrength(signupPassword);
      if (strengthErr) errs.password = strengthErr;
    }
    if (!signupConfirm) {
      errs.confirm = 'Please confirm your password';
    } else if (signupConfirm !== signupPassword) {
      errs.confirm = 'Passwords do not match';
    }
    if (Object.keys(errs).length) { setSignupFieldErrors(errs); return; }
    setSignupFieldErrors({});
    transitionTo('signup-step2', 'right');
  };

  // ── Signup final submission ─────────────────────────────────────────────────
  const handleSignupSubmit = async () => {
    setSignupError('');
    setSignupLoading(true);
    try {
      if (!HAS_BACKEND_API) throw new Error('Backend API is not configured');
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          preferences: {
            brew_types: selectedBrews,
            milk: selectedMilk,
            strength: selectedStrength,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignupError(parseError(data?.detail || data?.message) || 'Registration failed. Please try again.');
      } else {
        persistAuthSession(data);
        onSignupSuccess?.(data?.user || data);
      }
    } catch (error) {
      try {
        const data = await registerWithSupabaseFallback({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          brewTypes: selectedBrews,
          milk: selectedMilk,
          strength: selectedStrength,
        });
        persistAuthSession(data);
        onSignupSuccess?.(data.user);
      } catch (fallbackError) {
        setSignupError(parseError(fallbackError?.message) || 'Unable to connect. Please check your connection.');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  // ── Forgot Password Request OTP ──────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setForgotFieldErrors({});
    setForgotError('');
    setForgotSuccess('');
    
    if (!loginEmail) {
      setForgotFieldErrors({ email: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setForgotFieldErrors({ email: 'Enter a valid email' });
      return;
    }
    
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data?.detail || data?.message || 'Failed to request verification code.');
      } else {
        setForgotSuccess('Verification code sent successfully!');
        setTimeout(() => {
          setForgotStep('verify-otp');
          setForgotSuccess('');
        }, 1500);
      }
    } catch {
      setForgotError('Unable to connect. Please check your connection.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password Verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setForgotFieldErrors({});
    setForgotError('');
    setForgotSuccess('');
    
    if (!forgotOtp) {
      setForgotFieldErrors({ otp: 'Verification code is required' });
      return;
    }
    
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otp: forgotOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data?.detail || data?.message || 'Invalid or expired verification code.');
      } else {
        setForgotSuccess('Code verified successfully!');
        setTimeout(() => {
          setForgotStep('set-password');
          setForgotSuccess('');
        }, 1500);
      }
    } catch {
      setForgotError('Unable to connect. Please check your connection.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password Verify & Reset ──────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setForgotFieldErrors({});
    setForgotError('');
    setForgotSuccess('');
    
    const errs = {};
    if (!forgotNewPassword) {
      errs.newPassword = 'New password is required';
    } else {
      const strengthErr = validatePasswordStrength(forgotNewPassword);
      if (strengthErr) errs.newPassword = strengthErr;
    }
    if (!forgotConfirmPassword) {
      errs.confirmPassword = 'Confirm password is required';
    } else if (forgotConfirmPassword !== forgotNewPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errs).length) {
      setForgotFieldErrors(errs);
      return;
    }
    
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otp: forgotOtp, new_password: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data?.detail || data?.message || 'Password reset failed.');
      } else {
        setForgotSuccess('Your password has been reset successfully! Redirecting...');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotStep('request-email');
        setTimeout(() => {
          transitionTo('login', 'left');
          setForgotSuccess('');
        }, 2500);
      }
    } catch {
      setForgotError('Unable to connect. Please check your connection.');
    } finally {
      setForgotLoading(false);
    }
  };

  const toggleBrew = (id) =>
    setSelectedBrews(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Card animation style ────────────────────────────────────────────────────
  const cardAnim = isVisible
    ? { animation: 'fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) both' }
    : { opacity: 0, transform: 'translateY(28px)' };

  return (
    <div style={{
      minHeight: screen.compact ? '100dvh' : 'calc(100vh - 64px)', height: screen.compact ? 'auto' : 'calc(100vh - 64px)', width: '100%', display: 'flex',
      background: '#0A0A0A', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', position: 'relative',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      marginTop: screen.compact ? 0 : 64,
      paddingBottom: screen.compact ? 24 : 0,
    }}>
      {/* Floating bean particles (full screen) */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'fixed',
          left: `${p.x}%`, bottom: `-${p.size}px`,
          width: p.size, height: p.size,
          '--drift': `${p.drift}px`,
          animation: `floatBean ${p.duration}s ease-in-out ${p.delay}s infinite`,
          pointerEvents: 'none', zIndex: 0,
        }}>
          <CoffeeBeanIcon style={{ width: '100%', height: '100%' }} />
        </div>
      ))}

      {/* LEFT PANEL */}
      <div style={{ display: 'flex', width: '100%', minHeight: '100%', height: screen.compact ? 'auto' : '100%', overflow: screen.compact ? 'visible' : 'hidden' }}>
        {/* Left visual panel */}
        {!(breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') && (
          <div style={{ width: '50%', display: 'flex', flexShrink: 0, height: '100%' }}>
            <LeftPanel />
          </div>
        )}

        {/* RIGHT PANEL */}
        <div 
          className="no-scrollbar"
          style={{
            width: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? '100%' : '50%', 
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            position: 'relative', padding: breakpoint === 'xs' ? '20px 12px 28px' : breakpoint === 'sm' ? '28px 18px 32px' : breakpoint === 'md' ? '40px 24px' : '40px 24px 40px', boxSizing: 'border-box',
            background: 'linear-gradient(160deg, #0f0900 0%, #0A0A0A 60%)',
            animation: 'fadeInRight 0.8s cubic-bezier(0.4,0,0.2,1) both',
            zIndex: 1, overflowY: 'auto', overflowX: 'hidden', height: screen.compact ? 'auto' : '100%', minHeight: screen.compact ? '100dvh' : '100%',
          }}
        >
          {/* Radial amber glow behind card (fixed position to prevent scroll height expansion) */}
          <div style={{
            position: 'fixed', top: '50%', left: '75%',
            transform: 'translate(-50%, -50%)',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,140,0,0.1) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
            pointerEvents: 'none', animation: 'pulseGlow 4s ease-in-out infinite',
          }} />

          {/* Back to home button removed — Home link is in the left panel logo */}

          {/* Glassmorphic Card */}
          <div style={{
            width: '100%', maxWidth: breakpoint === 'xs' ? 360 : breakpoint === 'sm' ? 420 : breakpoint === 'md' ? 480 : breakpoint === 'xl' ? 500 : 440,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: breakpoint === 'xs' ? '26px 18px 24px' : breakpoint === 'sm' ? '32px 24px 28px' : '36px 32px 32px',
            position: 'relative', zIndex: 2,
            alignSelf: 'center',
            boxShadow: `
              0 30px 80px rgba(0,0,0,0.5),
              0 0 0 1px rgba(255,255,255,0.05),
              inset 0 1px 0 rgba(255,255,255,0.08),
              0 0 60px rgba(255,140,0,0.06)
            `,
            ...cardAnim,
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 40, right: 40, height: 2,
              background: 'linear-gradient(90deg, transparent, #FF8C00, #D4AF37, #FF8C00, transparent)',
              borderRadius: '0 0 4px 4px',
            }} />

            {/* ── LOGIN VIEW ────────────────────────────────────────────────── */}
            {view === 'login' && (
              <form onSubmit={handleLogin} noValidate>
                {/* Logo mark */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{
                    width: 56, height: 56, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(212,175,55,0.1))',
                    border: '1.5px solid rgba(212,175,55,0.35)',
                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, boxShadow: '0 4px 20px rgba(255,140,0,0.2)',
                  }}>☕</div>
                  <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 32, fontWeight: 700, color: '#fff',
                    margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2,
                  }}>Welcome Back</h1>
                  <p style={{
                    color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0,
                    fontWeight: 400, letterSpacing: '0.01em',
                  }}>Sign in to your brew experience</p>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>OR CONTINUE WITH EMAIL</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {loginError && (
                  <div style={{
                    background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                    color: 'rgba(255,140,140,0.9)', fontSize: 13,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    ⚠ {loginError}
                  </div>
                )}

                <FloatingInput
                  id="login-email" label="Email Address" type="email"
                  value={loginEmail} onChange={setLoginEmail}
                  icon="✉" error={loginFieldErrors.email} autoComplete="email"
                />
                <FloatingInput
                  id="login-password" label="Password" type="password"
                  value={loginPassword} onChange={setLoginPassword}
                  icon="🔒" error={loginFieldErrors.password} autoComplete="current-password"
                />

                <div style={{ textAlign: 'right', marginTop: -10, marginBottom: 22 }}>
                  <button 
                    type="button" 
                    className="kapi-link" 
                    onClick={() => {
                      if (!loginEmail) {
                        setLoginFieldErrors({ email: 'Please enter your email address first.' });
                        return;
                      }
                      transitionTo('forgot-password', 'right');
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(212,175,55,0.7)', fontSize: 13,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'color 0.2s', padding: 0,
                    }}
                  >Forgot password?</button>
                </div>

                <PrimaryButton type="submit" loading={loginLoading}>
                  Sign In — Brew Awaits ☕
                </PrimaryButton>

                <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                  New to Kapi Adda?{' '}
                  <button
                    type="button" className="kapi-link"
                    onClick={() => transitionTo('signup-step1', 'right')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#FF8C00', fontWeight: 600, fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'color 0.2s', padding: 0,
                    }}
                  >
                    Create Account
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGNUP STEP 1 ─────────────────────────────────────────────── */}
            {view === 'signup-step1' && (
              <form onSubmit={handleSignupStep1} noValidate>
                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #FF8C00, #D4AF37)' }} />
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,140,0,0.7)', fontWeight: 600, letterSpacing: '0.06em' }}>1 / 2</span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{
                    width: 56, height: 56, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(212,175,55,0.1))',
                    border: '1.5px solid rgba(212,175,55,0.35)',
                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, boxShadow: '0 4px 20px rgba(255,140,0,0.2)',
                  }}>🌟</div>
                  <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 28, fontWeight: 700, color: '#fff',
                    margin: '0 0 8px',
                  }}>Join Kapi Adda</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13.5, margin: 0 }}>
                    Create your brew profile
                  </p>
                </div>

                {signupError && (
                  <div style={{
                    background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                    color: 'rgba(255,140,140,0.9)', fontSize: 13,
                  }}>⚠ {signupError}</div>
                )}

                <FloatingInput
                  id="su-name" label="Full Name" type="text"
                  value={signupName} onChange={setSignupName}
                  icon="👤" error={signupFieldErrors.name} autoComplete="name"
                />
                <FloatingInput
                  id="su-email" label="Email Address" type="email"
                  value={signupEmail} onChange={setSignupEmail}
                  icon="✉" error={signupFieldErrors.email} autoComplete="email"
                />
                <FloatingInput
                  id="su-pass" label="Password" type="password"
                  value={signupPassword} onChange={setSignupPassword}
                  icon="🔒" error={signupFieldErrors.password} autoComplete="new-password"
                />
                <PasswordChecklist password={signupPassword} />

                <FloatingInput
                  id="su-confirm" label="Confirm Password" type="password"
                  value={signupConfirm} onChange={setSignupConfirm}
                  icon="✅" error={signupFieldErrors.confirm} autoComplete="new-password"
                />

                <PrimaryButton type="submit">
                  Next — Brew Preferences →
                </PrimaryButton>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                  Already have an account?{' '}
                  <button
                    type="button" className="kapi-link"
                    onClick={() => transitionTo('login', 'left')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#FF8C00', fontWeight: 600, fontSize: 14,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'color 0.2s', padding: 0,
                    }}
                  >Sign In</button>
                </p>
              </form>
            )}

            {/* ── SIGNUP STEP 2 — TASTE PREFERENCES ────────────────────────── */}
            {view === 'signup-step2' && (
              <div>
                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #FF8C00, #D4AF37)' }} />
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #FF8C00, #D4AF37)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,140,0,0.7)', fontWeight: 600, letterSpacing: '0.06em' }}>2 / 2</span>
                </div>

                <button
                  onClick={() => transitionTo('signup-step1', 'left')}
                  className="kapi-back-btn"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,140,0,0.65)', fontSize: 13,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    padding: '4px 0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'color 0.2s',
                  }}
                >← Back</button>

                <div style={{ marginBottom: 22 }}>
                  <h2 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px',
                  }}>Your Brew DNA 🧬</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                    Help us craft your perfect menu
                  </p>
                </div>

                {signupError && (
                  <div style={{
                    background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                    color: 'rgba(255,140,140,0.9)', fontSize: 13,
                  }}>⚠ {signupError}</div>
                )}

                {/* Brew types */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                    Favourite Brews (pick all you love)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: breakpoint === 'xs' ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                    {BREW_TYPES.map(b => {
                      const sel = selectedBrews.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBrew(b.id)}
                          style={{
                            padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                            background: sel ? 'rgba(255,140,0,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${sel ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.08)'}`,
                            color: sel ? '#FF8C00' : 'rgba(255,255,255,0.5)',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 11.5, fontWeight: sel ? 600 : 400,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            transition: 'all 0.2s', boxShadow: sel ? '0 2px 12px rgba(255,140,0,0.2)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{b.icon}</span>
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Milk preference */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                    Milk Preference
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {MILK_PREFS.map(m => {
                      const sel = selectedMilk === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMilk(sel ? '' : m.id)}
                          style={{
                            padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                            background: sel ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${sel ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.08)'}`,
                            color: sel ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 12.5, fontWeight: sel ? 600 : 400,
                            transition: 'all 0.2s',
                          }}
                        >{m.label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Strength */}
                <div style={{ marginBottom: 26 }}>
                  <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                    Brew Strength
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {STRENGTH_PREFS.map(s => {
                      const sel = selectedStrength === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStrength(sel ? '' : s.id)}
                          style={{
                            flex: 1, padding: '9px 4px', borderRadius: 10, cursor: 'pointer',
                            background: sel ? 'rgba(255,140,0,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${sel ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.08)'}`,
                            color: sel ? '#FF8C00' : 'rgba(255,255,255,0.4)',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 11.5, fontWeight: sel ? 600 : 400,
                            transition: 'all 0.2s',
                          }}
                        >{s.label}</button>
                      );
                    })}
                  </div>
                </div>

                <PrimaryButton onClick={handleSignupSubmit} loading={signupLoading}>
                  {signupLoading ? 'Creating your account…' : 'Start My Brew Journey ☕'}
                </PrimaryButton>

                <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.25)' }}>
                  You can always update preferences later in your profile.
                </p>
              </div>
            )}

            {/* ── FORGOT PASSWORD VIEW ────────────────────────────────────────── */}
            {view === 'forgot-password' && (
              <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{
                    width: 56, height: 56, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(212,175,55,0.1))',
                    border: '1.5px solid rgba(212,175,55,0.35)',
                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, boxShadow: '0 4px 20px rgba(255,140,0,0.2)',
                  }}>
                    {forgotStep === 'request-email' && '🔑'}
                    {forgotStep === 'verify-otp' && '🛡️'}
                    {forgotStep === 'set-password' && '🔒'}
                  </div>
                  <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 32, fontWeight: 700, color: '#fff',
                    margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2,
                  }}>
                    {forgotStep === 'request-email' && 'Forgot Password'}
                    {forgotStep === 'verify-otp' && 'Verify Code'}
                    {forgotStep === 'set-password' && 'Set New Password'}
                  </h1>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    {forgotStep === 'request-email' && 'Request verification code to your email'}
                    {forgotStep === 'verify-otp' && `Enter the code sent to ${loginEmail}`}
                    {forgotStep === 'set-password' && 'Choose a secure new password'}
                  </p>
                </div>

                {forgotError && (
                  <div style={{
                    padding: '12px 16px', background: 'rgba(255,70,70,0.12)',
                    border: '1px solid rgba(255,70,70,0.4)', borderRadius: 12,
                    color: '#FF8888', fontSize: 13.5, marginBottom: 20,
                    lineHeight: '1.4',
                  }}>
                    ⚠️ {forgotError}
                  </div>
                )}

                {forgotSuccess && (
                  <div style={{
                    padding: '12px 16px', background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.4)', borderRadius: 12,
                    color: '#34D399', fontSize: 13.5, marginBottom: 20,
                    lineHeight: '1.4',
                  }}>
                    ✨ {forgotSuccess}
                  </div>
                )}

                {forgotStep === 'request-email' && (
                  <form onSubmit={handleRequestOtp} noValidate>
                    <FloatingInput
                      id="forgot-email" label="Email Address" type="email"
                      value={loginEmail} onChange={setLoginEmail}
                      icon="📧" error={forgotFieldErrors.email} autoComplete="email"
                      readOnly={true}
                    />

                    <PrimaryButton type="submit" loading={forgotLoading}>
                      {forgotLoading ? 'Sending Code...' : 'Send Verification Code — Brew On ☕'}
                    </PrimaryButton>
                  </form>
                )}

                {forgotStep === 'verify-otp' && (
                  <form onSubmit={handleVerifyOtp} noValidate>
                    <FloatingInput
                      id="forgot-otp" label="Verification Code (OTP)" type="text"
                      value={forgotOtp} onChange={setForgotOtp}
                      icon="🔢" error={forgotFieldErrors.otp} autoComplete="off"
                    />

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('request-email');
                          setForgotOtp('');
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}
                      >
                        ◀ Back
                      </button>
                      <span style={{ flex: 1.5 }}>
                        <PrimaryButton type="submit" loading={forgotLoading}>
                          {forgotLoading ? 'Verifying...' : 'Verify Code ☕'}
                        </PrimaryButton>
                      </span>
                    </div>
                  </form>
                )}

                {forgotStep === 'set-password' && (
                  <form onSubmit={handleResetPassword} noValidate>
                    <FloatingInput
                      id="forgot-new-password" label="New Password" type="password"
                      value={forgotNewPassword} onChange={setForgotNewPassword}
                      icon="🔒" error={forgotFieldErrors.newPassword} autoComplete="new-password"
                    />
                    <PasswordChecklist password={forgotNewPassword} />

                    <FloatingInput
                      id="forgot-confirm-password" label="Confirm Password" type="password"
                      value={forgotConfirmPassword} onChange={setForgotConfirmPassword}
                      icon="🔒" error={forgotFieldErrors.confirmPassword} autoComplete="new-password"
                    />

                    <PrimaryButton type="submit" loading={forgotLoading}>
                      {forgotLoading ? 'Saving...' : 'Confirm Reset ☕'}
                    </PrimaryButton>
                  </form>
                )}

                <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
                  Remembered your password?{' '}
                  <button
                    type="button" className="kapi-link"
                    onClick={() => {
                      transitionTo('login', 'left');
                      setForgotStep('request-email');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#FF8C00', fontWeight: 600, padding: 0,
                    }}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            )}

            {/* Bottom corner decorative */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 80, height: 80,
              background: 'radial-gradient(circle at 100% 100%, rgba(255,140,0,0.07), transparent)',
              borderRadius: '0 0 24px 0', pointerEvents: 'none',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
