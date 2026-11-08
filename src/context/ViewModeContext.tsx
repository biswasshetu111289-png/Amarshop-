import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ViewMode = 'auto' | 'mobile' | 'desktop';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isDesktop: boolean;
  toggleViewMode: () => void;
  showViewModeModal: boolean;
  setShowViewModeModal: (show: boolean) => void;
}

const STORAGE_KEY = 'amar_business_view_mode';

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: 'auto',
  setViewMode: () => {},
  isDesktop: false,
  toggleViewMode: () => {},
  showViewModeModal: false,
  setShowViewModeModal: () => {},
});

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'mobile' || saved === 'desktop' || saved === 'auto') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [windowWidth, setWindowWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  const [showViewModeModal, setShowViewModeModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const next: ViewMode = prev === 'auto' ? 'desktop' : prev === 'desktop' ? 'mobile' : 'auto';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Compute effective desktop state
  // On mobile screens (< 768px), force mobile layout unless explicitly forced to desktop
  const isDesktop =
    viewMode === 'desktop'
      ? true
      : viewMode === 'mobile'
      ? false
      : windowWidth >= 1024;

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        isDesktop,
        toggleViewMode,
        showViewModeModal,
        setShowViewModeModal,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => useContext(ViewModeContext);
