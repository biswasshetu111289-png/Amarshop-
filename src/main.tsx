import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ViewModeProvider } from './context/ViewModeContext';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <StoreProvider>
          <ToastProvider>
            <ThemeProvider>
              <ViewModeProvider>
                <App />
              </ViewModeProvider>
            </ThemeProvider>
          </ToastProvider>
        </StoreProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>
);
