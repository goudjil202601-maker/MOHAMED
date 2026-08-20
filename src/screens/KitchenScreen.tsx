import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { formatTime } from '@/lib/format';
import { toast } from '@/components/Toast';
import type { Order, OrderItem, ItemStatus } from '@/types';
import { ChefHat, Clock, Flame, CheckCircle2, UtensilsCrossed, ShoppingBag, Bike } from 'lucide-react';

export function KitchenScreen() {
  const { lang } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel('kds_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadOrders]);

  const updateItemStatus = async (itemId: string, status: ItemStatus) => {
    const { error } = await supabase
      .from('order_items')
      .update({ status })
      .eq('id', itemId);
    if (error) {
      toast('error', t(lang, 'error'));
      return;
    }
    loadOrders();
  };

  const markOrderReady = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId);
    if (error) {
      toast('error', t(lang, 'error'));
      return;
    }
    toast('success', t(lang, 'ready'));
    loadOrders();
  };

  const completeOrder = async (orderId: string) => {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', orderId);
    if (orderError) {
      toast('error', t(lang, 'error'));
      return;
    }
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({ status: 'ready' })
      .eq('order_id', orderId);
    if (itemsError) {
      // non-critical
    }
    toast('success', t(lang, 'completed'));
    loadOrders();
  };

  const getElapsedMinutes = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  const getCardColor = (order: Order) => {
    const mins = getElapsedMinutes(order.created_at);
    if (order.status === 'ready') return 'border-success-300 bg-success-50';
    if (mins >= 15) return 'border-error-300 bg-error-50';
    if (mins >= 10) return 'border-warning-300 bg-warning-50';
    return 'border-slate-200 bg-white';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'dine_in') return <UtensilsCrossed className="w-4 h-4" />;
    if (type === 'takeaway') return <ShoppingBag className="w-4 h-4" />;
    return <Bike className="w-4 h-4" />;
  };

  const getItemName = (item: { name_ar: string; name_fr: string }) => {
    return lang === 'ar' ? item.name_ar : item.name_fr;
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-slate-400">{t(lang, 'loading')}</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <ChefHat className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-bold text-slate-800">{t(lang, 'kitchen')}</h1>
        <span className="text-sm text-slate-400">({orders.length})</span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ChefHat className="w-16 h-16 mb-3 opacity-30" />
          <p className="font-medium">{t(lang, 'noOrders')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const mins = getElapsedMinutes(order.created_at);
            const allReady = (order.order_items || []).every((i) => i.status === 'ready');
            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 p-4 transition-all animate-fade-in ${getCardColor(order)}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-xs font-medium text-slate-600">
                      {getTypeIcon(order.type)}
                      {t(lang, order.type === 'dine_in' ? 'dineIn' : order.type === 'takeaway' ? 'takeaway' : 'delivery')}
                    </span>
                    {order.table_name && (
                      <span className="px-2 py-1 rounded-lg bg-white/80 text-xs font-bold text-slate-700">
                        {order.table_name}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${
                    mins >= 15 ? 'text-error-600' : mins >= 10 ? 'text-warning-600' : 'text-slate-500'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {mins}m
                  </div>
                </div>

                {order.customer_name && (
                  <div className="text-xs text-slate-500 mb-2">{order.customer_name}</div>
                )}
                {order.notes && (
                  <div className="text-xs text-warning-600 bg-warning-50 rounded-lg px-2 py-1 mb-2">
                    {order.notes}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2 mb-3">
                  {(order.order_items || []).map((item: OrderItem) => (
                    <div key={item.id} className="bg-white/60 rounded-xl p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-slate-700">
                            {item.quantity}× {getItemName(item)}
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {item.modifiers.map((m) => m.name).join(', ')}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</div>
                          )}
                        </div>
                        {/* Item status buttons */}
                        <div className="flex gap-1 shrink-0">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateItemStatus(item.id, 'preparing')}
                              className="px-2 py-1 rounded-lg bg-warning-100 text-warning-700 text-xs font-medium hover:bg-warning-200 transition-colors flex items-center gap-1"
                            >
                              <Flame className="w-3 h-3" />
                              {t(lang, 'preparing')}
                            </button>
                          )}
                          {item.status === 'preparing' && (
                            <button
                              onClick={() => updateItemStatus(item.id, 'ready')}
                              className="px-2 py-1 rounded-lg bg-success-100 text-success-700 text-xs font-medium hover:bg-success-200 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {t(lang, 'ready')}
                            </button>
                          )}
                          {item.status === 'ready' && (
                            <span className="px-2 py-1 rounded-lg bg-success-100 text-success-700 text-xs font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {t(lang, 'ready')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-2">
                  {order.status !== 'ready' && (
                    <button
                      onClick={() => markOrderReady(order.id)}
                      className="flex-1 py-2 rounded-xl bg-success-500 text-white text-sm font-bold hover:bg-success-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t(lang, 'ready')}
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="flex-1 py-2 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t(lang, 'completed')}
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 mt-2 text-center">
                  {formatTime(order.created_at, lang)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
