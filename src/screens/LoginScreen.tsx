import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import type { Staff } from '@/types';
import { Store, Lock, Globe, Delete } from 'lucide-react';

export function LoginScreen() {
  const { lang, setLang, login } = useApp();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('active', true)
        .order('created_at');
      setStaffList(data as Staff[] || []);
      setLoading(false);
    })();
  }, []);

  const handlePinPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length >= 4 && selectedStaff) {
      if (pin === selectedStaff.pin) {
        login(selectedStaff);
        setPin('');
        setError('');
      } else {
        setError(t(lang, 'wrongPin'));
        setTimeout(() => {
          setPin('');
          setError('');
        }, 1000);
      }
    }
  }, [pin, selectedStaff, login, lang]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-primary-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800">{t(lang, 'appName')}</span>
        </div>
        <button
          onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
        >
          <Globe className="w-4 h-4" />
          {lang === 'ar' ? 'Français' : 'العربية'}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {!selectedStaff ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{t(lang, 'selectUser')}</h1>
                <p className="text-slate-500">{t(lang, 'staffOnly')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {loading ? (
                  <div className="col-span-2 text-center py-8 text-slate-400">{t(lang, 'loading')}</div>
                ) : staffList.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-slate-400">{t(lang, 'noData')}</div>
                ) : (
                  staffList.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-primary-300 hover:shadow-lg transition-all"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        staff.role === 'admin' ? 'bg-primary-600' :
                        staff.role === 'cashier' ? 'bg-success-500' :
                        staff.role === 'waiter' ? 'bg-accent-500' : 'bg-slate-600'
                      }`}>
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-700">{staff.name}</span>
                      <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
                        {t(lang, `role_${staff.role}` as 'role_admin')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="animate-scale-in">
              <div className="text-center mb-6">
                <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl ${
                  selectedStaff.role === 'admin' ? 'bg-primary-600' :
                  selectedStaff.role === 'cashier' ? 'bg-success-500' :
                  selectedStaff.role === 'waiter' ? 'bg-accent-500' : 'bg-slate-600'
                }`}>
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-xl font-bold text-slate-800">{selectedStaff.name}</h1>
                <p className="text-sm text-slate-500">{t(lang, 'enterPin')}</p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6 h-14">
                {error ? (
                  <p className="text-error-500 font-medium animate-fade-in">{error}</p>
                ) : (
                  Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all ${
                        i < pin.length ? 'bg-primary-600 scale-110' : 'bg-slate-200'
                      }`}
                    />
                  ))
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {['1','2','3','4','5','6','7','8','9'].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinPress(d)}
                    className="h-16 rounded-2xl bg-white border border-slate-200 text-xl font-bold text-slate-700 hover:bg-primary-50 hover:border-primary-300 active:scale-95 transition-all"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handleDelete}
                  className="h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handlePinPress('0')}
                  className="h-16 rounded-2xl bg-white border border-slate-200 text-xl font-bold text-slate-700 hover:bg-primary-50 hover:border-primary-300 active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="h-16 rounded-2xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Lock className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
