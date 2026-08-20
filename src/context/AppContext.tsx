import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Staff, Lang, Shift } from '@/types';
import { supabase } from '@/lib/supabase';
import { getHardwareFingerprint, validateLicenseKey } from '@/lib/fingerprint';

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  user: Staff | null;
  login: (staff: Staff) => void;
  logout: () => void;
  activeShift: Shift | null;
  setActiveShift: (s: Shift | null) => void;
  refreshShift: () => Promise<void>;
  licenseValid: boolean;
  licenseType: 'none' | 'trial' | 'lifetime';
  fingerprint: string;
  refreshLicense: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const [user, setUser] = useState<Staff | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [licenseType, setLicenseType] = useState<'none' | 'trial' | 'lifetime'>('none');
  const [licenseValid, setLicenseValid] = useState(false);
  const [loading, setLoading] = useState(true);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    localStorage.setItem('pos_lang', l);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pos_lang') as Lang | null;
    if (saved) setLang(saved);
    else setLang('ar');
  }, [setLang]);

  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const login = useCallback((staff: Staff) => {
    setUser(staff);
    localStorage.setItem('pos_user', JSON.stringify(staff));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('pos_user');
  }, []);

  const refreshShift = useCallback(async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveShift(data as Shift | null);
  }, []);

  const refreshLicense = useCallback(async () => {
    const fp = await getHardwareFingerprint();
    setFingerprint(fp);

    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'license')
      .maybeSingle();

    const license = (data?.value as { type: string; key: string; activatedAt: string | null; fingerprint: string }) || null;

    if (!license || !license.key || license.type === 'none') {
      setLicenseType('none');
      setLicenseValid(false);
      return;
    }

    // Anti-cloning: fingerprint must match
    if (license.fingerprint && license.fingerprint !== fp) {
      setLicenseType('none');
      setLicenseValid(false);
      return;
    }

    const validated = validateLicenseKey(license.key, fp);
    if (!validated) {
      setLicenseType('none');
      setLicenseValid(false);
      return;
    }

    if (validated === 'trial') {
      if (license.activatedAt) {
        const elapsed = Date.now() - new Date(license.activatedAt).getTime();
        const hours = elapsed / (1000 * 60 * 60);
        if (hours >= 24) {
          setLicenseType('none');
          setLicenseValid(false);
          return;
        }
      }
    }

    setLicenseType(validated);
    setLicenseValid(true);
  }, []);

  useEffect(() => {
    (async () => {
      await refreshLicense();
      await refreshShift();
      setLoading(false);
    })();
  }, [refreshLicense, refreshShift]);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        user,
        login,
        logout,
        activeShift,
        setActiveShift,
        refreshShift,
        licenseValid,
        licenseType,
        fingerprint,
        refreshLicense,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
