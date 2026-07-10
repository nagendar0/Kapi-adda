'use client';

import { useState, useEffect, useRef } from 'react';
import { getImageForItem } from '../utils/imageMapper';
import { useScreenProfile } from '../utils/responsive';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000`
  : 'http://127.0.0.1:8000');


// Quick replies managed dynamically by active mode

const GREETINGS = {
  en: "Namaste! ☕️ I'm your Kapi Adda AI assistant. I can help you find the perfect brew or snack. What can I get you today?",
  te: "నమస్తే! ☕️ నేను మీ కపి అడ్డా AI అసిస్టెంట్ ని. మీకు కావలసిన కాఫీ లేదా స్నాక్స్ ని ఎంచుకోవడంలో సహాయపడతాను. ఈరోజు మీకు ఏమి కావాలి?",
  hi: "नमस्ते! ☕️ मैं आपका कपि अड्डा AI सहायक हूँ। मैं आपको सही कॉफ़ी या स्नैक्स चुनने में मदद कर सकता हूँ। आज आपको क्या चाहिए?"
};

const INITIAL_MESSAGE = {
  id: 'init',
  role: 'bot',
  text: GREETINGS.en,
  items: [],
  timestamp: new Date(),
};

/* ─────────────────── sub-components ─────────────────── */

function RobotIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Headband / Headset arch */}
      <path d="M6 15C6 9.477 10.477 5 16 5C21.523 5 26 9.477 26 15" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Headphones */}
      <rect x="2" y="12" width="4" height="8" rx="2" fill="#f59e0b" />
      <rect x="26" y="12" width="4" height="8" rx="2" fill="#f59e0b" />
      
      {/* Antenna */}
      <line x1="16" y1="5" x2="16" y2="2" stroke="#f59e0b" strokeWidth="2.5" />
      <circle cx="16" cy="2" r="2" fill="#fbbf24" />
      
      {/* Main Head / Helmet */}
      <rect x="5" y="9" width="22" height="16" rx="8" fill="#ffffff" />
      
      {/* Visor Screen */}
      <rect x="8" y="12" width="16" height="10" rx="4" fill="#1e1b18" />
      
      {/* Glowing Eyes */}
      <circle cx="12" cy="17" r="2" fill="#f59e0b" />
      <circle cx="20" cy="17" r="2" fill="#f59e0b" />
      
      {/* Smile Mouth */}
      <path d="M12 20C13.5 21 18.5 21 20 20" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      <BotAvatar />
      <div
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px 18px 18px 4px',
          padding: '12px 16px',
          display: 'flex',
          gap: 5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'inline-block',
              animation: `kapiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
        boxShadow: '0 0 8px rgba(245,158,11,0.5)',
      }}
    >
      ☕
    </div>
  );
}

function MiniItemCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 120,
        maxWidth: 120,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 12,
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <img
        src={getImageForItem(item)}
        alt={item.name}
        style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }}
      />
      <div style={{ padding: '6px 8px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.name}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 11,
            color: '#f59e0b',
            fontWeight: 700,
          }}
        >
          ₹{item.price}
        </p>
      </div>
    </div>
  );
}

