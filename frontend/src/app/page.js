"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import PremiumAuth from "./components/PremiumAuth";
import CustomerHome from "./components/CustomerHome";
import FoodCatalog from "./components/FoodCatalog";
import FoodDetail from "./components/FoodDetail";
import AIAssistant from "./components/AIAssistant";
import OwnerDashboard from "./components/OwnerDashboard";
import ProfileCard from "./components/ProfileCard";
import { useBreakpoint, useScreenProfile } from "./utils/responsive";

// Initialize Supabase Client
const SUPABASE_URL = "https://kvjvnrktnkenlsaatmxq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anZucmt0bmtlbmxzYWF0bXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTk4NjgsImV4cCI6MjA5NjEzNTg2OH0.FOB6qXDOcZ7L0pb_fI1z2ZGd3CGM-lvtfTw2FcKxHqo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined'
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000');

// Cookie helper functions
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
};

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

const eraseCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = name + "=; Max-Age=-99999999; path=/";
};

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "KA";
};

export default function Home() {
  const breakpoint = useBreakpoint();
  const screen = useScreenProfile(breakpoint);
  // App States
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState("login");
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [activeMood, setActiveMood] = useState("sleepy");
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [customerTab, setCustomerTab] = useState("home"); // "home" or "menu"
  const [adminTab, setAdminTab] = useState("menu");
  const [headerAvatar, setHeaderAvatar] = useState("initials");
  const [headerAvatarImg, setHeaderAvatarImg] = useState("");
  
  // Interactive Quiz & FAQ states
  const [quizAnswers, setQuizAnswers] = useState({ base: "coffee", sweetness: "medium", vibe: "energizing" });
  const [quizRecommendation, setQuizRecommendation] = useState(null);
  const [isQuizCalculating, setIsQuizCalculating] = useState(false);
  const [quizProgress, setQuizProgress] = useState(0);
  const [quizLog, setQuizLog] = useState("");
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  
  // Login & Onboarding forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    veg_preference: "non-veg",
    favorite_categories: [],
    spice_preference: "medium",
    dietary_preferences: []
  });

  const [authView, setAuthView] = useState("login"); // "login" or "signup"
  const [onboardStep, setOnboardStep] = useState(1);

  const applyDesignSystemTokens = (design) => {
    if (!design || !design.colors) return;
    const root = document.documentElement;
    const colors = design.colors;
    
    if (colors.background || colors.surface) {
      root.style.setProperty('--background', colors.background || colors.surface);
    }
    if (colors['on-background'] || colors.foreground || colors['on-surface']) {
      root.style.setProperty('--foreground', colors['on-background'] || colors.foreground || colors['on-surface']);
    }
    if (colors.primary) {
      root.style.setProperty('--color-primary', colors.primary);
    }
    let styleTag = document.getElementById("stitch-custom-theme");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "stitch-custom-theme";
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        --background: ${colors.background || colors.surface || '#090503'};
        --foreground: ${colors['on-background'] || colors.foreground || colors['on-surface'] || '#f5f5f4'};
      }
      body {
        background: var(--background) !important;
        color: var(--foreground) !important;
      }
      .bg-stone-900, .bg-stone-950, .bg-zinc-900, .bg-zinc-950, .bg-stone-900\\/50 {
        background-color: ${colors['surface-container'] || colors.surface || '#1c1917'} !important;
      }
      .text-amber-500, .text-amber-400, .text-gradient-gold {
        color: ${colors.primary || '#ff8c00'} !important;
      }
      .bg-amber-500, .bg-amber-600 {
        background-color: ${colors.primary || '#ff8c00'} !important;
      }
      .border-amber-500, .border-stone-850, .border-stone-800 {
        border-color: ${colors.primary || '#ff8c00'} !important;
      }
    `;
  };

  useEffect(() => {
    try {
      const activeDesign = localStorage.getItem("kapi_active_design");
      if (activeDesign) {
        applyDesignSystemTokens(JSON.parse(activeDesign));
      }
    } catch (e) {
      console.error("Error loading design system on startup:", e);
    }
  }, []);

  // Sync authView when viewMode changes from navigation header click
  useEffect(() => {
    if (viewMode === "login") {
      setAuthView("login");
    } else if (viewMode === "onboarding") {
      setAuthView("signup");
      setOnboardStep(1);
    }
  }, [viewMode]);

  // AI Chat & Voice Assistant States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Welcome to Kapi Adda! Ask me to recommend juices, milkshakes, or snacks under ₹100!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState("");

  // Admin Dashboard States
  const [adminMetrics, setAdminMetrics] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    low_stock_count: 0,
    low_stock_items: [],
    top_foods: [],
    bi_recommendations: [],
    revenue_trend: []
  });
  const [expenseForm, setExpenseForm] = useState({ category: "ingredients", amount: "", description: "" });

  // Notifications
  const [notification, setNotification] = useState("");

  // Canvas particle system for drifting coffee beans (Google Stitch UI design)
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const count = 12;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement.offsetHeight || 600;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 15 + 8,
        speedY: Math.random() * 0.4 + 0.1,
        speedX: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        opacity: Math.random() * 0.25 + 0.05
      });
    }

    const drawBean = (ctx, p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.7, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212, 175, 55, ${p.opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Middle line of coffee bean
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.8, 0);
      ctx.bezierCurveTo(-p.size / 2, p.size / 4, p.size / 2, -p.size / 4, p.size * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        
        if (p.y < -p.size * 2) {
          p.y = canvas.height + p.size * 2;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -p.size * 2 || p.x > canvas.width + p.size * 2) {
          p.x = Math.random() * canvas.width;
        }
        drawBean(ctx, p);
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [viewMode]);

  // Google Stitch details animations: Ember Canvas particles, scroll timeline, and stats count-up
  const emberCanvasRef = useRef(null);
  useEffect(() => {
    const canvas = emberCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement.offsetHeight || 400;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 20;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = Math.random() * 0.4 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.life = 0;
        this.maxLife = Math.random() * 150 + 80;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.life++;
        if (this.life >= this.maxLife || this.y < 0) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 202, 80, ${this.opacity * (1 - this.life / this.maxLife)})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 35; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [viewMode]);

  const scrollIndicatorRef = useRef(null);
  const timelineFillRef = useRef(null);
  const howItWorksRef = useRef(null);
  const [stats, setStats] = useState({ items: 0, sync: 0, accuracy: 0 });
  const statsRef = useRef(null);
  const hasAnimatedStats = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      // Scroll progress indicator
      const scrollIndicator = scrollIndicatorRef.current;
      if (scrollIndicator) {
        const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPct = totalScroll > 0 ? (window.scrollY / totalScroll) * 100 : 0;
        scrollIndicator.style.width = `${scrollPct}%`;
      }

      // Parallax scrolling for ambient background layer
      const ambientLayer = document.querySelector('.ambient-layer');
      if (ambientLayer) {
        ambientLayer.style.transform = `translateY(${window.scrollY * 0.18}px)`;
      }

      // Smooth navbar opacity transition on scroll
      const navbar = document.querySelector('nav');
      if (navbar) {
        if (window.scrollY > 20) {
          navbar.classList.remove('bg-transparent', 'border-transparent');
          navbar.classList.add('bg-stone-950/85', 'border-stone-900', 'backdrop-blur-md');
        } else {
          navbar.classList.remove('bg-stone-950/85', 'border-stone-900', 'backdrop-blur-md');
          navbar.classList.add('bg-transparent', 'border-transparent');
        }
      }

      // Timeline fill height
      const timelineFill = timelineFillRef.current;
      const howItWorks = howItWorksRef.current;
      if (timelineFill && howItWorks) {
        const rect = howItWorks.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight && rect.bottom > 0) {
          const scrollProgress = (windowHeight - rect.top) / (rect.height + windowHeight);
          const percent = Math.min(Math.max(scrollProgress * 150 - 20, 0), 100);
          timelineFill.style.height = `${percent}%`;
        }
      }

      // Stats Count-up check
      const statsEl = statsRef.current;
      if (statsEl && !hasAnimatedStats.current) {
        const rect = statsEl.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          hasAnimatedStats.current = true;
          let progress = 0;
          const duration = 1500;
          const intervalTime = 30;
          const steps = duration / intervalTime;
          const timer = setInterval(() => {
            progress += 1;
            const ratio = progress / steps;
            setStats({
              items: Math.floor(ratio * 40),
              sync: ratio >= 1 ? 1 : 0,
              accuracy: Math.floor(ratio * 99)
            });
            if (progress >= steps) {
              clearInterval(timer);
              setStats({ items: 40, sync: 1, accuracy: 99 });
            }
          }, intervalTime);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [viewMode]);

  // Intersection Observer for scroll reveals and inventory supply chain tracking progress bars
  useEffect(() => {
    if (viewMode !== "landing") return;

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const targetWidth = bar.getAttribute('data-width');
          bar.style.transition = 'width 1.5s cubic-bezier(0.65, 0, 0.35, 1)';
          bar.style.width = targetWidth;
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    document.querySelectorAll('.inventory-bar').forEach(el => barObserver.observe(el));

    // Simple parallax for mouse movement on cup-highlight-badge
    const handleMouseMove = (e) => {
      const moveX = (e.clientX - window.innerWidth / 2) / 80;
      const moveY = (e.clientY - window.innerHeight / 2) / 80;
      const highlight = document.getElementById('cup-highlight-badge');
      if (highlight) {
        highlight.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      revealObserver.disconnect();
      barObserver.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [viewMode]);

  // Load Initial Menu & Data
  const loadMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMenu(data);
        if (data.length > 0) {
          setCategories(data.map(cat => cat.category));
        }
      } else {
        console.error("Expected array from menu API, got:", data);
        setMenu([]);
      }
    } catch (err) {
      console.warn("Menu API unavailable:", err);
      setMenu([]);
    }
  };

  const loadAdminDashboard = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/dashboard`);
      const data = await res.json();
      setAdminMetrics(data);
    } catch (err) {
      console.warn("Admin metrics API unavailable:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    // Restore user session on mount
    const cookieUser = getCookie("kapi_user");
    const cookieToken = getCookie("kapi_token");
    if (cookieToken && typeof window !== "undefined") {
      localStorage.setItem("kapi_token", cookieToken);
    }
    const path = window.location.pathname.replace(/^\//, "") || "landing";
    if (cookieUser) {
      try {
        const parsed = JSON.parse(cookieUser);
        setUser(parsed);
        if (parsed.email?.toLowerCase() === "kapiadda@gmail.com") {
          setViewMode("admin");
        } else if (path === "onboarding") {
          setViewMode("onboarding");
        } else {
          setViewMode("customer");
        }
      } catch (err) {
        console.error("Error parsing user cookie:", err);
        setViewMode("landing");
      }
    } else {
      if (path === "onboarding") {
        setViewMode("onboarding");
      } else if (path === "login") {
        setViewMode("login");
      } else {
        setViewMode("landing");
      }
    }

    loadMenu();
    loadAdminDashboard();
    const ordersSubscription = supabase
      .channel("realtime-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadAdminDashboard();
        showNotification("New Order updates received in real-time!");
      })
      .subscribe();

    const inventorySubscription = supabase
      .channel("realtime-inventory")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        loadAdminDashboard();
        loadMenu();
        showNotification("Inventory stock levels updated in real-time!");
      })
      .subscribe();

    const menuSubscription = supabase
      .channel("realtime-menu")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        loadMenu();
        showNotification("Menu items catalog updated in real-time!");
      })
      .subscribe();

    const expensesSubscription = supabase
      .channel("realtime-expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        loadAdminDashboard();
        showNotification("Operating expenses updated in real-time!");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(inventorySubscription);
      supabase.removeChannel(menuSubscription);
      supabase.removeChannel(expensesSubscription);
    };
  }, []);

  // Sync header avatar based on active user state and localStorage changes
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const saved = localStorage.getItem(`kapi_avatar_${user.id}`) || 'initials';
      setHeaderAvatar(saved);
      const savedImg = localStorage.getItem(`kapi_avatar_img_${user.id}`) || '';
      setHeaderAvatarImg(savedImg);
    }
  }, [user]);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      if (user && typeof window !== "undefined") {
        const saved = localStorage.getItem(`kapi_avatar_${user.id}`) || 'initials';
        setHeaderAvatar(saved);
        const savedImg = localStorage.getItem(`kapi_avatar_img_${user.id}`) || '';
        setHeaderAvatarImg(savedImg);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener('kapi_avatar_updated', handleAvatarUpdate);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener('kapi_avatar_updated', handleAvatarUpdate);
      }
    };
  }, [user]);

  // ── Presence heartbeat ──────────────────────────────────────────────────────
  // Pings every 25s while the tab is VISIBLE so admin sees user as Online.
  // Immediately signals offline when the tab is hidden, closed, or unmounted.
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('kapi_token') : null;
    if (!token) return;

    const HEARTBEAT_URL = `${BACKEND_URL}/api/users/heartbeat`;
    const OFFLINE_URL = `${BACKEND_URL}/api/users/offline`;
    const headers = { Authorization: `Bearer ${token}` };

    const ping = () => {
      if (document.visibilityState === 'hidden') return;
      fetch(HEARTBEAT_URL, { method: 'POST', headers }).catch(() => {});
    };

    const setOffline = () => {
      const url = `${OFFLINE_URL}?token=${encodeURIComponent(token)}`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    ping(); // fire immediately on login / page load
    const hbInterval = setInterval(ping, 25000); // every 25s

    // When tab visibility changes
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ping();
      } else {
        setOffline(); // signal offline immediately when tab goes to background
      }
    };

    const handleUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(hbInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      setOffline(); // signal offline immediately on unmount/logout
    };
  }, [user]);

  // Disable window scrollbars completely on login/onboarding views
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (viewMode === "login" || viewMode === "onboarding") {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.height = "100vh";
        document.documentElement.style.height = "100vh";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.height = "";
        document.documentElement.style.height = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.height = "";
        document.documentElement.style.height = "";
      }
    };
  }, [viewMode]);

  // Route Protection: force login if user is not authenticated.
  // If user IS authenticated, prevent them from accessing "login" tab.
  useEffect(() => {
    if (!user) {
      if (viewMode !== "login" && viewMode !== "onboarding" && viewMode !== "landing") {
        setViewMode("login");
      }
    } else {
      if (viewMode === "login") {
        if (user.email?.toLowerCase() === "kapiadda@gmail.com") {
          setViewMode("admin");
        } else {
          setViewMode("customer");
        }
      }
    }
  }, [user, viewMode]);

  // Address Bar Routing: sync URL pathname with viewMode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/customer/product/")) {
        const expectedPath = viewMode === "landing" ? "/" : "/" + viewMode;
        if (currentPath !== expectedPath) {
          if (viewMode === "customer" || viewMode === "admin") {
            window.history.replaceState(null, "", expectedPath);
          } else {
            window.history.pushState(null, "", expectedPath);
          }
        }
      }
    }
  }, [viewMode]);

  // Address Bar Product Page Routing
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedFoodItem) {
        const slug = selectedFoodItem.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const expectedPath = `/customer/product/${slug}-${selectedFoodItem.id}`;
        if (window.location.pathname !== expectedPath) {
          window.history.pushState(null, "", expectedPath);
        }
      } else {
        if (window.location.pathname.startsWith("/customer/product/")) {
          window.history.pushState(null, "", "/customer");
        }
      }
    }
  }, [selectedFoodItem]);

  // Detect direct product links when menu items load or URL path popstate occurs
  useEffect(() => {
    if (typeof window !== "undefined" && menu.length > 0) {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/customer\/product\/(.+)-([a-fA-F0-9-]+)$/) || pathname.match(/^\/customer\/product\/(.+)-(\d+)$/);
      if (match) {
        const id = match[2];
        const flatItems = menu.flatMap(catGroup => 
          (catGroup.items || []).map(item => ({ ...item, category: catGroup.category }))
        );
        const found = flatItems.find(item => String(item.id) === String(id));
        if (found && (!selectedFoodItem || String(selectedFoodItem.id) !== String(id))) {
          setSelectedFoodItem(found);
          setViewMode("customer");
        }
      }
    }
  }, [menu, selectedFoodItem]);

  // Back/Forward Browser Buttons Support
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const path = pathname.replace(/^\//, "") || "login";
      
      if (pathname.startsWith("customer/product/") || pathname.includes("/product/")) {
        setViewMode("customer");
      } else {
        setViewMode(path);
        setSelectedFoodItem(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleHeaderProfileClick = () => {
    if (user) {
      if (user.email?.toLowerCase() === "kapiadda@gmail.com") {
        setViewMode("admin");
        setAdminTab("profile");
      } else {
        setViewMode("customer");
        setCustomerTab("profile");
      }
    }
  };

  // Auth Operations
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Registered successfully!");
        setUser(data.user);
        setViewMode("customer");
      } else {
        alert(data.detail || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Login successful!");
        setUser(data.user);
        if (data.user?.email?.toLowerCase() === "kapiadda@gmail.com") {
          setViewMode("admin");
          loadAdminDashboard();
        } else {
          setViewMode("customer");
        }
      } else {
        alert(data.detail || "Login failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cart Operations
  const addToCart = (item) => {
    if (item.availability_status === "out_of_stock") {
      alert("This item is currently out of stock!");
      return;
    }
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    showNotification(`${item.name} added to cart!`);
  };

  const handleViewFood = (item) => {
    setSelectedFoodItem(item);
    if (item && item.id) {
      fetch(`${BACKEND_URL}/api/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          action_type: 'view',
          target_id: item.id
        })
      }).catch(err => console.error('Error tracking view:', err));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.id !== itemId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    try {
      const orderItems = cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity
      }));
      
      const payload = {
        user_id: user?.id || null,
        items: orderItems,
        weather_condition: "rainy"
      };

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Order placed successfully! Ingredients automatically updated.");
        setCart([]);
      } else {
        alert(data.detail || "Ordering failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Expense
  const submitExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description
        })
      });
      if (res.ok) {
        showNotification("Expense logged successfully!");
        setExpenseForm({ category: "ingredients", amount: "", description: "" });
        loadAdminDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI Chat Drawer assistant
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id || null, message: userMsg })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: "ai", text: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  // Voice AI Manager (Simulated Speech synthesis response)
  const speakText = (text) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceQuery = async (queryText) => {
    if (!queryText.trim()) return;
    setIsListening(true);
    setVoiceText(queryText);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/voice?speech_text=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      setVoiceReply(data.text);
      speakText(data.voice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsListening(false);
    }
  };

  // Find similar items when out of stock
  const findAlternative = (categoryName) => {
    if (!Array.isArray(menu)) return null;
    const category = menu.find(cat => cat.category === categoryName);
    if (!category) return null;
    return category.items.find(item => item.availability_status === "available");
  };

  // Filters menu items
  const getFilteredItems = () => {
    let allItems = [];
    if (!Array.isArray(menu)) return allItems;
    if (selectedCategory === "all") {
      menu.forEach(cat => allItems.push(...cat.items));
    } else {
      const catObj = menu.find(cat => cat.category === selectedCategory);
      if (catObj) allItems = catObj.items;
    }
    
    if (searchQuery) {
      allItems = allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (user?.preferences?.veg_preference === "veg") {
      allItems = allItems.filter(item => !item.name.toLowerCase().includes("chicken") && !item.name.toLowerCase().includes("prawn"));
    }

    return allItems;
  };

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (centerY - y) / 25;
    const rotateY = (x - centerX) / 25;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  const runQuizAnalysis = () => {
    setIsQuizCalculating(true);
    setQuizProgress(0);
    setQuizLog("Initializing smart neural parser...");
    
    // Simulate steps in AI recommendation calculation
    const logs = [
      "Accessing local database weights...",
      "Mapping sweetness coefficient (" + quizAnswers.sweetness + ")...",
      "Parsing flavor affinity arrays (" + quizAnswers.base + ")...",
      "Evaluating mood vibe alignments (" + quizAnswers.vibe + ")...",
      "Synthesizing matches based on spice profile...",
      "Recommendation ready!"
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < logs.length) {
        setQuizProgress((currentStep / logs.length) * 100);
        setQuizLog(logs[currentStep]);
      } else {
        setQuizProgress(100);
        clearInterval(interval);
        
        // Match selection logic
        let matchName = "Special South Indian Filter Coffee";
        let matchDesc = "Strong decoction, fresh foaming hot milk, frothed in brass dabara.";
        let matchPrice = "₹45";
        let matchTag = "Artisanal Choice";
        let matchImage = "/special_filter_coffee.png";

        if (quizAnswers.base === "coffee") {
          if (quizAnswers.sweetness === "none") {
            matchName = "Double Shot Black Espresso";
            matchDesc = "Premium dark roast pure espresso shots, zero sugar, high acidity and intense body.";
            matchPrice = "₹35";
            matchTag = "Pure Caffeine";
            matchImage = "/double_shot_black_espresso.png";
          } else if (quizAnswers.sweetness === "high") {
            matchName = "Oreo Whipped Mocha Cold Brew";
            matchDesc = "Double dripped espresso blend topped with fresh whipped cream and Oreo cookie crumbles.";
            matchPrice = "₹60";
            matchTag = "Dessert Fusion";
            matchImage = "/oreo_whipped_mocha_cold_brew.png";
          }
        } else if (quizAnswers.base === "tea") {
          if (quizAnswers.sweetness === "none") {
            matchName = "Lemon Green Tea Mint Cooler";
            matchDesc = "Premium green tea leaves steeped cold, shaken with fresh lemon slices and mint leaves.";
            matchPrice = "₹35";
            matchTag = "Zero Sugar Diet";
            matchImage = "/lemon_green_tea_mint_cooler.png";
          } else if (quizAnswers.sweetness === "medium") {
            matchName = "Ginger Masala Elachi Chai";
            matchDesc = "Warm street-style double boiled tea infused with ginger, cardamom, and thick creamy milk.";
            matchPrice = "₹25";
            matchTag = "Traditional Comfort";
            matchImage = "/ginger_masala_elachi_chai.png";
          } else {
            matchName = "Sweet Caramel Boba Milk Tea";
            matchDesc = "Artisanal black tea brewed with honey, combined with sweet caramel drizzles and tapioca pearls.";
            matchPrice = "₹70";
            matchTag = "Boba Craze";
            matchImage = "/sweet_caramel_boba_milk_tea.png";
          }
        } else {
          if (quizAnswers.sweetness === "none") {
            matchName = "Fresh Club Soda Cooler";
            matchDesc = "Sparkling aerated water served sub-zero with dynamic rock salt, fresh lime juice and zero sugar.";
            matchPrice = "₹30";
            matchTag = "Zero Calories";
            matchImage = "/fresh_club_soda_cooler.png";
          } else if (quizAnswers.sweetness === "medium") {
            matchName = "Ice Cold Blue Mojito";
            matchDesc = "Sub-zero crushed ice, fresh mint sprigs, lemon wedges, and sparkling blue curacao tonic.";
            matchPrice = "₹40";
            matchTag = "Chilled Blast";
            matchImage = "/blue_mojito_cooler.png";
          } else {
            matchName = "Mango Mastani Milkshake";
            matchDesc = "Thick, sweet mango pulp milkshake topped with fresh vanilla ice cream scoop and dry-fruits.";
            matchPrice = "₹80";
            matchTag = "Sweet Indulgence";
            matchImage = "/mango_mastani_milkshake.png";
          }
        }

        setQuizRecommendation({
          name: matchName,
          desc: matchDesc,
          price: matchPrice,
          tag: matchTag,
          image: matchImage
        });
        setIsQuizCalculating(false);
      }
    }, 450);
  };

  const handleNextStep = () => {
    if (!onboardForm.name || !onboardForm.email || !onboardForm.password) {
      alert("Please fill in your Name, Email, and Password.");
      return;
    }
    setOnboardStep(2);
  };

  const getSpiceValue = () => {
    if (onboardForm.spice_preference === "low") return 1;
    if (onboardForm.spice_preference === "high") return 3;
    return 2; // medium
  };

  const handleSpiceChange = (val) => {
    const levels = ["low", "medium", "high"];
    setOnboardForm({ ...onboardForm, spice_preference: levels[val - 1] });
  };

  const handleCategoryToggle = (category) => {
    const current = [...onboardForm.favorite_categories];
    const idx = current.indexOf(category);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(category);
    }
    setOnboardForm({ ...onboardForm, favorite_categories: current });
  };

  const flatMenuItems = Array.isArray(menu) ? menu.flatMap(catGroup => 
    (catGroup.items || []).map(item => ({
      ...item,
      category: catGroup.category
    }))
  ) : [];

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0702',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>☕</div>
        <p style={{ color: '#d4af37', fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
          Brewing Your Experience...
        </p>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 15px rgba(212,175,55,0.4)); }
            100% { transform: scale(1); opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  const isAuthView = viewMode === "login" || viewMode === "onboarding";

  return (
    <div 
      className={isAuthView ? "w-full h-full bg-[#090503] text-stone-100 font-sans fixed inset-0 overflow-hidden" : "min-h-screen bg-[#090503] text-stone-100 font-sans pb-16 relative pt-16"}
      style={isAuthView ? { position: 'fixed', inset: 0, height: '100%', width: '100%', overflow: 'hidden' } : { width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #__next {
          max-width: 100vw;
          overflow-x: hidden;
        }
      `}} />
      {isAuthView && (
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            min-height: 100% !important;
          }
        `}} />
      )}
      {/* Scroll Progress Indicator */}
      <div 
        ref={scrollIndicatorRef} 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_12px_#f2ca50] z-50 transition-all duration-75"
        style={{ width: "0%" }}
      ></div>

      {/* Ambient Background Orbs */}
      <div className="ambient-layer">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>

      {notification && (
        <div className="fixed top-5 right-5 bg-amber-500 text-stone-950 font-bold px-6 py-3 rounded-lg shadow-2xl transition-all duration-300 z-50 flex items-center border border-amber-400">
          <span className="mr-2">☕</span>
          {notification}
        </div>
      )}
      {/* Main Navbar */}
      <nav className="border-b border-transparent bg-transparent fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer select-none" onClick={() => setViewMode("landing")}>
            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>coffee</span>
            <span className="text-xl font-bold tracking-tight text-amber-500 font-sans">Kapi Adda</span>
          </div>
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                {user.email?.toLowerCase() === "kapiadda@gmail.com" && (
                  <button 
                    onClick={() => setViewMode("admin")}
                    className={`font-semibold text-sm transition ${viewMode === "admin" ? "text-amber-500" : "text-stone-300 hover:text-amber-500"}`}
                  >
                    Owner Dashboard
                  </button>
                )}
                <div className="flex items-center space-x-3 bg-stone-900 py-1.5 px-4 rounded-full border border-stone-850">
                  <div 
                    onClick={handleHeaderProfileClick}
                    className="flex items-center space-x-2.5 cursor-pointer hover:opacity-85 transition select-none"
                    title="View Profile Settings"
                  >
                    {/* Small Header Avatar Circle */}
                    {(() => {
                      const isInitials = headerAvatar === 'initials';
                      const isCustomImg = headerAvatar === 'image' && headerAvatarImg;
                      const initials = getInitials(user.name, user.email);
                      return (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isInitials ? '#6a7d83' : (isCustomImg ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(255,140,0,0.15), rgba(212,175,55,0.15))'),
                          border: '1.5px solid #ff8c00',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: isInitials ? '9px' : '13px',
                          fontWeight: '700',
                          color: isInitials ? '#ffffff' : '#ff8c00',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          overflow: 'hidden'
                        }}>
                          {isCustomImg ? (
                            <img src={headerAvatarImg} alt="Header Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            isInitials ? initials : headerAvatar
                          )}
                        </div>
                      );
                    })()}
                    <span className="text-sm font-medium text-stone-200">{user.name}</span>
                  </div>
                </div>
              </>
            ) : (
              !isAuthView && (
                <>
                  <button 
                    onClick={() => {
                      const el = document.getElementById("why-choose-us");
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hidden md:block font-semibold text-sm text-stone-400 hover:text-amber-500 transition"
                  >
                    Why Us
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById("how-it-works");
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hidden md:block font-semibold text-sm text-stone-400 hover:text-amber-500 transition"
                  >
                    How It Works
                  </button>
                  <button 
                    onClick={() => setViewMode("login")}
                    className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-6 py-1.5 rounded-full transition text-sm"
                  >
                    Login
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* -------------------- STITCH-DESIGNED LANDING PAGE -------------------- */}
      {viewMode === "landing" && (
        <div className="w-full space-y-16">
          
          {/* Hero Section */}
          <section className="relative min-h-[750px] flex flex-col justify-center items-center overflow-hidden w-full py-16">
            {/* Particle Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
            
            {/* Dynamic Background Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-650/5 blur-[150px] rounded-full"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 max-w-6xl">
              {/* Content Column */}
              <div className="flex-1 text-center lg:text-left space-y-8">
                <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold text-xs tracking-widest uppercase">
                  ARTISANAL AI BREWING
                </span>
                <h2 className="font-serif text-5xl md:text-[64px] font-bold text-amber-500 gold-glow leading-tight">
                  Welcome to <span className="block mt-2 text-amber-500">Kapi Adda</span>
                </h2>
                <p className="font-sans text-stone-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Discover Your Favorite Foods with Smart AI Assistance. Experience the heritage of filter coffee reimagined for the modern world.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => setViewMode(user ? "customer" : "login")}
                    className="btn-pulse bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold py-4 px-8 rounded-xl shadow-[0_10px_20px_rgba(217,119,6,0.2)] transition-all duration-300 active:scale-95 text-base"
                  >
                    Browse Menu Now
                  </button>
                  <button 
                    onClick={() => setViewMode(user ? "customer" : "onboarding")}
                    className="btn-slide-highlight bg-black/40 backdrop-blur-md border-[1.5px] border-amber-500/40 text-amber-500 font-bold py-4 px-8 rounded-xl hover:bg-amber-500 hover:text-stone-950 transition-all duration-300 active:scale-95 text-base"
                  >
                    Setup Custom Profile
                  </button>
                </div>
                {/* AI Assistant Micro-feature */}
                <div className="glass-card-premium p-5 rounded-2xl max-w-sm mx-auto lg:mx-0 flex items-start gap-4 border border-stone-850/30 bg-stone-900/40 backdrop-blur-xl">
                  <div className="bg-amber-500/20 p-2.5 rounded-xl text-amber-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">temp_preferences_custom</span>
                  </div>
                  <div className="text-left space-y-1">
                    <h4 className="text-sm font-bold text-stone-100">Smart Brew AI</h4>
                    <p className="text-xs text-stone-400 leading-tight">Tell me your mood, I'll find your perfect kapi blend.</p>
                  </div>
                </div>
              </div>

              {/* Central Visual Column - Redesigned Premium Coffee Cup Centerpiece */}
              <div className="flex-1 relative w-full flex justify-center items-center tilt-container">
                <div className="tilt-card relative flex items-center justify-center float-animation">
                  {/* Light Rays Background */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <div className="w-[450px] h-[450px] bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent opacity-30 rounded-full blur-3xl animate-pulse-ray"></div>
                    <div className="absolute w-[350px] h-[350px] bg-gradient-to-tr from-amber-600/10 via-transparent to-transparent opacity-20 rounded-full blur-2xl animate-pulse-ray" style={{ animationDelay: "-4s" }}></div>
                  </div>
                  
                  {/* Steam Lines */}
                  <div className="absolute -top-24 z-10 flex space-x-6 opacity-60">
                    <div className="steam-line w-[2px] h-20 bg-gradient-to-t from-amber-500/60 to-transparent rounded-full blur-[2px]" style={{ animationDelay: "0s" }}></div>
                    <div className="steam-line w-[2px] h-28 bg-gradient-to-t from-amber-500/40 to-transparent rounded-full blur-[3px]" style={{ animationDelay: "1.5s" }}></div>
                    <div className="steam-line w-[2px] h-16 bg-gradient-to-t from-amber-500/50 to-transparent rounded-full blur-[2px]" style={{ animationDelay: "0.8s" }}></div>
                    <div className="steam-line w-[2px] h-24 bg-gradient-to-t from-amber-500/30 to-transparent rounded-full blur-[4px]" style={{ animationDelay: "2.2s" }}></div>
                  </div>
                  
                  {/* Rotating Golden Halo Ring */}
                  <div className="absolute w-[320px] h-[320px] md:w-[360px] md:h-[360px] rounded-full border border-amber-500/20 animate-rotate-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-amber-500 rounded-full blur-[4px] shadow-[0_0_15px_#f2ca50]"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-amber-500 rounded-full blur-[4px] shadow-[0_0_15px_#f2ca50]"></div>
                  </div>
                  <div className="absolute w-[300px] h-[300px] md:w-[340px] md:h-[340px] rounded-full border-[2px] border-t-amber-500/30 border-r-transparent border-b-amber-500/30 border-l-transparent animate-rotate-slow" style={{ animationDirection: "reverse", animationDuration: "15s" }}></div>
                  
                  {/* Floating Accents */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 glass-card-premium rounded-full flex items-center justify-center animate-bounce z-30 border border-amber-500/20 text-xl bg-stone-900/40 backdrop-blur-xl">
                    ⭐
                  </div>

                  {/* Main Circular Cup Container */}
                  <div className="relative z-10 w-72 h-72 md:w-80 md:h-80 rounded-full overflow-hidden border-[3px] border-amber-500/30 shadow-[0_0_60px_rgba(212,175,55,0.25)] bg-black">
                    <img 
                      alt="Premium Artisanal Coffee" 
                      className="w-full h-full object-cover mix-blend-screen scale-95" 
                      src="/hero_coffee_cup.png"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-amber-500/10 pointer-events-none"></div>
                  </div>

                  {/* Float Tags */}
                  <div className="absolute bottom-6 -left-6 glass-card-premium py-2 px-4 rounded-full flex items-center gap-2 animate-pulse z-30 border border-amber-500/20 bg-stone-900/40 backdrop-blur-xl">
                    <div className="w-2 h-2 rounded-full bg-green-400 led-pulse"></div>
                    <span className="text-stone-200 text-xs font-semibold">Brewing Perfection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
              <span className="text-stone-400 text-[10px] tracking-widest uppercase font-semibold">Scroll</span>
              <div className="w-px h-10 bg-gradient-to-b from-amber-500 to-transparent"></div>
            </div>
          </section>


          {/* Mood Brew Finder */}
          <section className="py-12 max-w-5xl mx-auto px-4 reveal bg-stone-950/30 border border-stone-900/50 rounded-3xl p-8">
            <div className="text-center mb-10">
              <h3 className="font-serif text-3xl font-bold text-gradient-gold mb-2">How are you feeling?</h3>
              <p className="text-stone-300 text-sm">Let our AI match your mood to the perfect roast & treat.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { id: "sleepy", icon: "bedtime", label: "Sleepy" },
                { id: "stressed", icon: "bolt", label: "Stressed" },
                { id: "overheated", icon: "thermostat_auto", label: "Overheated" },
                { id: "hungry", icon: "fastfood", label: "Hungry" }
              ].map(m => (
                <button 
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMood(m.id)}
                  className={`glass p-6 rounded-2xl flex flex-col items-center gap-3 group hover:border-amber-500/50 transition-all hover-shimmer ${activeMood === m.id ? "border-amber-500 bg-amber-950/20" : ""}`}
                >
                  <span className="material-symbols-outlined text-4xl text-amber-400 group-hover:scale-110 transition-transform">{m.icon}</span>
                  <span className="font-serif font-bold text-stone-200 text-base">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="max-w-lg mx-auto">
              <div className={`recommendation-card glass p-6 rounded-2xl border border-amber-500/30 text-center transition-all ${activeMood === "sleepy" ? "active" : "hidden"}`}>
                <span className="text-3xl block mb-2">☕</span>
                <h4 className="text-amber-400 font-bold mb-2 font-serif text-lg">Special South Indian Filter Coffee</h4>
                <p className="text-stone-300 text-sm">Strong decoction, fresh foaming hot milk, and rich aroma to jumpstart your engine. (Rs.45)</p>
              </div>
              <div className={`recommendation-card glass p-6 rounded-2xl border border-amber-500/30 text-center transition-all ${activeMood === "stressed" ? "active" : "hidden"}`}>
                <span className="text-3xl block mb-2">🥣</span>
                <h4 className="text-amber-400 font-bold mb-2 font-serif text-lg">Healthy Hot Ragi Malt</h4>
                <p className="text-stone-300 text-sm">Nutritious finger millet blend with hot milk and cardamom flavor to soothe your nerves. (Rs.50)</p>
              </div>
              <div className={`recommendation-card glass p-6 rounded-2xl border border-amber-500/30 text-center transition-all ${activeMood === "overheated" ? "active" : "hidden"}`}>
                <span className="text-3xl block mb-2">🍹</span>
                <h4 className="text-amber-400 font-bold mb-2 font-serif text-lg">Ice Cold Blue Mojito</h4>
                <p className="text-stone-300 text-sm">Sub-zero mint, fresh lemon splash, and sparkling soda to drop your temperature instantly. (Rs.75)</p>
              </div>
              <div className={`recommendation-card glass p-6 rounded-2xl border border-amber-500/30 text-center transition-all ${activeMood === "hungry" ? "active" : "hidden"}`}>
                <span className="text-3xl block mb-2">🥟</span>
                <h4 className="text-amber-400 font-bold mb-2 font-serif text-lg">Golden Baked Chicken Puff</h4>
                <p className="text-stone-300 text-sm">Flaky, layered golden pastry filled with savory spiced chicken filling for a perfect treat. (Rs.60)</p>
              </div>
            </div>
          </section>

          {/* Bento Grid: What You Can Do */}
          <section className="py-12">
            <div className="max-w-5xl mx-auto px-4">
              <div className="text-center mb-10">
                <h3 className="font-serif text-3xl font-bold text-gradient-gold mb-2">What You Can Do</h3>
                <p className="text-stone-300 text-sm">Bespoke features for a seamless dining experience.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Main wide card */}
                <div 
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease", transitionDelay: "100ms" }}
                  className="md:col-span-2 lg:col-span-2 glass p-8 rounded-3xl relative overflow-hidden group hover-shimmer flex flex-col justify-between min-h-[220px] reveal"
                >
                  <div className="relative z-10 space-y-2">
                    <span className="text-2xl">📖</span>
                    <h4 className="font-serif text-xl font-bold text-amber-500">Browse Complete Menu</h4>
                    <p className="text-stone-300 text-xs md:text-sm max-w-md leading-relaxed">
                      Explore items with ratings, prep times, and prices in our digital catalog with real-time stock availability.
                    </p>
                  </div>
                  <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 group-hover:opacity-20 pointer-events-none transition-all">
                    <span className="material-symbols-outlined text-[150px] text-amber-500 absolute -right-8 -bottom-8">restaurant_menu</span>
                  </div>
                </div>
                
                <div 
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease", transitionDelay: "200ms" }}
                  className="glass p-8 rounded-3xl hover-shimmer flex flex-col justify-between min-h-[220px] reveal"
                >
                  <div className="space-y-2">
                    <span className="text-2xl">🤖</span>
                    <h4 className="font-serif text-xl font-bold text-amber-500">AI Assistant Barista</h4>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      Your personal digital barista, ready to recommendation-filter menu items based on price and preferences.
                    </p>
                  </div>
                </div>

                <div 
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease", transitionDelay: "300ms" }}
                  className="glass p-8 rounded-3xl hover-shimmer flex flex-col justify-between min-h-[200px] reveal"
                >
                  <div className="space-y-2">
                    <span className="text-2xl">🔥</span>
                    <h4 className="font-serif text-xl font-bold text-amber-500">Trending Today</h4>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      Discover daily hot selections, including our Special Filter Coffee and delicious snack bundles.
                    </p>
                  </div>
                </div>

                <div 
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease", transitionDelay: "400ms" }}
                  className="md:col-span-2 lg:col-span-2 glass p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/5 to-transparent hover-shimmer flex flex-col md:flex-row gap-6 items-start md:items-center justify-between reveal"
                >
                  <div className="space-y-4 w-full md:flex-1 text-left">
                    <h4 className="font-serif text-xl font-bold text-amber-500">Personalized Recommendations</h4>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      Smart database recommendations tailored to your spice preference, vegetarian choice, and customer reviews.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] bg-amber-950/60 border border-amber-900/60 text-amber-400 py-1 px-3 rounded-full font-bold uppercase tracking-wider">🥬 Veg Filters</span>
                      <span className="text-[10px] bg-amber-950/60 border border-amber-900/60 text-amber-400 py-1 px-3 rounded-full font-bold uppercase tracking-wider">🌶️ Spice Tuning</span>
                    </div>
                  </div>
                  <div className="w-full md:w-72 glass p-4 rounded-xl border border-amber-500/10 space-y-2 flex-shrink-0 text-left bg-stone-950/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500">★</span>
                      <span className="font-bold text-stone-200">4.9 / 5.0</span>
                    </div>
                    <p className="text-stone-300 text-xxs italic leading-normal">"AI recommended Ragi Malt with medium spice snacks. Fits perfectly."</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Signature Brews Preview */}
          <section className="py-12 max-w-5xl mx-auto px-4 reveal">
            <div className="text-center mb-10">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1.5 px-4 rounded-full font-bold uppercase tracking-widest">AI SELECTED FAVORITES</span>
              <h3 className="font-serif text-3xl font-bold text-gradient-gold mt-3 mb-2">Signature Brews & Treats</h3>
              <p className="text-stone-300 text-sm">A sneak peek of customer favorites crafted by our AI Barista.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: "Special Filter Coffee",
                  category: "Tea & Hot Beverages",
                  price: "₹15",
                  rating: "4.9",
                  tag: "House Special",
                  image: "/special_filter_coffee.png",
                  desc: "Authentic chicory blend, double-dripped and frothed in a brass dabara."
                },
                {
                  name: "Blue Mojito Cooler",
                  category: "Coolers",
                  price: "₹40",
                  rating: "4.8",
                  tag: "Chilled Blast",
                  image: "/blue_mojito_cooler.png",
                  desc: "Chilled sparkling soda infused with fresh mint, lime, and blue curacao syrup."
                },
                {
                  name: "Oreo Milk Shake",
                  category: "Milk Shakes",
                  price: "₹60",
                  rating: "4.7",
                  tag: "Sweet Delight",
                  image: "/oreo_milk_shake.png",
                  desc: "Thick vanilla ice cream blend frothed with crushed oreo cookies and whipped cream."
                },
                {
                  name: "Hot Chocolate Momos",
                  category: "Snacks",
                  price: "₹80",
                  rating: "4.8",
                  tag: "Crispy Bites",
                  image: "/hot_chocolate_momos.png",
                  desc: "Spiced vegetable or chicken momos served hot with garlic chili dips."
                }
              ].map((brew, idx) => (
                <div 
                  key={idx} 
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease" }}
                  className="glass p-5 rounded-2xl border border-stone-850 hover:border-amber-500/40 transition duration-500 hover:scale-[1.03] group flex flex-col justify-between bg-stone-900/10 backdrop-blur-md text-left"
                >
                  <div className="space-y-4">
                    <div className="relative h-40 rounded-xl overflow-hidden bg-stone-950 border border-stone-850/60">
                      <img 
                        src={brew.image} 
                        alt={brew.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[9px] uppercase tracking-wider">
                        {brew.tag}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif font-bold text-stone-100 text-sm group-hover:text-amber-500 transition-colors">{brew.name}</h4>
                        <span className="text-amber-500 font-bold text-xs">{brew.price}</span>
                      </div>
                      <p className="text-[10px] text-stone-500">{brew.category}</p>
                      <p className="text-[11px] text-stone-400 leading-relaxed">{brew.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-stone-850/60 mt-4 text-[10px]">
                    <span className="text-amber-400 font-bold">★ {brew.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Interactive AI Flavor DNA Explorer Section */}
          <section className="py-12 max-w-5xl mx-auto px-4 reveal bg-gradient-to-br from-amber-950/10 to-transparent border border-stone-900/50 rounded-3xl p-8">
            <div className="text-center mb-10">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1.5 px-4 rounded-full font-bold uppercase tracking-widest">INTERACTIVE EXPERIENCE</span>
              <h3 className="font-serif text-3xl font-bold text-gradient-gold mt-3 mb-2">AI Flavor DNA Explorer</h3>
              <p className="text-stone-300 text-sm">Fine-tune your sensory attributes and let our neural engine select your beverage match.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start text-left">
              {/* Form Controls Column */}
              <div className="space-y-6">
                {/* Select Base */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">1. Select Flavor Base</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "coffee", label: "☕ Coffee", desc: "Rich & bold" },
                      { id: "tea", label: "🍵 Tea", desc: "Warm & earthy" },
                      { id: "cooler", label: "🍹 Cooler", desc: "Crisp & cold" }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setQuizAnswers({ ...quizAnswers, base: opt.id })}
                        className={`p-3.5 rounded-xl border text-left transition-all ${quizAnswers.base === opt.id ? "border-amber-500 bg-amber-950/20 text-amber-400" : "border-stone-850 hover:border-amber-500/30 text-stone-300 bg-stone-900/10"}`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[9px] text-stone-500 leading-tight mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sweetness Range */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">2. Sugar & Sweetness Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "none", label: "Zero Sugar", desc: "Diet & pure" },
                      { id: "medium", label: "Balanced", desc: "Standard blend" },
                      { id: "high", label: "Extra Sweet", desc: "Indulgent sugar" }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setQuizAnswers({ ...quizAnswers, sweetness: opt.id })}
                        className={`p-3.5 rounded-xl border text-left transition-all ${quizAnswers.sweetness === opt.id ? "border-amber-500 bg-amber-950/20 text-amber-400" : "border-stone-850 hover:border-amber-500/30 text-stone-300 bg-stone-900/10"}`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[9px] text-stone-500 leading-tight mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibe Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">3. Pick Your Vibe</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "energizing", label: "⚡ Energizing", desc: "Power boost" },
                      { id: "relaxing", label: "🧘 Relaxing", desc: "Warm & cozy" },
                      { id: "refreshing", label: "❄️ Refreshing", desc: "Crisp splash" }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setQuizAnswers({ ...quizAnswers, vibe: opt.id })}
                        className={`p-3.5 rounded-xl border text-left transition-all ${quizAnswers.vibe === opt.id ? "border-amber-500 bg-amber-950/20 text-amber-400" : "border-stone-850 hover:border-amber-500/30 text-stone-300 bg-stone-900/10"}`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[9px] text-stone-500 leading-tight mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={runQuizAnalysis}
                  disabled={isQuizCalculating}
                  className="w-full btn-glow bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold py-3.5 px-6 rounded-xl transition duration-300 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">psychology</span>
                  {isQuizCalculating ? "Synthesizing DNA Profile..." : "Analyze Flavor DNA"}
                </button>
              </div>

              {/* Quiz Result Console Column */}
              <div className="glass p-6 rounded-2xl border border-stone-850 flex flex-col justify-between min-h-[300px] relative bg-stone-950/40 overflow-hidden">
                {isQuizCalculating ? (
                  <div className="flex-1 flex flex-col justify-center items-center space-y-6 py-8">
                    {/* Glowing spinner */}
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                    <div className="space-y-2 text-center w-full max-w-xs">
                      <div className="text-stone-300 text-xs font-mono select-none">{quizLog}</div>
                      <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-amber-500 shadow-[0_0_8px_#f2ca50]" style={{ width: `${quizProgress}%`, transition: "width 0.4s ease" }}></div>
                      </div>
                    </div>
                  </div>
                ) : quizRecommendation ? (
                  <div className="flex-1 flex flex-col md:flex-row gap-5 items-center md:items-start text-left animate-fade-in">
                    <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 border border-stone-850 bg-stone-950">
                      <img src={quizRecommendation.image} alt={quizRecommendation.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[9px] uppercase tracking-wider">
                          {quizRecommendation.tag}
                        </span>
                        <div className="flex justify-between items-center mt-1">
                          <h4 className="font-serif font-bold text-stone-100 text-base">{quizRecommendation.name}</h4>
                          <span className="text-amber-500 font-bold text-sm">{quizRecommendation.price}</span>
                        </div>
                      </div>
                      <p className="text-stone-300 text-xs leading-relaxed">{quizRecommendation.desc}</p>
                      
                      <div className="pt-2 flex justify-between items-center border-t border-stone-850/60 text-xs">
                        <span className="text-amber-400 font-bold font-mono">⚡ 99.4% DNA Match</span>
                        <button 
                          onClick={() => setViewMode("login")}
                          className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-stone-950 text-amber-500 font-bold px-4 py-1.5 rounded-lg transition text-xxs uppercase tracking-wider"
                        >
                          Quick Order
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-8">
                    <span className="material-symbols-outlined text-stone-500 text-5xl">cognition</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-stone-300 text-sm">Neural Matching Console</h4>
                      <p className="text-stone-500 text-xs max-w-xs leading-normal">Select your base, sweetness preferences, and vibe on the left, then click analyze to compute matching menu pairings.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Live Inventory Supply Chain Tracker */}
          <section className="py-12 max-w-5xl mx-auto px-4 reveal">
            <div className="glass p-8 rounded-3xl border border-amber-500/20 relative overflow-hidden hover-shimmer bg-stone-950/20">
              <div className="absolute top-6 right-6 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full led-pulse shadow-[0_0_8px_#d4af37]" style={{ color: "#d4af37" }}></div>
                <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Live Database Link</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-gradient-gold mb-8">Supply Chain & Inventory Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { name: "Dairy & Oat Milk", p: "85%" },
                  { name: "Ethiopian Beans", p: "92%" },
                  { name: "Natural Sugar", p: "70%" },
                  { name: "Specialty Teas", p: "50%" }
                ].map((inv, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-stone-300">
                      <span>{inv.name}</span>
                      <span className="text-amber-400">{inv.p}</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 inventory-bar" data-width={inv.p} style={{ width: "0%" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative overflow-hidden bg-stone-950/20 border border-stone-900/60 p-8 md:p-12 rounded-3xl max-w-5xl mx-auto reveal" id="why-choose-us">
            <canvas ref={emberCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
            <div className="space-y-6 relative z-10 text-left">
              <h2 className="text-4xl font-serif font-bold text-gradient-gold">Why Choose Us?</h2>
              <p className="text-xl font-serif leading-tight text-stone-200">
                South Indian Coffee culture meets real-time database intelligence.
              </p>
              <p className="text-stone-400 text-xs leading-relaxed max-w-md">
                At Kapi Adda, we combine artisanal South Indian coffee culture with intelligent real-time database tracking to create a modern, efficient, and personalized dining experience.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="pulse-glow px-4 py-2 bg-stone-900/60 border border-amber-500/40 rounded-full flex items-center gap-2">
                  <span className="text-amber-400 text-xs">⚡</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Real-time Menu</span>
                </div>
                <div className="pulse-glow px-4 py-2 bg-stone-900/60 border border-amber-500/40 rounded-full flex items-center gap-2">
                  <span className="text-amber-400 text-xs">🧠</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">AI Recommendation</span>
                </div>

              </div>
            </div>
            <div className="relative group z-10">
              <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-2xl overflow-hidden border border-stone-850 glass bg-stone-950/40">
                <img 
                  alt="Espresso Bar" 
                  className="w-full h-[280px] object-cover opacity-80" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK5Nua52lNdJYgoIXLx6gTMmbOAT-bKrcvhKtnnJXPEKKyI1sL3KP1JLWdSb3Uy3fFonp_GfqNSkLyURgMpCFDbOXxHiOOTzrUd4Nypi1dHU5e5GoxB-uJvv2xFAoaBtrR2QQ1alhtDufYrlaUs6UN2gXOpDAFrABh9Xi6NIvkcJ4gDzTdx8Gwtd8Vz4lAJh2VMA5aYkiFMchwHRJhVUDImv4WHo5BuIwD1LBbhZoxzmJg1GJKRPfxnwlXD1UDHFZAGJKg8VOuWHqd"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090503] via-transparent to-transparent"></div>
              </div>
            </div>
          </section>

          {/* Daily Combo Specials */}
          <section className="py-12 max-w-xl mx-auto px-4 reveal">
            <div>
              
              {/* Daily Chef Combo Pairing */}
              <div 
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                style={{ transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease" }}
                className="glass p-8 rounded-3xl border border-amber-500/20 text-left flex flex-col justify-between bg-stone-950/20 relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1 px-3 rounded-full font-bold uppercase tracking-wider">DAILY COMBO DEALS</span>
                    <span className="text-amber-400 font-bold text-xs">Save 23%</span>
                  </div>
                  
                  <h4 className="font-serif text-xl font-bold text-stone-100">AI Recommended Morning Combo</h4>
                  
                  <div className="flex items-center gap-4 bg-stone-900/30 p-3 rounded-xl border border-stone-850">
                    <div className="text-2xl">☕</div>
                    <div className="text-stone-200 text-xs">
                      <div className="font-bold text-amber-400">South Indian Filter Coffee</div>
                      <div className="text-stone-400 text-[10px] mt-0.5">Authentic double-dripped brass dabara froth.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-stone-900/30 p-3 rounded-xl border border-stone-850">
                    <div className="text-2xl">🥟</div>
                    <div className="text-stone-200 text-xs">
                      <div className="font-bold text-amber-400">Golden Baked Chicken Puff</div>
                      <div className="text-stone-400 text-[10px] mt-0.5">Flaky savory pastry filled with spicy chicken.</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-stone-850/60 mt-6 flex justify-between items-center">
                  <div className="flex items-baseline gap-2">
                    <span className="text-amber-400 font-bold font-serif text-lg">₹50</span>
                    <span className="text-stone-500 line-through text-xs">₹65</span>
                  </div>
                  <button onClick={() => setViewMode("login")} className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2 rounded-xl transition text-xs uppercase tracking-wider">
                    Order Combo
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* How it Works timeline */}
          <section ref={howItWorksRef} className="py-12 bg-stone-950/30 p-8 md:p-12 rounded-3xl border border-stone-900/60 text-left max-w-5xl mx-auto reveal" id="how-it-works">
            <h2 className="text-3xl font-serif font-bold text-center text-gradient-gold mb-12">The Intelligence Journey</h2>
            <div className="relative max-w-3xl mx-auto">
              <div className="timeline-line-container">
                <div ref={timelineFillRef} className="timeline-line-fill"></div>
              </div>
              <div className="space-y-12 pl-12 md:pl-20">
                <div className="relative flex gap-6 md:gap-12 group">
                  <div className="absolute -left-12 md:-left-20 w-10 h-10 rounded-full bg-stone-900 border border-amber-500 flex items-center justify-center z-10 glass">
                    <span className="text-amber-500 font-bold text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-serif font-bold text-stone-200 mb-1">Set Preferences</h4>
                    <p className="text-stone-400 text-xs md:text-sm leading-relaxed">
                      Set up your flavor affinities—from veg preference to spice level—using our customized profile setup.
                    </p>
                  </div>
                </div>
                <div className="relative flex gap-6 md:gap-12 group">
                  <div className="absolute -left-12 md:-left-20 w-10 h-10 rounded-full bg-stone-900 border border-amber-500 flex items-center justify-center z-10 glass">
                    <span className="text-amber-500 font-bold text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-serif font-bold text-stone-200 mb-1">Query AI Assistant</h4>
                    <p className="text-stone-400 text-xs md:text-sm leading-relaxed">
                      Chat with our digital AI barista to discover the perfect brew based on your mood or query price ranges.
                    </p>
                  </div>
                </div>
                <div className="relative flex gap-6 md:gap-12 group">
                  <div className="absolute -left-12 md:-left-20 w-10 h-10 rounded-full bg-stone-900 border border-amber-500 flex items-center justify-center z-10 glass">
                    <span className="text-amber-500 font-bold text-sm">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-serif font-bold text-stone-200 mb-1">Deduct Raw Stock</h4>
                    <p className="text-stone-400 text-xs md:text-sm leading-relaxed">
                      Place orders securely. Ingredients (milk, sugar, beans) are automatically deducted from stock.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats counters */}
          <section ref={statsRef} className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 py-8 reveal" id="stats-section">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-28 h-28 glow-ring">
                <span className="text-2xl font-bold text-amber-500">{stats.items}+</span>
              </div>
              <div>
                <h5 className="text-stone-200 font-semibold text-sm">Menu Items</h5>
                <p className="text-stone-500 text-xxs uppercase tracking-widest mt-1">Seeded Kapi Adda Items</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-28 h-28 glow-ring">
                <span className="text-2xl font-bold text-amber-500">{stats.sync === 1 ? "< 1s" : "0s"}</span>
              </div>
              <div>
                <h5 className="text-stone-200 font-semibold text-sm">Real-Time Sync</h5>
                <p className="text-stone-500 text-xxs uppercase tracking-widest mt-1">Supabase DB Sync Rate</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-28 h-28 glow-ring">
                <span className="text-2xl font-bold text-amber-500">{stats.accuracy}%</span>
              </div>
              <div>
                <h5 className="text-stone-200 font-semibold text-sm">AI Precision</h5>
                <p className="text-stone-500 text-xxs uppercase tracking-widest mt-1">Recommendation Accuracy</p>
              </div>
            </div>
          </section>

          {/* Customer Testimonials */}
          <section className="max-w-5xl mx-auto px-4 reveal">
            <div className="glass p-8 rounded-[32px] text-center hover-shimmer group relative overflow-hidden">
              <span className="material-symbols-outlined text-amber-500 text-4xl mb-6 group-hover:scale-110 transition-transform">format_quote</span>
              <p className="font-serif text-stone-200 text-lg md:text-xl italic mb-6 leading-relaxed">
                "Kapi Adda isn't just a coffee app. It's a sensory orchestrator that understands my morning mood better than I do. The precision is startling."
              </p>
              <div className="flex flex-col items-center gap-2">
                <span className="text-amber-400 font-bold font-serif text-sm">Jessica Thorne</span>
                <span className="text-stone-400 text-xs">UX Design Director, San Francisco</span>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="py-12 max-w-5xl mx-auto px-4 reveal">
            <div className="text-center mb-10">
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 py-1.5 px-4 rounded-full font-bold uppercase tracking-widest">HAVE QUESTIONS?</span>
              <h3 className="font-serif text-3xl font-bold text-gradient-gold mt-3 mb-2">Frequently Asked Questions</h3>
              <p className="text-stone-300 text-sm">Everything you need to know about our smart coffee experiences.</p>
            </div>
            
            <div className="space-y-4 max-w-3xl mx-auto text-left">
              {[
                {
                  q: "How does the AI Recommendation Engine calculate my matches?",
                  a: "Our AI engine processes multiple factors: your active mood (sleepy, stressed, overheated, hungry), flavor DNA preferences (veg preference, sweetness level, base type), spice tolerance tuning, and real-time community customer reviews to compute a personalized menu matchmaking score."
                },
                {
                  q: "Can I customize dietary preferences like lactose-free milk swaps?",
                  a: "Absolutely! During onboarding or inside your Profile settings, you can toggle preferences such as Vegetarian-only filters, Soy/Oat milk replacements, sugar levels, and spice constraints. The system automatically screens the menu items in real-time."
                },
                {
                  q: "How does the Live Database Inventory Tracking work?",
                  a: "We connect directly to our Supabase database. When order transactions complete, stock is reduced dynamically. The landing page receives instant updates for ingredients like Dairy, Specialty Beans, and Sugars, triggering alerts before item out-of-stock events occur."
                },
                {
                  q: "What are Kappa Coins and how do I redeem them?",
                  a: "Kappa Coins are our smart loyalty system rewards. You earn 10 Coins for every ₹100 spent. Coins can be used during order checkout to pay for custom toppings, get discount vouchers, or get special seasonal bakery menu items for free."
                }
              ].map((faq, idx) => (
                <div 
                  key={idx}
                  className="glass rounded-2xl border border-stone-850 overflow-hidden transition-all duration-300 bg-stone-900/5 backdrop-blur-md"
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                    className="w-full p-5 flex items-center justify-between text-stone-200 font-bold text-sm md:text-base hover:text-amber-400 transition-colors text-left"
                  >
                    <span>{faq.q}</span>
                    <span className="material-symbols-outlined text-amber-500 transition-transform duration-300" style={{ transform: faqOpenIndex === idx ? "rotate(180deg)" : "rotate(0deg)" }}>
                      keyboard_arrow_down
                    </span>
                  </button>
                  
                  <div 
                    className="transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: faqOpenIndex === idx ? "200px" : "0px",
                      opacity: faqOpenIndex === idx ? 1 : 0,
                      overflow: "hidden"
                    }}
                  >
                    <p className="p-5 pt-0 text-stone-400 text-xs md:text-sm leading-relaxed border-t border-stone-850/30">
                      {faq.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer and final slogan */}
          <footer className="pt-12 pb-6 border-t border-stone-900 max-w-5xl mx-auto text-stone-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-amber-500">
                  <span className="text-2xl">☕</span>
                  <span className="font-serif font-bold text-lg">Kapi Adda</span>
                </div>
                <p className="text-xs leading-relaxed text-stone-400 max-w-xs">
                  Redefining the artisanal South Indian coffee experience through the lens of artificial intelligence and premium hospitality.
                </p>
              </div>
              <div className="space-y-2 text-xs text-left">
                <h6 className="text-amber-500 font-bold font-serif uppercase tracking-wider mb-2">Visit Us</h6>
                <p>128 Espresso Way, Cyber District</p>
                <p>Neo Delhi, 110001</p>
                <p>Open Daily: 06:00 - 22:00</p>
              </div>
            </div>
            <div className="pt-6 border-t border-stone-900 text-center">
              <p className="text-gradient-gold font-bold font-serif italic text-base">
                Smart Food Discovery. Personalized Recommendations. Better Dining Experience.
              </p>
            </div>
          </footer>

        </div>
      )}

      {/* -------------------- 1. ONBOARDING & LOGIN UNIFIED PLATFORM -------------------- */}
      {(viewMode === "login" || viewMode === "onboarding") && (
        <PremiumAuth 
          initialView={viewMode}
          onViewChange={(mode) => setViewMode(mode)}
          onLoginSuccess={(userData) => {
            showNotification("Login successful!");
            setUser(userData);
            if (userData?.email?.toLowerCase() === "kapiadda@gmail.com") {
              setViewMode("admin");
              loadAdminDashboard();
            } else {
              setViewMode("customer");
            }
          }}
          onSignupSuccess={(userData) => {
            showNotification("Registered successfully!");
            setUser(userData);
            setViewMode("customer");
          }}
          onBackToHome={() => setViewMode("landing")}
        />
      )}


      {/* -------------------- 3. CUSTOMER STOREFRONT -------------------- */}
      {viewMode === "customer" && (
        <div style={{
          maxWidth: screen.contentMaxWidth,
          margin: '0 auto',
          padding: screen.pagePadding,
        }}>
          {/* Sub-navigation Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: screen.compact ? 'flex-start' : 'center',
            gap: breakpoint === 'xs' ? '8px' : breakpoint === 'sm' ? '10px' : '12px',
            marginBottom: breakpoint === 'xs' ? '16px' : '24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: '12px',
            overflowX: screen.compact ? 'auto' : 'visible',
            scrollbarWidth: 'none',
          }}>
            {[
              { key: 'home', label: '🏠 Home', icon: '🏠' },
              { key: 'menu', label: '🍽️ Menu', icon: '🍽️' },
              { key: 'profile', label: '👤 Profile', icon: '👤' },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`customer-tab-${tab.key}`}
                onClick={() => setCustomerTab(tab.key)}
                style={{
                  flexShrink: 0,
                  border: "none",
                  borderBottom: customerTab === tab.key ? "2px solid #ff8c00" : "2px solid transparent",
                  background: "transparent",
                  color: customerTab === tab.key ? "#ffb347" : "rgba(245,239,224,0.72)",
                  padding: breakpoint === "xs" ? "8px 12px" : "10px 16px",
                  fontSize: breakpoint === "xs" ? 12 : 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {customerTab === "home" && (
            <CustomerHome
              user={user}
              onViewFood={setSelectedFoodItem}
              onOpenChat={() => { setIsChatOpen(true); setStartWithVoice(true); }}
              breakpoint={breakpoint}
            />
          )}

          {customerTab === "menu" && (
            <FoodCatalog
              user={user}
              onViewFood={setSelectedFoodItem}
              onAddToCart={addToCart}
              cart={cart}
              onOpenChat={() => setIsChatOpen(true)}
              breakpoint={breakpoint}
            />
          )}

          {customerTab === "profile" && (
            <ProfileCard
              user={user}
              onUserUpdate={setUser}
              onSuccessRedirect={() => setCustomerTab("home")}
              onBack={() => setCustomerTab("home")}
              onLogout={() => {
                setUser(null);
                setViewMode("login");
                localStorage.removeItem("kapi_token");
                localStorage.removeItem("kapi_user");
                eraseCookie("kapi_token");
                eraseCookie("kapi_user");
              }}
              breakpoint={breakpoint}
            />
          )}

          {selectedFoodItem && (
            <FoodDetail
              item={selectedFoodItem}
              user={user}
              onClose={() => setSelectedFoodItem(null)}
              onAddToCart={addToCart}
              breakpoint={breakpoint}
            />
          )}

          <AIAssistant
            user={user}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            onOpen={() => setIsChatOpen(true)}
            menuItems={flatMenuItems}
            onSelectProduct={setSelectedFoodItem}
            breakpoint={breakpoint}
            startWithVoice={startWithVoice}
            onResetStartWithVoice={() => setStartWithVoice(false)}
          />
        </div>
      )}

      {/* -------------------- 4. ADMIN BUSINESS INTELLIGENCE DASHBOARD -------------------- */}
      {viewMode === "admin" && (
        <OwnerDashboard 
          user={user}
          onLogout={() => {
            setUser(null);
            setViewMode("login");
            localStorage.removeItem('kapi_token');
            localStorage.removeItem('kapi_user');
            eraseCookie('kapi_token');
            eraseCookie('kapi_user');
          }}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
          activeTab={adminTab}
          setActiveTab={setAdminTab}
        />
      )}



    </div>
  );
}
