import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { formatCurrency, uid } from '@/lib/format';
import { toast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import type { Category, MenuItem, Modifier, RestaurantTable, CartItem, OrderType, Order } from '@/types';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, UtensilsCrossed, ShoppingBag, Bike,
  Check, Send, FileText, Wallet,
} from 'lucide-react';

export function POSScreen() {
  const { lang, user, activeShift, refreshShift } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [modifierModal, setModifierModal] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [tableModal, setTableModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  type CartModifier = { id: string; name: string; price: number };

  useEffect(() => {
    (async () => {
      const [catRes, itemRes, modRes, tableRes] = await Promise.all([
        supabase.from('categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('menu_items').select('*').order('sort_order'),
        supabase.from('modifiers').select('*').eq('active', true),
        supabase.from('restaurant_tables').select('*').eq('active', true).order('name'),
      ]);
      setCategories(catRes.data as Category[] || []);
      setMenuItems(itemRes.data as MenuItem[] || []);
      setModifiers(modRes.data as Modifier[] || []);
      setTables(tableRes.data as RestaurantTable[] || []);
    })();
  }, []);

  // Realtime: listen for sold-out toggles
  useEffect(() => {
    const channel = supabase
      .channel('menu_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
        setMenuItems((prev) => {
          if (payload.eventType === 'UPDATE') {
            return prev.map((item) =>
              item.id === (payload.new as MenuItem).id ? payload.new as MenuItem : item
            );
          }
          if (payload.eventType === 'INSERT') return [...prev, payload.new as MenuItem];
          if (payload.eventType === 'DELETE') {
            return prev.filter((item) => item.id !== (payload.old as MenuItem).id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (activeCategory !== 'all') {
      items = items.filter((i) => i.category_id === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) => i.name_ar.toLowerCase().includes(q) || i.name_fr.toLowerCase().includes(q)
      );
    }
    return items;
  }, [menuItems, activeCategory, search]);

  const getItemName = useCallback((item: { name_ar: string; name_fr: string }) => {
    return lang === 'ar' ? item.name_ar : item.name_fr;
  }, [lang]);

  const openModifierModal = (item: MenuItem) => {
    if (!item.active) return;
    const itemMods = modifiers.filter((m) => m.menu_item_id === item.id);
    if (itemMods.length === 0) {
      addToCart(item, [], '');
      return;
    }
    setModifierModal(item);
    setSelectedModifiers([]);
    setItemNotes('');
  };

  const addToCart = (item: MenuItem, mods: CartModifier[], notes: string) => {
    const existing = cart.find(
      (c) => c.menu_item_id === item.id && c.notes === notes &&
      JSON.stringify(c.modifiers) === JSON.stringify(mods)
    );
    if (existing) {
      setCart(cart.map((c) =>
        c.uid === existing.uid ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        uid: uid(),
        menu_item_id: item.id,
        name_ar: item.name_ar,
        name_fr: item.name_fr,
        price: item.price,
        quantity: 1,
        notes,
        modifiers: mods,
      }]);
    }
    setModifierModal(null);
  };

  const updateQty = (uidStr: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.uid === uidStr) {
        const q = c.quantity + delta;
        return q <= 0 ? null : { ...c, quantity: q };
      }
      return c;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (uidStr: string) => {
    setCart(cart.filter((c) => c.uid !== uidStr));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  const toggleModifier = (mod: Modifier) => {
    const exists = selectedModifiers.find((m) => m.id === mod.id);
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter((m) => m.id !== mod.id));
    } else {
      setSelectedModifiers([...selectedModifiers, {
        id: mod.id,
        name: getItemName(mod),
        price: mod.price,
      }]);
    }
  };

  const canPlaceOrder = () => {
    if (cart.length === 0) return false;
    if (orderType === 'dine_in' && !selectedTable) return false;
    if (orderType === 'delivery' && !customerName) return false;
    return true;
  };

  const placeOrder = async () => {
    if (!user || !activeShift || !canPlaceOrder()) return;
    setSubmitting(true);
    try {
      const subtotal = cartTotal;
      const orderData = {
        type: orderType,
        table_id: selectedTable?.id || null,
        table_name: selectedTable?.name || '',
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        status: 'pending' as const,
        payment_status: 'unpaid' as const,
        subtotal,
        total: subtotal,
        shift_id: activeShift.id,
        staff_id: user.id,
        staff_name: user.name,
        notes: orderNotes,
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      const orderItems = cart.map((c) => ({
        order_id: (order as Order).id,
        menu_item_id: c.menu_item_id,
        name_ar: c.name_ar,
        name_fr: c.name_fr,
        price: c.price,
        quantity: c.quantity,
        notes: c.notes,
        modifiers: c.modifiers.map((m) => ({ name: m.name, price: m.price })),
        status: 'pending' as const,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      toast('success', t(lang, 'orderPlaced'));
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setOrderNotes('');
      setSelectedTable(null);
    } catch (err) {
      console.error(err);
      toast('error', t(lang, 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Payment flow: cashier collects payment and marks order as paid
  const [payOrderModal, setPayOrderModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);

  const loadActiveOrders = useCallback(async () => {
    if (!activeShift) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('shift_id', activeShift.id)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: false });
    setActiveOrders((data as Order[]) || []);
  }, [activeShift]);

  useEffect(() => {
    loadActiveOrders();
    const channel = supabase
      .channel('orders_changes_pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadActiveOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadActiveOrders]);

  const processPayment = async () => {
    if (!payingOrder || !user) return;
    try {
      const paid = parseFloat(amountPaid) || payingOrder.total;
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payingOrder.id);
      if (error) throw error;

      // Update shift totals
      if (activeShift) {
        const newTotal = (activeShift.total_sales || 0) + payingOrder.total;
        const channelKey = payingOrder.type === 'dine_in' ? 'total_dine_in' :
          payingOrder.type === 'takeaway' ? 'total_takeaway' : 'total_delivery';
        const updates = {
          total_sales: newTotal,
          orders_count: (activeShift.orders_count || 0) + 1,
          [channelKey]: (activeShift[channelKey as 'total_dine_in'] || 0) + payingOrder.total,
        };
        await supabase.from('shifts').update(updates).eq('id', activeShift.id);
        await refreshShift();
      }

      toast('success', t(lang, 'paymentSuccess'));
      setPayOrderModal(false);
      setPayingOrder(null);
      setAmountPaid('');
      loadActiveOrders();
    } catch (err) {
      console.error(err);
      toast('error', t(lang, 'error'));
    }
  };

  const isCashier = user?.role === 'cashier' || user?.role === 'admin';

  if (!activeShift) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-warning-50 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-warning-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">{t(lang, 'shiftRequired')}</h2>
          <p className="text-slate-500">{t(lang, 'noActiveShift')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Order Type Selector */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex gap-2">
            {(['dine_in', 'takeaway', 'delivery'] as OrderType[]).map((type) => {
              const Icon = type === 'dine_in' ? UtensilsCrossed : type === 'takeaway' ? ShoppingBag : Bike;
              return (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    orderType === type
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(lang, type === 'dine_in' ? 'dineIn' : type === 'takeaway' ? 'takeaway' : 'delivery')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(lang, 'search')}
              className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t(lang, 'allItems')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {getItemName(cat)}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => openModifierModal(item)}
                disabled={!item.active}
                className={`relative p-4 rounded-2xl border text-start transition-all ${
                  item.active
                    ? 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-lg active:scale-95'
                    : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                {!item.active && (
                  <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-error-100 text-error-600 text-xs font-medium">
                    {t(lang, 'soldOut')}
                  </span>
                )}
                <div className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">
                  {getItemName(item)}
                </div>
                <div className="text-xs text-slate-400 line-clamp-1 mb-2">
                  {lang === 'ar' ? item.description_ar : item.description_fr}
                </div>
                <div className="text-primary-600 font-bold text-sm">
                  {formatCurrency(item.price, lang)}
                </div>
              </button>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-slate-400">{t(lang, 'noData')}</div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-80 lg:w-96 bg-white border-s border-slate-200 flex flex-col shrink-0">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-600" />
            <span className="font-bold text-slate-800">{t(lang, 'cart')}</span>
            <span className="text-sm text-slate-400">({cart.length})</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-error-500 hover:text-error-600 font-medium"
            >
              {t(lang, 'clearCart')}
            </button>
          )}
        </div>

        {/* Order Details */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          {orderType === 'dine_in' && (
            <button
              onClick={() => setTableModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
            >
              <span className="text-slate-500">{t(lang, 'selectTable')}</span>
              <span className="font-medium text-slate-700">
                {selectedTable ? selectedTable.name : '—'}
              </span>
            </button>
          )}
          {(orderType === 'takeaway' || orderType === 'delivery') && (
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t(lang, 'customerName')}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
            />
          )}
          {orderType === 'delivery' && (
            <>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={t(lang, 'customerPhone')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
              />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder={t(lang, 'deliveryAddress')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
              />
            </>
          )}
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder={t(lang, 'notes')}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t(lang, 'empty')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.uid} className="py-3 border-b border-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700">{getItemName(item)}</div>
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.modifiers.map((m) => m.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.uid)}
                    className="text-slate-300 hover:text-error-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.uid, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.uid, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-bold text-sm text-primary-600">
                    {formatCurrency((item.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity, lang)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="px-4 py-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">{t(lang, 'total')}</span>
            <span className="text-xl font-bold text-slate-800">{formatCurrency(cartTotal, lang)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={!canPlaceOrder() || submitting}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t(lang, 'placeOrder')}
          </button>

          {isCashier && (
            <button
              onClick={() => { setPayOrderModal(true); loadActiveOrders(); }}
              className="w-full py-2.5 rounded-xl bg-success-50 text-success-700 font-medium text-sm hover:bg-success-100 transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {t(lang, 'pay')} ({activeOrders.filter(o => o.payment_status === 'unpaid').length})
            </button>
          )}
        </div>
      </div>

      {/* Modifier Modal */}
      <Modal open={!!modifierModal} onClose={() => setModifierModal(null)} title={modifierModal ? getItemName(modifierModal) : ''}>
        {modifierModal && (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">{t(lang, 'modifiers')}</div>
            <div className="space-y-2">
              {modifiers.filter((m) => m.menu_item_id === modifierModal.id).map((mod) => {
                const selected = selectedModifiers.some((m) => m.id === mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      selected ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'
                      }`}>
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="font-medium text-sm text-slate-700">{getItemName(mod)}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">
                      {mod.price > 0 ? `+${formatCurrency(mod.price, lang)}` : t(lang, 'free')}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-sm text-slate-500 mb-1.5 block">{t(lang, 'notes')}</label>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder={t(lang, 'addNote')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>

            <button
              onClick={() => addToCart(modifierModal, selectedModifiers, itemNotes)}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-colors"
            >
              {t(lang, 'addToCart')} — {formatCurrency(modifierModal.price + selectedModifiers.reduce((s, m) => s + m.price, 0), lang)}
            </button>
          </div>
        )}
      </Modal>

      {/* Table Selection Modal */}
      <Modal open={tableModal} onClose={() => setTableModal(false)} title={t(lang, 'selectTable')} size="lg">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => {
                setSelectedTable(table);
                setTableModal(false);
              }}
              className={`p-4 rounded-2xl border-2 transition-all ${
                selectedTable?.id === table.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-primary-300'
              }`}
            >
              <div className="font-bold text-slate-800">{table.name}</div>
              <div className="text-xs text-slate-400">{table.seats} {t(lang, 'seats')}</div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={payOrderModal} onClose={() => setPayOrderModal(false)} title={t(lang, 'pay')} size="lg">
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400">{t(lang, 'noOrders')}</div>
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setPayingOrder(order);
                      setAmountPaid(order.total.toString());
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      payingOrder?.id === order.id
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-start">
                      <div className="font-semibold text-sm text-slate-700">
                        {t(lang, order.type === 'dine_in' ? 'dineIn' : order.type === 'takeaway' ? 'takeaway' : 'delivery')}
                        {order.table_name && ` — ${order.table_name}`}
                        {order.customer_name && ` — ${order.customer_name}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {order.payment_status === 'paid' ? t(lang, 'completed') : t(lang, 'pending')}
                      </div>
                    </div>
                    <span className="font-bold text-primary-600">{formatCurrency(order.total, lang)}</span>
                  </button>
                ))}
              </div>

              {payingOrder && (
                <div className="border-t border-slate-100 pt-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t(lang, 'amountDue')}</span>
                    <span className="text-xl font-bold text-slate-800">{formatCurrency(payingOrder.total, lang)}</span>
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1.5 block">{t(lang, 'paymentMethod')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === 'cash' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <Wallet className="w-4 h-4" /> {t(lang, 'cash')}
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === 'card' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> {t(lang, 'card')}
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div>
                      <label className="text-sm text-slate-500 mb-1.5 block">{t(lang, 'amountPaid')}</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-bold focus:outline-none focus:border-primary-400"
                      />
                      {parseFloat(amountPaid) > payingOrder.total && (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-slate-500">{t(lang, 'change')}</span>
                          <span className="font-bold text-success-600">
                            {formatCurrency(parseFloat(amountPaid) - payingOrder.total, lang)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={processPayment}
                    className="w-full py-3 rounded-xl bg-success-500 text-white font-bold text-sm hover:bg-success-600 transition-colors"
                  >
                    {t(lang, 'confirmPayment')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