const parseInlineMarkdown = (str) => {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ color: '#fbbf24', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

function renderTable(headers, rows, key) {
  return (
    <div key={key} style={{ overflowX: 'auto', margin: '8px 0', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(0,0,0,0.2)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(245,158,11,0.14)', borderBottom: '1px solid rgba(245,158,11,0.25)' }}>
            {headers.map((h, idx) => (
              <th key={idx} style={{ padding: '6px 8px', color: '#fbbf24', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                borderBottom: rowIdx < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
              }}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} style={{ padding: '6px 8px', color: '#e2e8f0', lineHeight: 1.3 }}>{parseInlineMarkdown(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMessageText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableHeaders = null;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.replace(/[\s|:-]/g, '') === '') {
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        elements.push(renderTable(tableHeaders, tableRows, `table-${i}`));
        inTable = false;
        tableHeaders = null;
        tableRows = [];
      }

      if (line === '') {
        elements.push(<div key={`line-${i}`} style={{ height: '6px' }} />);
      } else {
        elements.push(
          <div key={`line-${i}`} style={{ margin: '3px 0', lineHeight: 1.5 }}>
            {parseInlineMarkdown(lines[i])}
          </div>
        );
      }
    }
  }

  if (inTable) {
    elements.push(renderTable(tableHeaders, tableRows, `table-${lines.length}`));
  }

  return <>{elements}</>;
}

function BotMessage({ msg, onSelectProduct, onSelectOption }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
      <BotAvatar />
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '18px 18px 18px 4px',
            padding: '10px 14px',
            color: '#e2e8f0',
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          {renderMessageText(msg.text)}
        </div>
        {msg.options && msg.options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {msg.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectOption?.(opt)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(245,158,11,0.35)',
                  background: 'rgba(245,158,11,0.08)',
                  color: '#fbbf24',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(245,158,11,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(245,158,11,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)';
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {msg.items && msg.items.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(245,158,11,0.3) transparent',
            }}
          >
            {msg.items.map((item, idx) => (
              <MiniItemCard key={item.id ?? idx} item={item} onClick={() => onSelectProduct?.(item)} />
            ))}
          </div>
        )}
        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', marginLeft: 4 }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 14,
      }}
    >
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '18px 18px 4px 18px',
            padding: '10px 14px',
            color: '#1a1a1a',
            fontSize: 13.5,
            fontWeight: 500,
            lineHeight: 1.55,
            boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
          }}
        >
          {msg.text}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', marginRight: 4 }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────── utils ─────────────────── */

function formatTime(ts) {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────── main component ─────────────────── */

export default function AIAssistant({ 
  user, 
  isOpen, 
  onClose, 
  onOpen, 
  menuItems, 
  onSelectProduct, 
  breakpoint = 'xl',
  startWithVoice = false,
  onResetStartWithVoice
}) {
  const screen = useScreenProfile(breakpoint);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [chatSessionId, setChatSessionId] = useState('');
  const [activeMode, setActiveMode] = useState('explorer');
  const [plannerStep, setPlannerStep] = useState(1);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let sess = localStorage.getItem('kapi_chat_session_id');
    if (!sess) {
      sess = 'sess_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('kapi_chat_session_id', sess);
    }
    setChatSessionId(sess);
  }, []);

  const getQuickReplies = () => {
    if (activeMode === 'explorer') {
      return [
        "I want my usual",
        "It's cold outside",
        "Vegetarian options",
        "Recommend a special"
      ];
    }
    return [];
  };

  const handleModeChange = async (mode) => {
    if (mode === activeMode) return;
    setActiveMode(mode);
    setIsTyping(true);
    setPlannerStep(1);
    
    if (mode === 'planner') {
      const initMsg = {
        id: 'init_planner',
        role: 'bot',
        text: "Welcome to **Meal Planner Mode**! 📋 Let's build your perfect custom meal combination under budget. \n\n**Step 1 of 5**: What is your mood now?",
        items: [],
        options: ["😀 Happy", "😢 Sad", "😠 Angry", "😨 Scared", "😌 Calm", "😴 Tired", "😕 Confused", "🤩 Excited"],
        timestamp: new Date(),
      };
      setMessages([initMsg]);
      try {
        await fetch(`${API_BASE}/api/ai/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id, session_id: chatSessionId, message: "plan mode", lang: selectedLang }),
        });
      } catch(e) {}
      setIsTyping(false);
    } else {
      const initMsg = {
        id: 'init_explorer',
        role: 'bot',
        text: "Namaste! ☕️ Switching back to **Explorer Mode** 🧭. I can help you find the perfect brew or snack. What can I get you today?",
        items: [],
        timestamp: new Date(),
      };
      setMessages([initMsg]);
      try {
        await fetch(`${API_BASE}/api/ai/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id, session_id: chatSessionId, message: "exit plan", lang: selectedLang }),
        });
      } catch(e) {}
      setIsTyping(false);
    }
  };

  const handleSelectOption = (optionText) => {
    const cleanOpt = optionText.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim().toLowerCase();
    if (cleanOpt.includes("meal planner") || cleanOpt === "planner" || cleanOpt === "plan mode") {
      handleModeChange('planner');
    } else if (cleanOpt.includes("explore menu") || cleanOpt.includes("explorer mode") || cleanOpt === "explorer") {
      handleModeChange('explorer');
    } else {
      sendMessage(optionText);
    }
  };

  /* Chat Memory */
  useEffect(() => {
    const saved = localStorage.getItem('kapi_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
          setHasGreeted(true);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('kapi_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  /* Voice Input */
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }
    const recognition = new SpeechRecognition();
    window._assistantRecognition = recognition;
    recognition.lang = selectedLang === 'hi' ? 'hi-IN' : (selectedLang === 'te' ? 'te-IN' : 'en-US');
    recognition.interimResults = false;
    recognition.continuous = false;
    
    let finalTranscript = '';
    
    recognition.onstart = () => {
      setIsListening(true);
      setInput('🎙️ Listening...');
    };
    
    recognition.onresult = (event) => {
      const currentTranscript = event.results[0][0].transcript;
      finalTranscript = currentTranscript;
      setInput(currentTranscript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setInput('');

      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access blocked! Please click the lock icon in your URL bar and allow microphone permissions.");
      } else {
        alert(`Voice error: ${event.error}. Please try again using Chrome or Edge browser.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      window._assistantRecognition = null;
      if (finalTranscript.trim()) {
        sendMessage(finalTranscript, true);
      } else {
        setInput('');
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Recognition start error:", err);
      setIsListening(false);
      setInput('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (window._assistantRecognition) {
        try { window._assistantRecognition.abort(); } catch(e){}
      }
      setIsListening(false);
      setInput('');
    } else {
      startListening();
    }
  };

  /* Auto start voice when requested */
  useEffect(() => {
    if (isOpen && startWithVoice) {
      const timer = setTimeout(() => {
        startListening();
        if (onResetStartWithVoice) onResetStartWithVoice();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startWithVoice]);

  /* reset greeting on each open */
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setMessages([{
        id: 'init',
        role: 'bot',
        text: GREETINGS[selectedLang] || GREETINGS['en'],
        items: [],
        timestamp: new Date()
      }]);
      setHasGreeted(true);
    }
    if (!isOpen) setHasGreeted(false);
  }, [isOpen, hasGreeted, selectedLang]);

  /* Update initial message dynamically if language is switched mid-session and no chats have occurred */
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'init') {
      setMessages([{
        id: 'init',
        role: 'bot',
        text: GREETINGS[selectedLang] || GREETINGS['en'],
        items: [],
        timestamp: messages[0].timestamp
      }]);
    }
  }, [selectedLang]);

  /* scroll to bottom on new message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* focus input when panel opens */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  async function sendMessage(text, isVoice = false) {
    if (!text.trim()) return;
    
    // Clean emojis & suffix helpers (e.g. "Veg 🌿" -> "Veg", "100 💰" -> "100")
    const cleanedText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
    
    const userMsg = { id: Date.now(), role: 'user', text: cleanedText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (activeMode === 'planner') {
      if (plannerStep === 1) setPlannerStep(2);
      else if (plannerStep === 2) setPlannerStep(3);
      else if (plannerStep === 3) setPlannerStep(4);
      else if (plannerStep === 4) setPlannerStep(5);
      else if (plannerStep === 5) setPlannerStep(1);
    }

    /* fire analytics in background */
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id,
        action_type: 'search',
        search_query: cleanedText,
      }),
    }).catch(() => {});

    try {
      const res = await fetch(`${API_BASE}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, session_id: chatSessionId, message: cleanedText, lang: selectedLang }),
      });
      const data = await res.json();
      setIsTyping(false);
      
      const replyText = data.reply ?? data.message ?? 'I couldn\'t understand that. Could you rephrase?';
      
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: replyText,
        items: data.items ?? [],
        options: activeMode === 'planner' ? (data.options ?? []) : [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      
      if (isVoice && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(replyText);
        
        const langMap = { te: 'te-IN', hi: 'hi-IN', en: 'en-US' };
        utterance.lang = langMap[data.lang] || 'en-US';
        
        // Select an advanced, friendly voice based on language
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;
        
        if (data.lang === 'hi') {
          selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi') && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.toLowerCase().startsWith('hi'));
        } else if (data.lang === 'te') {
          selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('te') && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.toLowerCase().startsWith('te'));
        } else {
          selectedVoice = voices.find(v => v.name.includes('Google UK English Female')) ||
                          voices.find(v => v.name.includes('Microsoft Zira') || v.name.includes('Samantha') || v.name.includes('Google US English')) ||
                          voices.find(v => v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.toLowerCase().startsWith('en'));
        }
                            
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        // Adjust pitch and rate to sound friendly, energetic, and advanced
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'bot',
          text: '⚠️ Oops! I seem to be having trouble connecting. Please try again in a moment.',
          items: [],
          timestamp: new Date(),
        },
      ]);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* keyframe injection */}
      <style>{`
        @keyframes kapiSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes kapiDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%           { transform: translateY(-8px); opacity: 1;   }
        }
        @keyframes kapiFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes kapiGlow {
          0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.4), 0 4px 20px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0), 0 4px 25px rgba(245, 158, 11, 0.3); }
        }
        @keyframes kapiTooltip {
          from { opacity: 0; transform: translateX(10px) scale(0.9); }
          to   { opacity: 0.95; transform: translateX(0)   scale(1);   }
        }
        @keyframes kapiPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .kapi-ai-scrollbar::-webkit-scrollbar { width: 4px; }
        .kapi-ai-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .kapi-ai-scrollbar::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); border-radius: 4px; }
        .kapi-ai-input::placeholder { color: rgba(148,163,184,0.5); }
        .kapi-chip:hover { background: rgba(245,158,11,0.2) !important; border-color: rgba(245,158,11,0.5) !important; }
        .kapi-send:hover { background: linear-gradient(135deg,#fbbf24,#d97706) !important; transform: scale(1.08); }
        .kapi-close:hover { background: rgba(255,255,255,0.12) !important; }
        .kapi-float-btn {
          border: 2px solid rgba(245,158,11,0.4) !important;
          background: linear-gradient(135deg, #1e1b18 0%, #0a0702 100%) !important;
        }
        .kapi-float-btn:hover {
          transform: scale(1.08);
          border-color: rgba(245,158,11,0.8) !important;
          background: linear-gradient(135deg, #2a2520 0%, #0f0b08 100%) !important;
        }
        .kapi-float-btn:hover + .kapi-tooltip {
          opacity: 1 !important;
          transform: translateX(0) scale(1.03) !important;
        }
      `}</style>

      {/* panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Kapi Adda AI Assistant"
          style={{
            position: 'fixed',
            bottom: breakpoint === 'xs' ? 80 : breakpoint === 'sm' ? 18 : 24,
            right: screen.compact ? 12 : 24,
            left: breakpoint === 'xs' ? 12 : 'auto',
            width: breakpoint === 'xs' ? 'calc(100vw - 24px)' : breakpoint === 'sm' ? 'min(420px, calc(100vw - 24px))' : breakpoint === 'md' ? 440 : breakpoint === 'lg' ? 400 : 440,
            height: breakpoint === 'xs' ? 'calc(100vh - 118px)' : breakpoint === 'sm' ? 'min(620px, calc(100vh - 48px))' : breakpoint === 'md' ? 560 : breakpoint === 'lg' ? 540 : 600,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100vh - 32px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            background: 'rgba(15,15,20,0.92)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(245,158,11,0.08)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))', borderBottom: '1px solid rgba(245,158,11,0.15)', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#1a1a1a', flexShrink: 0 }}>
              KA
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fef3c7' }}>Kapi Adda AI Assistant</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>Online - Powered by AI</p>
            </div>
            <button id="kapi-ai-close-btn" className="kapi-close" onClick={onClose} aria-label="Close AI Assistant" style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              x
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px',
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            {[
              { id: 'explorer', label: 'Explorer Mode' },
              { id: 'planner', label: 'Plan Mode' },
            ].map((mode) => {
              const active = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: breakpoint === 'xs' ? '8px 6px' : '8px 12px',
                    borderRadius: 12,
                    border: active ? '1px solid rgba(245,158,11,0.35)' : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))'
                      : 'transparent',
                    color: active ? '#fbbf24' : '#94a3b8',
                    fontSize: breakpoint === 'xs' ? 11 : 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="kapi-ai-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 4px', minHeight: 0 }}>
            {messages.map((msg) =>
              msg.role === 'bot' ? (
                <BotMessage key={msg.id} msg={msg} onSelectProduct={onSelectProduct} onSelectOption={handleSelectOption} />
              ) : (
                <UserMessage key={msg.id} msg={msg} />
              )
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 14px 4px', scrollbarWidth: 'none', flexShrink: 0 }}>
            {getQuickReplies().map((chip) => (
              <button key={chip} className="kapi-chip" onClick={() => sendMessage(chip)} style={{ whiteSpace: 'nowrap', padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontSize: 11.5, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>
                {chip}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <input ref={inputRef} id="kapi-ai-input" className="kapi-ai-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask me anything about our menu..." disabled={isTyping} aria-label="Chat message input" style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', color: '#e2e8f0', fontSize: 13.5, outline: 'none', fontFamily: 'inherit' }} />
            <button id="kapi-ai-send-btn" className="kapi-send" onClick={() => input.trim() && sendMessage(input)} disabled={!input.trim() || isTyping} aria-label="Send message" style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: input.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)', color: input.trim() ? '#1a1a1a' : 'rgba(255,255,255,0.3)', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
              &gt;
            </button>
          </div>
        </div>
      )}

      {/* Floating Chatbot Widget Trigger */}
      {!isOpen && onOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: screen.compact ? 16 : 24,
            right: screen.compact ? 16 : 24,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            animation: 'kapiFloat 3s ease-in-out infinite',
          }}
        >
          {/* Trigger Button */}
          <button
            onClick={onOpen}
            className="kapi-float-btn"
            aria-label="Open AI Assistant"
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'kapiGlow 2s infinite',
              padding: 0,
            }}
          >
            <RobotIcon />
          </button>

          {/* Tooltip speech bubble */}
          <div
            className="kapi-tooltip"
            style={{
              position: 'absolute',
              right: screen.compact ? 68 : 76,
              background: 'rgba(15, 15, 20, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#fef3c7',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '16px 16px 0 16px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(245,158,11,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              pointerEvents: 'none',
              transformOrigin: 'right center',
              animation: 'kapiTooltip 0.4s 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}
          >
            <span style={{ fontSize: 13 }}>☕</span> Ask Kapi AI!
          </div>
        </div>
      )}
    </>
  );
}
