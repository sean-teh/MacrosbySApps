import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Utensils, 
  CalendarDays, 
  Settings, 
  Check, 
  Edit2, 
  RefreshCw,
  Plus,
  X,
  Bot,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  MessageSquare,
  Trash2,
  Camera,
  Image as ImageIcon,
  Download,
  Upload,
  Copy,
  ClipboardPaste
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- Cloud Database Setup ---

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRiUjcHnpyf_8T2rWUiJwDSGL2adQCRz0",
  authDomain: "macrostrackersapps.firebaseapp.com",
  projectId: "macrostrackersapps",
  storageBucket: "macrostrackersapps.firebasestorage.app",
  messagingSenderId: "502665750399",
  appId: "1:502665750399:web:7fa95930acaf41894edc4a",
  measurementId: "G-E5MX5XPT9H"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Custom App Logo ---
const APP_LOGO_SRC = "/logo.png";

// --- Mock AI Fallback ---
const mockEstimate = (text) => {
  const words = text.split(' ');
  const baseName = words.length > 0 ? words.slice(0, 3).join(' ') : "Unknown Food";
  return {
    name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
    calories: Math.floor(Math.random() * 400) + 150,
    protein: Math.floor(Math.random() * 40) + 5,
    fibre: Math.floor(Math.random() * 15) + 1,
    reasoning: "Mock reasoning: Assumed a standard 1-cup portion size based on typical generic recipes."
  };
};

// --- Animation Components ---
const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    const duration = 800; // 0.8 seconds to count up
    const startValue = displayValue;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // easeOutQuart formula for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(startValue + (value - startValue) * easeOutQuart);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <>{Number.isInteger(value) ? Math.round(displayValue) : displayValue.toFixed(1)}</>;
};

export default function App() {
  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const todayStr = formatDate(new Date());

  // --- State ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logDate, setLogDate] = useState(todayStr);
  
  const [logs, setLogs] = useState([]); 
  const [goals, setGoals] = useState({ calories: 2000, protein: 120, fibre: 30 });
  const [currentDate, setCurrentDate] = useState(new Date());

  // Cloud User State
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  // --- Cloud Data Sync ---
  // 1. Authenticate User
  useEffect(() => {
    const initAuth = async () => {
      await auth.authStateReady();
      if (!auth.currentUser) {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      }
      // Add a tiny artificial delay to ensure smooth transition from splash screen
      setTimeout(() => setIsInitializing(false), 600);
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Sync Real-time Data
  useEffect(() => {
    if (!user) return;

    // Listen to Logs
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'logs');
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      const fetchedLogs = [];
      snapshot.forEach(doc => fetchedLogs.push(doc.data()));
      // Sort newest to oldest
      setLogs(fetchedLogs.sort((a,b) => b.id.localeCompare(a.id)));
    }, (error) => console.error("Error fetching logs:", error));

    // Listen to Goals
    const goalsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'goals', 'daily');
    const unsubGoals = onSnapshot(goalsRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoals(docSnap.data());
      }
    }, (error) => console.error("Error fetching goals:", error));

    return () => {
      unsubLogs();
      unsubGoals();
    };
  }, [user]);

  // AI Entry State
  const [promptInput, setPromptInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState(null); // { name, calories, protein, fibre, reasoning }
  const [chatHistory, setChatHistory] = useState([]);
  const [refineInput, setRefineInput] = useState('');
  const [aiError, setAiError] = useState(false);

  // Calendar Modal State
  const [selectedDate, setSelectedDate] = useState(null);

  // Edit Log State
  const [editingLog, setEditingLog] = useState(null);
  const [logToDelete, setLogToDelete] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // AI Coach & Suggestions State
  const [dailyInsight, setDailyInsight] = useState(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState(null);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);

  // Backup State
  const [backupMessage, setBackupMessage] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteData, setPasteData] = useState('');

  // --- Auth Handlers ---
  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign In Error", error);
      if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized-domain')) {
        setAuthError("Google Sign-In is restricted in this preview sandbox for security. It will work perfectly once you host the app on your own domain (like Vercel or Squarespace). Please use the Backup feature for now!");
      } else {
        setAuthError("Failed to sign in with Google. Please try again.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Sign Out Error", error);
    }
  };

  // --- Helpers ---
  const fetchWithRetry = async (url, options) => {
    const delays = [1000, 2000, 4000, 8000, 16000]; // Retries with increasing delays
    for (let i = 0; i < delays.length; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`Client Error: ${response.status}`);
        }
        
        if (i === delays.length - 1) throw new Error(`API Error: ${response.status}`);
      } catch (error) {
        if (error.message.startsWith('Client Error')) throw error;
        if (i === delays.length - 1) throw error;
      }
      await new Promise(res => setTimeout(res, delays[i]));
    }
  };

  const getTotalsForDate = (dateStr) => {
    const dayLogs = logs.filter(log => log.date === dateStr);
    const totals = dayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + Number(log.calories),
        protein: acc.protein + Number(log.protein),
        fibre: acc.fibre + Number(log.fibre)
      }),
      { calories: 0, protein: 0, fibre: 0 }
    );
    
    return {
      calories: Number(totals.calories.toFixed(1)),
      protein: Number(totals.protein.toFixed(1)),
      fibre: Number(totals.fibre.toFixed(1))
    };
  };

  const getColorClass = (type, value, goal) => {
    if (type === 'calories') {
      return value <= goal ? 'text-emerald-500' : 'text-rose-500';
    } else {
      return value >= goal ? 'text-emerald-500' : 'text-rose-500';
    }
  };

  const getBgColorClass = (type, value, goal) => {
    if (type === 'calories') {
      return value <= goal ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
    } else {
      return value >= goal ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
    }
  };

  // --- Image Handling ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setImageBase64(base64String.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
  };

  // --- AI Integration ---
