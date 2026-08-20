import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { formatCurrency, formatTime } from '@/lib/format';
import { toast } from '@/components/Toast';
import { Modal, ConfirmDialog } from '@/components/Modal';
import type { Shift, Order } from '@/types';
import {
  Clock, Wallet, TrendingUp, UtensilsCrossed, ShoppingBag, Bike,
  FileBarChart, Trash2, Printer, Calendar, X,
} from 'lucide-react';

export function ShiftScreen() {
  const { lang, user, activeShift, setActiveShift, refreshShift } = useApp();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRecentOrders = useCallback(async () => {
    if (!activeShift) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('shift_id', activeShift.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentOrders((data as Order[]) || []);
  }, [activeShift]);

  useEffect(() => {
    loadRecentOrders();
  }, [loadRecentOrders]);

  const openShift = async () => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        status: 'open',
        opening_cash: parseFloat(openingCash) || 0,
        opened_by: user.id,
        opened_by_name: user.name,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    setActiveShift(data as Shift);
    setOpenModal(false);
    setOpeningCash('');
    toast('success', t(lang, 'shiftOpened'));
  };

  const closeShift = async () => {
    if (!activeShift || !user) return;
    setSubmitting(true);
    const actualClosing = parseFloat(closingCash) || 0;
    const expected = (activeShift.opening_cash || 0) + (activeShift.total_sales || 0);
    const { data, error } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closing_cash: actualClosing,
        expected_cash: expected,
        closed_by: user.id,
        closed_by_name: user.name,
        closed_at: new Date().toISOString(),
      })
      .eq('id', activeShift.id)
      .select()
      .single();
    setSubmitting(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    setActiveShift(null);
    setCloseModal(false);
    setClosingCash('');
    toast('success', t(lang, 'shiftClosed'));
    await refreshShift();
  };

  const difference = activeShift
    ? (parseFloat(closingCash) || 0) - ((activeShift.opening_cash || 0) + (activeShift.total_sales || 0))
    : 0;

  if (!activeShift) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-warning-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-warning-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">{t(lang, 'noActiveShift')}</h2>
          <p className="text-slate-500 mb-4">{t(lang, 'shiftRequired')}</p>
          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 mx-auto"
          >
            <Clock className="w-5 h-5" /> {t(lang, 'openShift')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Active Shift Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-primary-100 text-sm">{t(lang, 'shift')}</div>
            <div className="text-xl font-bold">{t(lang, 'openShift')}</div>
          </div>
          <button
            onClick={() => setCloseModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium text-sm transition-colors"
          >
            <Clock className="w-4 h-4" /> {t(lang, 'closeShift')}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-primary-100 text-xs">{t(lang, 'openedAt')}</div>
            <div className="font-semibold text-sm">{formatTime(activeShift.opened_at, lang)}</div>
          </div>
          <div>
            <div className="text-primary-100 text-xs">{t(lang, 'openedBy')}</div>
            <div className="font-semibold text-sm">{activeShift.opened_by_name}</div>
          </div>
          <div>
            <div className="text-primary-100 text-xs">{t(lang, 'openingCash')}</div>
            <div className="font-semibold text-sm">{formatCurrency(activeShift.opening_cash, lang)}</div>
          </div>
          <div>
            <div className="text-primary-100 text-xs">{t(lang, 'totalSales')}</div>
            <div className="font-semibold text-sm">{formatCurrency(activeShift.total_sales, lang)}</div>
          </div>
        </div>
      </div>

      {/* Sales Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-600" />
            </div>
            <span className="text-sm text-slate-500">{t(lang, 'dineIn')}</span>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(activeShift.total_dine_in, lang)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-accent-600" />
            </div>
            <span className="text-sm text-slate-500">{t(lang, 'takeaway')}</span>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(activeShift.total_takeaway, lang)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
              <Bike className="w-4 h-4 text-success-600" />
            </div>
            <span className="text-sm text-slate-500">{t(lang, 'delivery')}</span>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(activeShift.total_delivery, lang)}</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-3">{t(lang, 'recentOrders')}</h3>
        {recentOrders.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">{t(lang, 'noOrders')}</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {t(lang, order.type === 'dine_in' ? 'dineIn' : order.type === 'takeaway' ? 'takeaway' : 'delivery')}
                    {order.table_name && ` — ${order.table_name}`}
                    {order.customer_name && ` — ${order.customer_name}`}
                  </span>
                  <span className="text-xs text-slate-400 ms-2">{formatTime(order.created_at, lang)}</span>
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

      {/* Open Shift Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title={t(lang, 'openShift')}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'openingCash')}</label>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-lg font-bold focus:outline-none focus:border-primary-400"
              autoFocus
            />
          </div>
          <button
            onClick={openShift}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50"
          >
            {t(lang, 'openShift')}
          </button>
        </div>
      </Modal>

      {/* Close Shift Modal */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title={t(lang, 'closeShift')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500">{t(lang, 'openingCash')}</div>
              <div className="font-bold text-slate-700">{formatCurrency(activeShift.opening_cash, lang)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500">{t(lang, 'totalSales')}</div>
              <div className="font-bold text-slate-700">{formatCurrency(activeShift.total_sales, lang)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500">{t(lang, 'expectedCash')}</div>
              <div className="font-bold text-slate-700">{formatCurrency((activeShift.opening_cash || 0) + (activeShift.total_sales || 0), lang)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500">{t(lang, 'ordersCount')}</div>
              <div className="font-bold text-slate-700">{activeShift.orders_count || 0}</div>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'closingCash')}</label>
            <input
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-lg font-bold focus:outline-none focus:border-primary-400"
              autoFocus
            />
          </div>

          {closingCash && (
            <div className={`px-4 py-3 rounded-xl flex items-center justify-between ${
              difference >= 0 ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
            }`}>
              <span className="text-sm font-medium">
                {difference >= 0 ? t(lang, 'surplus') : t(lang, 'deficit')}
              </span>
              <span className="font-bold">{formatCurrency(Math.abs(difference), lang)}</span>
            </div>
          )}

          <button
            onClick={closeShift}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-error-500 text-white font-bold hover:bg-error-600 disabled:opacity-50"
          >
            {t(lang, 'closeShift')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ============ REPORTS SCREEN ============
export function ReportsScreen() {
  const { lang } = useApp();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Shift | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false });
    setShifts((data as Shift[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteShift = async (id: string) => {
    await supabase.from('shifts').delete().eq('id', id);
    toast('success', t(lang, 'deleted'));
    setDeleteConfirm(null);
    load();
  };

  const deleteRange = async () => {
    let query = supabase.from('shifts').delete().eq('status', 'closed');
    if (rangeFrom) query = query.gte('closed_at', rangeFrom);
    if (rangeTo) query = query.lte('closed_at', rangeTo + 'T23:59:59');
    await query;
    toast('success', t(lang, 'deleted'));
    setShowRangeModal(false);
    setRangeFrom('');
    setRangeTo('');
    load();
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-slate-400">{t(lang, 'loading')}</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">{t(lang, 'shiftHistory')}</h1>
        <button
          onClick={() => setShowRangeModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error-50 text-error-600 text-sm font-medium hover:bg-error-100"
        >
          <Calendar className="w-4 h-4" /> {t(lang, 'deleteShiftRange')}
        </button>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileBarChart className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>{t(lang, 'noReports')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-800">{t(lang, 'zReport')}</div>
                  <div className="text-xs text-slate-400">
                    {shift.closed_at ? formatTime(shift.closed_at, lang) : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(shift)}
                    className="p-2 rounded-lg bg-error-50 text-error-500 hover:bg-error-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'openedBy')}</div>
                  <div className="font-medium text-slate-700">{shift.opened_by_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'closedBy')}</div>
                  <div className="font-medium text-slate-700">{shift.closed_by_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'openingCash')}</div>
                  <div className="font-medium text-slate-700">{formatCurrency(shift.opening_cash, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'closingCash')}</div>
                  <div className="font-medium text-slate-700">{formatCurrency(shift.closing_cash, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'totalSales')}</div>
                  <div className="font-bold text-primary-600">{formatCurrency(shift.total_sales, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'ordersCount')}</div>
                  <div className="font-medium text-slate-700">{shift.orders_count}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'cashDifference')}</div>
                  <div className={`font-medium ${(shift.closing_cash - (shift.expected_cash || 0)) >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {(shift.closing_cash - (shift.expected_cash || 0)) >= 0 ? '+' : ''}
                    {formatCurrency(shift.closing_cash - (shift.expected_cash || 0), lang)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'expectedCash')}</div>
                  <div className="font-medium text-slate-700">{formatCurrency(shift.expected_cash, lang)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-primary-500" />
                  <span className="text-slate-500">{t(lang, 'dineIn')}:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(shift.total_dine_in, lang)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <ShoppingBag className="w-3.5 h-3.5 text-accent-500" />
                  <span className="text-slate-500">{t(lang, 'takeaway')}:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(shift.total_takeaway, lang)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Bike className="w-3.5 h-3.5 text-success-500" />
                  <span className="text-slate-500">{t(lang, 'delivery')}:</span>
                  <span className="font-medium text-slate-700">{formatCurrency(shift.total_delivery, lang)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title={t(lang, 'deleteReport')}
        message={t(lang, 'deleteShiftConfirm')}
        confirmText={t(lang, 'deleteItem')}
        cancelText={t(lang, 'cancel')}
        onConfirm={() => deleteConfirm && deleteShift(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        danger
      />

      <Modal open={showRangeModal} onClose={() => setShowRangeModal(false)} title={t(lang, 'deleteShiftRange')}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'from')}</label>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'to')}</label>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <button onClick={deleteRange} className="w-full py-2.5 rounded-xl bg-error-500 text-white font-bold text-sm hover:bg-error-600">
            {t(lang, 'deleteItem')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
