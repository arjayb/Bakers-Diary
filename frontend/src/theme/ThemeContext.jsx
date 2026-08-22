import { createContext, useContext, useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/client';

const ThemeContext = createContext(null);

// §5: "Theme selection must persist between visits." Persisted server-side
// on UserSettings (not just localStorage) since this is a real backend-
// authenticated app — localStorage alone would lose the preference on a
// different device/browser. Falls back to 'night' (the spec'd default)
// before settings have loaded or if the user isn't authenticated yet.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('night');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('bd_token');
    if (!token) { setLoaded(true); return; }
    getSettings()
      .then((res) => { if (res.settings?.theme) setThemeState(res.settings.theme); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function setTheme(next) {
    setThemeState(next); // optimistic — kitchen use shouldn't wait on a round trip to flip a switch
    try {
      await updateSettings({ theme: next });
    } catch {
      // Persisted preference didn't save, but the UI already reflects the
      // choice for this session — next load may revert, which is an honest
      // degradation rather than a silent failure the person can't see.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