// Replace ONLY the apiKey and url lines. Keep everything from systemInstruction downwards exactly the same.

// --- AI Integration ---
const generateEstimate = async (text, isRefinement = false) => {
  setIsGenerating(true);
  setAiError(false);

  const url = '/api/gemini';

  const systemInstruction = "You are a precise nutrition expert. Estimate the nutritional content...
  // ... rest of the function remains untouched
  
    const newHistory = [...chatHistory];
    if (isRefinement && draft) {
      newHistory.push({ role: "model", parts: [{ text: JSON.stringify(draft) }] });
    }
    
    const userParts = [];
    if (text) userParts.push({ text });
    if (!text && imageBase64 && !isRefinement) userParts.push({ text: "Estimate the macros for this food." });
    
    if (imageBase64 && !isRefinement) {
      userParts.push({ inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } });
    }

    newHistory.push({ role: "user", parts: userParts });

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: newHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            calories: { type: "NUMBER" },
            protein: { type: "NUMBER" },
            fibre: { type: "NUMBER" },
            reasoning: { type: "STRING" }
          },
          required: ["name", "calories", "protein", "fibre", "reasoning"]
        }
      }
    };

    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) throw new Error("Empty response");

      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      
      if (result.calories !== undefined) result.calories = Number(Number(result.calories).toFixed(1));
      if (result.protein !== undefined) result.protein = Number(Number(result.protein).toFixed(1));
      if (result.fibre !== undefined) result.fibre = Number(Number(result.fibre).toFixed(1));
      
      setDraft(result);
      setChatHistory(newHistory);
      
    } catch (error) {
      console.warn("AI generation failed after retries, using mock data:", error);
      setAiError(true);
      setDraft(mockEstimate(text));
      setChatHistory(newHistory);
    } finally {
      setIsGenerating(false);
      setPromptInput('');
      setRefineInput('');
    }
  };

  const handleSaveDraft = async () => {
    if (!draft || !user) return;
    
    const newLog = {
      id: crypto.randomUUID(),
      date: logDate,
      name: draft.name || 'Unnamed Food',
      calories: Number(Number(draft.calories || 0).toFixed(1)),
      protein: Number(Number(draft.protein || 0).toFixed(1)),
      fibre: Number(Number(draft.fibre || 0).toFixed(1))
    };

    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', newLog.id), newLog);
    
    setDraft(null);
    setChatHistory([]);
    removeImage();
    setLogDate(todayStr);
    setActiveTab(logDate === todayStr ? 'dashboard' : 'calendar');
  };

  const cancelDraft = () => {
    setDraft(null);
    setChatHistory([]);
    setPromptInput('');
    setRefineInput('');
    removeImage();
  };

  const confirmDelete = async () => {
    if (!user || !logToDelete) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', logToDelete));
    setLogToDelete(null);
  };

  const saveEditedLog = async () => {
    if (!editingLog || !user) return;
    
    const updatedLog = {
      ...editingLog,
      calories: Number(Number(editingLog.calories).toFixed(1)),
      protein: Number(Number(editingLog.protein).toFixed(1)),
      fibre: Number(Number(editingLog.fibre).toFixed(1))
    };

    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', updatedLog.id), updatedLog);
    setEditingLog(null);
  };

  const generateDailyInsight = async () => {
    setIsGeneratingInsight(true);
const url = '/api/gemini';

    const totals = getTotalsForDate(todayStr);
    const todayLogs = logs.filter(l => l.date === todayStr);
    
    const systemInstruction = "You are a supportive, concise nutrition coach. Look at the user's totals vs goals and the foods they ate today. Provide a 2-sentence encouraging insight or tip. Be positive. Return ONLY a valid JSON object with a single key: 'message' (string).";
    
    const prompt = `Goals: ${goals.calories}kcal, ${goals.protein}g protein, ${goals.fibre}g fibre. 
    Current Totals: ${totals.calories}kcal, ${totals.protein}g protein, ${totals.fibre}g fibre.
    Foods eaten today: ${todayLogs.map(l => l.name).join(', ') || 'None yet'}.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { message: { type: "STRING" } } }
      }
    };

    try {
      const response = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      const responseText = data.candidates[0].content.parts[0].text;
      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      
      setDailyInsight(result.message);
    } catch (error) {
      setDailyInsight("You're doing great! Keep logging your meals to stay on track. (Mock Insight)");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const generateMealSuggestions = async () => {
    setIsGeneratingMeals(true);
 const url = '/api/gemini';

    const totals = getTotalsForDate(todayStr);
    const remCal = Math.max(0, goals.calories - totals.calories);
    const remPro = Math.max(0, goals.protein - totals.protein);
    const remFib = Math.max(0, goals.fibre - totals.fibre);

    const systemInstruction = "You are a helpful nutritionist. Suggest 2 simple meals/snacks that perfectly fit the user's remaining macros. Return ONLY a valid JSON object with a key 'suggestions' containing an array of objects. Each object must have 'name' (string) and 'description' (string, including estimated macros).";
    const prompt = `Remaining macros for today: ${remCal} kcal, ${remPro}g protein, ${remFib}g fibre. Suggest 2 quick meals.`;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            suggestions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: { name: { type: "STRING" }, description: { type: "STRING" } }
              }
            }
          }
        }
      }
    };

    try {
      const response = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      const responseText = data.candidates[0].content.parts[0].text;
      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanText);
      
      setMealSuggestions(result.suggestions);
    } catch (error) {
      setMealSuggestions([
        { name: "Mock Protein Shake", description: "A simple whey protein shake with water. ~120 kcal, 25g P, 0g F" },
        { name: "Mock Greek Yogurt & Berries", description: "1 cup greek yogurt with raspberries. ~180 kcal, 20g P, 8g F" }
      ]);
    } finally {
      setIsGeneratingMeals(false);
    }
  };

  // --- Views ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-out fade-out duration-500">
         <img src={APP_LOGO_SRC} alt="Logo" className="h-24 w-auto object-contain mb-6 animate-pulse" />
         <RefreshCw className="animate-spin text-[#F4826A]" size={28} />
         <p className="mt-4 text-sm font-semibold text-gray-500 tracking-widest uppercase">Loading Macros...</p>
      </div>
    );
  }

  // Refactored to a regular function instead of a Component so state isn't destroyed on parent render
  const renderMacroCard = (title, value, goal, type, unit) => {
    const color = getColorClass(type, value, goal);
    const bg = getBgColorClass(type, value, goal);
    const isSuccess = color.includes('emerald');

    return (
      <div key={type} className={`p-4 rounded-2xl border ${bg} transition-all duration-500 ${isSuccess ? 'shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.02]' : ''}`}>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-1">{title}</h3>
        <div className="flex items-end gap-2">
          <span className={`text-3xl font-bold ${color}`}>
            <AnimatedNumber value={value} />
          </span>
          <span className="text-gray-500 mb-1 font-medium">/ {goal}{unit}</span>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const totals = getTotalsForDate(todayStr);
    const todayLogs = logs.filter(l => l.date === todayStr);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {renderMacroCard("Calories", totals.calories, goals.calories, "calories", "kcal")}
          {renderMacroCard("Protein", totals.protein, goals.protein, "protein", "g")}
          {renderMacroCard("Fibre", totals.fibre, goals.fibre, "fibre", "g")}
        </div>

        {/* --- AI Coach Section --- */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h2 className="font-semibold text-indigo-900 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" /> Daily Coach Insight
            </h2>
            <button 
              onClick={generateDailyInsight}
              disabled={isGeneratingInsight}
              className="text-xs font-medium bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-1"
            >
              {isGeneratingInsight ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
              {dailyInsight ? "Update Insight" : "Get Insight"}
            </button>
          </div>
          {dailyInsight ? (
            <p className="text-sm text-indigo-800 leading-relaxed animate-in fade-in slide-in-from-top-2">{dailyInsight}</p>
          ) : (
            <p className="text-sm text-indigo-400 italic">Click to see what your AI Coach thinks about your day so far.</p>
          )}
        </div>

        {/* --- AI Meal Suggestions --- */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-3">
            <h2 className="font-semibold text-orange-900 flex items-center gap-2">
              <Utensils size={18} className="text-orange-600" /> Need Ideas?
            </h2>
            <button 
              onClick={generateMealSuggestions}
              disabled={isGeneratingMeals}
              className="text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-1"
            >
              {isGeneratingMeals ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Suggest Meals
            </button>
          </div>
          
          {!mealSuggestions ? (
            <p className="text-sm text-orange-600/70 italic">Get AI suggestions to hit your remaining macro goals today.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {mealSuggestions.map((meal, idx) => (
                <div key={idx} className="bg-white/60 p-3 rounded-xl border border-orange-200/50 animate-in fade-in slide-in-from-left-4 duration-300" style={{animationDelay: `${idx * 100}ms`}}>
                  <h4 className="font-semibold text-orange-900 text-sm mb-1">{meal.name}</h4>
                  <p className="text-xs text-orange-800">{meal.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Today's Entries</h2>
            <button 
              onClick={() => {
                setLogDate(todayStr);
                setActiveTab('log');
              }}
              className="text-sm font-medium text-[#F4826A] flex items-center gap-1 hover:text-[#E07058] transition-all active:scale-95"
            >
              <Plus size={16} /> Add Food
            </button>
          </div>
          
          {todayLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Utensils className="mx-auto mb-2 opacity-50" size={32} />
              <p>No food logged today yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayLogs.map((log, idx) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-gray-50 transition-colors gap-2 animate-in fade-in slide-in-from-left-2 duration-300" style={{animationDelay: `${idx * 50}ms`}}>
                  <div>
                    <p className="font-medium text-gray-900">{log.name}</p>
                    <p className="text-xs text-gray-500 mt-1 flex gap-3">
                      <span>🔥 {log.calories} kcal</span>
                      <span>🥩 {log.protein}g</span>
                      <span>🌾 {log.fibre}g</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button 
                      onClick={() => setEditingLog(log)}
                      className="p-2 text-gray-400 hover:text-[#F4826A] hover:bg-[#F4826A]/10 rounded-lg transition-all active:scale-95"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setLogToDelete(log.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLogFood = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log Food</h1>
            <p className="text-gray-500 text-sm">Describe what you ate or upload a photo.</p>
          </div>
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider">Logging for Date</label>
            <input 
              type="date" 
              value={logDate}
              max={todayStr}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full sm:w-auto p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-[#F4826A] shadow-sm transition-all"
            />
          </div>
        </header>

        {!draft ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all">
            <div className="relative">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g., 'A large bowl of chicken fried rice' or just upload a photo..."
                className="w-full h-32 p-3 pb-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F4826A] focus:border-[#F4826A] outline-none resize-none transition-all"
              />
              
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <label className="cursor-pointer bg-white text-gray-600 hover:text-[#F4826A] p-2 rounded-lg border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold">
                  <Camera size={16} />
                  <span>Photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {imagePreview && (
              <div className="mt-4 relative inline-block animate-in fade-in zoom-in duration-300">
                <img 
                  src={imagePreview} 
                  alt="Food preview" 
                  className="h-32 w-auto object-cover rounded-xl border border-gray-200 shadow-sm"
                />
                <button 
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-gray-900 text-white p-1 rounded-full hover:bg-rose-600 transition-all active:scale-90 shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <button
              onClick={() => generateEstimate(promptInput)}
              disabled={(!promptInput.trim() && !imageBase64) || isGenerating}
              className="mt-6 w-full bg-[#F4826A] hover:bg-[#E07058] disabled:bg-[#F4826A]/50 text-white font-semibold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] shadow-sm"
            >
              {isGenerating ? (
                <><RefreshCw className="animate-spin" size={20} /> Analyzing...</>
              ) : (
                <><Bot size={20} /> AI Guesstimate</>
              )}
            </button>

            <div className="relative mt-5 mb-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400 font-medium">or</span>
              </div>
            </div>

            <button
              onClick={() => setDraft({ name: promptInput || '', calories: '', protein: '', fibre: '' })}
              className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm"
            >
              <Edit2 size={18} className="text-gray-500" /> Manually Log Entry
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#F4826A]/20 rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#F4826A]/10 border-b border-[#F4826A]/20 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#d6654e] font-semibold">
                <Edit2 size={18} /> Review Draft
              </div>
              {aiError && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium flex items-center gap-1 animate-pulse">
                  <Info size={12}/> Mock Data (AI Unavailable)
                </span>
              )}
            </div>
            
            <div className="p-5 space-y-4">
              {draft.reasoning && (
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs p-3 rounded-xl flex items-start gap-2 leading-relaxed shadow-sm mb-4 animate-in slide-in-from-top-2 fade-in">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-indigo-600" />
                  <p><strong>AI Insight:</strong> {draft.reasoning}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Food Name</label>
                <input 
                  type="text" 
                  value={draft.name || ''}
                  onChange={(e) => setDraft({...draft, name: e.target.value})}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none font-medium text-gray-900 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Calories</label>
                  <input 
                    type="number" 
                    value={draft.calories ?? ''}
                    onChange={(e) => setDraft({...draft, calories: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Protein (g)</label>
                  <input 
                    type="number" 
                    value={draft.protein ?? ''}
                    onChange={(e) => setDraft({...draft, protein: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fibre (g)</label>
                  <input 
                    type="number" 
                    value={draft.fibre ?? ''}
                    onChange={(e) => setDraft({...draft, fibre: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
              </div>

              <hr className="border-gray-100 my-4" />
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Refine Estimate (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    placeholder="e.g., 'Actually it had a lot of oil'"
                    className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-sm transition-all"
                  />
                  <button
                    onClick={() => generateEstimate(refineInput, true)}
                    disabled={!refineInput.trim() || isGenerating}
                    className="bg-[#F4826A] hover:bg-[#E07058] text-white px-4 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGenerating ? '...' : 'Update'}
                  </button>
                </div>
                
                <div className="relative mt-5 mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-400 font-medium">or</span>
                  </div>
                </div>

                <button
                  onClick={cancelDraft}
                  className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg flex justify-center items-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm text-sm"
                >
                  <RefreshCw size={14} className="text-gray-500" /> Estimate another from scratch
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={cancelDraft}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveDraft}
                  className="flex-1 py-3 px-4 bg-[#F4826A] text-white font-semibold rounded-xl hover:bg-[#E07058] transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-sm"
                >
                  <Check size={20} /> Accept & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    // Generate calendar grid
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const prevYear = () => setCurrentDate(new Date(year - 1, month, 1));
    const nextYear = () => setCurrentDate(new Date(year + 1, month, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const renderDayCell = (dayNumber) => {
      if (!dayNumber) return <div className="p-2 border border-transparent"></div>;
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      const dayTotals = getTotalsForDate(dateStr);
      const hasLogs = logs.some(l => l.date === dateStr);
      const isToday = dateStr === todayStr;

      return (
        <div 
          onClick={() => setSelectedDate(dateStr)}
          className={`relative p-1 sm:p-2 aspect-square border rounded-xl flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.05] active:scale-95 ${
            hasLogs ? 'bg-white hover:shadow-md border-gray-200' : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:border-gray-200'
          } ${isToday ? 'ring-2 ring-[#F4826A] ring-offset-1' : ''}`}
        >
          <span className={`text-xs font-semibold ${isToday ? 'text-[#F4826A]' : ''}`}>{dayNumber}</span>
          
          {hasLogs && (
            <div className="space-y-[2px] mt-1 text-[9px] sm:text-[10px] font-medium tracking-tight">
              <div className={`truncate ${getColorClass('calories', dayTotals.calories, goals.calories)}`}>
                C:{dayTotals.calories}
              </div>
              <div className={`truncate ${getColorClass('protein', dayTotals.protein, goals.protein)}`}>
                P:{dayTotals.protein}
              </div>
              <div className={`truncate ${getColorClass('fibre', dayTotals.fibre, goals.fibre)}`}>
                F:{dayTotals.fibre}
              </div>
            </div>
          )}
        </div>
      );
    };

    const cells = [];
    for (let i = 0; i < startingDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    // Pad end of grid
    while (cells.length % 7 !== 0) cells.push(null);

    // --- Monthly & Yearly Stats Calculations ---
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => l.date.startsWith(monthPrefix));
    const uniqueDaysInMonth = new Set(monthLogs.map(l => l.date)).size;

    const monthTotals = monthLogs.reduce((acc, log) => ({
        calories: acc.calories + Number(log.calories),
        protein: acc.protein + Number(log.protein),
        fibre: acc.fibre + Number(log.fibre)
    }), { calories: 0, protein: 0, fibre: 0 });

    const monthlyAverages = {
        calories: uniqueDaysInMonth ? Math.round(monthTotals.calories / uniqueDaysInMonth) : 0,
        protein: uniqueDaysInMonth ? Math.round(monthTotals.protein / uniqueDaysInMonth) : 0,
        fibre: uniqueDaysInMonth ? Math.round(monthTotals.fibre / uniqueDaysInMonth) : 0,
    };

    const yearPrefix = `${year}-`;
    const yearLogs = logs.filter(l => l.date.startsWith(yearPrefix));
    const uniqueDaysInYear = new Set(yearLogs.map(l => l.date)).size;

    const yearCalories = yearLogs.reduce((sum, log) => sum + Number(log.calories), 0);
    const yearGoalCalories = uniqueDaysInYear * goals.calories;
    const yearSurplusDeficit = Math.round(yearCalories - yearGoalCalories);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 w-full sm:w-auto">History</h1>
          
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl sm:rounded-full shadow-sm border border-gray-100 w-full sm:w-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={prevYear} className="p-2 hover:bg-gray-100 rounded-xl sm:rounded-full text-gray-400 hover:text-gray-700 transition-all active:scale-90" title="Previous Year">
                <ChevronsLeft size={20}/>
              </button>
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl sm:rounded-full text-gray-600 transition-all active:scale-90" title="Previous Month">
                <ChevronLeft size={20}/>
              </button>
            </div>
            
            <span className="font-bold text-gray-800 text-sm sm:text-base min-w-[130px] text-center select-none tracking-wide animate-in fade-in zoom-in duration-300" key={`${month}-${year}`}>
              {monthNames[month]} {year}
            </span>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl sm:rounded-full text-gray-600 transition-all active:scale-90" title="Next Month">
                <ChevronRight size={20}/>
              </button>
              <button onClick={nextYear} className="p-2 hover:bg-gray-100 rounded-xl sm:rounded-full text-gray-400 hover:text-gray-700 transition-all active:scale-90" title="Next Year">
                <ChevronsRight size={20}/>
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 animate-in fade-in duration-500" key={`${month}-${year}-grid`}>
            {cells.map((day, idx) => <React.Fragment key={idx}>{renderDayCell(day)}</React.Fragment>)}
          </div>
        </div>

        {/* --- Monthly & Yearly Stats UI --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transition-all hover:shadow-md">
            <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider text-center">{monthNames[month]} Daily Averages</h3>
            <div className="grid grid-cols-3 gap-2" key={`${month}-${year}-averages`}>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Calories</div>
                <div className={`font-bold ${getColorClass('calories', monthlyAverages.calories, goals.calories)}`}>
                  <AnimatedNumber value={monthlyAverages.calories} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Protein</div>
                <div className={`font-bold ${getColorClass('protein', monthlyAverages.protein, goals.protein)}`}>
                  <AnimatedNumber value={monthlyAverages.protein} />g
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Fibre</div>
                <div className={`font-bold ${getColorClass('fibre', monthlyAverages.fibre, goals.fibre)}`}>
                  <AnimatedNumber value={monthlyAverages.fibre} />g
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{year} Calorie Balance</h3>
              <div className="group relative flex items-center justify-center">
                <Info size={14} className="text-gray-400 hover:text-[#F4826A] transition-colors cursor-help" />
                <div className="absolute bottom-full mb-2 w-56 bg-gray-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 text-center font-medium leading-relaxed normal-case scale-95 group-hover:scale-100">
                  Blank days are void. They are ignored and do not add or subtract from your yearly balance.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mb-2 font-medium">vs. {goals.calories} kcal goal on logged days</p>
            <div className={`text-2xl font-black tracking-tight ${yearSurplusDeficit > 0 ? 'text-rose-500' : yearSurplusDeficit < 0 ? 'text-emerald-500' : 'text-gray-900'}`}>
              {yearSurplusDeficit > 0 ? '+' : ''}<AnimatedNumber value={yearSurplusDeficit} /> kcal
            </div>
            <div className={`text-[10px] font-bold uppercase mt-1 ${yearSurplusDeficit > 0 ? 'text-rose-400' : yearSurplusDeficit < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {yearSurplusDeficit > 0 ? 'Surplus' : yearSurplusDeficit < 0 ? 'Deficit' : 'Balanced'}
            </div>
          </div>
        </div>

        {/* Date Detail Modal */}
        {selectedDate && (
          <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-200 rounded-full transition-all active:scale-90 text-gray-500">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {['calories', 'protein', 'fibre'].map(type => {
                    const val = getTotalsForDate(selectedDate)[type];
                    const goal = goals[type];
                    return (
                      <div key={type} className={`p-3 rounded-xl border text-center transition-all ${getBgColorClass(type, val, goal)}`}>
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{type}</div>
                        <div className={`text-xl font-bold ${getColorClass(type, val, goal)}`}>{val}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Entries</h4>
                  <button 
                    onClick={() => {
                      setLogDate(selectedDate);
                      setSelectedDate(null);
                      setActiveTab('log');
                    }}
                    className="text-xs font-bold text-[#F4826A] bg-[#F4826A]/10 hover:bg-[#F4826A]/20 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={14} /> Add to Day
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {logs.filter(l => l.date === selectedDate).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4 italic animate-in fade-in">No food logged on this date.</p>
                  ) : logs.filter(l => l.date === selectedDate).map((log, idx) => (
                    <div key={log.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300" style={{animationDelay: `${idx * 50}ms`}}>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm mb-1">{log.name}</p>
                        <div className="flex gap-3 text-xs text-gray-600 font-medium">
                          <span>{log.calories} kcal</span>
                          <span>{log.protein}g protein</span>
                          <span>{log.fibre}g fibre</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button onClick={() => setEditingLog(log)} className="p-1.5 text-gray-400 hover:text-[#F4826A] hover:bg-[#F4826A]/10 rounded-md transition-all active:scale-90"><Edit2 size={14} /></button>
                        <button onClick={() => setLogToDelete(log.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all active:scale-90"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const handleGoalChange = async (e, field) => {
      if (!user) return;
      const newGoals = { ...goals, [field]: Number(e.target.value) };
      setGoals(newGoals); // Update UI instantly
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', 'daily'), newGoals); // Save to cloud
    };

    const handleExport = () => {
      const data = { logs, goals };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-macros-backup-${todayStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMessage('Backup downloaded successfully!');
      setTimeout(() => setBackupMessage(''), 3000);
    };

    const handleImport = async (e) => {
      const file = e.target.files[0];
      if (!file || !user) return;

      setBackupMessage('Restoring data...');
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          // Restore Goals
          if (data.goals) {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', 'daily'), data.goals);
          }
          
          // Restore Logs
          if (data.logs && Array.isArray(data.logs)) {
            for (const log of data.logs) {
              await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', log.id), log);
            }
          }
          setBackupMessage('Data restored successfully!');
        } catch (err) {
          console.error(err);
          setBackupMessage('Error: Invalid backup file.');
        }
        setTimeout(() => setBackupMessage(''), 3000);
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
    };

    const handleCopyData = () => {
      const data = { logs, goals };
      const jsonString = JSON.stringify(data);
      
      const textArea = document.createElement("textarea");
      textArea.value = jsonString;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setBackupMessage('Data copied to clipboard!');
      } catch (err) {
        setBackupMessage('Error: Could not copy.');
      }
      document.body.removeChild(textArea);
      setTimeout(() => setBackupMessage(''), 3000);
    };

    const handlePasteImport = async () => {
      if (!pasteData || !user) return;
      setBackupMessage('Restoring data...');
      try {
        const data = JSON.parse(pasteData);
        if (data.goals) {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'goals', 'daily'), data.goals);
        }
        if (data.logs && Array.isArray(data.logs)) {
          for (const log of data.logs) {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', log.id), log);
          }
        }
        setBackupMessage('Data restored successfully!');
        setPasteData('');
        setShowPasteArea(false);
      } catch (err) {
        console.error(err);
        setBackupMessage('Error: Invalid backup text.');
      }
      setTimeout(() => setBackupMessage(''), 3000);
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Configure your daily targets.</p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
          <div className="p-5 space-y-5">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Daily Goals</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Calories Limit (kcal)</label>
              <p className="text-xs text-gray-500 mb-2">Stay under this limit for a green status.</p>
              <input 
                type="number" 
                value={goals.calories ?? ''}
                onChange={(e) => handleGoalChange(e, 'calories')}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F4826A] outline-none font-semibold transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Protein Goal (g)</label>
              <p className="text-xs text-gray-500 mb-2">Exceed this goal for a green status.</p>
              <input 
                type="number" 
                value={goals.protein ?? ''}
                onChange={(e) => handleGoalChange(e, 'protein')}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F4826A] outline-none font-semibold transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fibre Goal (g)</label>
              <p className="text-xs text-gray-500 mb-2">Exceed this goal for a green status.</p>
              <input 
                type="number" 
                value={goals.fibre ?? ''}
                onChange={(e) => handleGoalChange(e, 'fibre')}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F4826A] outline-none font-semibold transition-all"
              />
            </div>
          </div>
        </div>

        {/* --- Account & Sync --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 transition-all hover:shadow-md">
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Account & Sync</h3>
            {user && user.isAnonymous ? (
              <div className="animate-in fade-in">
                <p className="text-sm text-gray-500 mb-3">You are currently using a temporary guest session. Sign in with Google to permanently save and sync your data across devices.</p>
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#F4826A] text-white font-semibold rounded-xl hover:bg-[#E07058] transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  Sign in with Google
                </button>
                {authError && <p className="text-xs text-rose-500 mt-2 font-medium animate-in fade-in">{authError}</p>}
              </div>
            ) : user ? (
              <div className="animate-in fade-in">
                <p className="text-sm text-gray-500 mb-3">Signed in as <strong className="text-gray-900">{user.email || 'Google User'}</strong>. Your data is syncing securely across your devices.</p>
                <button 
                  onClick={handleSignOut}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading account status...</p>
            )}
          </div>
        </div>

        {/* --- Data Backup --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 transition-all hover:shadow-md">
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Data Backup</h3>
            <p className="text-sm text-gray-500 mb-3">Export your data before code updates, then import it back to restore your logs and goals.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} /> Save File
              </button>
              <button 
                onClick={handleCopyData}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                <Copy size={16} /> Copy Text
              </button>
              
              <label className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm">
                <Upload size={16} /> Load File
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport} 
                  className="hidden" 
                />
              </label>
              <button 
                onClick={() => setShowPasteArea(!showPasteArea)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                <ClipboardPaste size={16} /> Paste Text
              </button>
            </div>

            {showPasteArea && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Paste your backup code here..."
                  className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-sm font-mono transition-all"
                />
                <button
                  onClick={handlePasteImport}
                  disabled={!pasteData.trim()}
                  className="bg-[#F4826A] hover:bg-[#E07058] disabled:bg-[#F4826A]/50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  Restore
                </button>
              </div>
            )}
            
            {backupMessage && (
              <p className={`text-sm font-medium text-center p-2 rounded-lg animate-in fade-in zoom-in duration-300 ${backupMessage.includes('Error') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {backupMessage}
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#F4826A]/10 border border-[#F4826A]/20 rounded-2xl p-5 text-sm text-[#d6654e] mt-6">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Bot size={18} /> AI Configuration
          </div>
          <p className="opacity-90 leading-relaxed">
            The Gemini API key is securely managed by the environment runtime. No manual key input is required. A fallback mock function is active in case of network unavailability.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 md:pb-0 md:flex animate-in fade-in duration-500">
      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .animate-pop {
          animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen fixed">
        <div className="p-6 pb-4">
          <div className="flex items-center">
            <img src={APP_LOGO_SRC} alt="Macros Tracker by S. Apps" className="h-12 w-auto object-contain" />
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'log', icon: Plus, label: 'Log Food' },
            { id: 'calendar', icon: CalendarDays, label: 'History' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'log') setLogDate(todayStr);
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all active:scale-[0.98] ${
                activeTab === item.id 
                  ? 'bg-[#F4826A]/10 text-[#F4826A]' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? "animate-pop" : ""} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 sm:p-8 max-w-3xl mx-auto w-full pb-20 md:pb-8">
        
        {/* Unified Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
          {/* Mobile Title */}
          <div className="md:hidden flex items-center">
             <img src={APP_LOGO_SRC} alt="Macros Tracker by S. Apps" className="h-10 w-auto object-contain" />
          </div>
          
          {/* Desktop Spacer */}
          <div className="hidden md:block"></div>

          {/* Refresh Bar */}
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 font-medium bg-white px-1.5 py-1.5 rounded-full shadow-sm border border-gray-200 ml-auto transition-all hover:shadow-md">
            <span className="pl-2">Refreshed {lastRefreshed.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
            <button 
              onClick={() => setLastRefreshed(new Date())}
              className="p-1.5 bg-gray-50 text-gray-600 hover:text-[#F4826A] hover:bg-[#F4826A]/10 rounded-full border border-gray-100 transition-all active:scale-90 shadow-sm"
              title="Refresh connection"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'log' && renderLogFood()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Edit Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-gray-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Edit2 size={18} className="text-[#F4826A]"/> Edit Entry
              </h3>
              <button onClick={() => setEditingLog(null)} className="p-1 hover:bg-gray-200 rounded-full transition-all active:scale-90 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Food Name</label>
                <input 
                  type="text" 
                  value={editingLog.name}
                  onChange={(e) => setEditingLog({...editingLog, name: e.target.value})}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none font-medium text-gray-900 transition-all"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Calories</label>
                  <input 
                    type="number" 
                    value={editingLog.calories}
                    onChange={(e) => setEditingLog({...editingLog, calories: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Protein</label>
                  <input 
                    type="number" 
                    value={editingLog.protein}
                    onChange={(e) => setEditingLog({...editingLog, protein: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fibre</label>
                  <input 
                    type="number" 
                    value={editingLog.fibre}
                    onChange={(e) => setEditingLog({...editingLog, fibre: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F4826A] outline-none text-center font-bold transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveEditedLog}
                  className="flex-1 py-2.5 px-4 bg-[#F4826A] text-white font-semibold rounded-xl hover:bg-[#E07058] transition-all active:scale-95 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Log Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce" style={{animationIterationCount: 1}}>
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Entry?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone. Are you sure you want to remove this food log?</p>
            <div className="flex gap-3">
              <button onClick={() => setLogToDelete(null)} className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 px-4 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all active:scale-95 shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
        <div className="flex justify-around p-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
            { id: 'log', icon: Plus, label: 'Log' },
            { id: 'calendar', icon: CalendarDays, label: 'History' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'log') setLogDate(todayStr);
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center p-2 min-w-[64px] transition-all active:scale-90 rounded-lg ${
                activeTab === item.id ? 'text-[#F4826A]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon size={24} className={`mb-1 ${activeTab === item.id ? "animate-pop" : ""}`} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}