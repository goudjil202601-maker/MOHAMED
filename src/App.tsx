import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastContainer } from '@/components/Toast';
import { Layout } from '@/components/Layout';
import { LoginScreen } from '@/screens/LoginScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { POSScreen } from '@/screens/POSScreen';
import { KitchenScreen } from '@/screens/KitchenScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ShiftScreen, ReportsScreen } from '@/screens/ShiftScreen';
import { LockScreen } from '@/screens/LockScreen';
import { KeyGenScreen } from '@/screens/KeyGenScreen';

type Screen = 'dashboard' | 'pos' | 'kitchen' | 'settings' | 'reports' | 'shift';

function MainApp() {
  const { user, loading, licenseValid } = useApp();
  const [screen, setScreen] = useState<Screen>('dashboard');

  // Check if URL has #keygen hash for standalone key generator
  if (typeof window !== 'undefined' && window.location.hash === '#keygen') {
    return <KeyGenScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // License check — if no valid license, show lock screen
  if (!licenseValid) {
    return <LockScreen />;
  }

  // Not logged in — show login
  if (!user) {
    return <LoginScreen />;
  }

  // Role-based access control
  const roleAccess: Record<Screen, string[]> = {
    dashboard: ['admin', 'cashier', 'waiter', 'kitchen'],
    pos: ['admin', 'cashier', 'waiter'],
    kitchen: ['admin', 'kitchen'],
    settings: ['admin'],
    reports: ['admin'],
    shift: ['admin', 'cashier'],
  };

  // If user can't access current screen, redirect to dashboard
  const canAccess = roleAccess[screen].includes(user.role);
  const effectiveScreen = canAccess ? screen : 'dashboard';

  return (
    <Layout current={effectiveScreen} onNavigate={(s) => setScreen(s)}>
      {effectiveScreen === 'dashboard' && <DashboardScreen onNavigate={(s) => setScreen(s)} />}
      {effectiveScreen === 'pos' && <POSScreen />}
      {effectiveScreen === 'kitchen' && <KitchenScreen />}
      {effectiveScreen === 'settings' && <SettingsScreen />}
      {effectiveScreen === 'shift' && <ShiftScreen />}
      {effectiveScreen === 'reports' && <ReportsScreen />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
      <ToastContainer />
    </AppProvider>
  );
}
