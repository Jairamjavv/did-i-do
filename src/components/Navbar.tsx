import React, { useState } from 'react';
import { FileJson, RefreshCw, Search, Check, X, Menu, Activity, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { SyncStatus } from '../hooks/useActivityTracker';

interface NavbarProps {
  onOpenJsonModal: () => void;
  onResetData: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onToggleSideMenu: () => void;
  isSideMenuOpen: boolean;
  sideMenuCountdown: number | null;
  onToggleLiveStatus: () => void;
  isLiveStatusOpen: boolean;
  liveStatusCountdown: number | null;
  syncStatus?: SyncStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenJsonModal,
  onResetData,
  searchQuery,
  setSearchQuery,
  onToggleSideMenu,
  isSideMenuOpen,
  sideMenuCountdown,
  onToggleLiveStatus,
  isLiveStatusOpen,
  liveStatusCountdown,
  syncStatus = 'disconnected',
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <header className="w-full border-b-2 border-black bg-white text-black sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">

        {/* HAMBURGER MENU BUTTON & BRANDING */}
        <div className="flex items-center gap-3">
          {/* HAMBURGER BUTTON WITH 5S COUNTDOWN INDICATOR */}
          <button
            onClick={onToggleSideMenu}
            disabled={isLiveStatusOpen}
            className={`p-2 border-2 border-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isLiveStatusOpen
                ? 'opacity-40 cursor-not-allowed bg-zinc-100 text-zinc-400 border-zinc-300 pointer-events-none'
                : isSideMenuOpen
                  ? 'bg-black text-white font-black'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            title={
              isLiveStatusOpen
                ? 'Menu disabled while Live Status is open'
                : 'Toggle Side Navigation (Auto-closes in 5s)'
            }
          >
            <Menu className="w-5 h-5" />
            <span className="font-mono text-xs font-bold uppercase hidden sm:inline">
              Menu
            </span>
            {isSideMenuOpen && sideMenuCountdown !== null && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-yellow-400 text-black font-black animate-pulse">
                {sideMenuCountdown}s
              </span>
            )}
          </button>

          {/* APP LOGO & BRANDING */}
          <div className="flex items-center gap-2 group cursor-pointer select-none">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 leading-none">
              <h1 className="font-impact text-xl sm:text-2xl md:text-3xl tracking-tighter uppercase font-black text-black group-hover:text-orange-500 transition-colors duration-200">
                D.I.D
              </h1>
              <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider text-zinc-500 group-hover:text-orange-500 transition-colors duration-200">
                — Did I do
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex-1 max-w-xs md:max-w-sm relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH TASKS, BOOKS, MOVIES..."
            className="w-full pl-9 pr-8 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-zinc-50 focus:outline-none focus:border-black transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ACTION CONTROLS & LIVE BUTTON */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* SUPABASE CLOUD SYNC STATUS BADGE */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 border-2 border-black font-mono text-[10px] font-bold uppercase ${syncStatus === 'synced'
                ? 'bg-green-100 text-green-800'
                : syncStatus === 'saving' || syncStatus === 'loading'
                  ? 'bg-yellow-100 text-yellow-800'
                  : syncStatus === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-zinc-100 text-zinc-600'
              }`}
            title={`Supabase Cloud Sync Status: ${syncStatus}`}
          >
            {syncStatus === 'synced' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-green-600" />
                <span>Cloud DB</span>
              </>
            ) : syncStatus === 'saving' || syncStatus === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-600" />
                <span>{syncStatus === 'loading' ? 'Loading' : 'Syncing'}</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* EXPANDABLE LIVE STATUS TRIGGER BUTTON WITH 5S COUNTDOWN */}
          <button
            onClick={onToggleLiveStatus}
            disabled={isSideMenuOpen}
            className={`px-3 py-1.5 border-2 border-black font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isSideMenuOpen
                ? 'opacity-40 cursor-not-allowed bg-zinc-100 text-zinc-400 border-zinc-300 pointer-events-none'
                : isLiveStatusOpen
                  ? 'bg-yellow-400 text-black border-black font-black'
                  : 'bg-black text-white hover:opacity-90'
              }`}
            title={
              isSideMenuOpen
                ? 'Live Status disabled while Menu is open'
                : 'Expand Live Activity Pulse (Auto-closes in 5s)'
            }
          >
            <Activity className="w-4 h-4 animate-pulse text-red-500" />
            <span>LIVE</span>
            {isLiveStatusOpen && liveStatusCountdown !== null ? (
              <span className="text-[10px] font-mono px-1 py-0.2 bg-black text-white font-black">
                {liveStatusCountdown}s
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block" />
            )}
          </button>

          {/* JSON DATA MODAL BUTTON */}
          <button
            onClick={onOpenJsonModal}
            className="px-2.5 py-1.5 border-2 border-black bg-white hover:bg-black hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            title="View, Import, Export JSON metadata"
          >
            <FileJson className="w-4 h-4" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          {/* RESET BUTTON */}
          {showConfirmReset ? (
            <div className="flex items-center gap-1 border-2 border-black p-0.5 bg-zinc-100">
              <span className="text-[10px] font-mono font-bold uppercase px-1">Reset?</span>
              <button
                onClick={() => {
                  onResetData();
                  setShowConfirmReset(false);
                }}
                className="p-1 bg-black text-white hover:opacity-80"
                title="Confirm Reset"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="p-1 hover:bg-zinc-200"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="p-1.5 border-2 border-black bg-white hover:bg-zinc-100 text-xs font-mono transition-all"
              title="Reset sample data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
