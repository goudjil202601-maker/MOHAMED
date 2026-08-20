import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { validateLicenseKey } from '@/lib/fingerprint';
import { toast } from '@/components/Toast';
import { Modal, ConfirmDialog } from '@/components/Modal';
import type { Category, MenuItem, Modifier, Staff, Role, RestaurantInfo, PrinterConfig } from '@/types';
import {
  UtensilsCrossed, Users, Store, Printer, Shield, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, Save, Key, AlertTriangle,
} from 'lucide-react';

type Tab = 'menu' | 'users' | 'restaurant' | 'printers' | 'license' | 'reset';

export function SettingsScreen() {
  const { lang, user, fingerprint, refreshLicense } = useApp();
  const [tab, setTab] = useState<Tab>('menu');

  if (user?.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        {t(lang, 'staffOnly')}
      </div>
    );
  }

  const tabs: { key: Tab; icon: typeof UtensilsCrossed; label: string }[] = [
    { key: 'menu', icon: UtensilsCrossed, label: t(lang, 'menu') },
    { key: 'users', icon: Users, label: t(lang, 'users') },
    { key: 'restaurant', icon: Store, label: t(lang, 'restaurantInfo') },
    { key: 'printers', icon: Printer, label: t(lang, 'printerSettings') },
    { key: 'license', icon: Key, label: t(lang, 'license') },
    { key: 'reset', icon: AlertTriangle, label: t(lang, 'factoryReset') },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 mb-3">{t(lang, 'settings')}</h1>
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === item.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'menu' && <MenuTab lang={lang} />}
        {tab === 'users' && <UsersTab lang={lang} />}
        {tab === 'restaurant' && <RestaurantTab lang={lang} />}
        {tab === 'printers' && <PrintersTab lang={lang} />}
        {tab === 'license' && <LicenseTab lang={lang} fingerprint={fingerprint} refreshLicense={refreshLicense} />}
        {tab === 'reset' && <ResetTab lang={lang} />}
      </div>
    </div>
  );
}

