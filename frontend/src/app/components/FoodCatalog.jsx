'use client';

import { useState, useEffect, useMemo } from 'react';
import { getImageForItem } from '../utils/imageMapper';
import { useScreenProfile } from '../utils/responsive';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000` 
  : 'http://127.0.0.1:8000');


function StarRating({ rating, count }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {stars.map((star) => (
          <svg
            key={star}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={star <= Math.round(rating) ? '#f59e0b' : 'none'}
            stroke={star <= Math.round(rating) ? '#f59e0b' : '#6b7280'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
        {rating?.toFixed(1)} ({count || 0})
      </span>
    </div>
  );
}

function FoodCard({ item, onViewFood, onAddToCart, cart, breakpoint }) {
  const [hovered, setHovered] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);
  const [addedPulse, setAddedPulse] = useState(false);

  const inCart = cart?.some((c) => c.id === item.id || c._id === item._id);
  const isAvailable = item.is_available !== false;
  const isXs = breakpoint === 'xs';
  const isSm = breakpoint === 'sm';
  const imageHeight = isXs ? '110px' : isSm ? '130px' : breakpoint === 'md' ? '150px' : breakpoint === 'lg' ? '172px' : '190px';

  const handleAdd = () => {
    if (!isAvailable) return;
    onAddToCart && onAddToCart(item);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 600);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? 'linear-gradient(145deg, rgba(30,28,40,0.98), rgba(40,35,55,0.98))'
          : 'linear-gradient(145deg, rgba(22,20,30,0.95), rgba(28,24,38,0.95))',
        border: hovered ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.08)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Image */}
      <div
        style={{
          position: 'relative',
          height: imageHeight,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
        onClick={() => onViewFood && onViewFood(item)}
      >
        <img
          src={getImageForItem(item)}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: imgHovered ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
            filter: isAvailable ? 'brightness(0.9)' : 'brightness(0.5) grayscale(0.4)',
          }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Category badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(245,158,11,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#1a1625',
            fontSize: isXs ? '9px' : '11px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '20px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {item.category || 'Food'}
        </div>

        {/* Availability badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: isAvailable ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: isXs ? '8px' : '10px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '20px',
            letterSpacing: '0.4px',
          }}
        >
          {isAvailable ? '● Available' : '✕ Out of Stock'}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: isXs ? '10px' : '16px', display: 'flex', flexDirection: 'column', gap: isXs ? '6px' : '10px', flex: 1 }}>
        {/* Name & Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: isXs ? '13px' : '16px',
              fontWeight: '700',
              color: '#f3f0ff',
              lineHeight: '1.3',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>{item.name}</span>
            {item.pieces && (
              <span
                style={{
                  fontSize: '9px',
                  background: 'rgba(255,140,0,0.1)',
                  color: '#ff8c00',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  border: '1px solid rgba(255,140,0,0.2)'
                }}
              >
                {item.pieces}
              </span>
            )}
          </h3>
          <span
            style={{
              color: '#f59e0b',
              fontWeight: '800',
              fontSize: isXs ? '13px' : '16px',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.5px',
            }}
          >
            ₹{item.price}
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            color: '#9ca3af',
            fontSize: isXs ? '11px' : '13px',
            lineHeight: '1.55',
            display: '-webkit-box',
            WebkitLineClamp: isXs ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description || 'A delightful offering from our kitchen, crafted with care.'}
        </p>

        {/* Rating */}
        <StarRating rating={item.rating !== undefined && item.rating !== null ? item.rating : 0} count={item.review_count || item.reviews || 0} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '4px' }}>
          <button
            onClick={() => onViewFood && onViewFood(item)}
            style={{
              flex: 1,
              padding: isXs ? '7px 0' : '9px 0',
              background: 'transparent',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: '12px',
              color: '#f59e0b',
              fontSize: isXs ? '11px' : '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
              e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)';
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ query }) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        gap: '16px',
        color: '#9ca3af',
      }}
    >
      <div style={{ fontSize: '56px', opacity: 0.4 }}>🍽️</div>
      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#d1d5db' }}>
        No items found
      </h3>
      <p style={{ margin: 0, fontSize: '14px', textAlign: 'center', maxWidth: '320px', lineHeight: '1.6' }}>
        {query
          ? `No menu items match "${query}". Try a different search or adjust your filters.`
          : 'No menu items match your current filters. Try adjusting them.'}
      </p>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'price_asc', label: 'Price Low–High' },
  { value: 'price_desc', label: 'Price High–Low' },
  { value: 'name', label: 'Name' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: 'under30', label: 'Under ₹30' },
  { value: '30to60', label: '₹30–₹60' },
  { value: 'above60', label: 'Above ₹60' },
];

export default function FoodCatalog({ user, onViewFood, onAddToCart, cart, onOpenChat, breakpoint = 'xl' }) {
  const screen = useScreenProfile(breakpoint);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState('rating');

  const [categoriesList, setCategoriesList] = useState([]);

  // Fetch menu
  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/menu?t=` + Date.now());
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
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
    } catch (err) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    window.addEventListener('kapi_menu_updated', fetchMenu);
    return () => {
      window.removeEventListener('kapi_menu_updated', fetchMenu);
    };
  }, []);

  // Derive categories
  const categories = useMemo(() => {
    if (categoriesList.length > 0) {
      return ['All', ...categoriesList];
    }
    const cats = ['All', ...new Set(menuItems.map((i) => i.category).filter(Boolean))];
    return cats;
  }, [menuItems, categoriesList]);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    let items = [...menuItems];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== 'All') {
      items = items.filter((i) => i.category === selectedCategory);
    }

    // Price range
    if (priceRange === 'under30') items = items.filter((i) => i.price < 30);
    else if (priceRange === '30to60') items = items.filter((i) => i.price >= 30 && i.price <= 60);
    else if (priceRange === 'above60') items = items.filter((i) => i.price > 60);

    // Availability
    if (availability === 'available') items = items.filter((i) => i.is_available !== false);

    // Sort
    if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'name') items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return items;
  }, [menuItems, search, selectedCategory, priceRange, availability, sort]);

  // Pill button style helper
  const pillStyle = (active) => ({
    padding: breakpoint === 'xs' ? '5px 12px' : '7px 16px',
    borderRadius: '30px',
    border: active ? '1px solid rgba(245,158,11,0.8)' : '1px solid rgba(255,255,255,0.1)',
    background: active
      ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15))'
      : 'rgba(255,255,255,0.04)',
    color: active ? '#fbbf24' : '#9ca3af',
    fontSize: breakpoint === 'xs' ? '11px' : '13px',
    fontWeight: active ? '700' : '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    letterSpacing: '0.2px',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0d18 0%, #13101f 50%, #0d0c16 100%)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: '0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '20px 12px 0' : '32px 24px 0',
          maxWidth: screen.contentMaxWidth,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: breakpoint === 'xs' ? '22px' : breakpoint === 'sm' ? '24px' : '28px',
                fontWeight: '800',
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}
            >
              Our Menu
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              {loading ? 'Loading...' : `${menuItems.length} items crafted with love`}
            </p>
          </div>
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              style={{
                padding: breakpoint === 'xs' ? '8px 12px' : '10px 20px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '14px',
                color: '#1a1625',
                fontWeight: '700',
                fontSize: breakpoint === 'xs' ? '12px' : '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(245,158,11,0.35)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 22px rgba(245,158,11,0.55)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(245,158,11,0.35)'; }}
            >
              {breakpoint === 'xs' ? '💬' : '💬 Chat with us'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(13,12,22,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '10px 12px' : '16px 24px',
          marginTop: '20px',
        }}
      >
        <div style={{ maxWidth: screen.contentMaxWidth, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Row 1: Search + Sort */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: (breakpoint === 'xs' || breakpoint === 'sm') ? 'stretch' : 'center', 
            flexDirection: (breakpoint === 'xs' || breakpoint === 'sm') ? 'column' : 'row',
            flexWrap: 'wrap' 
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                  pointerEvents: 'none',
                }}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search menu items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 42px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  color: '#f3f0ff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: '#d1d5db',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '160px',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: '#1a1625' }}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Category Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={pillStyle(selectedCategory === cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Row 3: Price Range + Availability */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
              PRICE
            </span>
            {PRICE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setPriceRange(r.value)}
                style={pillStyle(priceRange === r.value)}
              >
                {r.label}
              </button>
            ))}

            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>
              STATUS
            </span>
            <button onClick={() => setAvailability('all')} style={pillStyle(availability === 'all')}>
              All
            </button>
            <button onClick={() => setAvailability('available')} style={pillStyle(availability === 'available')}>
              ● Available Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: screen.contentMaxWidth, margin: '0 auto', padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '14px 12px' : breakpoint === 'md' ? '20px' : '24px' }}>
        {/* Result count */}
        {!loading && !error && (
          <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '13px', fontWeight: '500' }}>
            Showing{' '}
            <span style={{ color: '#f59e0b', fontWeight: '700' }}>{filteredItems.length}</span> of{' '}
            <span style={{ color: '#d1d5db' }}>{menuItems.length}</span> items
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '100px 20px',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                border: '3px solid rgba(245,158,11,0.2)',
                borderTop: '3px solid #f59e0b',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Loading menu…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#ef4444',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#fca5a5', fontSize: '18px' }}>Failed to load menu</h3>
            <p style={{ margin: '0 0 20px', color: '#9ca3af', fontSize: '14px' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px',
                color: '#fca5a5',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: screen.catalogColumns,
              gap: screen.gap,
            }}
          >
            {filteredItems.length === 0 ? (
              <EmptyState query={search} />
            ) : (
              filteredItems.map((item) => (
                <FoodCard
                  key={item.id || item._id || item.name}
                  item={item}
                  onViewFood={onViewFood}
                  onAddToCart={onAddToCart}
                  cart={cart}
                  breakpoint={breakpoint}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
