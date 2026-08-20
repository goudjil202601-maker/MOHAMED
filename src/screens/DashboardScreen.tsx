import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { formatCurrency, formatTime } from '@/lib/format';
import type { Order } from '@/types';
import {
  TrendingUp, UtensilsCrossed, ShoppingBag, Bike, Clock, Wallet,
  FileBarChart, Receipt, Users,
} from 'lucide-react';

type Screen = 'dashboard' | 'pos' | 'kitchen' | 'settings' | 'reports' | 'shift';

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { lang, user, activeShift } = useApp();
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [dineIn, setDineIn] = useState(0);
  const [takeaway, setTakeaway] = useState(0);
  const [delivery, setDelivery] = useState(0);

  const load = useCallback(async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const orders = (data as Order[]) || [];
    setTodayOrders(orders);

    const completed = orders.filter((o) => o.payment_status === 'paid');
    setTotalSales(completed.reduce((s, o) => s + o.total, 0));
    setDineIn(completed.filter((o) => o.type === 'dine_in').reduce((s, o) => s + o.total, 0));
    setTakeaway(completed.filter((o) => o.type === 'takeaway').reduce((s, o) => s + o.total, 0));
    setDelivery(completed.filter((o) => o.type === 'delivery').reduce((s, o) => s + o.total, 0));
  }, []);

  useEffect(() => { load(); }, [load]);

  const quickActions: { label: string; icon: typeof TrendingUp; screen: Screen; color: string }[] = [
    { label: t(lang, 'newDineIn'), icon: UtensilsCrossed, screen: 'pos', color: 'bg-primary-500' },
    { label: t(lang, 'newTakeaway'), icon: ShoppingBag, screen: 'pos', color: 'bg-accent-500' },
    { label: t(lang, 'newDelivery'), icon: Bike, screen: 'pos', color: 'bg-success-500' },
    { label: t(lang, 'manageShift'), icon: Clock, screen: 'shift', color: 'bg-warning-500' },
  ];

  const canAccess = (screen: Screen) => {
    const access: Record<Screen, string[]> = {
      dashboard: ['admin', 'cashier', 'waiter', 'kitchen'],
      pos: ['admin', 'cashier', 'waiter'],
      kitchen: ['admin', 'kitchen'],
      settings: ['admin'],
      reports: ['admin'],
      shift: ['admin', 'cashier'],
    };
    return user && access[screen].includes(user.role);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-slate-800 mb-4">
        {t(lang, 'welcome')}, {user?.name}
      </h1>

      {/* Shift Warning */}
      {!activeShift && (
        <div className="bg-warning-50 border border-warning-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-warning-600 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-warning-700 text-sm">{t(lang, 'shiftRequired')}</div>
            <div className="text-xs text-warning-600">{t(lang, 'noActiveShift')}</div>
          </div>
          {canAccess('shift') && (
            <button
              onClick={() => onNavigate('shift')}
              className="px-3 py-1.5 rounded-lg bg-warning-500 text-white text-sm font-medium hover:bg-warning-600"
            >
              {t(lang, 'openShift')}
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={TrendingUp} label={t(lang, 'totalSales')} value={formatCurrency(totalSales, lang)} color="primary" />
        <StatCard icon={UtensilsCrossed} label={t(lang, 'dineIn')} value={formatCurrency(dineIn, lang)} color="primary" />
        <StatCard icon={ShoppingBag} label={t(lang, 'takeaway')} value={formatCurrency(takeaway, lang)} color="accent" />
        <StatCard icon={Bike} label={t(lang, 'delivery')} value={formatCurrency(delivery, lang)} color="success" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {quickActions.filter((a) => canAccess(a.screen)).map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigate(action.screen)}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg hover:border-primary-200 transition-all text-start group"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-medium text-sm text-slate-700">{action.label}</div>
            </button>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">{t(lang, 'recentOrders')}</h3>
          <Receipt className="w-5 h-5 text-slate-400" />
        </div>
        {todayOrders.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">{t(lang, 'noOrders')}</p>
        ) : (
          <div className="space-y-2">
            {todayOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  {order.type === 'dine_in' && <UtensilsCrossed className="w-4 h-4 text-primary-500" />}
                  {order.type === 'takeaway' && <ShoppingBag className="w-4 h-4 text-accent-500" />}
                  {order.type === 'delivery' && <Bike className="w-4 h-4 text-success-500" />}
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {order.table_name || order.customer_name || t(lang, order.type === 'dine_in' ? 'dineIn' : order.type === 'takeaway' ? 'takeaway' : 'delivery')}
                    </div>
                    <div className="text-xs text-slate-400">{formatTime(order.created_at, lang)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.payment_status === 'paid' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                  }`}>
                    {order.payment_status === 'paid' ? t(lang, 'completed') : t(lang, 'pending')}
                  </span>
                  <span className="font-bold text-sm text-slate-700">{formatCurrency(order.total, lang)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Quick Links */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <button onClick={() => onNavigate('settings')} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-all text-start flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm text-slate-700">{t(lang, 'manageMenu')}</div>
              <div className="text-xs text-slate-400">{t(lang, 'settings')}</div>
            </div>
          </button>
          <button onClick={() => onNavigate('reports')} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-all text-start flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm text-slate-700">{t(lang, 'viewReports')}</div>
              <div className="text-xs text-slate-400">{t(lang, 'shiftHistory')}</div>
            </div>
          </button>
          <button onClick={() => onNavigate('shift')} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-all text-start flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-sm text-slate-700">{t(lang, 'manageShift')}</div>
              <div className="text-xs text-slate-400">{t(lang, 'shift')}</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof TrendingUp; label: string; value: string; color: 'primary' | 'accent' | 'success' | 'warning';
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-xl ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-slate-800 text-sm">{value}</div>
    </div>
  );
}