// ============ MENU TAB ============
function MenuTab({ lang }: { lang: 'ar' | 'fr' }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [activeCat, setActiveCat] = useState<string>('');
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showModModal, setShowModModal] = useState(false);
  const [editModsFor, setEditModsFor] = useState<MenuItem | null>(null);

  const load = useCallback(async () => {
    const [catRes, itemRes, modRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('modifiers').select('*'),
    ]);
    setCategories(catRes.data as Category[] || []);
    setItems(itemRes.data as MenuItem[] || []);
    setModifiers(modRes.data as Modifier[] || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ active: !item.active })
      .eq('id', item.id);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'updated'));
    load();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'deleted'));
    load();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'deleted'));
    load();
  };

  const filteredItems = activeCat ? items.filter((i) => i.category_id === activeCat) : items;

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">{t(lang, 'category')}</h3>
          <button
            onClick={() => { setEditCat(null); setShowCatModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <Plus className="w-4 h-4" /> {t(lang, 'addCategory')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              !activeCat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t(lang, 'allItems')}
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveCat(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  activeCat === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {lang === 'ar' ? cat.name_ar : cat.name_fr}
              </button>
              <button
                onClick={() => { setEditCat(cat); setShowCatModal(true); }}
                className="text-slate-400 hover:text-primary-600 p-0.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="text-slate-300 hover:text-error-500 p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">{t(lang, 'menu')}</h3>
          <button
            onClick={() => { setEditItem(null); setShowItemModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <Plus className="w-4 h-4" /> {t(lang, 'addItem')}
          </button>
        </div>
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <button onClick={() => toggleActive(item)} className="shrink-0">
                {item.active
                  ? <ToggleRight className="w-8 h-8 text-success-500" />
                  : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${item.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                  {lang === 'ar' ? item.name_ar : item.name_fr}
                </div>
                <div className="text-xs text-slate-400">{formatCurrency(item.price, lang)}</div>
              </div>
              <button
                onClick={() => { setEditModsFor(item); setShowModModal(true); }}
                className="text-xs px-2 py-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                {t(lang, 'modifiers')} ({modifiers.filter((m) => m.menu_item_id === item.id).length})
              </button>
              <button
                onClick={() => { setEditItem(item); setShowItemModal(true); }}
                className="text-slate-400 hover:text-primary-600 p-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-slate-300 hover:text-error-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showItemModal && (
        <ItemEditModal
          lang={lang}
          item={editItem}
          categories={categories}
          onClose={() => setShowItemModal(false)}
          onSaved={() => { setShowItemModal(false); load(); }}
        />
      )}
      {showCatModal && (
        <CategoryEditModal
          lang={lang}
          category={editCat}
          onClose={() => setShowCatModal(false)}
          onSaved={() => { setShowCatModal(false); load(); }}
        />
      )}
      {showModModal && editModsFor && (
        <ModifierModal
          lang={lang}
          item={editModsFor}
          modifiers={modifiers.filter((m) => m.menu_item_id === editModsFor.id)}
          onClose={() => { setShowModModal(false); setEditModsFor(null); }}
          onSaved={() => { load(); }}
        />
      )}
    </div>
  );
}

function ItemEditModal({ lang, item, categories, onClose, onSaved }: {
  lang: 'ar' | 'fr'; item: MenuItem | null; categories: Category[];
  onClose: () => void; onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(item?.name_ar || '');
  const [nameFr, setNameFr] = useState(item?.name_fr || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [descAr, setDescAr] = useState(item?.description_ar || '');
  const [descFr, setDescFr] = useState(item?.description_fr || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '');
  const [active, setActive] = useState(item?.active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nameAr || !nameFr || !price) { toast('error', t(lang, 'error')); return; }
    setSaving(true);
    const data = {
      name_ar: nameAr, name_fr: nameFr,
      price: parseFloat(price),
      description_ar: descAr, description_fr: descFr,
      category_id: categoryId || null,
      active,
    };
    const { error } = item
      ? await supabase.from('menu_items').update(data).eq('id', item.id)
      : await supabase.from('menu_items').insert(data);
    setSaving(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'saved'));
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={item ? t(lang, 'editItem') : t(lang, 'addItem')}>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'nameAr')}</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'nameFr')}</label>
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'price')}</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'category')}</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400">
            {categories.map((c) => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_fr}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'description')} ({t(lang, 'nameAr')})</label>
          <input value={descAr} onChange={(e) => setDescAr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'description')} ({t(lang, 'nameFr')})</label>
          <input value={descFr} onChange={(e) => setDescFr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <button onClick={() => setActive(!active)} className="flex items-center gap-2 text-sm">
          {active ? <ToggleRight className="w-7 h-7 text-success-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
          {active ? t(lang, 'available') : t(lang, 'soldOut')}
        </button>
        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50">
          {t(lang, 'save')}
        </button>
      </div>
    </Modal>
  );
}

function CategoryEditModal({ lang, category, onClose, onSaved }: {
  lang: 'ar' | 'fr'; category: Category | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(category?.name_ar || '');
  const [nameFr, setNameFr] = useState(category?.name_fr || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nameAr || !nameFr) return;
    setSaving(true);
    const data = { name_ar: nameAr, name_fr: nameFr };
    const { error } = category
      ? await supabase.from('categories').update(data).eq('id', category.id)
      : await supabase.from('categories').insert(data);
    setSaving(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'saved'));
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={t(lang, 'addCategory')}>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'nameAr')}</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'nameFr')}</label>
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50">
          {t(lang, 'save')}
        </button>
      </div>
    </Modal>
  );
}

