import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Film,
  Tv,
  Gamepad2,
  Sparkles,
  Database,
  Kanban,
  BarChart3,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogIn,
  UserCheck,
  ShieldCheck,
  Star,
  Clock,
  Layers,
  Loader2
} from 'lucide-react';

import { registerDIDUser, verifyDIDLogin } from '../services/supabaseClient';
import { Footer } from './Footer';

interface LandingPageProps {
  onLoginSuccess: (user: { did_id: string; identifier: string; displayName: string }) => void;
}

// Security sanitization helpers
const sanitizeText = (input: string): string => {
  return input
    .replace(/[<>'"`;()&$]/g, '') // remove dangerous characters for XSS/injection protection
    .replace(/\s+/g, ' ') // collapse multiple whitespaces
    .trim();
};

const sanitizeIdentifier = (input: string): string => {
  // Trim and remove dangerous script / injection chars
  return input
    .toLowerCase()
    .replace(/[<>'"`;()&$]/g, '')
    .replace(/\s+/g, '')
    .trim();
};

const sanitizePasscode = (input: string): string => {
  // Strict digits only
  return input.replace(/\D/g, '').slice(0, 8);
};

// Static Examples for Horizontal Rotation Showcase
const SHOWCASE_CARDS = [
  {
    id: 'books',
    tag: 'READING TRACKER',
    categoryName: 'Books & Literature',
    title: 'Atomic Habits',
    meta: 'James Clear',
    status: 'In Progress (72%)',
    badgeColor: 'bg-emerald-400',
    icon: BookOpen,
    accent: 'border-emerald-500',
    unitText: '230 / 320 pages read',
    rating: 5,
    quote: 'Never miss twice. Habit tracking done with high clarity.'
  },
  {
    id: 'movies',
    tag: 'CINEMA LOG',
    categoryName: 'Movies & Films',
    title: 'Dune: Part Two',
    meta: 'Denis Villeneuve (2024)',
    status: 'Completed',
    badgeColor: 'bg-yellow-400',
    icon: Film,
    accent: 'border-yellow-500',
    unitText: '166 / 166 mins watched',
    rating: 5,
    quote: 'Masterpiece cinematography and sound design.'
  },
  {
    id: 'series',
    tag: 'EPISODIC BINGE',
    categoryName: 'TV Series & Anime',
    title: 'Severance (Season 2)',
    meta: 'Apple TV+ • Ben Stiller',
    status: 'In Progress (50%)',
    badgeColor: 'bg-cyan-400',
    icon: Tv,
    accent: 'border-cyan-500',
    unitText: '5 / 10 episodes watched',
    rating: 4,
    quote: 'Please enjoy each episode equally.'
  },
  {
    id: 'games',
    tag: 'GAMING QUESTS',
    categoryName: 'Video Games',
    title: 'Elden Ring: Shadow of the Erdtree',
    meta: 'FromSoftware • Action RPG',
    status: 'Backlog',
    badgeColor: 'bg-purple-400',
    icon: Gamepad2,
    accent: 'border-purple-500',
    unitText: '0 / 45 hours logged',
    rating: 0,
    quote: 'Preparing for the Realm of Shadow.'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  // Auth Form State (Name/Nickname + Email/Phone + 6-8 digit passcode)
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Horizontal Showcase Active Index with Auto-Rotation
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_CARDS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Apply strict sanitization
    const sanitizedId = sanitizeIdentifier(identifier);
    const sanitizedPass = sanitizePasscode(passcode);
    const sanitizedName = sanitizeText(displayName);

    if (activeTab === 'signup' && !sanitizedName) {
      setAuthError('Please enter your name or nickname to register');
      return;
    }

    if (!sanitizedId) {
      setAuthError('Please enter a valid email or phone number');
      return;
    }

    // Basic identifier pattern checks
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedId);
    const isPhone = /^\+?[0-9]{7,15}$/.test(sanitizedId);
    if (!isEmail && !isPhone && sanitizedId.length < 4) {
      setAuthError('Please provide a valid email address or phone number');
      return;
    }

    if (!/^\d{6,8}$/.test(sanitizedPass)) {
      setAuthError('Passcode must be 6 to 8 numerical digits (e.g. 123456)');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'signup') {
        // Perform Supabase Registration
        const res = await registerDIDUser(sanitizedId, sanitizedPass, sanitizedName);
        if (!res.success || !res.user) {
          setAuthError(res.error || 'Failed to register. Please try again.');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess({
          did_id: res.user.did_id,
          identifier: res.user.identifier,
          displayName: res.user.displayName,
        });
      } else {
        // Perform Supabase Login Verification
        const res = await verifyDIDLogin(sanitizedId, sanitizedPass);
        if (!res.success || !res.user) {
          setAuthError(res.error || 'Failed to sign in. Please verify your credentials.');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess({
          did_id: res.user.did_id,
          identifier: res.user.identifier,
          displayName: res.user.displayName,
        });
      }
    } catch (err: any) {
      setAuthError(err?.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCard = SHOWCASE_CARDS[activeIndex];
  const IconComponent = currentCard.icon;

  return (
    <div className="min-h-screen bg-architectural-grid bg-zinc-50 text-black flex flex-col font-minion selection:bg-yellow-400 selection:text-black">

      {/* TOP BRAND BAR */}
      <header className="w-full border-b-2 border-black bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-impact text-2xl sm:text-3xl tracking-tighter uppercase font-black text-black">
              D.I.D
            </span>
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-500 uppercase">
              — Did I Do
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-zinc-600 uppercase hidden sm:inline">
              Personal Leisure Activity Tracker
            </span>
          </div>
        </div>
      </header>

      {/* MAIN HERO & AUTH CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-14 flex flex-col gap-12">

        {/* HERO TITLE & SUBTITLE */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-300 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            Simple • Direct • Zero Clutter
          </div>

          <h1 className="font-titan text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-black leading-tight">
            Stop wondering, <br className="hidden sm:inline" />
            <span className="bg-yellow-300 px-2.5 py-0.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block my-1">
              Did I Do
            </span> it.
          </h1>

          <p className="font-mono text-xs sm:text-sm md:text-base text-zinc-700 max-w-xl mx-auto leading-relaxed">
            A punchy personal kanban tracker for your books, movies, series, games, and daily goals. Fast, clean, and distraction-free.
          </p>
        </div>

        {/* 2-COLUMN SECTION: (1) HORIZONTAL ROTATING EXAMPLES | (2) SIMPLE PASSCODE LOGIN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* COLUMN 1: HORIZONTAL ROTATING FEATURE EXAMPLES (7 COLS) */}
          <div
            className="lg:col-span-7 flex flex-col gap-4"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* SECTION HEADER & ROTATION INDICATOR */}
            <div className="flex items-center justify-between border-2 border-black bg-black text-white px-4 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Live Showcase & Examples
                </span>
              </div>

              {/* ROTATION CONTROLS */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-zinc-300">
                  {activeIndex + 1} / {SHOWCASE_CARDS.length}
                </span>
                <button
                  onClick={() => setActiveIndex((prev) => (prev === 0 ? SHOWCASE_CARDS.length - 1 : prev - 1))}
                  className="p-1 bg-white text-black hover:bg-yellow-400 border border-black transition-colors"
                  aria-label="Previous example"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveIndex((prev) => (prev + 1) % SHOWCASE_CARDS.length)}
                  className="p-1 bg-white text-black hover:bg-yellow-400 border border-black transition-colors"
                  aria-label="Next example"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROTATING CARD CONTAINER */}
            <div className="border-2 border-black bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden transition-all duration-300">

              {/* TOP CARD TAG & CATEGORY */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 border-2 border-black ${currentCard.badgeColor} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                    <IconComponent className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-black uppercase text-zinc-500 tracking-wider block">
                      {currentCard.tag}
                    </span>
                    <h3 className="font-mono text-xs font-bold uppercase text-black">
                      {currentCard.categoryName}
                    </h3>
                  </div>
                </div>

                <span className="font-mono text-[11px] font-black px-2.5 py-1 border-2 border-black bg-zinc-100 uppercase">
                  {currentCard.status}
                </span>
              </div>

              {/* CARD TITLE & METADATA */}
              <div className="my-5 border-l-4 border-black pl-3 py-0.5">
                <h2 className="font-titan text-2xl sm:text-3xl text-black uppercase tracking-tight">
                  {currentCard.title}
                </h2>
                <p className="font-mono text-xs font-bold text-zinc-600 uppercase mt-0.5">
                  {currentCard.meta}
                </p>
              </div>

              {/* PROGRESS BAR & UNITS */}
              <div className="bg-zinc-50 border-2 border-black p-3.5 my-4 space-y-2">
                <div className="flex justify-between items-center font-mono text-xs font-bold">
                  <span className="text-zinc-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-black" />
                    Progress Status
                  </span>
                  <span className="font-black text-black">
                    {currentCard.unitText}
                  </span>
                </div>

                {/* VISUAL PROGRESS BAR */}
                <div className="w-full h-3 bg-zinc-200 border-2 border-black overflow-hidden relative">
                  <div
                    className={`h-full ${currentCard.badgeColor} border-r-2 border-black transition-all duration-500`}
                    style={{
                      width: currentCard.status.includes('72%')
                        ? '72%'
                        : currentCard.status.includes('50%')
                          ? '50%'
                          : currentCard.status === 'Completed'
                            ? '100%'
                            : '5%'
                    }}
                  />
                </div>
              </div>

              {/* RATING & NOTES PREVIEW */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t-2 border-black/10">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= currentCard.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-zinc-300'
                        }`}
                    />
                  ))}
                  <span className="font-mono text-[11px] font-bold text-zinc-600 ml-1.5">
                    {currentCard.rating > 0 ? `${currentCard.rating}/5` : 'Unrated'}
                  </span>
                </div>

                <p className="font-mono text-xs italic text-zinc-600">
                  "{currentCard.quote}"
                </p>
              </div>

              {/* ROTATION BULLETS (CLICKABLE) */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {SHOWCASE_CARDS.map((card, idx) => (
                  <button
                    key={card.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2.5 border-2 border-black transition-all ${idx === activeIndex
                      ? 'w-8 bg-black'
                      : 'w-2.5 bg-zinc-200 hover:bg-zinc-400'
                      }`}
                    title={card.categoryName}
                  />
                ))}
              </div>
            </div>

            {/* THREE CORE PILLARS AT A GLANCE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5">
                <Kanban className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <div className="font-mono text-xs font-black uppercase">Kanban Flow</div>
                  <div className="font-mono text-[10px] text-zinc-500">Backlog • Doing • Done</div>
                </div>
              </div>

              <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-mono text-xs font-black uppercase">Live Stats</div>
                  <div className="font-mono text-[10px] text-zinc-500">Completion metrics</div>
                </div>
              </div>

              <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5">
                <Database className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <div className="font-mono text-xs font-black uppercase">Cloud Ready</div>
                  <div className="font-mono text-[10px] text-zinc-500">JSON & Cloud Backups</div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: KEEP IT SIMPLE PASSCODE LOGIN / ACCESS (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="border-2 border-black bg-white p-6 sm:p-7 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">

              {/* TAB SELECTOR */}
              <div className="grid grid-cols-2 border-2 border-black mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setAuthError(null);
                  }}
                  className={`py-2 font-mono text-xs font-black uppercase transition-colors ${activeTab === 'signin'
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`}
                >
                  Quick Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setAuthError(null);
                  }}
                  className={`py-2 font-mono text-xs font-black uppercase transition-colors border-l-2 border-black ${activeTab === 'signup'
                    ? 'bg-black text-white'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                    }`}
                >
                  Create Passcode
                </button>
              </div>

              {/* FORM HEADER */}
              <div className="mb-5">
                <h3 className="font-titan text-xl uppercase tracking-tight text-black flex items-center gap-2">
                  <Lock className="w-4 h-4 text-black" />
                  {activeTab === 'signin' ? 'Access Your Tracker' : 'Set Up Access'}
                </h3>
                <p className="font-mono text-xs text-zinc-600 mt-1">
                  Simple access using your Email or Phone with a 6–8 digit numerical passcode.
                </p>
              </div>

              {/* ERROR NOTICE */}
              {authError && (
                <div className="p-3 mb-4 border-2 border-black bg-red-100 text-red-900 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ⚠️ {authError}
                </div>
              )}

              {/* AUTH FORM */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">

                {/* NAME / SHORT NAME FIELD (REGISTRATION ONLY) */}
                {activeTab === 'signup' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-mono text-xs font-black uppercase text-black">
                        Your Name / Short Name
                      </label>
                      <span className="font-mono text-[10px] text-zinc-500">
                        Required
                      </span>
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={30}
                      onChange={(e) => setDisplayName(sanitizeText(e.target.value))}
                      placeholder="e.g. Alex, Jairam, Sam"
                      className="w-full px-3 py-2 border-2 border-black bg-zinc-50 font-mono text-xs font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                )}

                {/* IDENTIFIER (EMAIL / PHONE) */}
                <div>
                  <label className="block font-mono text-xs font-black uppercase text-black mb-1">
                    Email or Phone Number
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. user@gmail.com or 9876543210"
                    className="w-full px-3 py-2 border-2 border-black bg-zinc-50 font-mono text-xs font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                {/* 6-8 DIGIT NUMERICAL PASSCODE */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-mono text-xs font-black uppercase text-black">
                      Passcode (6–8 Digits)
                    </label>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Numerical Only
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={passcode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // numerical only
                        setPasscode(val);
                      }}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 pr-10 border-2 border-black bg-zinc-50 font-mono text-xs font-bold tracking-widest focus:outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 px-4 border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 mt-2 ${
                    isSubmitting
                      ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed border-zinc-400'
                      : 'bg-yellow-400 hover:bg-yellow-300 text-black'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{activeTab === 'signin' ? 'Verifying Account...' : 'Creating Account & DB...'}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{activeTab === 'signin' ? 'Enter Tracker' : 'Register & Enter'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* SECURITY & PRIVACY NOTE */}
            <div className="border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-[11px] text-zinc-600 leading-snug">
                <strong>No spam, no intrusive tracking:</strong> Your metadata is stored locally and securely synced to your cloud account.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* CENTER FOOTER WITH HOVER TAMIL TOOLTIP */}
      <Footer />

    </div>
  );
};
