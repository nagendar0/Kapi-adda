'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getImageForItem } from '../utils/imageMapper';
import { useBreakpoint, useScreenProfile } from '../utils/responsive';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000` 
  : 'http://127.0.0.1:8000');


// ─── Constants ───────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES = {
  'Tea': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
  'Coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
  'Milk Shakes': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
  'Coolers': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
  'Fresh Juices': 'https://images.unsplash.com/photo-1534353341965-d5a6e220cc91?w=400',
  'Snacks': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
  'Ice Cream': 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400',
  'default': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
};

const COLORS = {
  bg: '#0a0702',
  bgCard: 'rgba(255, 140, 0, 0.06)',
  bgCardHover: 'rgba(255, 140, 0, 0.12)',
  amber: '#ff8c00',
  amberLight: '#ffaa33',
  gold: '#d4af37',
  goldLight: '#f0d060',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,140,0,0.18)',
  text: '#f5efe0',
  textMuted: '#a08060',
  textDim: '#6b5a3a',
  textSecondary: '#a08060',
  green: '#4ade80',
  red: '#f87171',
  bannerBg: 'rgba(255,140,0,0.12)',
  bannerBorder: 'rgba(255,140,0,0.35)',
};

const FONTS = {
  base: "'Plus Jakarta Sans', 'Inter', sans-serif",
};

// ─── Utility Functions ────────────────────────────────────────────────────────

function getWeatherRecommendation(temp, code, city = 'Chennai') {
  const displayCity = (city || 'Chennai').toUpperCase();
  if (code >= 61 && code <= 67) {
    return {
      icon: '🌧️',
      label: `RAINY WEATHER DETECTED IN ${displayCity}!`,
      suggestion: 'Perfect time for warm Tea, Coffee & crispy Snacks',
      categories: ['Hot Beverages & Puffs', 'Snacks'],
      gradient: 'linear-gradient(135deg, rgba(100,150,255,0.15), rgba(255,140,0,0.10))',
      accentColor: '#7eb3ff',
    };
  }
  if (temp > 28) {
    return {
      icon: '☀️',
      label: `IT'S ${temp}°C IN ${displayCity}!`,
      suggestion: 'Stay cool with Cold Drinks, Milk Shakes & Juices',
      categories: ['Coolers', 'Fresh Juices', 'Milk Shakes', 'Ice Creams'],
      gradient: 'linear-gradient(135deg, rgba(255,200,50,0.15), rgba(255,140,0,0.10))',
      accentColor: '#ffd700',
    };
  }
  return {
    icon: '☕',
    label: `${temp}°C IN ${displayCity} — PERFECT COFFEE WEATHER!`,
    suggestion: 'Enjoy a hot brew or warm puff from our collection',
    categories: ['Hot Beverages & Puffs'],
    gradient: 'linear-gradient(135deg, rgba(180,120,60,0.20), rgba(255,140,0,0.08))',
    accentColor: COLORS.amber,
  };
}

function StarRating({ rating }) {
  const stars = Math.round(rating || 0);
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= stars ? COLORS.gold : COLORS.textDim }}>★</span>
      ))}
    </span>
  );
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── FoodCard ────────────────────────────────────────────────────────────────