function ModifierModal({ lang, item, modifiers, onClose, onSaved }: {
  lang: 'ar' | 'fr'; item: MenuItem; modifiers: Modifier[];
  onClose: () => void; onSaved: () => void;
}) {
  const [list, setList] = useState<Modifier[]>(modifiers);
  const [nameAr, setNameAr] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!nameAr || !nameFr) return;
    setSaving(true);
    const { error } = await supabase.from('modifiers').insert({
      menu_item_id: item.id, name_ar: nameAr, name_fr: nameFr, price: parseFloat(price) || 0,
    });
    setSaving(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    setNameAr(''); setNameFr(''); setPrice('0');
    const { data } = await supabase.from('modifiers').select('*').eq('menu_item_id', item.id);
    setList(data as Modifier[] || []);
    onSaved();
  };

  const del = async (id: string) => {
    await supabase.from('modifiers').delete().eq('id', id);
    setList(list.filter((m) => m.id !== id));
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={`${t(lang, 'modifiers')} — ${lang === 'ar' ? item.name_ar : item.name_fr}`}>
      <div className="space-y-3">
        {list.map((mod) => (
          <div key={mod.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
            <div>
              <span className="text-sm font-medium text-slate-700">{lang === 'ar' ? mod.name_ar : mod.name_fr}</span>
              <span className="text-xs text-slate-400 ms-2">
                {mod.price > 0 ? `+${formatCurrency(mod.price, lang)}` : t(lang, 'free')}
              </span>
            </div>
            <button onClick={() => del(mod.id)} className="text-slate-300 hover:text-error-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t(lang, 'nameAr')} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} placeholder={t(lang, 'nameFr')} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t(lang, 'price')} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          <button onClick={add} disabled={saving} className="w-full py-2 rounded-xl bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> {t(lang, 'addModifier')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============ USERS TAB ============
function UsersTab({ lang }: { lang: 'ar' | 'fr' }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('staff').select('*').order('created_at');
    setStaff(data as Staff[] || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id);
    toast('success', t(lang, 'deleted'));
    load();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800">{t(lang, 'users')}</h3>
        <button
          onClick={() => { setEditStaff(null); setShowModal(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100"
        >
          <Plus className="w-4 h-4" /> {t(lang, 'addUser')}
        </button>
      </div>
      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              s.role === 'admin' ? 'bg-primary-600' : s.role === 'cashier' ? 'bg-success-500' :
              s.role === 'waiter' ? 'bg-accent-500' : 'bg-slate-600'
            }`}>
              {s.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-slate-700">{s.name}</div>
              <div className="text-xs text-slate-400">{t(lang, `role_${s.role}` as 'role_admin')}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${s.active ? 'bg-success-100 text-success-700' : 'bg-slate-200 text-slate-500'}`}>
              {s.active ? t(lang, 'active') : t(lang, 'disabled')}
            </span>
            <button onClick={() => { setEditStaff(s); setShowModal(true); }} className="text-slate-400 hover:text-primary-600 p-1">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => del(s.id)} className="text-slate-300 hover:text-error-500 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <StaffEditModal lang={lang} staff={editStaff} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function StaffEditModal({ lang, staff, onClose, onSaved }: {
  lang: 'ar' | 'fr'; staff: Staff | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(staff?.name || '');
  const [role, setRole] = useState<Role>(staff?.role || 'cashier');
  const [pin, setPin] = useState(staff?.pin || '');
  const [active, setActive] = useState(staff?.active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !pin || pin.length < 4) { toast('error', t(lang, 'error')); return; }
    setSaving(true);
    const data = { name, role, pin, active };
    const { error } = staff
      ? await supabase.from('staff').update(data).eq('id', staff.id)
      : await supabase.from('staff').insert(data);
    setSaving(false);
    if (error) { toast('error', t(lang, 'error')); return; }
    toast('success', t(lang, 'saved'));
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={staff ? t(lang, 'editItem') : t(lang, 'addUser')}>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'role')}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400">
            <option value="admin">{t(lang, 'admin')}</option>
            <option value="cashier">{t(lang, 'cashier')}</option>
            <option value="waiter">{t(lang, 'waiter')}</option>
            <option value="kitchen">{t(lang, 'kitchenRole')}</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'pin')}</label>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
        </div>
        <button onClick={() => setActive(!active)} className="flex items-center gap-2 text-sm">
          {active ? <ToggleRight className="w-7 h-7 text-success-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
          {active ? t(lang, 'active') : t(lang, 'disabled')}
        </button>
        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50">
          {t(lang, 'save')}
        </button>
      </div>
    </Modal>
  );
}

// ============ RESTAURANT TAB ============
function RestaurantTab({ lang }: { lang: 'ar' | 'fr' }) {
  const [info, setInfo] = useState<RestaurantInfo>({ name: '', phone: '', address: '', logo: '' });
  const [tables, setTables] = useState<{ id: string; name: string; seats: number; active: boolean }[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('4');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'restaurant').maybeSingle();
      if (data?.value) setInfo(data.value as RestaurantInfo);
      const { data: tableData } = await supabase.from('restaurant_tables').select('*').order('name');
      setTables(tableData || []);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from('settings').upsert({
      key: 'restaurant',
      value: info,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    setSaving(false);
    toast('success', t(lang, 'saved'));
  };

  const addTable = async () => {
    if (!newTableName) return;
    await supabase.from('restaurant_tables').insert({ name: newTableName, seats: parseInt(newTableSeats) || 4 });
    setNewTableName('');
    setNewTableSeats('4');
    const { data } = await supabase.from('restaurant_tables').select('*').order('name');
    setTables(data || []);
  };

  const delTable = async (id: string) => {
    await supabase.from('restaurant_tables').delete().eq('id', id);
    setTables(tables.filter((t) => t.id !== id));
  };

  const toggleTable = async (id: string, current: boolean) => {
    await supabase.from('restaurant_tables').update({ active: !current }).eq('id', id);
    setTables(tables.map((t) => t.id === id ? { ...t, active: !current } : t));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-3">{t(lang, 'restaurantInfo')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'restaurantName')}</label>
            <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'phone')}</label>
            <input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'address')}</label>
            <input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {t(lang, 'save')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-3">{t(lang, 'tables')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
          {tables.map((table) => (
            <div key={table.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
              <button onClick={() => toggleTable(table.id, table.active)}>
                {table.active ? <ToggleRight className="w-7 h-7 text-success-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
              </button>
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-700">{table.name}</div>
                <div className="text-xs text-slate-400">{table.seats} {t(lang, 'seats')}</div>
              </div>
              <button onClick={() => delTable(table.id)} className="text-slate-300 hover:text-error-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder={t(lang, 'tableName')} className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          <input type="number" value={newTableSeats} onChange={(e) => setNewTableSeats(e.target.value)} className="w-20 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400" />
          <button onClick={addTable} className="px-3 py-2 rounded-lg bg-primary-50 text-primary-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PRINTERS TAB ============
function PrintersTab({ lang }: { lang: 'ar' | 'fr' }) {
  const [config, setConfig] = useState<PrinterConfig>({ cashier: null, kitchen: null, bar: null });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'printers').maybeSingle();
      if (data?.value) setConfig(data.value as PrinterConfig);
    })();
  }, []);

  const detectPrinters = async () => {
    setDetecting(true);
    // Web browsers don't expose USB printers directly. Use the Web USB API if available,
    // otherwise simulate with the browser's print spooler.
    try {
      // Try WebUSB
      if ('usb' in navigator) {
        try {
          const devices = await (navigator as Navigator & { usb?: { requestDevice: (opts: { filters: unknown[] }) => Promise<unknown[]> } }).usb?.requestDevice({ filters: [] });
          if (devices && Array.isArray(devices)) {
            setAvailablePrinters(devices.map((_, i) => `USB Printer ${i + 1}`));
          }
        } catch { /* user cancelled */ }
      }
      // Fallback: browser print
      if (availablePrinters.length === 0) {
        setAvailablePrinters(['Browser Print (Default)', 'Browser Print (Receipt)', 'Browser Print (Kitchen)']);
      }
    } finally {
      setDetecting(false);
    }
  };

  const saveConfig = async () => {
    await supabase.from('settings').upsert({
      key: 'printers',
      value: config,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    toast('success', t(lang, 'saved'));
  };

  const testPrint = () => {
    window.print();
  };

  const printerRoles: { key: keyof PrinterConfig; label: string }[] = [
    { key: 'cashier', label: t(lang, 'cashierPrinter') },
    { key: 'kitchen', label: t(lang, 'kitchenPrinter') },
    { key: 'bar', label: t(lang, 'barPrinter') },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 max-w-2xl">
      <h3 className="font-bold text-slate-800 mb-3">{t(lang, 'printerSettings')}</h3>

      <button
        onClick={detectPrinters}
        disabled={detecting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 mb-4"
      >
        <Printer className="w-4 h-4" />
        {detecting ? t(lang, 'loading') : t(lang, 'detectPrinters')}
      </button>

      <div className="space-y-3">
        {printerRoles.map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm text-slate-500 mb-1 block">{label}</label>
            <select
              value={config[key] || ''}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
            >
              <option value="">{t(lang, 'noPrinters')}</option>
              {availablePrinters.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={saveConfig} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700">
          <Save className="w-4 h-4" /> {t(lang, 'save')}
        </button>
        <button onClick={testPrint} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200">
          <Printer className="w-4 h-4" /> {t(lang, 'testPrint')}
        </button>
      </div>
    </div>
  );
}

// ============ LICENSE TAB ============
function LicenseTab({ lang, fingerprint, refreshLicense }: {
  lang: 'ar' | 'fr'; fingerprint: string; refreshLicense: () => Promise<void>;
}) {
  const { licenseType } = useApp();
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);

  const activate = async () => {
    if (!key || !fingerprint) return;
    setActivating(true);
    const type = validateLicenseKey(key, fingerprint);
    if (!type) {
      toast('error', t(lang, 'invalidKey'));
      setActivating(false);
      return;
    }
    await supabase.from('settings').upsert({
      key: 'license',
      value: { type, key, activatedAt: new Date().toISOString(), fingerprint },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    await refreshLicense();
    toast('success', t(lang, 'licenseActivated'));
    setKey('');
    setActivating(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-slate-800">{t(lang, 'license')}</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'hardwareFingerprint')}</label>
            <div className="px-3 py-2.5 rounded-lg bg-slate-900 text-success-400 font-mono text-sm break-all">
              {fingerprint || '—'}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'licenseType')}</label>
            <div className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
              licenseType === 'lifetime' ? 'bg-primary-50 text-primary-700' :
              licenseType === 'trial' ? 'bg-warning-50 text-warning-700' :
              'bg-error-50 text-error-700'
            }`}>
              {licenseType === 'lifetime' ? t(lang, 'lifetime') :
               licenseType === 'trial' ? t(lang, 'trial') : t(lang, 'none')}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block">{t(lang, 'licenseKey')}</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t(lang, 'licenseKey')}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-primary-400"
            />
          </div>

          <button
            onClick={activate}
            disabled={activating || !key}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Key className="w-4 h-4" /> {t(lang, 'activate')}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">
          {t(lang, 'antiCloneWarning')}
        </p>
      </div>
    </div>
  );
}

// ============ RESET TAB ============
function ResetTab({ lang }: { lang: 'ar' | 'fr' }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    setResetting(true);
    // Verify admin PIN
    const { data: admin } = await supabase.from('staff').select('pin').eq('role', 'admin').limit(1).maybeSingle();
    if ((admin as { pin: string } | null)?.pin !== adminPin) {
      toast('error', t(lang, 'wrongPin'));
      setResetting(false);
      return;
    }

    // Delete all operational data but keep menu (categories, menu_items, modifiers)
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    setResetting(false);
    setShowConfirm(false);
    setAdminPin('');
    toast('success', t(lang, 'success'));
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-error-50 rounded-2xl border-2 border-error-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-error-600" />
          <h3 className="font-bold text-error-700">{t(lang, 'factoryReset')}</h3>
        </div>
        <p className="text-sm text-error-600 mb-4">{t(lang, 'resetWarning')}</p>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2.5 rounded-xl bg-error-500 text-white font-bold text-sm hover:bg-error-600"
        >
          {t(lang, 'reset')}
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title={t(lang, 'factoryReset')}
        message={t(lang, 'enterAdminPassword')}
        confirmText={t(lang, 'reset')}
        cancelText={t(lang, 'cancel')}
        onConfirm={doReset}
        onCancel={() => { setShowConfirm(false); setAdminPin(''); }}
        danger
      />

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder={t(lang, 'pin')}
              maxLength={6}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary-400 mb-3"
              autoFocus
            />
            <button
              onClick={doReset}
              disabled={resetting || !adminPin}
              className="w-full py-2.5 rounded-xl bg-error-500 text-white font-bold text-sm hover:bg-error-600 disabled:opacity-50"
            >
              {resetting ? t(lang, 'loading') : t(lang, 'reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
