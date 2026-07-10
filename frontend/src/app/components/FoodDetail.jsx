'use client';

import { useState, useEffect, useCallback } from 'react';
import { getImageForItem } from '../utils/imageMapper';
import { useScreenProfile } from '../utils/responsive';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? (window.location.hostname.endsWith('vercel.app') ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`)
  : 'http://127.0.0.1:8000');


function StarRating({ rating, interactive = false, onRate }) {
  const [hovered, setHovered] = useState(0);

  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={interactive ? () => onRate(star) : undefined}
          onMouseEnter={interactive ? () => setHovered(star) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          style={{
            fontSize: interactive ? '28px' : '16px',
            cursor: interactive ? 'pointer' : 'default',
            color: star <= (hovered || rating) ? '#f59e0b' : '#4b5563',
            transition: 'color 0.15s ease',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function SimilarItemCard({ item, onClick }) {
  const imageUrl = getImageForItem(item);

  return (
    <div
      onClick={() => onClick(item)}
      style={{
        minWidth: '140px',
        maxWidth: '140px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)';
      }}
    >
      <img
        src={imageUrl}
        alt={item.name}
        style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }}
      />
      <div style={{ padding: '8px 10px' }}>
        <p style={{
          margin: 0,
          fontSize: '12px',
          fontWeight: 600,
          color: '#f3f4f6',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.3',
        }}>
          {item.name}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
          ₹{item.price}
        </p>
      </div>
    </div>
  );
}

export default function FoodDetail({ item, user, onClose, onAddToCart, breakpoint = 'xl' }) {
  const screen = useScreenProfile(breakpoint);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    if (item) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [item]);

  // Close with animation
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Fetch reviews
  useEffect(() => {
    if (!item) return;
    setReviews([]);
    setReviewsLoading(true);
    fetch(`http://127.0.0.1:8000/api/reviews/${item.id}`)
      .then((res) => res.ok ? res.json() : [])
      .catch(() => [])
      .then((data) => {
        setReviews(data && Array.isArray(data.reviews) ? data.reviews : (Array.isArray(data) ? data : []));
        setReviewsLoading(false);
      });
  }, [item]);

  // Fetch similar items
  useEffect(() => {
    if (!item) return;
    setSimilarItems([]);
    fetch(`http://127.0.0.1:8000/api/menu/${item.id}/similar`)
      .then((res) => res.ok ? res.json() : null)
      .catch(() => null)
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSimilarItems(data);
        }
        // fallback handled via prop — parent should pass allItems if needed
      });
  }, [item]);

  const handleSubmitReview = async () => {
    if (!rating) {
      setSubmitError('Please select a star rating.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          menu_item_id: item.id,
          rating,
          comment,
          reviewer_name: user.name,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitSuccess(true);
      setRating(0);
      setComment('');
      window.dispatchEvent(new Event('kapi_menu_updated'));
      // Refresh reviews
      const updated = await fetch(`http://127.0.0.1:8000/api/reviews/${item.id}`)
        .then((r) => r.ok ? r.json() : [])
        .catch(() => []);
      setReviews(updated && Array.isArray(updated.reviews) ? updated.reviews : (Array.isArray(updated) ? updated : []));
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!item) return null;

  const imageUrl = getImageForItem(item);
  const isAvailable = item.is_available !== false && item.available !== false;
  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      {/* Inject Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .food-detail-scroll::-webkit-scrollbar { width: 6px; }
        .food-detail-scroll::-webkit-scrollbar-track { background: transparent; }
        .food-detail-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); border-radius: 3px; }
        .similar-scroll::-webkit-scrollbar { height: 4px; }
        .similar-scroll::-webkit-scrollbar-track { background: transparent; }
        .similar-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: breakpoint === 'xs' ? '8px' : breakpoint === 'sm' ? '12px' : '16px',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Modal Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="food-detail-scroll"
          style={{
            width: '100%',
            maxWidth: breakpoint === 'xs' ? 'calc(100% - 8px)' : breakpoint === 'sm' ? '560px' : breakpoint === 'md' ? '640px' : breakpoint === 'lg' ? '700px' : '760px',
            maxHeight: screen.compact ? '96vh' : '90vh',
            margin: breakpoint === 'xs' ? '8px auto' : '0 auto',
            overflowY: 'auto',
            background: 'rgba(15,15,20,0.92)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '20px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.1)',
            fontFamily: "'Inter', sans-serif",
            color: '#f3f4f6',
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
            position: 'relative',
          }}
        >
          {/* ── SECTION 1: HEADER ── */}
          <div style={{ position: 'relative' }}>
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 10,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245,158,11,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Food Image */}
            <img
              src={imageUrl}
              alt={item.name}
              style={{
                width: '100%',
                height: breakpoint === 'xs' ? '160px' : breakpoint === 'sm' ? '200px' : breakpoint === 'md' ? '230px' : breakpoint === 'lg' ? '250px' : '280px',
                objectFit: 'cover',
                display: 'block',
                borderRadius: '20px 20px 0 0',
              }}
            />

            {/* Gradient overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(to top, rgba(15,15,20,0.95), transparent)',
            }} />

            {/* Category badge */}
            {item.category && (
              <span style={{
                position: 'absolute',
                bottom: '14px',
                left: '16px',
                background: 'rgba(245,158,11,0.85)',
                color: '#1a0a00',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '20px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {item.category}
              </span>
            )}
          </div>

          {/* ── SECTION 2: INFO ── */}
          <div style={{ padding: breakpoint === 'xs' ? '14px 16px 0' : '20px 24px 0' }}>
            {/* Name */}
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: breakpoint === 'xs' ? '20px' : '26px',
              fontWeight: 700,
              margin: '0 0 8px',
              color: '#fff',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span>{item.name}</span>
              {item.pieces && (
                <span style={{
                  fontSize: '12px',
                  background: 'rgba(255,140,0,0.1)',
                  color: '#ff8c00',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  border: '1px solid rgba(255,140,0,0.2)'
                }}>
                  {item.pieces}
                </span>
              )}
            </h2>

            {/* Price + Availability row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                ₹{item.price}
              </span>

              {/* Availability badge */}
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 12px',
                borderRadius: '20px',
                background: isAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: isAvailable ? '#4ade80' : '#f87171',
                border: `1px solid ${isAvailable ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {isAvailable ? '● Available' : '● Out of Stock'}
              </span>
            </div>

            {/* Prep time + rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {item.prep_time && (
                <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '15px' }}>⏱</span>
                  {item.prep_time} min
                </span>
              )}
              {avgRating && (
                <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '15px' }}>★</span>
                  {avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              )}
              {(item.rating !== undefined && item.rating !== null) && !avgRating && (
                <span style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '15px' }}>★</span>
                  {item.rating}
                </span>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p style={{
                fontSize: '14px',
                color: '#9ca3af',
                lineHeight: '1.7',
                margin: '0 0 20px',
              }}>
                {item.description}
              </p>
            )}


          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(245,158,11,0.12)', margin: breakpoint === 'xs' ? '0 16px' : '0 24px' }} />

          {/* ── SECTION 4: REVIEWS ── */}
          <div style={{ padding: breakpoint === 'xs' ? '14px 16px 0' : '20px 24px 0' }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
              margin: '0 0 16px',
            }}>
              Customer Reviews
            </h3>

            {reviewsLoading ? (
              <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>
                Loading reviews…
              </p>
            ) : reviews.length === 0 ? (
              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                No reviews yet. Be the first! 🌟
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.map((review, idx) => {
                  const initial = (review.reviewer_name || review.name || 'A').charAt(0).toUpperCase();
                  const dateStr = review.created_at
                    ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '';
                  return (
                    <div
                      key={review.id || idx}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#1a0a00',
                          flexShrink: 0,
                        }}>
                          {initial}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#f3f4f6' }}>
                              {review.reviewer_name || review.name || 'Anonymous'}
                            </span>
                            {dateStr && (
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>{dateStr}</span>
                            )}
                          </div>
                          <StarRating rating={review.rating || 0} />
                        </div>
                      </div>
                      {review.comment && (
                        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECTION 5: SUBMIT REVIEW (only if logged in) ── */}
          {user && (
            <div style={{ padding: breakpoint === 'xs' ? '14px 16px 0' : '20px 24px 0' }}>
              <div style={{ height: '1px', background: 'rgba(245,158,11,0.12)', marginBottom: '20px' }} />
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 14px',
              }}>
                Write a Review
              </h3>

              {submitSuccess ? (
                <div style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#4ade80',
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  ✅ Thank you! Your review has been submitted.
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '14px',
                  padding: '18px',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}>
                  {/* Star selector */}
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
                    Your Rating
                  </label>
                  <div style={{ marginBottom: '14px' }}>
                    <StarRating rating={rating} interactive onRate={setRating} />
                  </div>

                  {/* Comment textarea */}
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience…"
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: '10px',
                      color: '#f3f4f6',
                      fontSize: '14px',
                      padding: '10px 12px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)')}
                  />

                  {submitError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '8px 0 0' }}>{submitError}</p>
                  )}

                  <button
                    onClick={handleSubmitReview}
                    disabled={submitLoading}
                    style={{
                      marginTop: '12px',
                      padding: '11px 28px',
                      borderRadius: '10px',
                      border: 'none',
                      background: submitLoading
                        ? 'rgba(75,85,99,0.4)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: submitLoading ? '#6b7280' : '#1a0a00',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: submitLoading ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => { if (!submitLoading) e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {submitLoading ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 6: SIMILAR ITEMS ── */}
          {similarItems.length > 0 && (
            <div style={{ padding: breakpoint === 'xs' ? '14px 16px 16px' : '20px 24px 24px' }}>
              <div style={{ height: '1px', background: 'rgba(245,158,11,0.12)', marginBottom: '20px' }} />
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 14px',
              }}>
                You Might Also Like
              </h3>
              <div
                className="similar-scroll"
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                }}
              >
                {similarItems.map((si, idx) => (
                  <SimilarItemCard key={si.id || idx} item={si} onClick={() => {}} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom padding if no similar section */}
          {similarItems.length === 0 && <div style={{ height: '24px' }} />}
        </div>
      </div>
    </>
  );
}