function FoodCard({ item, onViewFood, breakpoint, isCarousel = true }) {
  const [hovered, setHovered] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);
  const imgSrc = getImageForItem(item);
  const isXs = breakpoint === 'xs';
  const isSm = breakpoint === 'sm';
  const cardWidth = isXs ? 'calc((100vw - 44px) / 2)' : isSm ? 168 : breakpoint === 'md' ? 196 : breakpoint === 'lg' ? 220 : 244;
  const imgHeight = isXs ? 110 : isSm ? 125 : breakpoint === 'md' ? 140 : breakpoint === 'lg' ? 150 : 164;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setImgHovered(false); }}
      style={{
        minWidth: isCarousel ? cardWidth : undefined,
        maxWidth: isCarousel ? cardWidth : undefined,
        width: isCarousel ? undefined : '100%',
        boxSizing: 'border-box',
        flexShrink: isCarousel ? 0 : undefined,
        borderRadius: 20,
        background: hovered ? COLORS.bgCardHover : COLORS.bgCard,
        border: `1.5px solid ${hovered ? COLORS.amber : COLORS.surfaceBorder}`,
        boxShadow: hovered
          ? `0 8px 40px rgba(255,140,0,0.22), 0 2px 12px rgba(0,0,0,0.5)`
          : `0 2px 16px rgba(0,0,0,0.35)`,
        transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Image */}
      <div
        style={{ position: 'relative', width: '100%', height: imgHeight, overflow: 'hidden' }}
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
      >
        <img
          src={imgSrc}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: imgHovered ? 'scale(1.10)' : 'scale(1.00)',
            transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
            display: 'block',
          }}
          onError={(e) => { e.target.src = PLACEHOLDER_IMAGES['default']; }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,7,2,0.85) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        {/* Availability Badge */}
        <div style={{
          position: 'absolute',
          top: 8, right: 8,
          background: item.is_available !== false ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
          border: `1px solid ${item.is_available !== false ? COLORS.green : COLORS.red}`,
          color: item.is_available !== false ? COLORS.green : COLORS.red,
          fontSize: isXs ? 9 : 10,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 20,
          backdropFilter: 'blur(8px)',
          letterSpacing: 0.5,
        }}>
          {item.is_available !== false ? '● Available' : '● Unavailable'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: isXs ? '10px 10px 12px' : '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{
          fontSize: isXs ? 11 : 13,
          color: COLORS.textMuted,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {item.category || 'Beverage'}
        </div>
        <div style={{
          fontSize: isXs ? 13 : 15,
          fontWeight: 700,
          color: COLORS.text,
          lineHeight: 1.3,
          minHeight: isXs ? 28 : 36,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <span>{item.name}</span>
          {item.pieces && (
            <span style={{
              fontSize: '10px',
              background: 'rgba(255,140,0,0.08)',
              color: '#ff8c00',
              padding: '1px 5px',
              borderRadius: 4,
              fontWeight: '700',
              width: 'fit-content',
              marginTop: '4px',
              border: '1px solid rgba(255,140,0,0.15)'
            }}>
              {item.pieces}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StarRating rating={item.rating !== undefined && item.rating !== null ? item.rating : (item.average_rating || 0)} />
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            ({item.rating_count || item.total_ratings || 0})
          </span>
        </div>
        <div style={{
          fontSize: isXs ? 15 : 18,
          fontWeight: 800,
          color: COLORS.amber,
          marginTop: 2,
        }}>
          ₹{parseFloat(item.price || 0).toFixed(0)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onViewFood && onViewFood(item); }}
          style={{
            marginTop: 6,
            padding: isXs ? '7px 0' : '9px 0',
            borderRadius: 12,
            border: `1.5px solid ${COLORS.amber}`,
            background: hovered
              ? `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.gold})`
              : 'transparent',
            color: hovered ? '#0a0702' : COLORS.amber,
            fontFamily: FONTS.base,
            fontSize: isXs ? 11 : 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.22s ease',
            width: '100%',
            letterSpacing: 0.5,
          }}
        >
          View Details →
        </button>
      </div>
    </div>
  );
}

// ─── Carousel Section ─────────────────────────────────────────────────────────

function CarouselSection({ title, icon, items, onViewFood, accentColor, breakpoint }) {
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, items]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 480, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  const accent = accentColor || COLORS.amber;

  return (
    <section style={{ marginBottom: isMobile ? 28 : 44, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 12 : 18, paddingRight: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: isMobile ? 18 : 24 }}>{icon}</span>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? 16 : 20,
            fontWeight: 800,
            color: COLORS.text,
            fontFamily: FONTS.base,
            letterSpacing: -0.3,
          }}>
            {title}
          </h2>
          <div style={{
            width: 40, height: 3, borderRadius: 2,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
            marginLeft: 4,
          }} />
        </div>
        {/* Arrow buttons — hidden on mobile (swipe instead) */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ dir: -1, label: '‹', can: canScrollLeft }, { dir: 1, label: '›', can: canScrollRight }].map(({ dir, label, can }) => (
              <button
                key={dir}
                onClick={() => scroll(dir)}
                disabled={!can}
                style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  border: `1.5px solid ${can ? accent : COLORS.textDim}`,
                  background: can ? `rgba(255,140,0,0.10)` : 'transparent',
                  color: can ? accent : COLORS.textDim,
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: can ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s ease',
                  lineHeight: 1,
                  padding: 0,
                  opacity: can ? 1 : 0.35,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: isMobile ? 12 : 16,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 12,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          margin: breakpoint === 'xs' ? '0 -10px' : breakpoint === 'sm' ? '0 -16px' : breakpoint === 'md' ? '0 -20px' : '0',
          padding: breakpoint === 'xs' ? '0 10px 12px 10px' : breakpoint === 'sm' ? '0 16px 12px 16px' : breakpoint === 'md' ? '0 20px 12px 20px' : '0 0 12px 0',
          maxWidth: breakpoint === 'xs' ? 'calc(100vw - 20px)' : breakpoint === 'sm' ? 'calc(100vw - 32px)' : '100%',
          width: '100%',
          boxSizing: 'border-box',
          overscrollBehaviorX: 'contain',
        }}
      >
        <style>{`
          .carousel-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        {items.map((item, i) => (
          <FoodCard key={item.id || item._id || i} item={item} onViewFood={onViewFood} breakpoint={breakpoint} isCarousel={true} />
        ))}
      </div>
    </section>
  );
}

// ─── Weather Banner ───────────────────────────────────────────────────────────

function WeatherBanner({ weather, onViewFood, menuItems, breakpoint }) {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isXs = breakpoint === 'xs';
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';

  if (!weather || dismissed) return null;

  const rec = getWeatherRecommendation(weather.temp, weather.code, weather.city);
  const recItems = menuItems.filter(i =>
    rec.categories.some(cat => (i.category || '').toLowerCase().includes(cat.toLowerCase()))
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        border: `1.5px solid ${COLORS.bannerBorder}`,
        background: rec.gradient,
        backdropFilter: 'blur(16px)',
        padding: isXs ? '14px 16px' : '20px 24px',
        marginBottom: 36,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: isXs ? 10 : 16,
        boxShadow: hovered
          ? `0 4px 32px rgba(255,140,0,0.18)`
          : `0 2px 16px rgba(0,0,0,0.3)`,
        transition: 'box-shadow 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Shimmer line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${rec.accentColor}, transparent)`,
        opacity: 0.7,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: isXs ? 10 : 16, flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isXs ? 28 : 40,
          filter: 'drop-shadow(0 0 10px rgba(255,200,50,0.4))',
          animation: 'pulse 2.5s ease-in-out infinite',
        }}>
          {rec.icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: isXs ? 11 : 13,
            fontWeight: 600,
            color: rec.accentColor,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>
            {rec.label}
          </div>
          <div style={{
            fontSize: isXs ? 13 : 16,
            fontWeight: 700,
            color: COLORS.text,
            marginTop: 3,
          }}>
            {rec.suggestion}
          </div>
          {!isXs && recItems.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', minWidth: 0 }}>
              {recItems.slice(0, 3).map((item, i) => (
                <button
                  key={i}
                  onClick={() => onViewFood && onViewFood(item)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: `1px solid ${rec.accentColor}`,
                    background: `rgba(255,255,255,0.06)`,
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: FONTS.base,
                    transition: 'background 0.18s',
                  }}
                >
                  {item.name} · ₹{parseFloat(item.price || 0).toFixed(0)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none',
          color: COLORS.textMuted, fontSize: 20,
          cursor: 'pointer', lineHeight: 1, padding: 4,
          flexShrink: 0,
          alignSelf: isMobile ? 'flex-end' : 'center',
          position: isMobile ? 'absolute' : 'static',
          top: isMobile ? 10 : 'auto',
          right: isMobile ? 12 : 'auto',
        }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── Category Filter Pills ────────────────────────────────────────────────────

function CategoryPills({ categories, active, onChange, breakpoint }) {
  const isXs = breakpoint === 'xs';
  const scrollRef = useRef(null);

  return (
    <div style={{ marginBottom: isXs ? 24 : 36, position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: isXs ? 7 : 10,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 6,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          margin: isXs ? '0 -10px' : '0',
          padding: isXs ? '0 10px 6px 10px' : '0',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overscrollBehaviorX: 'contain',
        }}
      >
        {['All', ...categories].map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              style={{
                flexShrink: 0,
                padding: isXs ? '7px 14px' : '9px 20px',
                borderRadius: 50,
                border: `1.5px solid ${isActive ? COLORS.amber : COLORS.surfaceBorder}`,
                background: isActive
                  ? `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.gold})`
                  : 'rgba(255,140,0,0.05)',
                color: isActive ? '#0a0702' : COLORS.textMuted,
                fontSize: isXs ? 12 : 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                fontFamily: FONTS.base,
                transition: 'all 0.2s ease',
                boxShadow: isActive ? `0 2px 16px rgba(255,140,0,0.30)` : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'hidden', marginBottom: 44, width: '100%', maxWidth: '100%' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            minWidth: 220, height: 320, borderRadius: 20,
            background: 'rgba(255,140,0,0.06)',
            border: '1.5px solid rgba(255,140,0,0.10)',
            animation: 'shimmer 1.6s infinite',
          }}
        />
      ))}
    </div>
  );
}

// ─── Header Greeting ──────────────────────────────────────────────────────────

function GreetingHeader({ user, onOpenChat, breakpoint }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = user?.name || user?.username || 'Guest';
  const isXs = breakpoint === 'xs';
  const isSm = breakpoint === 'sm';

  return (
    <div style={{
      display: 'flex',
      alignItems: isXs ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      marginBottom: isXs ? 20 : 36,
      flexWrap: 'wrap',
      gap: 12,
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
    }}>
      <div style={{ minWidth: 0, flex: '1 1 240px' }}>
        <div style={{
          fontSize: isXs ? 11 : 13,
          fontWeight: 600,
          color: COLORS.amber,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {greeting} ☀️
        </div>
        <h1 style={{
          margin: 0,
          fontSize: isXs ? 22 : isSm ? 26 : 30,
          fontWeight: 900,
          color: COLORS.text,
          fontFamily: FONTS.base,
          letterSpacing: -0.5,
          lineHeight: 1.2,
        }}>
          Welcome back,{' '}
          <span style={{
            background: `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.goldLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {name}
          </span>
          !
        </h1>
        <div style={{ fontSize: isXs ? 12 : 14, color: COLORS.textMuted, marginTop: 4 }}>
          What would you like to savour today?
        </div>
      </div>
    </div>
  );
}

function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * CustomerHome — Main landing page for logged-in customers of Kapi Adda.
 *
 * @param {Object}   props
 * @param {Object}   [props.user]         - Authenticated user object { name, username, preferences[] }
 * @param {Function} [props.onViewFood]   - Called with (menuItem) when user clicks "View Details"
 * @param {Function} [props.onOpenChat]   - Called when user clicks the chat button
 */
// Custom hook to detect responsive screen size categories (xs, sm, md, lg, xl)
export default function CustomerHome({ user, onViewFood, onOpenChat, breakpoint: passedBreakpoint }) {
  const internalBreakpoint = useBreakpoint();
  const breakpoint = passedBreakpoint || internalBreakpoint;
  const screen = useScreenProfile(breakpoint);
  const [menuItems, setMenuItems] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [offers, setOffers] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    const DEFAULT_OFFERS = {
      1: {
        dayName: "Monday",
        title: "Buy 3 Milkshakes, Get 1 Free",
        subtitle: "Blended with fresh ice cream & premium toppings ❤️",
        imageUrl: "/offers/monday_offer.png",
        isActive: true
      },
      2: {
        dayName: "Tuesday",
        title: "Buy 1 Tea, Get 1 Biscuit Free",
        subtitle: "Start your day with hot brewing chai & snacks ☕",
        imageUrl: "/offers/tuesday_offer.png",
        isActive: true
      },
      3: {
        dayName: "Wednesday",
        title: "Get 1 Free Campa Cola",
        subtitle: "On Non-Veg Snacks bill above ₹200 🍗",
        imageUrl: "/offers/wednesday_offer.png",
        isActive: true
      },
      4: {
        dayName: "Thursday",
        title: "Buy 3 Scoops of Ice Cream, Get 1 Scoop Free",
        subtitle: "Chilled creaminess in your favorite fruit flavors 🍧",
        imageUrl: "/offers/thursday_offer.png",
        isActive: true
      },
      5: {
        dayName: "Friday",
        title: "10% Off on Milkshakes",
        subtitle: "Thick creamy shakes to fuel your Friday night 🥛",
        imageUrl: "/offers/friday_offer.png",
        isActive: true
      },
      6: {
        dayName: "Saturday",
        title: "Get 1 Free Campa Cola",
        subtitle: "On Veg Snacks bill above ₹200 🍔",
        imageUrl: "/offers/saturday_offer.png",
        isActive: true
      },
      0: {
        dayName: "Sunday",
        title: "Savour the Flavor of Kapi Adda",
        subtitle: "Gather with friends & enjoy premium brews and snacks ☕",
        imageUrl: "/offers/default_branding.png",
        isActive: false
      }
    };

    const loadOffers = () => {
      fetch(`${API_BASE}/api/offers`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setOffers(data);
            localStorage.setItem('kapi_daily_offers', JSON.stringify(data));
          } else {
            const stored = localStorage.getItem('kapi_daily_offers');
            if (stored) setOffers(JSON.parse(stored));
          }
        })
        .catch(() => {
          const stored = localStorage.getItem('kapi_daily_offers');
          if (stored) setOffers(JSON.parse(stored));
        });
    };

    loadOffers();

    window.addEventListener('storage', loadOffers);
    window.addEventListener('kapi_offers_updated', loadOffers);
    return () => {
      window.removeEventListener('storage', loadOffers);
      window.removeEventListener('kapi_offers_updated', loadOffers);
    };
  }, []);

  // ── Fetch menu ──
  const loadMenu = () => {
    fetch(`${API_BASE}/api/menu?t=` + Date.now())
      .then((r) => r.json())
      .then((data) => {
        let items = [];
        if (Array.isArray(data)) {
          if (data.length > 0 && data[0].items !== undefined) {
            const fetchedCats = data.map(catGroup => catGroup.category).filter(Boolean);
            setCategoriesList(fetchedCats);
            items = data.flatMap(catGroup => 
              (catGroup.items || []).map(item => ({
                ...item,
                category: catGroup.category
              }))
            );
          } else {
            items = data;
          }
        } else if (data.items) {
          items = data.items;
        }
        setMenuItems(items);
      })
      .catch((err) => {
        console.error('Menu fetch error:', err);
        setError('Could not load menu. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu();
    window.addEventListener('kapi_menu_updated', loadMenu);
    return () => {
      window.removeEventListener('kapi_menu_updated', loadMenu);
    };
  }, []);

  // ── Fetch weather based on geolocation ──
  useEffect(() => {
    const fetchWeatherForCoords = (lat, lon, cityName = 'Chennai') => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`
      )
        .then((r) => r.json())
        .then((data) => {
          const temp = data.current?.temperature_2m;
          const code = data.current?.weathercode;
          if (temp !== undefined) {
            setWeather({ temp, code, city: cityName });
          }
        })
        .catch((err) => console.warn('Weather fetch error:', err));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          // Reverse geocode to get city name
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
            .then((res) => res.json())
            .then((geoData) => {
              const detectedCity = geoData.city || geoData.locality || geoData.principalSubdivision || 'your area';
              fetchWeatherForCoords(lat, lon, detectedCity);
            })
            .catch(() => {
              // Fallback to coordinates with default name if geocoding fails
              fetchWeatherForCoords(lat, lon, 'your area');
            });
        },
        (error) => {
          console.warn('Geolocation error, falling back to Chennai:', error.message);
          fetchWeatherForCoords(13.08, 80.27, 'Chennai');
        },
        { timeout: 8000 }
      );
    } else {
      fetchWeatherForCoords(13.08, 80.27, 'Chennai');
    }
  }, []);

  // ── Derived data ──
  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter((i) => (i.category || '').toLowerCase() === activeCategory.toLowerCase());

  const categories = categoriesList.length > 0
    ? categoriesList
    : [...new Set(menuItems.map((i) => i.category).filter(Boolean))];

  const featuredItems = [...menuItems]
    .filter((i) => i.is_available !== false)
    .sort((a, b) => (b.rating || b.average_rating || 0) - (a.rating || a.average_rating || 0))
    .slice(0, 8);

  const availableItems = menuItems.filter((i) => i.is_available !== false);
  const shuffled1 = shuffleArray(availableItems);
  const popularItems = shuffled1.slice(0, 6);
  const shuffled2 = shuffleArray(availableItems.filter((i) => !popularItems.includes(i)));
  const trendingItems = shuffled2.slice(0, 6);

  const recommendedItems = (() => {
    const prefs = user?.preferences || [];
    if (prefs.length > 0) {
      const matched = menuItems.filter((i) =>
        prefs.some((p) => (i.category || '').toLowerCase().includes(p.toLowerCase()) ||
          (i.name || '').toLowerCase().includes(p.toLowerCase()))
      );
      if (matched.length > 0) return matched.slice(0, 8);
    }
    return shuffleArray(availableItems).slice(0, 6);
  })();

  // ── Render ──
  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        body {
          background: #0a0702;
          color: #f5efe0;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        }

        @keyframes shimmer {
          0%   { opacity: 0.5; }
          50%  { opacity: 1; }
          100% { opacity: 0.5; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .carousel-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: `radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,140,0,0.08) 0%, ${COLORS.bg} 60%)`,
          fontFamily: FONTS.base,
          padding: breakpoint === 'xs' ? '12px 10px 80px' : breakpoint === 'sm' ? '16px 16px 80px' : breakpoint === 'md' ? '24px 20px 60px' : breakpoint === 'lg' ? '36px 28px 60px' : '42px 32px 72px',
          maxWidth: breakpoint === 'xl' ? 1440 : 1200,
          width: '100%',
          boxSizing: 'border-box',
          margin: '0 auto',
          animation: 'fadeInUp 0.5s ease both',
          overflowX: 'hidden',
        }}
      >
        {/* Greeting Header */}
        <GreetingHeader user={user} onOpenChat={onOpenChat} breakpoint={breakpoint} />

        {/* Swiggy/Zomato Style Search Bar with Related Items Spelling suggestion overlay */}
        <div style={{ position: 'relative', width: '100%', maxWidth: (breakpoint === 'xs' || breakpoint === 'sm') ? '100%' : '600px', margin: '0 auto 24px auto', zIndex: 30, boxSizing: 'border-box' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1.5px solid ${isSearchFocused ? COLORS.amber : 'rgba(255, 140, 0, 0.15)'}`,
            borderRadius: '16px',
            padding: '12px 18px',
            gap: '12px',
            transition: 'all 0.3s ease',
            boxShadow: isSearchFocused ? '0 0 15px rgba(245, 158, 11, 0.2)' : 'none',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: '18px', color: isSearchFocused ? COLORS.amber : COLORS.textSecondary }}>🔍</span>
            <input
              type="text"
              placeholder="Search for dishes, snacks, shakes, or cakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} // short delay to allow clicks on dropdown
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: breakpoint === 'xs' ? '13px' : '15px',
                outline: 'none',
                fontWeight: '500'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: COLORS.textSecondary,
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search suggestions overlay */}
          {isSearchFocused && searchQuery.trim() !== '' && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#0f0b06',
              border: '1.5px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '16px',
              marginTop: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              maxHeight: '320px',
              overflowY: 'auto',
              zIndex: 40,
              padding: '8px 0',
              boxSizing: 'border-box',
            }} className="no-scrollbar">
              {(() => {
                const queryLower = searchQuery.toLowerCase().trim();
                const matches = menuItems.filter(item => {
                  const nameLower = item.name.toLowerCase();
                  const catLower = (item.category || "").toLowerCase();
                  const descLower = (item.description || "").toLowerCase();
                  
                  // Substring matches
                  if (nameLower.includes(queryLower) || catLower.includes(queryLower) || descLower.includes(queryLower)) {
                    return true;
                  }
                  
                  // Spelling related match: fuzzy checking word edit distances
                  if (queryLower.length >= 3) {
                    const queryWords = queryLower.split(/\s+/);
                    return queryWords.every(word => {
                      const maxDistance = word.length <= 3 ? 0 : word.length <= 5 ? 1 : 2;
                      return nameLower.split(/\s+/).some(nameWord => {
                        return nameWord.startsWith(word) || getEditDistance(word, nameWord) <= maxDistance;
                      });
                    });
                  }
                  return false;
                });

                if (matches.length === 0) {
                  return (
                    <div style={{ padding: '24px', textAlign: 'center', color: COLORS.textSecondary, fontSize: '14px' }}>
                      No dishes found. Try searching for "chocolate", "chicken", "tea", or "momos"...
                    </div>
                  );
                }

                return matches.map(item => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onViewFood?.(item);
                      setSearchQuery('');
                      setIsSearchFocused(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      borderBottom: '1px solid rgba(255,255,255,0.02)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 140, 0, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {(() => {
                      const itemImg = getImageForItem(item);
                      return (
                        <img
                          src={itemImg}
                          alt={item.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        />
                      );
                    })()}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                          {item.name}
                        </span>
                        {item.pieces && (
                          <span style={{
                            fontSize: '9px',
                            background: 'rgba(255,140,0,0.1)',
                            color: '#ff8c00',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255,140,0,0.15)'
                          }}>
                            {item.pieces}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>
                        {item.category}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.amber }}>
                      ₹{item.price}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Daily Offer Banner */}
        {offers && (() => {
          const today = new Date().getDay();
          const activeOffer = offers[today];
          const showOffer = activeOffer && activeOffer.isActive;
          const bannerTitle = showOffer ? activeOffer.title : "Savour the Flavor of Kapi Adda";
          const bannerSubtitle = showOffer ? activeOffer.subtitle : "Gather with friends & enjoy premium brews and snacks ☕";
          const bannerImage = showOffer ? activeOffer.imageUrl : "/offers/default_branding.png";
          
          return (
            <div 
              style={{
                position: 'relative',
                minHeight: breakpoint === 'xs' ? '160px' : breakpoint === 'sm' ? '200px' : '240px',
                borderRadius: '24px',
                border: '1.5px solid rgba(245, 158, 11, 0.3)',
                background: `linear-gradient(to right, rgba(12, 8, 4, 0.95) 45%, rgba(12, 8, 4, 0.4) 100%), url(${bannerImage}) center / cover no-repeat`,
                display: 'flex',
                alignItems: 'center',
                padding: breakpoint === 'xs' ? '16px 18px' : '24px 32px',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                transition: 'all 0.5s ease-in-out',
                animation: 'fadeInOffer 0.8s ease-out'
              }}
            >
              <style>{`
                @keyframes fadeInOffer {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseOffer {
                  0%, 100% { transform: scale(1) rotate(-10deg); }
                  50% { transform: scale(1.05) rotate(-10deg); }
                }
              `}</style>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2, maxWidth: breakpoint === 'xs' ? '100%' : '65%', minWidth: 0 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  width: 'fit-content',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ★ {showOffer ? "Today's Offer" : "Special Day"} ★
                </div>
                
                <h2 style={{
                  fontSize: breakpoint === 'xs' ? '20px' : breakpoint === 'sm' ? '24px' : '30px',
                  fontWeight: '800',
                  color: '#fff',
                  margin: 0,
                  lineHeight: '1.15',
                  letterSpacing: '-0.5px',
                  fontFamily: FONTS.base,
                  textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                  overflowWrap: 'anywhere',
                }}>
                  {bannerTitle}
                </h2>
                
                <p style={{
                  fontSize: '14px',
                  color: '#d1d5db',
                  margin: '4px 0 0 0',
                  lineHeight: '1.4',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                }}>
                  {bannerSubtitle}
                </p>
              </div>
              
              {/* Circular Dash Badge — hidden on XS */}
              {breakpoint !== 'xs' && (
              <div style={{
                marginLeft: 'auto',
                marginRight: '20px',
                width: '105px',
                height: '105px',
                borderRadius: '50%',
                border: '2.5px dashed rgba(245, 158, 11, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                zIndex: 2,
                background: 'rgba(10,7,2,0.65)',
                backdropFilter: 'blur(4px)',
                transform: 'rotate(-10deg)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                animation: 'pulseOffer 3s infinite'
              }}>
                <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.5px' }}>Valid</span>
                <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', margin: '2px 0' }}>Today</span>
                <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#f59e0b', letterSpacing: '0.5px' }}>Only</span>
              </div>
              )}
            </div>
          );
        })()}

        {/* Weather Recommendation Banner */}
        {weather && (
          <WeatherBanner
            weather={weather}
            menuItems={menuItems}
            onViewFood={onViewFood}
            breakpoint={breakpoint}
          />
        )}

        {/* Category Filter Pills */}
        {!loading && categories.length > 0 && (
          <div id="food-menu-section">
            <CategoryPills
              categories={categories}
              active={activeCategory}
              onChange={setActiveCategory}
              breakpoint={breakpoint}
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            borderRadius: 16,
            border: '1.5px solid rgba(248,113,113,0.3)',
            background: 'rgba(248,113,113,0.08)',
            padding: '20px 24px',
            color: COLORS.red,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 32,
            textAlign: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <>
            <div style={{ marginBottom: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ marginBottom: 44 }}>
                  <div style={{
                    width: 200, height: 24, borderRadius: 8,
                    background: 'rgba(255,140,0,0.08)',
                    marginBottom: 16,
                    animation: 'shimmer 1.6s infinite',
                  }} />
                  <LoadingSkeleton />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Carousel Sections */}
        {!loading && !error && (
          <>
            {/* When category filter is active, show filtered grid instead */}
            {activeCategory !== 'All' ? (
              <div>
                <h2 style={{
                  margin: '0 0 20px',
                  fontSize: 20, fontWeight: 800, color: COLORS.text,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: COLORS.amber }}>#</span> {activeCategory}
                  <span style={{
                    fontSize: 13, color: COLORS.textMuted, fontWeight: 500,
                  }}>
                    · {filteredItems.length} items
                  </span>
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: screen.menuColumns,
                  gap: screen.gap,
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                }}>
                  {filteredItems.map((item, i) => (
                    <FoodCard key={item.id || item._id || i} item={item} onViewFood={onViewFood} breakpoint={breakpoint} isCarousel={false} />
                  ))}
                </div>
                {filteredItems.length === 0 && (
                  <div style={{
                    textAlign: 'center', color: COLORS.textMuted,
                    padding: '60px 0', fontSize: 15,
                  }}>
                    No items found in this category.
                  </div>
                )}
              </div>
            ) : (
              <>
                <CarouselSection
                  title="Featured Items"
                  icon="⭐"
                  items={featuredItems}
                  onViewFood={onViewFood}
                  accentColor={COLORS.gold}
                  breakpoint={breakpoint}
                />
                <CarouselSection
                  title="Popular Right Now"
                  icon="🔥"
                  items={popularItems}
                  onViewFood={onViewFood}
                  accentColor={COLORS.amber}
                  breakpoint={breakpoint}
                />
                <CarouselSection
                  title="Trending Today"
                  icon="📈"
                  items={trendingItems}
                  onViewFood={onViewFood}
                  accentColor="#a78bfa"
                  breakpoint={breakpoint}
                />
                <CarouselSection
                  title="Recommended For You"
                  icon="💡"
                  items={recommendedItems}
                  onViewFood={onViewFood}
                  accentColor="#34d399"
                  breakpoint={breakpoint}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
