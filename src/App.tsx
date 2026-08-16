import React, { useState, useEffect } from 'react';
import { useActivityTracker } from './hooks/useActivityTracker';
import { ActivityCategory, ColumnType, TaskItem } from './types';
import { Navbar } from './components/Navbar';
import { SideMenu } from './components/SideMenu';
import { LiveStatus } from './components/LiveStatus';
import { ActivityBoard } from './components/ActivityBoard';
import { SummaryDashboard } from './components/SummaryDashboard';
import { AddItemModal } from './components/AddItemModal';
import { AddCategoryModal } from './components/AddCategoryModal';
import { JsonModal } from './components/JsonModal';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { AlertTriangle } from 'lucide-react';

interface AuthUser {
  did_id: string;
  identifier: string;
  displayName: string;
}

export default function App() {
  // Simple session state (stored in localStorage)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('did_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('did_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('did_current_user');
  };

  // Activity Tracker scoped by the authenticated user's unique did_id
  const {
    data,
    categories,
    fifoCompletedQueue,
    syncStatus,
    addCategory,
    toastMessage,
    addItem,
    updateItem,
    moveItem,
    deleteItem,
    getInProgressCount,
    importJSON,
    exportJSON,
    resetToDefault,
    createCloudSnapshot,
    fetchFromCloud,
    listCloudSnapshots,
    saveToCloud,
    deleteFromCloud,
    isSupabaseConfigured,
  } = useActivityTracker(currentUser?.did_id);

  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'dashboard'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [modalTargetCategory, setModalTargetCategory] = useState<ActivityCategory>('books');
  const [modalTargetColumn, setModalTargetColumn] = useState<ColumnType>('backlog');
  const [editingItem, setEditingItem] = useState<TaskItem | null>(null);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  // Dynamic UI Elements: Hamburger Menu & Live Status with 5s Auto Close & Mutual Exclusivity
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [sideMenuCountdown, setSideMenuCountdown] = useState<number | null>(null);

  const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false);
  const [liveStatusCountdown, setLiveStatusCountdown] = useState<number | null>(null);

  // Toggle Side Menu with 5s Countdown (Disabled if Live Status is open)
  const handleToggleSideMenu = () => {
    if (isLiveStatusOpen) return;
    if (isSideMenuOpen) {
      setIsSideMenuOpen(false);
      setSideMenuCountdown(null);
    } else {
      setIsSideMenuOpen(true);
      setSideMenuCountdown(5);
    }
  };

  useEffect(() => {
    if (!isSideMenuOpen || sideMenuCountdown === null) return;
    if (sideMenuCountdown <= 0) {
      setIsSideMenuOpen(false);
      setSideMenuCountdown(null);
      return;
    }

    const timer = setInterval(() => {
      setSideMenuCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [isSideMenuOpen, sideMenuCountdown]);

  // Toggle Live Status with 5s Countdown (Disabled if Side Menu is open)
  const handleToggleLiveStatus = () => {
    if (isSideMenuOpen) return;
    if (isLiveStatusOpen) {
      setIsLiveStatusOpen(false);
      setLiveStatusCountdown(null);
    } else {
      setIsLiveStatusOpen(true);
      setLiveStatusCountdown(5);
    }
  };

  useEffect(() => {
    if (!isLiveStatusOpen || liveStatusCountdown === null) return;
    if (liveStatusCountdown <= 0) {
      setIsLiveStatusOpen(false);
      setLiveStatusCountdown(null);
      return;
    }

    const timer = setInterval(() => {
      setLiveStatusCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLiveStatusOpen, liveStatusCountdown]);

  // Open add item modal
  const handleOpenAddItem = (cat?: ActivityCategory, col?: ColumnType) => {
    const targetCat = cat || (selectedCategory === 'dashboard' ? 'books' : selectedCategory);
    setModalTargetCategory(targetCat);
    setModalTargetColumn(col || 'backlog');
    setEditingItem(null);
    setIsAddItemOpen(true);
  };

  // Open edit item modal
  const handleEditItem = (item: TaskItem) => {
    setModalTargetCategory(item.category);
    setModalTargetColumn(item.column);
    setEditingItem(item);
    setIsAddItemOpen(true);
  };

  // Save item handler
  const handleSaveItem = (itemData: Omit<TaskItem, 'id' | 'createdAt'> & { id?: string }) => {
    if (itemData.id) {
      updateItem(itemData.id, itemData);
    } else {
      addItem(itemData);
    }
  };

  // Handler for progress updates
  const handleUpdateProgress = (id: string, newProgress: number) => {
    updateItem(id, { progress: newProgress });
  };

  const handleUpdateUnit = (id: string, currentUnit: number) => {
    updateItem(id, { currentUnit });
  };

  const handleUpdateRating = (id: string, rating: number) => {
    updateItem(id, { rating });
  };

  // Handle adding custom category
  const handleCreateCategory = (newCatData: any) => {
    const newCatId = addCategory(newCatData);
    if (newCatId) {
      setSelectedCategory(newCatId);
    }
  };

  // If not logged in, render the Welcome Landing Page first
  if (!currentUser) {
    return (
      <LandingPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-minion antialiased bg-architectural-grid bg-zinc-50 text-black transition-colors duration-200">
      
      {/* SECTION 1: NAVBAR WITH HAMBURGER & LIVE BUTTONS */}
      <Navbar
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onResetData={resetToDefault}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onToggleSideMenu={handleToggleSideMenu}
        isSideMenuOpen={isSideMenuOpen}
        sideMenuCountdown={sideMenuCountdown}
        onToggleLiveStatus={handleToggleLiveStatus}
        isLiveStatusOpen={isLiveStatusOpen}
        liveStatusCountdown={liveStatusCountdown}
        syncStatus={syncStatus}
        onLogoClick={() => setSelectedCategory('dashboard')}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom duration-300 max-w-md">
          <div className="p-4 rounded-xl border-2 border-black bg-black text-white shadow-[6px_6px_0px_0px_rgba(234,179,8,1)] flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="font-mono text-xs font-bold leading-snug">
              {toastMessage}
            </p>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT WITH OVERLAY BACKDROP & DRAWERS */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex items-stretch relative">
        
        {/* SIDE MENU DRAWER (MUTUALLY EXCLUSIVE) */}
        <div
          className={`fixed inset-y-16 left-0 z-30 w-72 sm:w-80 bg-white border-r-2 border-black transform transition-transform duration-300 ease-in-out shadow-[8px_0px_0px_0px_rgba(0,0,0,1)] ${
            isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SideMenu
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setIsSideMenuOpen(false);
              setSideMenuCountdown(null);
            }}
            categories={categories}
            items={data.items}
            onOpenAddCategory={() => setIsAddCategoryOpen(true)}
            autoCloseSeconds={sideMenuCountdown}
            onClose={() => {
              setIsSideMenuOpen(false);
              setSideMenuCountdown(null);
            }}
          />
        </div>

        {/* LIVE STATUS PANEL DRAWER (MUTUALLY EXCLUSIVE) */}
        <div
          className={`fixed inset-y-16 right-0 z-30 w-80 sm:w-96 bg-white border-l-2 border-black transform transition-transform duration-300 ease-in-out shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] ${
            isLiveStatusOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <LiveStatus
            items={data.items}
            selectedCategory={selectedCategory}
            onUpdateProgress={handleUpdateProgress}
            autoCloseSeconds={liveStatusCountdown}
            onClose={() => {
              setIsLiveStatusOpen(false);
              setLiveStatusCountdown(null);
            }}
          />
        </div>

        {/* OVERLAY BACKDROP WHEN EITHER MENU OR LIVE STATUS IS OPEN */}
        {(isSideMenuOpen || isLiveStatusOpen) && (
          <div
            onClick={() => {
              setIsSideMenuOpen(false);
              setSideMenuCountdown(null);
              setIsLiveStatusOpen(false);
              setLiveStatusCountdown(null);
            }}
            className="fixed inset-0 top-16 bg-black/20 z-20 backdrop-blur-[1px] transition-opacity"
          />
        )}

        {/* CENTER CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {selectedCategory === 'dashboard' ? (
            <SummaryDashboard
              items={data.items}
              categories={categories}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onOpenAddItem={handleOpenAddItem}
              userName={currentUser?.displayName}
              fifoQueue={fifoCompletedQueue}
            />
          ) : (
            <ActivityBoard
              key={selectedCategory}
              category={selectedCategory}
              items={data.items}
              categories={categories}
              onMoveColumn={moveItem}
              onUpdateProgress={handleUpdateProgress}
              onUpdateUnit={handleUpdateUnit}
              onUpdateRating={handleUpdateRating}
              onOpenAddItem={(col) => handleOpenAddItem(selectedCategory, col)}
              onEditItem={handleEditItem}
              onDeleteItem={deleteItem}
              onUpdateItem={updateItem}
              searchQuery={searchQuery}
            />
          )}
        </main>

      </div>

      {/* CENTER FOOTER */}
      <Footer />

      {/* MODALS */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onSave={handleSaveItem}
        initialCategory={modalTargetCategory}
        initialColumn={modalTargetColumn}
        editingItem={editingItem}
        inProgressCount={getInProgressCount(modalTargetCategory)}
        categories={categories}
      />

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onAddCategory={handleCreateCategory}
      />

      <JsonModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        jsonString={exportJSON()}
        onImportJSON={importJSON}
        onResetData={resetToDefault}
        isSupabaseConfigured={isSupabaseConfigured}
        onCreateCloudSnapshot={createCloudSnapshot}
        onFetchFromCloud={fetchFromCloud}
        onSaveToCloud={saveToCloud}
        onDeleteFromCloud={deleteFromCloud}
        onListCloudSnapshots={listCloudSnapshots}
      />

    </div>
  );
}
