const SUPABASE_URL = 'https://kvjvnrktnkenlsaatmxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo';

export const OFFER_CONFIG_CATEGORY_NAME = '__kapi_daily_offers__';

const OFFER_CONFIG_PREFIX = 'KAPI_OFFERS_V1:';
const HIDDEN_FLAG = '[HIDDEN]';
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export const DEFAULT_OFFERS = {
  1: {
    dayName: 'Monday',
    title: 'Buy 3 Milkshakes, Get 1 Free',
    subtitle: 'Blended with fresh ice cream and premium toppings',
    imageUrl: '/offers/monday_offer.png',
    isActive: true,
  },
  2: {
    dayName: 'Tuesday',
    title: 'Buy 1 Tea, Get 1 Biscuit Free',
    subtitle: 'Start your day with hot brewing chai and snacks',
    imageUrl: '/offers/tuesday_offer.png',
    isActive: true,
  },
  3: {
    dayName: 'Wednesday',
    title: 'Get 1 Free Campa Cola',
    subtitle: 'On Non-Veg Snacks bill above Rs.200',
    imageUrl: '/offers/wednesday_offer.png',
    isActive: true,
  },
  4: {
    dayName: 'Thursday',
    title: 'Buy 3 Scoops of Ice Cream, Get 1 Scoop Free',
    subtitle: 'Chilled creaminess in your favorite fruit flavors',
    imageUrl: '/offers/thursday_offer.png',
    isActive: true,
  },
  5: {
    dayName: 'Friday',
    title: '10% Off on Milkshakes',
    subtitle: 'Thick creamy shakes to fuel your Friday night',
    imageUrl: '/offers/friday_offer.png',
    isActive: true,
  },
  6: {
    dayName: 'Saturday',
    title: 'Get 1 Free Campa Cola',
    subtitle: 'On Veg Snacks bill above Rs.200',
    imageUrl: '/offers/saturday_offer.png',
    isActive: true,
  },
  0: {
    dayName: 'Sunday',
    title: 'Savour the Flavor of Kapi Adda',
    subtitle: 'Gather with friends and enjoy premium brews and snacks',
    imageUrl: '/offers/default_branding.png',
    isActive: false,
  },
};

export const getDefaultOffers = () => JSON.parse(JSON.stringify(DEFAULT_OFFERS));

export const isOfferConfigCategory = (category = {}) =>
  String(category.name || '') === OFFER_CONFIG_CATEGORY_NAME;

export const parseSharedOffers = (description = '') => {
  const text = String(description || '');
  const markerIndex = text.indexOf(OFFER_CONFIG_PREFIX);
  if (markerIndex < 0) return null;

  const jsonText = text
    .slice(markerIndex + OFFER_CONFIG_PREFIX.length)
    .replace(/\s*\[HIDDEN\]\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('Unable to parse shared offer settings:', err);
    return null;
  }
};

const serializeSharedOffers = (offers) =>
  `${OFFER_CONFIG_PREFIX}${JSON.stringify(offers)} ${HIDDEN_FLAG}`;

const getOfferSettingsRow = async () => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?select=id,name,description&name=eq.${encodeURIComponent(OFFER_CONFIG_CATEGORY_NAME)}&limit=1`,
    { headers: SUPABASE_HEADERS }
  );

  if (!res.ok) {
    throw new Error(`Unable to load shared offers: ${res.status}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : null;
};

export const fetchSharedOffers = async () => {
  const row = await getOfferSettingsRow();
  return parseSharedOffers(row?.description) || getDefaultOffers();
};

export const saveSharedOffers = async (offers) => {
  const row = await getOfferSettingsRow();
  const payload = {
    name: OFFER_CONFIG_CATEGORY_NAME,
    description: serializeSharedOffers(offers),
  };
  const method = row?.id ? 'PATCH' : 'POST';
  const query = row?.id
    ? `id=eq.${encodeURIComponent(row.id)}&select=id,name,description`
    : 'select=id,name,description';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?${query}`, {
    method,
    headers: {
      ...SUPABASE_HEADERS,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || `Unable to save shared offers: ${res.status}`);
  }

  return offers;
};
