'use client';

import { useState, useEffect, useRef } from 'react';
import ProfileCard from './ProfileCard';
import { getImageForItem } from '../utils/imageMapper';
import { useBreakpoint, useScreenProfile } from '../utils/responsive';
import { fetchSharedOffers, getDefaultOffers, isOfferConfigCategory, saveSharedOffers } from '../utils/sharedOffers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000');
const HAS_BACKEND_API = Boolean(process.env.NEXT_PUBLIC_API_URL) || (typeof window !== 'undefined' && !window.location.hostname.includes('.vercel.app'));

const SUPABASE_URL = "https://kvjvnrktnkenlsaatmxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo";

const COLORS = {
  bg: '#0a0702',
  surface: 'rgba(20, 15, 5, 0.98)',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  amber: '#ff8c00',
  amberDim: 'rgba(255, 140, 0, 0.15)',
  gold: '#d4af37',
  goldDim: 'rgba(212, 175, 55, 0.15)',
  textPrimary: '#ede8df',
  textSecondary: '#a89880',
  textMuted: '#6b5c47',
  green: '#10b981',
  red: '#ef4444',
  blue: '#3b82f6',
};

export default function OwnerDashboard({ 
  user, 
  onLogout, 
  onUserUpdate,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab
}) {
  const breakpoint = useBreakpoint();
  const screen = useScreenProfile(breakpoint);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState('menu');
  const syncTimeoutRef = useRef(null);
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setInternalActiveTab;
  const [menu, setMenu] = useState([]);
  const [flatMenu, setFlatMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3000);
  };

  // Dashboard Overview state
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Inventory state
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [editingQty, setEditingQty] = useState('');

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Ingredients',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // AI Voice state
  const [voiceHistory, setVoiceHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceReply, setVoiceReply] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [barHeights, setBarHeights] = useState(Array.from({ length: 60 }, () => 8));
  const [voiceLang, setVoiceLang] = useState('en');
  const [voiceAvailability, setVoiceAvailability] = useState({ en: false, te: false });

  // Users panel state
  const [adminUsers, setAdminUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Menu Management state
  const [showAddMenuForm, setShowAddMenuForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [hasSelectedNewImage, setHasSelectedNewImage] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    availability_status: 'available',
    image_url: '',
    prep_time: '5',
    rating: '4.5',
    pieces: ''
  });
  const [offers, setOffers] = useState(() => getDefaultOffers());

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

    if (!HAS_BACKEND_API) {
      const stored = localStorage.getItem('kapi_daily_offers');
      if (stored) setOffers(JSON.parse(stored));
      return;
    }

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
  }, []);

  useEffect(() => {
    if (HAS_BACKEND_API) return undefined;
    let cancelled = false;

    const loadSharedOfferState = async () => {
      try {
        const data = await fetchSharedOffers();
        if (!cancelled) {
          setOffers(data);
          localStorage.setItem('kapi_daily_offers', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Shared offer settings unavailable:', err);
      }
    };

    loadSharedOfferState();
    const intervalId = setInterval(loadSharedOfferState, 15000);
    window.addEventListener('storage', loadSharedOfferState);
    window.addEventListener('kapi_offers_updated', loadSharedOfferState);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('storage', loadSharedOfferState);
      window.removeEventListener('kapi_offers_updated', loadSharedOfferState);
    };
  }, []);

  const persistOffers = async (updated) => {
    localStorage.setItem('kapi_daily_offers', JSON.stringify(updated));

    if (HAS_BACKEND_API) {
      const res = await fetchAdmin(`${API_BASE}/api/admin/offers`, {
        method: 'POST',
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error(`Backend offer sync failed: ${res.status}`);
      window.dispatchEvent(new Event('kapi_offers_updated'));
      return;
    }

    await saveSharedOffers(updated);
    window.dispatchEvent(new Event('kapi_offers_updated'));
  };

  const handleUpdateOfferImage = async (dayId, base64Image) => {
    const updated = {
      ...offers,
      [dayId]: {
        ...offers[dayId],
        imageUrl: base64Image,
        isActive: true
      }
    };
    setOffers(updated);
    try {
      await persistOffers(updated);
    } catch (err) {
      console.error('Failed to sync offer image:', err);
      showToast('Failed to save offer image. Please try again.', 'error');
    }
  };

  const debouncedSyncOffers = (data) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await persistOffers(data);
      } catch (err) {
        console.error('Failed to sync offers:', err);
        showToast('Failed to save offer changes. Please try again.', 'error');
      }
    }, 800);
  };

  const handleUpdateOfferDetails = (dayId, title, subtitle) => {
    const updated = {
      ...offers,
      [dayId]: {
        ...offers[dayId],
        title: title,
        subtitle: subtitle,
        isActive: title.trim() !== ''
      }
    };
    setOffers(updated);
    debouncedSyncOffers(updated);
  };

  const handleRemoveOffer = async (dayId) => {
    const updated = {
      ...offers,
      [dayId]: {
        ...offers[dayId],
        isActive: false
      }
    };
    setOffers(updated);
    try {
      await persistOffers(updated);
    } catch (err) {
      console.error('Failed to sync offer removal:', err);
      showToast('Failed to remove offer. Please try again.', 'error');
    }
  };
  const fetchAdmin = async (url, options = {}) => {
    if (!HAS_BACKEND_API) return new Response(null, { status: 503 });
    const token = localStorage.getItem('kapi_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };

  const supabaseRequest = async (table, { method = 'GET', query = 'select=*', body } = {}) => {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
    const request = { method, headers };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers.Prefer = 'return=representation';
      request.body = JSON.stringify(body);
    }

    return fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, request);
  };

  const responseError = async (res, fallback) => {
    try {
      const data = await res.json();
      return data?.detail || data?.message || data?.hint || fallback;
    } catch {
      return fallback;
    }
  };

  const fetchSupabaseTable = async (table, query = 'select=*') => {
    const res = await supabaseRequest(table, { query });
    if (!res.ok) {
      throw new Error(`Supabase ${table} fetch failed: ${res.status}`);
    }
    return res.json();
  };

  const extractPiecesFromDesc = (description = '') => {
    const match = String(description).match(/\s*\[Pieces:\s*(.*?)\]\s*$/);
    if (!match) return { description, pieces: undefined };
    return {
      description: String(description).slice(0, match.index).trim(),
      pieces: match[1],
    };
  };

  const formatPiecesIntoDesc = (description = '', pieces = '') => {
    const cleanDescription = extractPiecesFromDesc(description).description.trim();
    const cleanPieces = String(pieces || '').trim();
    return cleanPieces ? `${cleanDescription} [Pieces: ${cleanPieces}]` : cleanDescription;
  };

  const normalizeMenuItem = (item, reviewsMap = {}) => {
    const piecesInfo = extractPiecesFromDesc(item.description || '');
    const ratings = reviewsMap[item.id] || [];
    const avgRating = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : item.rating;
    return {
      ...item,
      description: piecesInfo.description,
      pieces: item.pieces || piecesInfo.pieces,
      rating: avgRating || item.rating || 4.5,
    };
  };

  const loadMenuGroups = (groups, cats = []) => {
    setMenu(groups);
    setCategories(cats);
    const flatItems = groups.flatMap(catGroup =>
      (catGroup.items || []).map(item => ({
        ...item,
        category: catGroup.category,
      }))
    );
    setFlatMenu(flatItems);

    if (cats.length > 0 && !menuForm.category_id) {
      setMenuForm(prev => ({ ...prev, category_id: cats[0].id }));
    }
  };

  const fetchMenuFromSupabase = async () => {
    const [cats, items, reviews] = await Promise.all([
      fetchSupabaseTable('categories', 'select=*'),
      fetchSupabaseTable('menu_items', 'select=*'),
      fetchSupabaseTable('reviews', 'select=menu_item_id,rating'),
    ]);

    const reviewsMap = {};
    (reviews || []).forEach((review) => {
      const itemId = review.menu_item_id;
      const rating = Number(review.rating);
      if (!itemId || Number.isNaN(rating)) return;
      if (!reviewsMap[itemId]) reviewsMap[itemId] = [];
      reviewsMap[itemId].push(rating);
    });

    const menuCategories = (cats || []).filter((cat) => !isOfferConfigCategory(cat));
    const groups = menuCategories.map((cat) => ({
      id: cat.id,
      category: cat.name,
      description: cat.description,
      items: (items || [])
        .filter(item => item.category_id === cat.id)
        .map(item => normalizeMenuItem(item, reviewsMap)),
    }));

    loadMenuGroups(groups, menuCategories);
  };

  // Fetch functions
  const fetchDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await fetchAdmin(`${API_BASE}/api/admin/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.warn('Dashboard metrics API unavailable:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchMenu = async () => {
    try {
      setLoadingMenu(true);
      const [catRes, res] = await Promise.all([
        fetchAdmin(`${API_BASE}/api/admin/categories`),
        fetchAdmin(`${API_BASE}/api/admin/menu?t=${Date.now()}`)
      ]);

      let cats = [];
      if (catRes.ok) {
        cats = await catRes.json();
      }

      if (res.ok) {
        const data = await res.json();
        loadMenuGroups(data, cats);
        return;
      }
      throw new Error(`Admin menu API failed: ${res.status}`);
    } catch (err) {
      console.warn('Admin menu API unavailable:', err);
      try {
        await fetchMenuFromSupabase();
      } catch (fallbackErr) {
        console.warn('Supabase menu fallback unavailable:', fallbackErr);
        setMenu([]);
        setFlatMenu([]);
      }
    } finally {
      setLoadingMenu(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const res = await fetchAdmin(`${API_BASE}/api/admin/inventory`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
        return;
      }
      throw new Error(`Inventory API failed: ${res.status}`);
    } catch (err) {
      console.warn('Inventory API unavailable:', err);
      try {
        const data = await fetchSupabaseTable('inventory', 'select=*');
        setInventory(data || []);
      } catch (fallbackErr) {
        console.warn('Supabase inventory fallback unavailable:', fallbackErr);
        setInventory([]);
      }
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const res = await fetchAdmin(`${API_BASE}/api/admin/expenses`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
        return;
      }
      throw new Error(`Expenses API failed: ${res.status}`);
    } catch (err) {
      console.warn('Expenses API unavailable:', err);
      try {
        const data = await fetchSupabaseTable('expenses', 'select=*');
        setExpenses(data || []);
      } catch (fallbackErr) {
        console.warn('Supabase expenses fallback unavailable:', fallbackErr);
        setExpenses([]);
      }
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchAnalyticsFromSupabase = async () => {
    const [menuItems, logs, reviews, categories] = await Promise.all([
      fetchSupabaseTable('menu_items', 'select=*').catch(() => []),
      fetchSupabaseTable('user_activity_logs', 'select=*').catch(() => []),
      fetchSupabaseTable('reviews', 'select=*').catch(() => []),
      fetchSupabaseTable('categories', 'select=*').catch(() => []),
    ]);

    const viewCounts = {};
    const searchCounts = {};
    const hourlyCounts = {};
    (logs || []).forEach((log) => {
      if (log.activity_type === 'view' && log.target_id) {
        viewCounts[log.target_id] = (viewCounts[log.target_id] || 0) + 1;
      }
      if (log.activity_type === 'search' && log.search_query?.trim()) {
        const query = log.search_query.trim().toLowerCase();
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      }
      const created = new Date(log.created_at);
      if (!Number.isNaN(created.getTime())) {
        const hour = created.getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
      }
    });

    const categoryMap = Object.fromEntries((categories || []).map((category) => [category.id, category.name]));
    const itemMap = Object.fromEntries((menuItems || []).map((item) => [item.id, item]));
    const topViewedItems = Object.entries(viewCounts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 8)
      .flatMap(([id, views]) => itemMap[id] ? [{ id, name: itemMap[id].name || 'Unknown item', views }] : []);
    const topSearchedItems = Object.entries(searchCounts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 8)
      .map(([query, count]) => ({ query, count }));

    const demandAlerts = [];
    const topItem = topViewedItems[0];
    if (topItem) demandAlerts.push(`High demand: ${topItem.name} has ${topItem.views} customer views. Keep it visible and available.`);
    const topQuery = topSearchedItems.find(({ query }) => !(menuItems || []).some((item) => {
      const itemName = String(item.name || '').trim().toLowerCase();
      return itemName && (itemName.includes(query) || query.includes(itemName));
    }));
    if (topQuery) demandAlerts.push(`Unmet demand: customers searched for "${topQuery.query}" ${topQuery.count} times. Consider adding it to the menu.`);
    const categoryCounts = {};
    Object.entries(viewCounts).forEach(([itemId, views]) => {
      const categoryName = categoryMap[itemMap[itemId]?.category_id] || 'General';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + views;
    });
    const topCategory = Object.entries(categoryCounts).sort(([, left], [, right]) => right - left)[0];
    if (topCategory) demandAlerts.push(`Category trend: ${topCategory[0]} has the strongest customer interest with ${topCategory[1]} views.`);
    if (!demandAlerts.length) {
      demandAlerts.push('No customer activity has been recorded yet. Analytics will appear as customers browse, search, and place orders.');
    }

    const sentimentCounts = (reviews || []).reduce((counts, review) => {
      const rating = Number(review.rating);
      if (rating >= 4) counts.positive += 1;
      else if (rating === 3) counts.neutral += 1;
      else counts.negative += 1;
      return counts;
    }, { positive: 0, neutral: 0, negative: 0 });
    const totalReviews = (reviews || []).length;
    const percent = (value) => totalReviews ? Math.floor((value / totalReviews) * 100) : 0;

    setAnalytics({
      total_views: Object.values(viewCounts).reduce((total, count) => total + count, 0),
      top_viewed_items: topViewedItems,
      top_searched_items: topSearchedItems,
      activity_by_hour: Object.entries(hourlyCounts).sort(([left], [right]) => Number(left) - Number(right)).map(([hour, count]) => ({ hour: Number(hour), count })),
      demand_alerts: demandAlerts.slice(0, 5),
      sentiment_stats: {
        positive: percent(sentimentCounts.positive),
        neutral: percent(sentimentCounts.neutral),
        negative: percent(sentimentCounts.negative),
        total_reviews: totalReviews,
        summary: totalReviews ? 'Sentiment is calculated from the customer ratings saved in your database.' : 'No customer reviews submitted yet. Submit a review with a comment to see sentiment analysis.',
      },
    });
  };

  const fetchAdminUsersFromSupabase = async () => {
    const activityCutoff = new Date(Date.now() - (2 * 60 * 1000)).toISOString();
    const [users, orders, reviews, menuItems, preferences, activityLogs] = await Promise.all([
      fetchSupabaseTable('users', 'select=*'),
      fetchSupabaseTable('orders', 'select=*').catch(() => []),
      fetchSupabaseTable('reviews', 'select=*').catch(() => []),
      fetchSupabaseTable('menu_items', 'select=id,name').catch(() => []),
      fetchSupabaseTable('user_preferences', 'select=*').catch(() => []),
      fetchSupabaseTable('user_activity_logs', `select=user_id,created_at&created_at=gte.${encodeURIComponent(activityCutoff)}&order=created_at.desc`).catch(() => []),
    ]);

    const menuMap = Object.fromEntries((menuItems || []).map((item) => [item.id, item.name || 'Unknown item']));
    const preferencesByUser = Object.fromEntries((preferences || []).map((preference) => [preference.user_id, preference]));
    const ordersByUser = {};
    (orders || []).forEach((order) => {
      if (order.user_id) (ordersByUser[order.user_id] ||= []).push(order);
    });
    const reviewsByUser = {};
    (reviews || []).forEach((review) => {
      if (!review.user_id) return;
      (reviewsByUser[review.user_id] ||= []).push({ ...review, item_name: menuMap[review.menu_item_id] || 'Unknown item' });
    });
    const lastActiveByUser = {};
    (activityLogs || []).forEach((log) => {
      if (!log.user_id || !log.created_at) return;
      const current = new Date(log.created_at);
      const previous = lastActiveByUser[log.user_id];
      if (!Number.isNaN(current.getTime()) && (!previous || current > previous)) lastActiveByUser[log.user_id] = current;
    });

    setAdminUsers((users || []).filter((user) => user.role !== 'admin').map((user) => {
      const userOrders = ordersByUser[user.id] || [];
      const userReviews = reviewsByUser[user.id] || [];
      const lastActive = lastActiveByUser[user.id];
      return {
        id: user.id,
        name: user.name || 'Anonymous',
        email: user.email || '',
        mobile: user.mobile || '',
        role: user.role || 'customer',
        created_at: user.created_at || '',
        is_online: Boolean(lastActive && (Date.now() - lastActive.getTime()) <= 55000),
        last_seen: lastActive?.toISOString() || null,
        total_orders: userOrders.length,
        total_spent: userOrders.filter((order) => order.status !== 'cancelled').reduce((total, order) => total + Number(order.total_amount || order.total || 0), 0),
        avg_rating_given: userReviews.length ? Number((userReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / userReviews.length).toFixed(2)) : null,
        reviews: userReviews,
        orders: userOrders,
        preferences: preferencesByUser[user.id] || {},
      };
    }));
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetchAdmin(`${API_BASE}/api/admin/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        return;
      }
      throw new Error(`Analytics API failed: ${res.status}`);
    } catch (err) {
      console.warn('Analytics API unavailable:', err);
      try {
        await fetchAnalyticsFromSupabase();
      } catch (fallbackErr) {
        console.warn('Supabase analytics fallback unavailable:', fallbackErr);
        setAnalytics(null);
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch all users for admin Users panel (silent = no loading spinner for background refresh)
  const fetchAdminUsers = async (silent = false) => {
    if (!silent) setUsersLoading(true);
    try {
      const res = await fetchAdmin(`${API_BASE}/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
        return;
      }
      throw new Error(`Users API failed: ${res.status}`);
    } catch (err) {
      console.warn('Users API unavailable:', err);
      try {
        await fetchAdminUsersFromSupabase();
      } catch (fallbackErr) {
        console.warn('Supabase users fallback unavailable:', fallbackErr);
        setAdminUsers([]);
      }
    } finally {
      if (!silent) setUsersLoading(false);
    }
  };

  // Load active tab data
  useEffect(() => {
    if (activeTab === 'menu') fetchMenu();
    else if (activeTab === 'inventory') fetchInventory();
    else if (activeTab === 'expenses') fetchExpenses();
    else if (activeTab === 'analytics') fetchAnalytics();
    else if (activeTab === 'users') fetchAdminUsers();
  }, [activeTab]);

  // Refresh customer records only while this tab is open to keep the dashboard responsive.
  useEffect(() => {
    if (activeTab !== 'users') return undefined;
    const interval = setInterval(() => {
      fetchAdminUsers(true); // silent refresh - no loading spinner
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Keep the detail panel in sync: when adminUsers refreshes, update selectedUser to reflect new is_online status
  useEffect(() => {
    if (!selectedUser) return;
    const fresh = adminUsers.find(u => u.id === selectedUser.id);
    if (fresh) setSelectedUser(fresh);
  }, [adminUsers]);

  // ── ASR: Automatic Speech Recognition (MediaRecorder + Whisper) ─────────────
  // Records audio with MediaRecorder, detects silence with AudioContext VAD,
  // sends WAV to local Whisper backend — no API key, fully open-source.

  // Convert raw PCM AudioBuffer → WAV Blob (browser-side, no library needed)
  const audioBufferToWav = (buffer) => {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const dataSize = samples.length * 2;
    const ab = new ArrayBuffer(44 + dataSize);
    const view = new DataView(ab);
    const ws = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
    ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ws(36, 'data'); view.setUint32(40, dataSize, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true);
    return new Blob([ab], { type: 'audio/wav' });
  };

  const startListening = async () => {
    if (typeof window === 'undefined') return;

    // Always cleanup previous session before starting fresh
    stopBargeInMonitor();
    if (window._asrVadLoop)  { clearInterval(window._asrVadLoop); window._asrVadLoop = null; }
    if (window._asrStream)   { window._asrStream.getTracks().forEach(t => t.stop()); window._asrStream = null; }
    if (window._asrAudioCtx) { try { window._asrAudioCtx.close(); } catch(e){} window._asrAudioCtx = null; }
    if (window._asrRecognition) { try { window._asrRecognition.abort(); } catch(e){} window._asrRecognition = null; }
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); setIsSpeaking(false); }

    window._aiSpeaking = false;
    window._voiceActive = true;
    window._lastSubmittedText = '';
    window._lastSubmitTime = 0;

    // Browser-native SpeechRecognition (Preferred for high accuracy in Telugu/Hindi and lower latency)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      console.log('ASR: Using browser-native SpeechRecognition');
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = voiceLang === 'te' ? 'te-IN' : (voiceLang === 'hi' ? 'hi-IN' : 'en-US');
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceError('');
          setVoiceQuery('🎙️ Listening...');
        };

        recognition.onresult = (event) => {
          const text = event.results[0][0].transcript;
          console.log('ASR SpeechRecognition transcribed:', text);
          setVoiceQuery(text);
          window._aiSpeaking = true;
          setIsListening(false);
          try { recognition.abort(); } catch(e){}
          handleVoiceQuerySubmit(text, voiceLang);
        };

        recognition.onerror = (event) => {
          if (event.error === 'no-speech') {
            console.log('ASR: No speech detected. Restarting...');
            if (window._voiceActive && !window._aiSpeaking) {
              try { recognition.start(); } catch(e){}
            }
          } else if (event.error === 'aborted') {
            setIsListening(false);
          } else {
            console.error('ASR SpeechRecognition error:', event.error);
            setVoiceError('Speech recognition failed: ' + event.error);
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          console.log('ASR SpeechRecognition ended');
          if (window._voiceActive && !window._aiSpeaking && !isListening) {
            try { recognition.start(); } catch(e){}
          }
        };

        window._asrRecognition = recognition;
        recognition.start();
        return;
      } catch (recognitionErr) {
        console.warn('ASR: SpeechRecognition failed, falling back to MediaRecorder:', recognitionErr);
      }
    }

    // Fallback to local Whisper recording + API
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported. Please make sure you are using localhost or HTTPS.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const src = audioCtx.createMediaStreamSource(stream);
      src.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      window._asrStream   = stream;
      window._asrAudioCtx = audioCtx;
      window._asrAnalyser = analyser;

      let mimeType = 'audio/webm';
      let fileExt = 'webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
          fileExt = 'webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
          fileExt = 'ogg';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
          fileExt = 'mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
          fileExt = 'wav';
        }
      }

      let mediaRecorder = null;
      let audioChunks   = [];
      let hasSpoken     = false;
      let silenceTimer  = null;
      let sessionStartTime = Date.now();
      const VAD_THRESHOLD = 2;
      const SILENCE_MS    = 1500;

      const sendAudio = async () => {
        if (!window._voiceActive) return;
        if (!audioChunks.length) return;
        const blob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        hasSpoken = false;

        if (blob.size < 1000) { 
          if (window._voiceActive && !window._aiSpeaking) {
            startSession();
          }
          return; 
        }

        setVoiceQuery('⏳ Transcribing...');
        try {
          const formData = new FormData();
          formData.append('audio', blob, `speech.${fileExt}`);
          formData.append('language', voiceLang);
          const token = localStorage.getItem('kapi_token');
          const res   = await fetch(`${API_BASE}/api/ai/transcribe`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!res.ok) throw new Error(`Transcription server error ${res.status}`);
          const data = await res.json();
          const text = (data.text || '').trim();

          if (!text) {
            setVoiceQuery('');
            if (window._voiceActive && !window._aiSpeaking) startSession();
            return;
          }

          setVoiceQuery(text);
          window._aiSpeaking = true;
          setIsListening(false);
          handleVoiceQuerySubmit(text, voiceLang);
        } catch (err) {
          console.error('ASR error:', err);
          setVoiceError('Transcription failed: ' + err.message);
          setVoiceQuery('');
          setIsListening(true);
          if (window._voiceActive && !window._aiSpeaking) startSession();
        }
      };

      const startSession = () => {
        if (!window._voiceActive) return;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try { mediaRecorder.stop(); } catch(e){}
        }
        audioChunks = [];
        hasSpoken = false;
        sessionStartTime = Date.now();
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }

        try {
          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType });
          } catch (mimeErr) {
            mediaRecorder = new MediaRecorder(stream);
          }
          window._asrMediaRecorder = mediaRecorder;
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
          };
          mediaRecorder.onstop = sendAudio;
          mediaRecorder.start(250);
        } catch (e) {
          console.error('ASR: Failed to start MediaRecorder session:', e);
          setVoiceError('ASR Error: ' + e.message);
          setIsListening(false);
          window._voiceActive = false;
        }
      };

      window._asrStartSession = startSession;
      setIsListening(true);
      setVoiceError('');
      startSession();

      const vadLoop = setInterval(() => {
        if (!window._voiceActive) { clearInterval(vadLoop); return; }
        if (window._aiSpeaking) return;

        const elapsed = Date.now() - sessionStartTime;
        if (elapsed > 10000) {
          if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
          return;
        }

        analyser.getByteFrequencyData(freqData);
        const energy = freqData.reduce((s, v) => s + v, 0) / freqData.length;

        if (energy > VAD_THRESHOLD) {
          hasSpoken = true;
          if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        } else if (hasSpoken) {
          if (!silenceTimer) {
            silenceTimer = setTimeout(() => {
              silenceTimer = null;
              if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
            }, SILENCE_MS);
          }
        }
      }, 80);

      window._asrVadLoop = vadLoop;

    } catch (err) {
      window._voiceActive = false;
      setIsListening(false);
      if (err.name === 'NotAllowedError') {
        setVoiceError('Microphone permission denied. Please allow access in your browser.');
      } else {
        setVoiceError('Could not start microphone: ' + err.message);
      }
    }
  };

  const stopBargeInMonitor = () => {
    if (typeof window === 'undefined') return;
    if (window._bargeInLoop) {
      clearInterval(window._bargeInLoop);
      window._bargeInLoop = null;
    }
    if (window._bargeInStream) {
      window._bargeInStream.getTracks().forEach(t => t.stop());
      window._bargeInStream = null;
    }
    if (window._bargeInAudioCtx) {
      try { window._bargeInAudioCtx.close(); } catch(e){}
      window._bargeInAudioCtx = null;
    }
    window._bargeInActive = false;
  };

  const startBargeInMonitor = async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    if (window._bargeInActive) return;

    stopBargeInMonitor();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      window._bargeInStream = stream;
      window._bargeInAudioCtx = audioCtx;
      window._bargeInActive = true;

      let baseline = 0;
      let baselineSamples = 0;
      let speechHits = 0;

      const interruptAiSpeech = () => {
        stopBargeInMonitor();
        if (window.currentIndicTtsAudio) {
          try {
            window.currentIndicTtsAudio.pause();
            window.currentIndicTtsAudio.currentTime = 0;
          } catch(e){}
          window.currentIndicTtsAudio = null;
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        window._aiSpeaking = false;
        setIsSpeaking(false);
        setVoiceReply('');
        setVoiceQuery('Listening...');

        if (window._voiceActive) {
          setTimeout(() => {
            startListening();
          }, 120);
        }
      };

      window._bargeInLoop = setInterval(() => {
        if (!window._voiceActive || !window._aiSpeaking) {
          stopBargeInMonitor();
          return;
        }

        analyser.getByteFrequencyData(freqData);
        const energy = freqData.reduce((sum, value) => sum + value, 0) / freqData.length;

        if (baselineSamples < 8) {
          baseline = ((baseline * baselineSamples) + energy) / (baselineSamples + 1);
          baselineSamples += 1;
          return;
        }

        const threshold = Math.max(18, baseline * 1.8 + 8);
        if (energy > threshold) {
          speechHits += 1;
        } else {
          speechHits = Math.max(0, speechHits - 1);
        }

        if (speechHits >= 3) {
          interruptAiSpeech();
        }
      }, 90);
    } catch (err) {
      console.warn('ASR barge-in monitor could not start:', err);
      stopBargeInMonitor();
    }
  };

  // Resume ASR mic after AI finishes speaking
  const resumeListeningAfterAI = (delayMs = 400) => {
    setTimeout(() => {
      stopBargeInMonitor();
      window._aiSpeaking = false;
      if (window._voiceActive) {
        startListening();
      }
    }, delayMs);
  };

  // Stop ASR — cleans up all resources
  const stopListening = () => {
    window._voiceActive = false;
    window._aiSpeaking  = false;
    stopBargeInMonitor();
    window._asrStartSession = null;
    window._asrAnalyser = null;
    window._asrMediaRecorder = null;
    if (window._asrVadLoop)  { clearInterval(window._asrVadLoop); window._asrVadLoop = null; }
    if (window._asrStream)   { window._asrStream.getTracks().forEach(t => t.stop()); window._asrStream = null; }
    if (window._asrAudioCtx) { try { window._asrAudioCtx.close(); } catch(e){} window._asrAudioCtx = null; }
    if (window._asrRecognition) {
      try { window._asrRecognition.abort(); } catch(e){}
      window._asrRecognition = null;
    }
    if (window.currentIndicTtsAudio) {
      try {
        window.currentIndicTtsAudio.pause();
        window.currentIndicTtsAudio.currentTime = 0;
      } catch(e){}
      window.currentIndicTtsAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsListening(false);
    setVoiceQuery('');
  };

  useEffect(() => {
    if (activeTab !== 'voice') {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [activeTab]);


  useEffect(() => {
    let intervalId;
    if (isListening || isSpeaking) {
      let phase = 0;
      intervalId = setInterval(() => {
        const analyser = typeof window !== 'undefined' ? window._asrAnalyser : null;
        if (isListening && analyser) {
          // Read actual real-time microphone frequency data!
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const newHeights = Array.from({ length: 60 }, (_, i) => {
            // Map the 60 visual bars to frequency bands (primarily lower speech ranges)
            const freqIdx = Math.floor((i / 60) * dataArray.length * 0.5);
            const amplitude = dataArray[freqIdx] || 0;
            // Map 0-255 amplitude to 6px-40px bar height
            const height = 6 + (amplitude / 255) * 34 + Math.random() * 3;
            return Math.round(height);
          });
          setBarHeights(newHeights);
        } else {
          // Simulated smooth pulsing waves for Speaking/Thinking/Fallback
          phase += 0.3;
          const newHeights = Array.from({ length: 60 }, (_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const wave = Math.sin(angle * 4 + phase) * Math.cos(angle * 2 - phase * 0.5);
            const height = 8 + Math.abs(wave) * 24 + Math.random() * 4;
            return Math.round(height);
          });
          setBarHeights(newHeights);
        }
      }, 50); // Faster 50ms interval for extremely smooth and responsive animation
    } else {
      setBarHeights(Array.from({ length: 60 }, () => 8));
    }
    return () => clearInterval(intervalId);
  }, [isListening, isSpeaking]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoiceAvailability = () => {
      const voices = window.speechSynthesis.getVoices();
      setVoiceAvailability({
        en: voices.some((voice) => voice.lang?.toLowerCase().startsWith('en')),
        te: voices.some((voice) => voice.lang?.toLowerCase().startsWith('te')),
      });
    };

    updateVoiceAvailability();
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoiceAvailability);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoiceAvailability);
    }

    window.speechSynthesis.onvoiceschanged = updateVoiceAvailability;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === updateVoiceAvailability) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getSpeechVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);

    const loadedVoices = window.speechSynthesis.getVoices();
    if (loadedVoices.length) return Promise.resolve(loadedVoices);

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 300);
      window.speechSynthesis.onvoiceschanged = () => {
        clearTimeout(timer);
        resolve(window.speechSynthesis.getVoices());
      };
    });
  };

  const normalizeVoiceText = (text) =>
    String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const buildDeployedVoiceResponse = (queryText, lang = 'en') => {
    const query = normalizeVoiceText(queryText);
    const isTelugu = lang === 'te' || /[\u0C00-\u0C7F]/.test(queryText || '');
    const availableItems = flatMenu.filter(item => item.availability_status !== 'out_of_stock');
    const outOfStockItems = flatMenu.filter(item => item.availability_status === 'out_of_stock');
    const productMatch = flatMenu.find((item) => {
      const name = normalizeVoiceText(item.name);
      if (!name) return false;
      if (query.includes(name)) return true;
      return name.split(/\s+/).some(token => token.length > 3 && query.includes(token));
    });
    const hasAny = (...terms) => terms.some(term => query.includes(term));

    let text;
    if (productMatch) {
      const available = productMatch.availability_status !== 'out_of_stock';
      text = isTelugu
        ? `${productMatch.name} ${available ? 'ప్రస్తుతం అందుబాటులో ఉంది' : 'ప్రస్తుతం స్టాక్ లో లేదు'}. ధర Rs.${productMatch.price || 0}.`
        : `${productMatch.name} is ${available ? 'available' : 'currently out of stock'} at Rs.${productMatch.price || 0}.`;
    } else if (hasAny('stock', 'inventory', 'available', 'out of stock', 'స్టాక్', 'అందుబాట')) {
      const topOut = outOfStockItems.slice(0, 5).map(item => item.name).join(', ');
      text = isTelugu
        ? `ప్రస్తుతం ${availableItems.length} ఉత్పత్తులు అందుబాటులో ఉన్నాయి. ${topOut ? `స్టాక్ లో లేని వాటిలో ${topOut}.` : 'అన్ని ప్రధాన వస్తువులు అందుబాటులో ఉన్నాయి.'}`
        : `${availableItems.length} items are available right now. ${topOut ? `Out of stock: ${topOut}.` : 'All key items are currently available.'}`;
    } else if (hasAny('menu', 'product', 'item', 'price', 'category', 'మెను', 'ఉత్పత్తి', 'ధర')) {
      const categoriesCount = new Set(flatMenu.map(item => item.category).filter(Boolean)).size;
      const samples = availableItems.slice(0, 5).map(item => `${item.name} Rs.${item.price || 0}`).join(', ');
      text = isTelugu
        ? `మెనులో ${flatMenu.length} ఉత్పత్తులు, ${categoriesCount} కేటగిరీలు ఉన్నాయి. ${samples ? `కొన్ని అందుబాటులో ఉన్నవి: ${samples}.` : ''}`
        : `The menu has ${flatMenu.length} items across ${categoriesCount} categories. ${samples ? `Available picks include ${samples}.` : ''}`;
    } else if (hasAny('customer', 'user', 'online', 'login', 'వినియోగదార', 'కస్టమర్')) {
      const online = adminUsers.filter(customer => customer.is_online).length;
      text = isTelugu
        ? `ప్రస్తుతం ${adminUsers.length} కస్టమర్లు కనిపిస్తున్నారు. ${online} మంది ఇప్పుడు ఆన్‌లైన్‌లో ఉన్నారు.`
        : `I can see ${adminUsers.length} customer records, with ${online} online right now.`;
    } else if (hasAny('sales', 'revenue', 'orders', 'income', 'ఆదాయం', 'అమ్మకాలు', 'ఆర్డర్')) {
      const revenue = dashboardData?.total_revenue ?? dashboardData?.revenue ?? 0;
      const orders = dashboardData?.total_orders ?? dashboardData?.orders ?? 0;
      text = isTelugu
        ? `ప్రస్తుత డ్యాష్‌బోర్డ్ ప్రకారం ఆదాయం Rs.${revenue}, ఆర్డర్లు ${orders}.`
        : `Current dashboard figures show Rs.${revenue} revenue and ${orders} orders.`;
    } else if (hasAny('analytics', 'trend', 'demand', 'insight', 'అనలిటిక్స్')) {
      const alert = analytics?.demand_alerts?.[0];
      text = isTelugu
        ? (alert ? `ప్రధాన ఇన్‌సైట్: ${alert}` : 'ఇంకా సరిపడా కస్టమర్ డేటా లేదు. డేటా వచ్చినప్పుడు ఇన్‌సైట్లు కనిపిస్తాయి.')
        : (alert || 'There is not enough customer activity yet. Analytics will update as customers browse and order.');
    } else {
      text = isTelugu
        ? `మీ ప్రశ్నను అర్థం చేసుకున్నాను. మెను, స్టాక్, కస్టమర్లు లేదా ఆఫర్ల గురించి అడగండి. ప్రస్తుతం ${availableItems.length} వస్తువులు అందుబాటులో ఉన్నాయి.`
        : `I understood your question. Ask me about menu, stock, customers, offers, or sales. Right now ${availableItems.length} items are available.`;
    }

    return { text, voice: text, lang: isTelugu ? 'te' : 'en' };
  };

  const handleVoiceQuerySubmit = async (queryText, queryLang = voiceLang) => {
    if (!queryText || !queryText.trim()) return;

    const cleanQuery = queryText.trim();
    const normalizedQuery = normalizeVoiceText(cleanQuery);
    const now = Date.now();
    if (
      typeof window !== 'undefined' &&
      window._lastSubmittedText === normalizedQuery &&
      now - (window._lastSubmitTime || 0) < 8000
    ) {
      setVoiceQuery('');
      resumeListeningAfterAI(600);
      return;
    }
    if (typeof window !== 'undefined') {
      window._lastSubmittedText = normalizedQuery;
      window._lastSubmitTime = now;
    }

    const userMessage = { role: 'user', text: queryText.trim(), timestamp: new Date().toLocaleTimeString() };
    setVoiceHistory(prev => [...prev, userMessage]);
    setVoiceQuery('');
    setVoiceReply('');
    setVoiceError('');
    setIsAnalyzing(true);

    // Safety valve — if speechSynthesis never fires onend, unblock mic after 15s
    let safetyTimer = null;
    const forceResume = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        safetyTimer = setTimeout(forceResume, 3000);
        return;
      }
      setIsSpeaking(false);
      resumeListeningAfterAI();
    };

    try {
      const effectiveLang = queryLang || voiceLang || 'en';
      let data;
      if (HAS_BACKEND_API) {
        const res = await fetchAdmin(`${API_BASE}/api/ai/voice?speech_text=${encodeURIComponent(cleanQuery)}&lang=${encodeURIComponent(effectiveLang)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error ${res.status}`);
        }
        data = await res.json();
      } else {
        data = buildDeployedVoiceResponse(cleanQuery, effectiveLang);
      }
      const replyText = data.text || data.reply || 'No response from AI.';
      const spokenReply = data.voice || replyText;
      const botMessage = { role: 'bot', text: replyText, timestamp: new Date().toLocaleTimeString() };
      setVoiceHistory(prev => [...prev, botMessage]);
      setVoiceReply(replyText);
      if (typeof window !== 'undefined') {
        window._aiSpeaking = true;
      }

      // Speak the response aloud
      if (effectiveLang !== 'en' && HAS_BACKEND_API && typeof window !== 'undefined') {
        try {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          setIsSpeaking(true);
          const token = localStorage.getItem('kapi_token');
          const ttsRes = await fetch(`${API_BASE}/api/ai/tts?text=${encodeURIComponent(spokenReply)}&lang=${encodeURIComponent(effectiveLang)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!ttsRes.ok) throw new Error(`Indic TTS failed ${ttsRes.status}`);

          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          window.currentIndicTtsAudio = audio;
          safetyTimer = setTimeout(forceResume, Math.min(45000, Math.max(15000, String(spokenReply).length * 90)));

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            stopBargeInMonitor();
            if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            setIsSpeaking(false);
            resumeListeningAfterAI();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            stopBargeInMonitor();
            if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            setIsSpeaking(false);
            resumeListeningAfterAI();
          };

          startBargeInMonitor();
          await audio.play();
          return;
        } catch (ttsErr) {
          console.warn('Indic TTS playback failed, falling back to browser speech:', ttsErr);
          stopBargeInMonitor();
          if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
          setIsSpeaking(false);
        }
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        
        // Chrome bug workaround: resume if paused
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(spokenReply);
        const langMap = { te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN' };
        const responseLang = data.lang || effectiveLang;
        const targetLang = langMap[responseLang] || 'en-US';
        utterance.lang = targetLang;
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

        // Try to select a native voice matching the language
        const voices = await getSpeechVoices();
        let bestVoice = voices.find(v => v.lang === targetLang);
        if (!bestVoice) {
          // Fallback to general language code match (e.g. 'te' instead of 'te-IN')
          const baseLang = targetLang.split('-')[0];
          bestVoice = voices.find(v => v.lang.startsWith(baseLang));
        }
        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log('ASR SpeechSynthesis: using voice:', bestVoice.name, 'for lang:', targetLang);
        }

        // Safety: force-resume mic if speech never fires (Chrome bug on some systems).
        // Keep this long enough that normal spoken answers are not captured by the mic.
        const speechSafetyMs = Math.min(45000, Math.max(15000, String(spokenReply).length * 90));
        safetyTimer = setTimeout(forceResume, speechSafetyMs);

        utterance.onstart = () => {
          setIsSpeaking(true);
          startBargeInMonitor();
        };
        utterance.onend = () => {
          stopBargeInMonitor();
          if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
          setIsSpeaking(false);
          resumeListeningAfterAI();
        };
        utterance.onerror = (speechErr) => {
          console.warn('ASR SpeechSynthesis error:', speechErr);
          stopBargeInMonitor();
          if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
          setIsSpeaking(false);
          resumeListeningAfterAI();
        };

        window.currentUtterance = utterance;
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } else {
        // No speechSynthesis — just resume mic
        resumeListeningAfterAI(200);
      }
    } catch (err) {
      console.error('Voice query error:', err);
      const errorMsg = err.message || 'Could not reach the AI. Check if the server is running.';
      setVoiceError(errorMsg);
      setVoiceHistory(prev => [...prev, { role: 'bot', text: `⚠️ ${errorMsg}`, timestamp: new Date().toLocaleTimeString() }]);
      // CRITICAL: always unblock mic on error so user can speak again
      resumeListeningAfterAI(500);
    } finally {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      setIsAnalyzing(false);
    }
  };


  // Add/Edit menu item submit
  const handleCreateOrUpdateMenuItem = async (e) => {
    e.preventDefault();
    const payload = {
      name: menuForm.name,
      description: menuForm.description,
      category_id: menuForm.category_id,
      price: parseFloat(menuForm.price),
      availability_status: menuForm.availability_status,
      rating: parseFloat(menuForm.rating || '4.5'),
      prep_time: parseInt(menuForm.prep_time || '5'),
      pieces: menuForm.pieces || null
    };

    if (!editingMenuItem || hasSelectedNewImage) {
      payload.image_url = menuForm.image_url || null;
    }

    try {
      let url = `${API_BASE}/api/admin/menu`;
      let method = 'POST';
      let query = 'select=*';
      const { pieces, ...supabasePayload } = payload;
      supabasePayload.description = formatPiecesIntoDesc(payload.description, pieces);
      
      if (editingMenuItem) {
        url = `${API_BASE}/api/admin/menu/${editingMenuItem.id}`;
        method = 'PATCH';
        query = `id=eq.${encodeURIComponent(editingMenuItem.id)}&select=*`;
      }

      const res = HAS_BACKEND_API
        ? await fetchAdmin(url, {
            method,
            body: JSON.stringify(payload)
          })
        : await supabaseRequest('menu_items', { method, query, body: supabasePayload });

      if (res.ok) {
        showToast(editingMenuItem ? 'Menu item updated successfully!' : 'Menu item created successfully!');
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));

        setShowAddMenuForm(false);
        setEditingMenuItem(null);
        setMenuForm({
          name: '',
          description: '',
          category_id: categories[0]?.id || '',
          price: '',
          availability_status: 'available',
          image_url: '',
          prep_time: '5',
          rating: '4.5',
          pieces: ''
        });
      } else {
        const message = await responseError(res, 'Failed to save menu item');
        showToast(`Error: ${message}`, 'error');
      }
    } catch (err) {
      console.error('Error saving menu item:', err);
      showToast(`Error saving menu item: ${err.message || err}`, 'error');
    }
  };

  const handleMenuSubmit = handleCreateOrUpdateMenuItem;

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.name.trim()) {
      showToast("Please enter a category name.", 'error');
      return;
    }
    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim()
    };
    try {
      const res = HAS_BACKEND_API
        ? await fetchAdmin(`${API_BASE}/api/admin/categories`, {
            method: 'POST',
            body: JSON.stringify(payload)
          })
        : await supabaseRequest('categories', { method: 'POST', query: 'select=*', body: payload });
      if (res.ok) {
        showToast('Category created successfully!');
        setCategoryForm({ name: '', description: '' });
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));
      } else {
        const message = await responseError(res, 'Failed to create category');
        showToast(`Error: ${message}`, 'error');
      }
    } catch (err) {
      console.error('Error creating category:', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleCategoryVisibility = async (e, cat) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const isCurrentlyHidden = (cat.description || '').endsWith('[HIDDEN]');
    let newDesc = cat.description || '';
    if (isCurrentlyHidden) {
      newDesc = newDesc.replace(' [HIDDEN]', '').replace('[HIDDEN]', '').trim();
    } else {
      newDesc = `${newDesc.trim()} [HIDDEN]`.trim();
    }

    setCategories(prevCats => 
      prevCats.map(c => c.id === cat.id ? { ...c, description: newDesc } : c)
    );

    const payload = {
      name: cat.name,
      description: newDesc
    };

    try {
      const res = HAS_BACKEND_API
        ? await fetchAdmin(`${API_BASE}/api/admin/categories/${cat.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          })
        : await supabaseRequest('categories', {
            method: 'PATCH',
            query: `id=eq.${encodeURIComponent(cat.id)}&select=*`,
            body: payload
          });
      if (!res.ok) {
        setCategories(prevCats => 
          prevCats.map(c => c.id === cat.id ? cat : c)
        );
        const message = await responseError(res, 'Error');
        showToast(`Failed to update category visibility: ${message}`, 'error');
      } else {
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));
      }
    } catch (err) {
      console.error('Error updating category visibility:', err);
      setCategories(prevCats => 
        prevCats.map(c => c.id === cat.id ? cat : c)
      );
    }
  };

  const handleDeleteCategory = async (e, catId) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!confirm('Are you sure you want to delete this category? All products in this category will also be deleted!')) return;
    
    const originalCats = [...categories];
    const originalMenu = [...flatMenu];

    setCategories(prevCats => prevCats.filter(c => c.id !== catId));
    setFlatMenu(prevMenu => prevMenu.filter(m => m.category_id !== catId));

    try {
      let res;
      if (HAS_BACKEND_API) {
        res = await fetchAdmin(`${API_BASE}/api/admin/categories/${catId}`, {
          method: 'DELETE'
        });
      } else {
        const itemDeleteRes = await supabaseRequest('menu_items', {
          method: 'DELETE',
          query: `category_id=eq.${encodeURIComponent(catId)}`
        });
        if (!itemDeleteRes.ok) {
          const message = await responseError(itemDeleteRes, 'Failed to delete category products');
          throw new Error(message);
        }
        res = await supabaseRequest('categories', {
          method: 'DELETE',
          query: `id=eq.${encodeURIComponent(catId)}`
        });
      }
      if (!res.ok) {
        setCategories(originalCats);
        setFlatMenu(originalMenu);
        const message = await responseError(res, 'Error');
        showToast(`Failed to delete category: ${message}`, 'error');
      } else {
        showToast('Category and its products deleted successfully!');
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setCategories(originalCats);
      setFlatMenu(originalMenu);
      showToast(`Failed to delete category: ${err.message || err}`, 'error');
    }
  };

  const handleToggleAvailability = async (e, item) => {
    if (e && e.preventDefault) e.preventDefault();
    const newStatus = item.availability_status === 'available' ? 'out_of_stock' : 'available';
    
    // Optimistically update state immediately
    setFlatMenu(prevMenu => 
      prevMenu.map(m => m.id === item.id ? { ...m, availability_status: newStatus } : m)
    );

    const payload = {
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      price: parseFloat(item.price),
      availability_status: newStatus,
      image_url: item.image_url,
      rating: parseFloat(item.rating || '4.5'),
      prep_time: parseInt(item.prep_time || '5')
    };

    try {
      const res = HAS_BACKEND_API
        ? await fetchAdmin(`${API_BASE}/api/admin/menu/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          })
        : await supabaseRequest('menu_items', {
            method: 'PATCH',
            query: `id=eq.${encodeURIComponent(item.id)}&select=*`,
            body: { availability_status: newStatus }
          });
      if (!res.ok) {
        // Rollback state
        setFlatMenu(prevMenu => 
          prevMenu.map(m => m.id === item.id ? { ...m, availability_status: item.availability_status } : m)
        );
        const message = await responseError(res, 'Error');
        showToast(`Failed to update stock status: ${message}`, 'error');
      } else {
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      // Rollback state
      setFlatMenu(prevMenu => 
        prevMenu.map(m => m.id === item.id ? { ...m, availability_status: item.availability_status } : m)
      );
      showToast(`Failed to update stock status: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteMenuItem = async (e, id) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    const originalMenu = [...flatMenu];
    // Optimistically remove from state immediately
    setFlatMenu(prevMenu => prevMenu.filter(m => m.id !== id));

    try {
      const res = HAS_BACKEND_API
        ? await fetchAdmin(`${API_BASE}/api/admin/menu/${id}`, {
            method: 'DELETE'
          })
        : await supabaseRequest('menu_items', {
            method: 'DELETE',
            query: `id=eq.${encodeURIComponent(id)}`
          });
      if (!res.ok) {
        // Rollback state
        setFlatMenu(originalMenu);
        const message = await responseError(res, 'Error');
        showToast(`Failed to delete menu item: ${message}`, 'error');
      } else {
        showToast('Menu item deleted successfully!');
        await fetchMenu();
        window.dispatchEvent(new Event('kapi_menu_updated'));
      }
    } catch (err) {
      console.error('Error deleting menu item:', err);
      // Rollback state
      setFlatMenu(originalMenu);
      showToast(`Failed to delete menu item: ${err.message || err}`, 'error');
    }
  };

  // Update Inventory Qty
  const handleUpdateInventory = async (id) => {
    const qty = parseFloat(editingQty);
    if (isNaN(qty)) return;

    try {
      const res = await fetchAdmin(`${API_BASE}/api/admin/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: qty })
      });
      if (res.ok) {
        setEditingInventoryId(null);
        setEditingQty('');
        fetchInventory();
      }
    } catch (err) {
      console.error('Error updating inventory quantity:', err);
    }
  };

  // Log Expense submit
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      date: expenseForm.date
    };

    try {
      const res = await fetchAdmin(`${API_BASE}/api/admin/expenses`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Expense logged successfully!');
        setExpenseForm({
          category: 'Ingredients',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchExpenses();
      }
    } catch (err) {
      console.error('Error logging expense:', err);
    }
  };

  // Helper calculation for expenses
  const expenseTotals = () => {
    if (expenses.length === 0) return { daily: 0, monthly: 0, total: 0 };
    const todayStr = new Date().toISOString().split('T')[0];
    const currMonthStr = todayStr.substring(0, 7); // YYYY-MM

    let daily = 0;
    let monthly = 0;
    let total = 0;

    expenses.forEach(e => {
      const amt = parseFloat(e.amount || 0);
      total += amt;
      if (e.date === todayStr) daily += amt;
      if (e.date && e.date.substring(0, 7) === currMonthStr) monthly += amt;
    });

    return { daily, monthly, total };
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: COLORS.bg,
      color: COLORS.textPrimary,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      flexDirection: 'row',
    }}>
      {/* Top Mobile Header */}
      {(breakpoint === 'xs' || breakpoint === 'sm') && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(12, 8, 4, 0.95)',
          borderBottom: `1px solid ${COLORS.cardBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 130,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setMobileMenuOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.textPrimary,
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >
              ☰
            </button>
            <h2 style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ff8c00, #d4af37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Kapi Adda
            </h2>
          </div>
          
          {/* Quick Profile shortcut on header */}
          <div 
            onClick={() => setActiveTab('profile')}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            A
          </div>
        </div>
      )}

      {/* Sidebar (Desktop or Mobile Drawer Overlay) */}
      {((breakpoint !== 'xs' && breakpoint !== 'sm') || mobileMenuOpen) && (
        <>
          {/* Backdrop for mobile drawer */}
          {(breakpoint === 'xs' || breakpoint === 'sm') && (
            <div 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 140,
              }}
            />
          )}
          
          <div style={{
            position: (breakpoint === 'xs' || breakpoint === 'sm') ? 'fixed' : 'relative',
            top: 0,
            bottom: 0,
            left: 0,
            width: '220px',
            background: 'rgba(12, 8, 4, 0.98)',
            borderRight: `1px solid ${COLORS.cardBorder}`,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            flexShrink: 0,
            zIndex: 150,
            boxShadow: (breakpoint === 'xs' || breakpoint === 'sm') ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
          }}>
            {/* Close button for mobile drawer */}
            {(breakpoint === 'xs' || breakpoint === 'sm') && (
              <button 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  alignSelf: 'flex-end',
                  background: 'transparent',
                  border: 'none',
                  color: COLORS.textSecondary,
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  marginBottom: '12px'
                }}
              >
                ✕
              </button>
            )}

            {/* Brand (Desktop only) */}
            {(breakpoint !== 'xs' && breakpoint !== 'sm') && (
              <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '22px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #ff8c00, #d4af37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.5px'
                }}>
                  Kapi Adda Admin
                </h2>
                <span style={{ fontSize: '11px', color: COLORS.textSecondary }}>Intelligence Platform</span>
              </div>
            )}

            {/* Tab Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {[
                { id: 'menu', label: 'Menu Catalog', icon: '🍽️' },
                { id: 'analytics', label: 'AI Analytics', icon: '📈' },
                { id: 'users', label: 'User Management', icon: '👥' },
                { id: 'voice', label: 'AI Voice', icon: '🎙️' },
                { id: 'offers', label: 'Daily Offers', icon: '🏷️' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isActive ? 'linear-gradient(90deg, rgba(255, 140, 0, 0.15), transparent)' : 'transparent',
                      color: isActive ? COLORS.amber : COLORS.textSecondary,
                      fontSize: '14px',
                      fontWeight: isActive ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      borderLeft: isActive ? `3px solid ${COLORS.amber}` : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = COLORS.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = COLORS.textSecondary;
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* User Info & Logout */}
            <div style={{
              marginTop: 'auto',
              borderTop: `1px solid ${COLORS.cardBorder}`,
              paddingTop: '16px',
              paddingBottom: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div 
                onClick={() => {
                  setActiveTab('profile');
                  setMobileMenuOpen(false);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Configure profile settings"
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '13px'
                }}>
                  A
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.textPrimary, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Administrator'}
                  </div>
                  <div style={{ fontSize: '10px', color: COLORS.textMuted }}>Owner Account</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        background: COLORS.bg,
        padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '16px' : breakpoint === 'md' ? '24px' : breakpoint === 'lg' ? '32px 36px' : '40px 48px',
        maxWidth: screen.contentMaxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        overflowY: 'auto',
        marginTop: (breakpoint === 'xs' || breakpoint === 'sm') ? '60px' : '0',
      }}>


        {/* TAB 2: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>Menu Catalog Management</h1>
                <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Add, update, or remove restaurant menu items</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryForm({ name: '', description: '' });
                    setShowCategoryManager(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1.5px solid ${COLORS.cardBorder}`,
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📁 Manage Categories
                </button>
                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    setHasSelectedNewImage(true);
                    setMenuForm({
                      name: '',
                      description: '',
                      category_id: categories[0]?.id || '',
                      price: '',
                      availability_status: 'available',
                      image_url: '',
                      prep_time: '5',
                      rating: '4.5',
                      pieces: ''
                    });
                    setShowAddMenuForm(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  + Add New Item
                </button>
              </div>
            </div>

            {loadingMenu && <p style={{ color: COLORS.textSecondary }}>Fetching menu catalog...</p>}

            {/* Menu Form Panel Overlay */}
            {showAddMenuForm && (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 150,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  background: COLORS.surface,
                  border: `1.5px solid ${COLORS.cardBorder}`,
                  borderRadius: '20px',
                  padding: '32px',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 20px 80px rgba(0,0,0,0.8)'
                }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 'bold', color: COLORS.amber }}>
                    {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>
                  <form onSubmit={handleMenuSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Item Name</label>
                      <input
                        type="text"
                        required
                        value={menuForm.name}
                        onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Description</label>
                      <textarea
                        required
                        value={menuForm.description}
                        onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                        style={{ width: '100%', height: '70px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Category</label>
                        <select
                          value={menuForm.category_id}
                          onChange={(e) => setMenuForm({ ...menuForm, category_id: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(12,8,4,0.95)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Price (₹)</label>
                        <input
                          type="number"
                          required
                          value={menuForm.price}
                          onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Prep Time (mins)</label>
                        <input
                          type="number"
                          value={menuForm.prep_time}
                          onChange={(e) => setMenuForm({ ...menuForm, prep_time: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Pieces (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 5 pieces"
                          value={menuForm.pieces}
                          onChange={(e) => setMenuForm({ ...menuForm, pieces: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Item Image</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Preview thumbnail */}
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '10px',
                          border: `1px solid ${COLORS.cardBorder}`,
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {(() => {
                            const previewSrc = editingMenuItem 
                              ? (hasSelectedNewImage 
                                  ? menuForm.image_url 
                                  : getImageForItem({
                                      name: menuForm.name,
                                      category: categories.find(c => c.id === menuForm.category_id)?.name,
                                      image_url: menuForm.image_url
                                    }))
                              : menuForm.image_url;
                            return previewSrc ? (
                              <img src={previewSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '20px', color: COLORS.textMuted }}>📷</span>
                            );
                          })()}
                        </div>
                        {/* Upload Button */}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById('menuImageFileInput').click()}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px dashed ${COLORS.cardBorder}`,
                              borderRadius: '8px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              textAlign: 'center',
                              transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.amber}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.cardBorder}
                          >
                            {menuForm.image_url ? 'Change Selected Image' : 'Choose / Upload Image'}
                          </button>
                          <input
                            id="menuImageFileInput"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onClick={(e) => { e.target.value = ''; }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const img = new Image();
                                  img.src = reader.result;
                                  img.onload = () => {
                                    const maxDim = 800;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > maxDim || height > maxDim) {
                                      if (width > height) {
                                        height = Math.round((height * maxDim) / width);
                                        width = maxDim;
                                      } else {
                                        width = Math.round((width * maxDim) / height);
                                        height = maxDim;
                                      }
                                    }
                                    const canvas = document.createElement('canvas');
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                    setMenuForm(prev => ({ ...prev, image_url: compressedDataUrl }));
                                    setHasSelectedNewImage(true);
                                  };
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        {/* Clear selection */}
                        {menuForm.image_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuForm(prev => ({ ...prev, image_url: '' }));
                              setHasSelectedNewImage(true);
                            }}
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: `1px solid rgba(239, 68, 68, 0.2)`,
                              borderRadius: '8px',
                              color: COLORS.red,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMenuForm(false);
                          setEditingMenuItem(null);
                        }}
                        style={{ flex: 1, padding: '11px', background: 'transparent', border: `1.5px solid ${COLORS.cardBorder}`, borderRadius: '10px', color: COLORS.textSecondary, cursor: 'pointer', fontWeight: '600' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ flex: 1, padding: '11px', background: COLORS.amber, border: 'none', borderRadius: '10px', color: '#000', cursor: 'pointer', fontWeight: '700' }}
                      >
                        {editingMenuItem ? 'Save Changes' : 'Create Item'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showCategoryManager && (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 150,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  background: COLORS.surface,
                  border: `1.5px solid ${COLORS.cardBorder}`,
                  borderRadius: '20px',
                  padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '20px' : '32px',
                  width: '100%',
                  maxWidth: '750px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 80px rgba(0,0,0,0.8)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: COLORS.amber }}>
                      📁 Manage Categories
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(false)}
                      style={{ background: 'transparent', border: 'none', color: COLORS.textSecondary, fontSize: '20px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: (breakpoint === 'xs' || breakpoint === 'sm') ? '1fr' : '1fr 1.2fr', gap: '28px' }}>
                    {/* Add Category Form */}
                    <div style={{ 
                      borderRight: (breakpoint === 'xs' || breakpoint === 'sm') ? 'none' : `1px solid ${COLORS.cardBorder}`, 
                      borderBottom: (breakpoint === 'xs' || breakpoint === 'sm') ? `1px solid ${COLORS.cardBorder}` : 'none',
                      paddingRight: (breakpoint === 'xs' || breakpoint === 'sm') ? '0' : '20px',
                      paddingBottom: (breakpoint === 'xs' || breakpoint === 'sm') ? '20px' : '0'
                    }}>
                      <h4 style={{ margin: '0 0 16px', color: '#fff', fontSize: '15px' }}>Create Category</h4>
                      <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Category Name</label>
                          <input
                            type="text"
                            required
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            placeholder="e.g. Desserts"
                            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Description</label>
                          <textarea
                            required
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            placeholder="Briefly describe the category..."
                            style={{ width: '100%', height: '80px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none' }}
                          />
                        </div>
                        <button
                          type="submit"
                          style={{ padding: '10px', background: COLORS.amber, border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}
                        >
                          Create Category
                        </button>
                      </form>
                    </div>

                    {/* Categories List */}
                    <div>
                      <h4 style={{ margin: '0 0 16px', color: '#fff', fontSize: '15px' }}>Existing Categories</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                        {categories.map((cat) => {
                          const isHidden = (cat.description || '').endsWith('[HIDDEN]');
                          const cleanDesc = (cat.description || '').replace(' [HIDDEN]', '').replace('[HIDDEN]', '').trim();
                          
                          return (
                            <div key={cat.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ maxWidth: '65%' }}>
                                <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>{cat.name}</div>
                                <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden' }}>{cleanDesc}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleCategoryVisibility(e, cat)}
                                  style={{
                                    padding: '5px 8px',
                                    background: isHidden ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    border: `1px solid ${isHidden ? COLORS.red : COLORS.green}`,
                                    borderRadius: '6px',
                                    color: isHidden ? COLORS.red : COLORS.green,
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isHidden ? 'Hidden' : 'Visible'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCategory(e, cat.id)}
                                  style={{
                                    padding: '5px 8px',
                                    background: 'transparent',
                                    border: `1px solid ${COLORS.cardBorder}`,
                                    borderRadius: '6px',
                                    color: COLORS.textSecondary,
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            {!loadingMenu && flatMenu.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search items by name, category, or description..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px 14px 44px',
                    background: COLORS.cardBg,
                    border: `1px solid ${COLORS.cardBorder}`,
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba%28255%2C255%2C255%2C0.4%29' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: '16px center',
                    backgroundSize: '18px 18px',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = COLORS.amber}
                  onBlur={(e) => e.currentTarget.style.borderColor = COLORS.cardBorder}
                />
              </div>
            )}

            {!loadingMenu && flatMenu.length === 0 && (
              <div style={{
                padding: '32px',
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: '16px',
                color: COLORS.textSecondary,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '8px' }}>
                  No menu data loaded
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  The dashboard could not reach the live backend. It will try the Supabase fallback automatically when data is available there.
                </div>
              </div>
            )}

            {/* Menu Items Table */}
            {!loadingMenu && flatMenu.length > 0 && (() => {
              const filteredMenu = flatMenu.filter(item => {
                const query = menuSearchQuery.toLowerCase();
                return (
                  (item.name || '').toLowerCase().includes(query) ||
                  (item.category || '').toLowerCase().includes(query) ||
                  (item.description || '').toLowerCase().includes(query)
                );
              });

              if (filteredMenu.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px', background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '16px', color: COLORS.textSecondary }}>
                    <p style={{ margin: 0, fontSize: '15px' }}>No items match your search details.</p>
                  </div>
                );
              }

              return (
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Category</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Price</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMenu.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: idx < filteredMenu.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</div>
                            <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>{item.description}</div>
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: '13px', color: COLORS.textSecondary }}>{item.category || 'Snacks'}</td>
                          <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '800', color: COLORS.amber }}>₹{item.price}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: item.availability_status === 'available' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              border: `1px solid ${item.availability_status === 'available' ? COLORS.green : COLORS.red}`,
                              color: item.availability_status === 'available' ? COLORS.green : COLORS.red,
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {item.availability_status === 'available' ? 'Available' : 'Out of Stock'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleAvailability(e, item)}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid ${COLORS.cardBorder}`,
                                  borderRadius: '8px',
                                  color: COLORS.textSecondary,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                Toggle Stock
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingMenuItem(item);
                                  setHasSelectedNewImage(false);
                                  setMenuForm({
                                    name: item.name,
                                    description: item.description || '',
                                    category_id: item.category_id || '',
                                    price: item.price.toString(),
                                    availability_status: item.availability_status || 'available',
                                    image_url: item.image_url || '',
                                    prep_time: (item.prep_time || '5').toString(),
                                    rating: (item.rating || '4.5').toString(),
                                    pieces: item.pieces || ''
                                  });
                                  setShowAddMenuForm(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid ${COLORS.amber}`,
                                  borderRadius: '8px',
                                  color: COLORS.amber,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMenuItem(e, item.id)}
                                style={{
                                  padding: '6px 12px',
                                  background: 'transparent',
                                  border: `1px solid ${COLORS.red}`,
                                  borderRadius: '8px',
                                  color: COLORS.red,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: INVENTORY */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>Inventory Management</h1>
              <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Track ingredient levels, stock thresholds, and alerts</p>
            </div>

            {loadingInventory && <p style={{ color: COLORS.textSecondary }}>Fetching inventory data...</p>}

            {/* Inventory cards */}
            {!loadingInventory && inventory.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '20px', borderRadius: '16px' }}>
                    <div style={{ color: COLORS.textSecondary, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Total Ingredients</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '8px' }}>{inventory.length} Items</div>
                  </div>
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '20px', borderRadius: '16px' }}>
                    <div style={{ color: COLORS.textSecondary, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Low Stock</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: COLORS.amber, marginTop: '8px' }}>
                      {inventory.filter(i => parseFloat(i.quantity) <= parseFloat(i.threshold)).length} Items
                    </div>
                  </div>
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '20px', borderRadius: '16px' }}>
                    <div style={{ color: COLORS.textSecondary, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Out of Stock</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: COLORS.red, marginTop: '8px' }}>
                      {inventory.filter(i => parseFloat(i.quantity) === 0).length} Items
                    </div>
                  </div>
                </div>

                {/* Inventory Table */}
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Ingredient Name</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Available Stock</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Threshold</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, idx) => {
                        const isLow = parseFloat(item.quantity) <= parseFloat(item.threshold);
                        const isOut = parseFloat(item.quantity) === 0;
                        const isEditing = editingInventoryId === item.id;

                        return (
                          <tr key={item.id || idx} style={{ borderBottom: idx < inventory.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                            <td style={{ padding: '14px 20px', fontWeight: '700', fontSize: '14px' }}>{item.item_name}</td>
                            <td style={{ padding: '14px 20px', fontSize: '14px' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="number"
                                    value={editingQty}
                                    onChange={(e) => setEditingQty(e.target.value)}
                                    style={{ width: '80px', padding: '6px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '6px', color: '#fff', outline: 'none' }}
                                  />
                                  <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>{item.unit}</span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: '600' }}>{item.quantity} {item.unit}</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '13px', color: COLORS.textSecondary }}>{item.threshold} {item.unit}</td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: isOut ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(255,140,0,0.1)' : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${isOut ? COLORS.red : isLow ? COLORS.amber : COLORS.green}`,
                                color: isOut ? COLORS.red : isLow ? COLORS.amber : COLORS.green,
                                fontSize: '11px',
                                fontWeight: '700'
                              }}>
                                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => setEditingInventoryId(null)}
                                    style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: COLORS.textSecondary, fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleUpdateInventory(item.id)}
                                    style={{ padding: '6px 12px', background: COLORS.amber, border: 'none', borderRadius: '8px', color: '#000', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingInventoryId(item.id);
                                    setEditingQty(item.quantity.toString());
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'transparent',
                                    border: `1px solid ${COLORS.amber}`,
                                    borderRadius: '8px',
                                    color: COLORS.amber,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  Update Qty
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: EXPENSES */}
        {activeTab === 'expenses' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>Expense Tracking</h1>
              <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Monitor operating expenses and ingredient acquisition costs</p>
            </div>

            {loadingExpenses && <p style={{ color: COLORS.textSecondary }}>Fetching operating expenses...</p>}

            {!loadingExpenses && (
              <div style={{ display: 'grid', gridTemplateColumns: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? '1fr' : '1fr 300px', gap: '28px', alignItems: 'start' }}>
                {/* Left side: Totals + List + SVG Bar Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Totals */}
                  <div style={{ display: 'grid', gridTemplateColumns: (breakpoint === 'xs' || breakpoint === 'sm') ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '16px', borderRadius: '12px' }}>
                      <div style={{ color: COLORS.textSecondary, fontSize: '11px', fontWeight: '600' }}>Daily Expenses</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.textPrimary, marginTop: '4px' }}>₹{expenseTotals().daily}</div>
                    </div>
                    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '16px', borderRadius: '12px' }}>
                      <div style={{ color: COLORS.textSecondary, fontSize: '11px', fontWeight: '600' }}>Monthly Total</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.amber, marginTop: '4px' }}>₹{expenseTotals().monthly}</div>
                    </div>
                    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '16px', borderRadius: '12px' }}>
                      <div style={{ color: COLORS.textSecondary, fontSize: '11px', fontWeight: '600' }}>Cumulative Expenses</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.textPrimary, marginTop: '4px' }}>₹{expenseTotals().total}</div>
                    </div>
                  </div>

                  {/* SVG Chart Expenses by Category */}
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '20px', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>Expenses by Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {['Ingredients', 'Rent', 'Salaries', 'Utilities', 'Marketing', 'Miscellaneous'].map((cat, idx) => {
                        const total = expenses.reduce((sum, e) => e.category === cat ? sum + parseFloat(e.amount || 0) : sum, 0);
                        const allTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 1;
                        const pct = (total / allTotal) * 100;
                        if (total === 0) return null;

                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                              <span>{cat}</span>
                              <span style={{ fontWeight: '700' }}>₹{total} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: COLORS.amber, borderRadius: '4px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expenses Table */}
                  {expenses.length > 0 ? (
                    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '16px', overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                            <th style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700' }}>Category</th>
                            <th style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700' }}>Description</th>
                            <th style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700' }}>Date</th>
                            <th style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary, fontWeight: '700', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((exp, idx) => (
                            <tr key={exp.id || idx} style={{ borderBottom: idx < expenses.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none' }}>
                              <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>{exp.category}</td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.textSecondary }}>{exp.description}</td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: COLORS.textSecondary }}>{exp.date}</td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: COLORS.red, textAlign: 'right' }}>₹{exp.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  ) : <p style={{ color: COLORS.textSecondary }}>No logged expenses.</p>}
                </div>

                {/* Right side: Add Expense Form */}
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: COLORS.amber }}>Log Expense</h3>
                  <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Category</label>
                      <select
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(12,8,4,0.95)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                      >
                        {['Ingredients', 'Rent', 'Salaries', 'Utilities', 'Marketing', 'Miscellaneous'].map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Description</label>
                      <input
                        type="text"
                        required
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '600' }}>Date</label>
                      <input
                        type="date"
                        required
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '8px', color: '#fff', outline: 'none' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '11px',
                        background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        marginTop: '8px'
                      }}
                    >
                      Log Expense
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>AI Business Intelligence</h1>
              <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Predictive insights, user analytics, and demand alerts</p>
            </div>

            {loadingAnalytics && <p style={{ color: COLORS.textSecondary }}>Calculating AI analysis...</p>}

            {analytics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Intelligence Warnings */}
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: COLORS.amber }}>Demand Forecast & BI Alerts</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {(analytics.demand_alerts || []).map((alertText, idx) => (
                      <div key={idx} style={{
                        padding: '14px 18px',
                        background: 'rgba(255, 140, 0, 0.05)',
                        borderLeft: `4px solid ${COLORS.amber}`,
                        borderRadius: '10px',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: COLORS.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '18px' }}>💡</span>
                        <span>{alertText}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  {/* Top Viewed items */}
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>Top Viewed Menu Items</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {(analytics.top_viewed_items || []).length === 0 ? (
                        <p style={{ color: COLORS.textSecondary, fontSize: '13px', margin: 0 }}>No product views recorded yet.</p>
                      ) : (
                        analytics.top_viewed_items.map((item, i) => {
                          const maxViews = Math.max(...analytics.top_viewed_items.map(x => x.views)) || 1;
                          const pct = (item.views / maxViews) * 100;
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ fontWeight: '600' }}>{item.name}</span>
                                <span style={{ color: COLORS.amber, fontWeight: '700' }}>{item.views} views</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: COLORS.amber, borderRadius: '3px' }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Top Searched terms Tag Cloud */}
                  <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>Trending Search Queries</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {(analytics.top_searched_items || []).length === 0 ? (
                        <p style={{ color: COLORS.textSecondary, fontSize: '13px', margin: 0 }}>No search queries recorded yet.</p>
                      ) : (
                        analytics.top_searched_items.map((search, i) => {
                          const fontSize = 12 + Math.min(6, search.count / 30);
                          return (
                            <span key={i} style={{
                              padding: '6px 12px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${COLORS.cardBorder}`,
                              borderRadius: '20px',
                              color: COLORS.gold,
                              fontSize: `${fontSize}px`,
                              fontWeight: '600'
                            }}>
                              {search.query} ({search.count})
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Hourly Activity SVG Bar Chart */}
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>Hourly Customer Traffic</h3>
                  {(analytics.activity_by_hour || []).length === 0 ? (
                    <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ color: COLORS.textSecondary, fontSize: '13px', margin: 0 }}>No customer traffic recorded yet.</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'flex-end', gap: '6px', padding: '10px 0' }}>
                      {analytics.activity_by_hour.map((hourObj, idx) => {
                        const maxCount = Math.max(...analytics.activity_by_hour.map(x => x.count)) || 1;
                        const h = hourObj.hour;
                        const count = hourObj.count;
                        const heightPct = (count / maxCount) * 100;
                        const showLabel = idx % 2 === 0;

                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ width: '100%', height: `${heightPct}%`, background: COLORS.amber, borderRadius: '3px 3px 0 0', position: 'relative' }} title={`${h}:00 - ${count} events`}>
                              <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', color: COLORS.textSecondary }}>{count}</div>
                            </div>
                            <div style={{ fontSize: '9px', color: COLORS.textSecondary, marginTop: '6px', height: '12px' }}>
                              {showLabel ? `${h}h` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Review Sentiment indicators */}
                <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.cardBorder}`, padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>Review Sentiment Analysis</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(() => {
                      const sentiment = analytics.sentiment_stats || {
                        positive: 0,
                        neutral: 0,
                        negative: 0,
                        summary: "No customer reviews submitted yet. Submit a review with a comment to see sentiment analysis.",
                        total_reviews: 0
                      };

                      return (
                        <>
                          {sentiment.total_reviews === 0 ? (
                            <div style={{
                              display: 'flex',
                              height: '24px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              background: 'rgba(255,255,255,0.02)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: COLORS.textSecondary,
                              fontSize: '11px',
                              fontWeight: '700',
                              border: `1px dashed ${COLORS.cardBorder}`
                            }}>
                              No Reviews (0%)
                            </div>
                          ) : (
                            <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                              {sentiment.positive > 0 && (
                                <div style={{ width: `${sentiment.positive}%`, background: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '11px', fontWeight: '700' }}>
                                  Positive ({sentiment.positive}%)
                                </div>
                              )}
                              {sentiment.neutral > 0 && (
                                <div style={{ width: `${sentiment.neutral}%`, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textPrimary, fontSize: '11px', fontWeight: '700' }}>
                                  Neutral ({sentiment.neutral}%)
                                </div>
                              )}
                              {sentiment.negative > 0 && (
                                <div style={{ width: `${sentiment.negative}%`, background: COLORS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                                  Negative ({sentiment.negative}%)
                                </div>
                              )}
                            </div>
                          )}
                          <p style={{ margin: 0, fontSize: '12px', color: COLORS.textSecondary, lineHeight: '1.5' }}>
                            {sentiment.summary}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* TAB: USER MANAGEMENT */}
        {activeTab === 'users' && (() => {
          const search = usersSearch.toLowerCase();
          const filtered = adminUsers
            .filter(u =>
              u.name.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search)
            )
            .sort((a, b) => {
              // Online users always at top, then by name
              if (a.is_online && !b.is_online) return -1;
              if (!a.is_online && b.is_online) return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
          const onlineUsers = filtered.filter(u => u.is_online);
          const offlineUsers = filtered.filter(u => !u.is_online);

          const UserCard = ({ u }) => (
            <div
              onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
              style={{
                background: selectedUser?.id === u.id
                  ? 'rgba(212,175,55,0.08)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selectedUser?.id === u.id ? 'rgba(212,175,55,0.4)' : COLORS.cardBorder}`,
                borderRadius: '14px',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.borderColor = COLORS.cardBorder; }}
            >
              {/* Avatar */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${u.is_online ? '#10b981' : '#6b7280'}, ${u.is_online ? '#059669' : '#4b5563'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '700', fontSize: '15px',
                boxShadow: u.is_online ? '0 0 10px rgba(16,185,129,0.35)' : 'none'
              }}>
                {(u.name || 'A')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                {/* Review preview row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  {u.reviews && u.reviews.length > 0 ? (
                    <>
                      <span style={{ fontSize: '11px', color: '#fbbf24' }}>{'★'.repeat(Math.round(u.avg_rating_given || 0))}{'☆'.repeat(5 - Math.round(u.avg_rating_given || 0))}</span>
                      <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{u.reviews.length} review{u.reviews.length !== 1 ? 's' : ''}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '10px', color: COLORS.textMuted }}>No reviews yet</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px',
                  background: u.is_online ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                  color: u.is_online ? '#10b981' : '#9ca3af',
                  border: `1px solid ${u.is_online ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                  padding: '2px 7px', borderRadius: '20px'
                }}>{u.is_online ? '● Online' : '○ Offline'}</span>
              </div>
            </div>
          );
          return (
            <div style={{ 
              display: 'flex', 
              flexDirection: (breakpoint === 'xs' || breakpoint === 'sm') ? 'column' : 'row',
              gap: '24px', 
              height: '100%', 
              overflow: (breakpoint === 'xs' || breakpoint === 'sm') ? 'visible' : 'hidden' 
            }}>
              {/* Left: User List */}
              <div style={{
                width: (breakpoint === 'xs' || breakpoint === 'sm') ? '100%' : (selectedUser ? '340px' : '100%'),
                flexShrink: 0,
                display: (breakpoint === 'xs' || breakpoint === 'sm') && selectedUser ? 'none' : 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
                transition: 'width 0.3s ease'
              }} className="no-scrollbar">
                {/* Header + Search + Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary }}>User Intelligence</h2>
                        {/* Live auto-refresh badge */}
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px',
                          background: 'rgba(16,185,129,0.1)', color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.25)',
                          padding: '2px 8px', borderRadius: '20px'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseGlow 1s infinite alternate' }} />
                          Live · Auto-refresh
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: COLORS.textSecondary }}>{adminUsers.length} registered customers · live updates every 5s</p>
                    </div>
                    <button
                      onClick={() => fetchAdminUsers(false)}
                      style={{ background: 'rgba(212,175,55,0.1)', border: `1px solid ${COLORS.gold}`, borderRadius: '8px', padding: '7px 14px',
                        color: COLORS.gold, fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                      ↻ Refresh Now
                    </button>
                  </div>
                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: (breakpoint === 'xs' || breakpoint === 'sm') ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Total Users', value: adminUsers.length, color: COLORS.amber },
                      { label: 'Online Now', value: adminUsers.filter(u => u.is_online).length, color: '#10b981' },
                      { label: 'Offline', value: adminUsers.filter(u => !u.is_online).length, color: '#9ca3af' }
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '10px', color: COLORS.textSecondary, marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Search bar */}
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontSize: '14px' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search by name, email or phone…"
                      value={usersSearch}
                      onChange={e => setUsersSearch(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.cardBorder}`,
                        borderRadius: '10px', padding: '10px 12px 10px 36px',
                        color: COLORS.textPrimary, fontSize: '13px', outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = COLORS.amber}
                      onBlur={e => e.target.style.borderColor = COLORS.cardBorder}
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, fontSize: '13px' }}>Loading users…</div>
                ) : (
                  <>
                    {/* Online Section */}
                    {onlineUsers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                          Active Now ({onlineUsers.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {onlineUsers.map(u => <UserCard key={u.id} u={u} />)}
                        </div>
                      </div>
                    )}
                    {/* Offline Section */}
                    {offlineUsers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6b7280', display: 'inline-block' }} />
                          Offline ({offlineUsers.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {offlineUsers.map(u => <UserCard key={u.id} u={u} />)}
                        </div>
                      </div>
                    )}
                    {filtered.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted, fontSize: '13px' }}>No users found matching "{usersSearch}"</div>
                    )}
                  </>
                )}
              </div>

              {/* Right: User Detail Panel */}
              {selectedUser && (
                <div style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.015)',
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: '20px',
                  padding: '24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }} className="no-scrollbar">
                  {/* Mobile Back Button */}
                  {(breakpoint === 'xs' || breakpoint === 'sm') && (
                    <button
                      onClick={() => setSelectedUser(null)}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${COLORS.cardBorder}`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: COLORS.amber,
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      ← Back to Users List
                    </button>
                  )}
                  {/* Profile header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `1px solid ${COLORS.cardBorder}`, paddingBottom: '16px' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                      background: selectedUser.is_online
                        ? 'linear-gradient(135deg,#10b981,#059669)'
                        : `linear-gradient(135deg,${COLORS.amber},${COLORS.gold})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '800', fontSize: '24px',
                      boxShadow: selectedUser.is_online ? '0 0 16px rgba(16,185,129,0.4)' : `0 0 16px rgba(212,175,55,0.3)`
                    }}>
                      {(selectedUser.name || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary }}>{selectedUser.name}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px',
                          background: selectedUser.is_online ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                          color: selectedUser.is_online ? '#10b981' : '#9ca3af',
                          border: `1px solid ${selectedUser.is_online ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                          padding: '2px 8px', borderRadius: '20px'
                        }}>{selectedUser.is_online ? '● Online' : '○ Offline'}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '2px' }}>{selectedUser.email}</div>
                      {selectedUser.last_seen && !selectedUser.is_online && (
                        <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '3px' }}>
                          Last seen: {new Date(selectedUser.last_seen).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSelectedUser(null)}
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.cardBorder}`,
                        borderRadius: '8px', padding: '6px 12px', color: COLORS.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                      ✕ Close
                    </button>
                  </div>

                  {/* Rating Summary */}
                  <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: '#fbbf24', lineHeight: 1 }}>
                      {selectedUser.avg_rating_given != null ? selectedUser.avg_rating_given : '—'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#fbbf24' }}>
                        {'★'.repeat(Math.round(selectedUser.avg_rating_given || 0))}{'☆'.repeat(5 - Math.round(selectedUser.avg_rating_given || 0))}
                      </div>
                      <div style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '3px' }}>Average Rating Given</div>
                      <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{selectedUser.reviews?.length || 0} review{(selectedUser.reviews?.length || 0) !== 1 ? 's' : ''} submitted</div>
                    </div>
                  </div>

                  {/* Preferences */}
                  {selectedUser.preferences && Object.keys(selectedUser.preferences).length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '14px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.amber, marginBottom: '10px' }}>🍽 Preferences</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedUser.preferences.veg_preference && (
                          <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', padding: '3px 9px', borderRadius: '20px' }}>
                            🥗 {selectedUser.preferences.veg_preference}
                          </span>
                        )}
                        {selectedUser.preferences.spice_preference && (
                          <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '3px 9px', borderRadius: '20px' }}>
                            🌶 {selectedUser.preferences.spice_preference}
                          </span>
                        )}
                        {(selectedUser.preferences.dietary_preferences || []).map(d => (
                          <span key={d} style={{ fontSize: '11px', background: 'rgba(212,175,55,0.1)', color: COLORS.gold, border: `1px solid rgba(212,175,55,0.25)`, padding: '3px 9px', borderRadius: '20px' }}>{d}</span>
                        ))}
                        {(selectedUser.preferences.favorite_categories || []).map(c => (
                          <span key={c} style={{ fontSize: '11px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)', padding: '3px 9px', borderRadius: '20px' }}>❤ {c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Reviews - always visible */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.amber, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🛍 Product Reviews
                      {selectedUser.reviews && selectedUser.reviews.length > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(212,175,55,0.1)', color: COLORS.gold, border: `1px solid rgba(212,175,55,0.25)`, padding: '1px 8px', borderRadius: '20px' }}>
                          {selectedUser.reviews.length} product{selectedUser.reviews.length !== 1 ? 's' : ''} reviewed
                        </span>
                      )}
                    </div>
                    {selectedUser.reviews && selectedUser.reviews.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedUser.reviews.map((r, i) => {
                          const ratingColor = r.rating >= 4 ? '#10b981' : r.rating === 3 ? '#fbbf24' : '#ef4444';
                          const ratingBg = r.rating >= 4 ? 'rgba(16,185,129,0.08)' : r.rating === 3 ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.08)';
                          const ratingBorder = r.rating >= 4 ? 'rgba(16,185,129,0.25)' : r.rating === 3 ? 'rgba(251,191,36,0.25)' : 'rgba(239,68,68,0.25)';
                          return (
                            <div key={i} style={{
                              background: 'rgba(255,255,255,0.015)',
                              border: `1px solid ${COLORS.cardBorder}`,
                              borderRadius: '14px',
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              {/* Product name + rating badge row */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                {/* Product name with icon */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                    background: 'rgba(212,175,55,0.1)', border: `1px solid rgba(212,175,55,0.2)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '15px'
                                  }}>🍽</div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {r.item_name}
                                    </div>
                                    {/* Stars */}
                                    <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '1px' }}>
                                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                    </div>
                                  </div>
                                </div>
                                {/* Rating number badge */}
                                <div style={{
                                  flexShrink: 0,
                                  background: ratingBg,
                                  border: `1px solid ${ratingBorder}`,
                                  borderRadius: '10px',
                                  padding: '6px 12px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '18px', fontWeight: '800', color: ratingColor, lineHeight: 1 }}>{r.rating}</div>
                                  <div style={{ fontSize: '8px', color: ratingColor, opacity: 0.8, marginTop: '1px' }}>out of 5</div>
                                </div>
                              </div>
                              {/* Written review */}
                              {r.review_text ? (
                                <div style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  borderLeft: `3px solid ${ratingColor}`,
                                }}>
                                  <p style={{ margin: 0, fontSize: '11px', color: COLORS.textSecondary, lineHeight: '1.6', fontStyle: 'italic' }}>
                                    "{r.review_text}"
                                  </p>
                                </div>
                              ) : (
                                <div style={{ fontSize: '10px', color: COLORS.textMuted, fontStyle: 'italic' }}>No written review</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛍</div>
                        <div style={{ fontSize: '12px', color: COLORS.textMuted }}>This customer has not reviewed any products yet.</div>
                      </div>
                    )}
                  </div>

                  {/* Recent Orders */}
                  {selectedUser.orders && selectedUser.orders.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.amber, marginBottom: '10px' }}>📦 Recent Orders ({selectedUser.orders.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedUser.orders.slice(-8).reverse().map((o, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)', border: `1px solid ${COLORS.cardBorder}`, borderRadius: '10px', padding: '10px 14px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: COLORS.textPrimary }}>Order #{o.id?.toString().slice(-6) || i + 1}</div>
                              <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.gold }}>₹{parseFloat(o.total_amount || 0).toLocaleString()}</span>
                              <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '20px',
                                background: o.status === 'completed' ? 'rgba(16,185,129,0.1)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                                color: o.status === 'completed' ? '#10b981' : o.status === 'cancelled' ? '#ef4444' : '#fbbf24',
                                border: `1px solid ${o.status === 'completed' ? 'rgba(16,185,129,0.3)' : o.status === 'cancelled' ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`
                              }}>{o.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!selectedUser.reviews || selectedUser.reviews.length === 0) && (!selectedUser.orders || selectedUser.orders.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted, fontSize: '13px' }}>No activity recorded for this user yet.</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 6: AI VOICE MANAGER */}
        {activeTab === 'voice' && (
          <div style={{
            height: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? 'auto' : '100%',
            display: 'flex',
            flexDirection: 'column',
            margin: (breakpoint === 'xs' || breakpoint === 'sm') ? '-16px' : '-24px', // Break out of dashboard wrapper padding
            padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '16px' : '24px',
            background: '#080808', // Obsidian dark theme background
            backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.08) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            flex: 1,
            position: 'relative',
            borderRadius: '16px',
            overflow: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? 'visible' : 'hidden',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }}>
            {/* Header Status Bar */}
            <div style={{
              display: 'flex',
              flexDirection: (breakpoint === 'xs') ? 'column' : 'row',
              alignItems: (breakpoint === 'xs') ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: (breakpoint === 'xs') ? '8px' : '0',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '12px',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isListening ? '#ef4444' : isSpeaking ? '#fbbf24' : '#10b981',
                  boxShadow: isListening 
                    ? '0 0 10px #ef4444' 
                    : isSpeaking 
                      ? '0 0 10px #fbbf24' 
                      : '0 0 10px #10b981',
                  animation: (isListening || isSpeaking) ? 'pulseGlow 1s infinite alternate' : 'none'
                }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  {isListening ? 'Microphone Active' : isSpeaking ? 'Lumina Speaking' : 'System Online'}
                </span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Enterprise Operations Portal
              </div>
            </div>

            {/* Language Selector Bar */}
            <div style={{
              display: 'flex',
              flexDirection: (breakpoint === 'xs' || breakpoint === 'sm') ? 'column' : 'row',
              alignItems: (breakpoint === 'xs' || breakpoint === 'sm') ? 'flex-start' : 'center',
              gap: '12px',
              marginBottom: '20px',
              padding: (breakpoint === 'xs' || breakpoint === 'sm') ? '12px 16px' : '8px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              zIndex: 10,
              width: '100%'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Primary Language:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'te', label: 'Telugu' }
                ].map((lang) => {
                  const isSelected = voiceLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setVoiceLang(lang.code)}
                      style={{
                        background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? COLORS.gold : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: isSelected ? '#fff' : COLORS.textSecondary,
                        fontSize: '12px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {lang.label}
                    </button>
                  );
                })}
                <span style={{
                  alignSelf: 'center',
                  fontSize: '11px',
                  color: voiceAvailability[voiceLang] ? '#10b981' : '#fbbf24',
                  fontWeight: '700'
                }}>
                  {voiceAvailability[voiceLang]
                    ? `${voiceLang === 'te' ? 'Telugu' : 'English'} voice ready`
                    : `${voiceLang === 'te' ? 'Telugu' : 'English'} text ready, voice fallback`}
                </span>
              </div>
            </div>

            {/* Split layout: Left column = Transcript, Right column = Control Center */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? '1fr' : '1.3fr 1fr', 
              gap: '28px', 
              flex: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? 'none' : 1, 
              overflow: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? 'visible' : 'hidden' 
            }}>
              
              {/* Left Column: Transcript Pane */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '20px',
                padding: '24px',
                overflowY: 'auto',
                height: (breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md') ? '380px' : '100%',
                position: 'relative'
              }} className="no-scrollbar">
                
                {!(voiceQuery || voiceReply || isAnalyzing || voiceError) ? (
                  /* Initial Standby Instructions */
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    color: COLORS.textSecondary,
                    padding: '20px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
                    <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '18px', fontWeight: '700' }}>Voice Operations Manager</h3>
                    <p style={{ margin: '0 0 24px', fontSize: '13px', lineHeight: '1.6', maxWidth: '320px' }}>
                      Click the microphone and speak to query restaurant revenue, stock alerts, expenses, or customer review ratings.
                    </p>
                    
                    {/* Suggested Queries Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: COLORS.gold, marginBottom: '4px' }}>Suggested Queries</div>
                      {[
                        "What is today's revenue report?",
                        "Check current stock status alerts",
                        "Show operational expenses list",
                        "How are customers reviewing us?"
                      ].map((qText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleVoiceQuerySubmit(qText)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            color: COLORS.textPrimary,
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                          }}
                        >
                          "{qText}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Conversations Transcript */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* User Query bubble */}
                    {voiceQuery && (
                      <div className="animate-slide-in-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{
                          background: 'rgba(212, 175, 55, 0.03)',
                          border: '1px solid rgba(212, 175, 55, 0.15)',
                          borderLeft: `4px solid ${COLORS.amber}`,
                          padding: '16px 20px',
                          borderRadius: '16px',
                          maxWidth: '85%',
                          textAlign: 'left'
                        }}>
                          <p style={{ margin: '0 0 6px', fontSize: '9px', color: COLORS.amber, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Owner Query</p>
                          <h2 className="serif-ai" style={{ margin: 0, fontSize: '18px', color: '#e2e8f0', fontStyle: 'italic' }}>
                            "{voiceQuery}"
                          </h2>
                        </div>
                      </div>
                    )}

                    {/* AI Response or states */}
                    {isAnalyzing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRight: `4px solid ${COLORS.gold}`,
                          padding: '24px',
                          borderRadius: '16px',
                          width: '100%',
                          textAlign: 'left'
                        }}>
                          <p style={{ margin: '0 0 6px', fontSize: '10px', color: COLORS.gold, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Lumina AI Insight</p>
                          <p className="serif-ai" style={{ margin: 0, fontSize: '18px', color: '#cbd5e1', lineHeight: '1.6', animation: 'pulseText 1.5s infinite' }}>
                            Retrieving operations database logs...
                          </p>
                        </div>
                      </div>
                    ) : voiceError ? (
                      <div className="animate-slide-in-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRight: `4px solid #ef4444`,
                          padding: '24px',
                          borderRadius: '16px',
                          width: '100%',
                          textAlign: 'left'
                        }}>
                          <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>System Warning</p>
                          <p style={{ margin: 0, fontSize: '15px', color: '#fca5a5', lineHeight: '1.6' }}>
                            ⚠️ {voiceError}
                          </p>
                        </div>
                      </div>
                    ) : voiceReply ? (
                      <div className="animate-slide-in-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRight: `4px solid ${COLORS.gold}`,
                          padding: '24px',
                          borderRadius: '16px',
                          width: '100%',
                          textAlign: 'left',
                          position: 'relative'
                        }}>
                          <p style={{ margin: '0 0 8px', fontSize: '10px', color: COLORS.gold, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✨ Lumina AI Insight
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {(() => {
                              const lines = voiceReply.split('\n');
                              return lines.map((line, idx) => {
                                const trimmed = line.trim();
                                if (!trimmed) return <div key={idx} style={{ height: '12px' }} />;
                                
                                if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                  const headerText = trimmed.replace(/\*\*/g, '');
                                  return (
                                    <h3 key={idx} style={{
                                      margin: idx === 0 ? '0 0 8px 0' : '20px 0 8px 0',
                                      fontSize: '12px',
                                      fontWeight: '800',
                                      color: COLORS.gold,
                                      textTransform: 'uppercase',
                                      letterSpacing: '1px'
                                    }}>
                                      {headerText}
                                    </h3>
                                  );
                                }
                                
                                return (
                                  <p key={idx} className="serif-ai" style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '16px',
                                    color: '#cbd5e1',
                                    lineHeight: '1.6'
                                  }}>
                                    {trimmed}
                                  </p>
                                );
                              });
                            })()}
                          </div>
                          
                          {/* Insight Badges */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                            <div style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.15)', fontSize: '9px', fontWeight: 'bold', color: COLORS.amber, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Private Operations Channel
                            </div>
                            <div style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', fontSize: '9px', fontWeight: 'bold', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Telemetry: Synced
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Right Column: Control & Equalizer Center */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '20px',
                padding: '32px',
                position: 'relative'
              }}>
                {/* Main Microphone Orb Activator */}
                <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Concentric Ripple Rings */}
                  {(isListening || isSpeaking) && (
                    <>
                      <div className="ripple-ring ring-delay-1" style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: isListening ? '2px solid rgba(239, 68, 68, 0.3)' : '2px solid rgba(212, 175, 55, 0.3)',
                        pointerEvents: 'none'
                      }} />
                      <div className="ripple-ring ring-delay-2" style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: isListening ? '2px solid rgba(239, 68, 68, 0.1)' : '2px solid rgba(212, 175, 55, 0.1)',
                        pointerEvents: 'none'
                      }} />
                    </>
                  )}

                  <button
                    id="micBtn"
                    onClick={() => {
                      if (window._asrMediaRecorder && window._asrMediaRecorder.state === 'recording') {
                        // Stop recording and submit immediately!
                        try {
                          window._asrMediaRecorder.stop();
                        } catch (e) {
                          console.warn('ASR: manual stop failed, stopping session:', e);
                          stopListening();
                        }
                      } else if (isListening || window._voiceActive) {
                        // Stop and cancel
                        stopListening();
                      } else if (isSpeaking) {
                        if (typeof window !== 'undefined') {
                          if (window.currentIndicTtsAudio) {
                            try {
                              window.currentIndicTtsAudio.pause();
                              window.currentIndicTtsAudio.currentTime = 0;
                            } catch (e) {}
                            window.currentIndicTtsAudio = null;
                          }
                          if (window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                          }
                        }
                        setIsSpeaking(false);
                        resumeListeningAfterAI(100);
                      } else {
                        startListening();
                      }
                    }}
                    style={{
                      position: 'relative',
                      width: '110px',
                      height: '110px',
                      borderRadius: '50%',
                      background: isListening 
                        ? 'radial-gradient(circle at 35% 35%, #ff5252 0%, #d32f2f 60%, #850c0c 100%)' 
                        : isSpeaking 
                          ? 'radial-gradient(circle at 35% 35%, #fbbf24 0%, #f59e0b 60%, #b45309 100%)'
                          : 'radial-gradient(circle at 35% 35%, #2a2000 0%, #171100 70%, #080808 100%)',
                      border: `3px solid ${isListening ? '#fecaca' : isSpeaking ? '#fde047' : 'rgba(212, 175, 55, 0.3)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isListening ? '#fff' : isSpeaking ? '#000' : COLORS.gold,
                      boxShadow: isListening 
                        ? '0 0 35px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)' 
                        : isSpeaking 
                          ? '0 0 35px rgba(251, 191, 36, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)' 
                          : '0 8px 24px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05)',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      animation: isListening 
                        ? 'micPulse 1.4s infinite' 
                        : isSpeaking 
                          ? 'orbWave 1.2s infinite' 
                          : 'none',
                      outline: 'none',
                      zIndex: 5
                    }}
                  >
                    {isListening ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="4" />
                      </svg>
                    ) : isSpeaking ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="5" y="4" width="4" height="16" rx="2" />
                        <rect x="15" y="4" width="4" height="16" rx="2" />
                      </svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Linear Soundwave Equalizer (15 responsive bars) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '60px', marginTop: '20px', width: '220px' }}>
                  {barHeights.slice(0, 15).map((h, i) => {
                    return (
                      <div
                        key={i}
                        className="soundwave-bar"
                        style={{
                          width: '4px',
                          height: (isListening || isSpeaking) ? `${h}px` : '6px',
                          background: isListening 
                            ? 'linear-gradient(to top, #ef4444, #fca5a5)' 
                            : isSpeaking
                              ? `linear-gradient(to top, ${COLORS.gold}, #fffbeb)`
                              : `linear-gradient(to top, ${COLORS.gold}, rgba(212, 175, 55, 0.15))`,
                          borderRadius: '2px',
                          transition: 'height 0.07s ease-in-out'
                        }}
                      />
                    );
                  })}
                </div>

                <p style={{
                  margin: '16px 0 0 0',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                  color: isListening ? '#ef4444' : isSpeaking ? '#fbbf24' : 'rgba(255, 191, 0, 0.4)',
                  animation: (isListening || isSpeaking) ? 'pulseText 1.5s infinite' : 'none'
                }}>
                  {isListening 
                    ? 'Listening for voice command' 
                    : isSpeaking 
                      ? 'Lumina AI Speaking...' 
                      : isAnalyzing 
                        ? 'Analyzing operations data...' 
                        : 'Standby for query'}
                </p>

                {/* Quick Strategy Cards / Insights Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '36px' }}>
                  <div 
                    onClick={() => handleVoiceQuerySubmit("today's revenue report")}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 191, 0, 0.08)',
                      borderLeft: `3px solid ${COLORS.amber}`,
                      padding: '14px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="insight-chip-hover"
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 140, 0, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.amber, fontSize: '16px' }}>
                      📈
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>Daily Forecast</p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: COLORS.textSecondary }}>Query financial report</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => handleVoiceQuerySubmit("check current stock status alerts")}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(212, 175, 55, 0.08)',
                      borderLeft: `3px solid ${COLORS.gold}`,
                      padding: '14px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="insight-chip-hover"
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gold, fontSize: '16px' }}>
                      💡
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>AI Strategy</p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: COLORS.textSecondary }}>Stock replenishment advisory</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Custom CSS for animations */}
            <style>{`
              .serif-ai {
                font-family: 'Playfair Display', serif;
              }
              .insight-chip-hover:hover {
                background: rgba(255, 255, 255, 0.04) !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              }
              @keyframes pulseGlow {
                from { opacity: 0.6; }
                to { opacity: 1; }
              }
              @keyframes micPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.03); }
                100% { transform: scale(1); }
              }
              @keyframes orbWave {
                0% { transform: scale(1); }
                50% { transform: scale(1.03); }
                100% { transform: scale(1); }
              }
              .ripple-ring {
                animation: rippleAnimation 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
              }
              .ring-delay-1 {
                animation-delay: 0s;
              }
              .ring-delay-2 {
                animation-delay: 0.8s;
              }
              @keyframes rippleAnimation {
                0% { transform: scale(0.9); opacity: 0.8; }
                100% { transform: scale(1.7); opacity: 0; }
              }
              @keyframes pulseText {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
              .animate-slide-in-right {
                animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .animate-slide-in-left {
                animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              @keyframes slideInRight {
                from { transform: translateX(30px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes slideInLeft {
                from { transform: translateX(-30px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {/* TAB 7: MY PROFILE */}
        {activeTab === 'profile' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>Profile Settings</h1>
              <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Manage your administrator profile details and security credentials.</p>
            </div>
            
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ProfileCard 
                user={user}
                onUserUpdate={onUserUpdate}
                onSuccessRedirect={() => setActiveTab('menu')}
                onBack={() => setActiveTab('menu')}
                onLogout={onLogout}
              />
            </div>
          </div>
        )}

        {/* TAB 8: DAILY OFFERS */}
        {activeTab === 'offers' && offers && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Playfair Display', serif", fontWeight: 'bold' }}>Daily Offer Banners</h1>
              <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: '14px' }}>Configure and schedule premium visual marketing banners for each day of the week.</p>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '8px'
            }} className="no-scrollbar">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
                paddingBottom: '40px'
              }}>
                {[1, 2, 3, 4, 5, 6, 0].map((dayId) => {
                  const offer = offers[dayId];
                  if (!offer) return null;
                  
                  return (
                    <div
                      key={dayId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${offer.isActive ? 'rgba(245, 158, 11, 0.3)' : COLORS.cardBorder}`,
                        borderRadius: '20px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        transition: 'border-color 0.3s ease'
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                          {offer.dayName}
                        </span>
                        
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: offer.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                          color: offer.isActive ? '#4ade80' : COLORS.textSecondary,
                          border: `1px solid ${offer.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          {offer.isActive ? '● Active Offer' : '● Fallback Branding'}
                        </span>
                      </div>
                      
                      {/* Image Preview */}
                      <div style={{
                        position: 'relative',
                        height: '140px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `1px solid ${COLORS.cardBorder}`,
                        background: '#0c0804'
                      }}>
                        <img
                          src={offer.isActive ? offer.imageUrl : "/offers/default_branding.png"}
                          alt={offer.dayName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                      
                      {/* Editable Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: COLORS.textSecondary, marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                            Offer Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Buy 3 Milkshakes, Get 1 Free"
                            value={offer.title}
                            onChange={(e) => handleUpdateOfferDetails(dayId, e.target.value, offer.subtitle)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${COLORS.cardBorder}`,
                              borderRadius: '8px',
                              color: '#fff',
                              outline: 'none',
                              fontSize: '13px'
                            }}
                          />
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: COLORS.textSecondary, marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                            Offer Subtitle / Description
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Blended with fresh ice cream"
                            value={offer.subtitle}
                            onChange={(e) => handleUpdateOfferDetails(dayId, offer.title, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${COLORS.cardBorder}`,
                              borderRadius: '8px',
                              color: '#fff',
                              outline: 'none',
                              fontSize: '13px'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        {/* Custom Stylized Upload Button */}
                        <label style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '10px',
                          background: 'rgba(255,140,0,0.1)',
                          border: `1px solid ${COLORS.amber}`,
                          color: COLORS.amber,
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          minHeight: '40px'
                        }}>
                          📷 Upload Banner
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const img = new Image();
                                  img.src = reader.result;
                                  img.onload = () => {
                                    const maxDim = 800;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > maxDim || height > maxDim) {
                                      if (width > height) {
                                        height = Math.round((height * maxDim) / width);
                                        width = maxDim;
                                      } else {
                                        width = Math.round((width * maxDim) / height);
                                        height = maxDim;
                                      }
                                    }
                                    const canvas = document.createElement('canvas');
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                    handleUpdateOfferImage(dayId, compressedDataUrl);
                                  };
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                        
                        {offer.isActive && (
                          <button
                            onClick={() => handleRemoveOffer(dayId)}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '10px',
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid #ef4444',
                              color: '#f87171',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {toast.message && (
          <>
            <style>{`
              @keyframes slideIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            <div style={{
              position: 'fixed',
              bottom: '24px',
              right: (breakpoint === 'xs' || breakpoint === 'sm') ? '16px' : '24px',
              left: (breakpoint === 'xs' || breakpoint === 'sm') ? '16px' : 'auto',
              background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 999,
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              animation: 'slideIn 0.3s ease-out'
            }}>
              {toast.type === 'error' ? '❌' : '✨'} {toast.message}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
