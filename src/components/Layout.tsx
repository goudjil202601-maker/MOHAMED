import { type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import type { Role } from '@/types';
import { Store, LayoutGrid, UtensilsCrossed, Settings, FileBarChart, Clock, LogOut, Globe, ChefHat } from 'lucide-react';

type Screen = 'dashboard' | 'pos' | 'kitchen' | 'settings' | 'reports' | 'shift';

interface LayoutProps {
  current: Screen;
  onNavigate: (s: Screen) => void;
  children: ReactNode;
}

const roleAccess: Record<Screen, Role[]> = {
  dashboard: ['admin', 'cashier', 'waiter', 'kitchen'],
  pos: ['admin', 'cashier', 'waiter'],
  kitchen: ['admin', 'kitchen'],
  settings: ['admin'],
  reports: ['admin'],
  shift: ['admin', 'cashier'],
};

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { lang, setLang, user, logout, activeShift, licenseType } = useApp();

  if (!user) return null;

  const navItems: { key: Screen; icon: typeof Store; label: string }[] = [
    { key: 'dashboard', icon: LayoutGrid, label: t(lang, 'dashboard') },
    { key: 'pos', icon: UtensilsCrossed, label: t(lang, 'pos') },
    { key: 'kitchen', icon: ChefHat, label: t(lang, 'kitchen') },
    { key: 'shift', icon: Clock, label: t(lang, 'shift') },
    { key: 'reports', icon: FileBarChart, label: t(lang, 'reports') },
    { key: 'settings', icon: Settings, label: t(lang, 'settings') },
  ];

  const visibleNav = navItems.filter((item) => roleAccess[item.key].includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800 hidden sm:block">{t(lang, 'appName')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Shift indicator */}
          {activeShift ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success-50 text-success-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              {t(lang, 'shift')}: {t(lang, 'openShift')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-error-50 text-error-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-error-500" />
              {t(lang, 'noActiveShift')}
            </span>
          )}

          {/* License indicator */}
          {licenseType !== 'none' && (
            <span className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              licenseType === 'lifetime' ? 'bg-primary-50 text-primary-700' : 'bg-warning-50 text-warning-700'
            }`}>
              {licenseType === 'lifetime' ? t(lang, 'lifetime') : t(lang, 'trial')}
            </span>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <Globe className="w-5 h-5" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              user.role === 'admin' ? 'bg-primary-600' :
              user.role === 'cashier' ? 'bg-success-500' :
              user.role === 'waiter' ? 'bg-accent-500' : 'bg-slate-600'
            }`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</div>
              <div className="text-xs text-slate-400 leading-tight">{t(lang, `role_${user.role}` as 'role_admin')}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-error-50 hover:text-error-600 transition-colors text-slate-500"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-16 lg:w-56 bg-white border-r border-slate-200 flex flex-col py-3 gap-1 shrink-0">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 mx-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
