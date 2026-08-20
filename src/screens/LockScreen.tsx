import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { validateLicenseKey } from '@/lib/fingerprint';
import { toast } from '@/components/Toast';
import { Lock, Key, Shield, Globe } from 'lucide-react';

export function LockScreen() {
  const { lang, setLang, fingerprint, refreshLicense } = useApp();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-4">
      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
        <button
          onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {lang === 'ar' ? 'Français' : 'العربية'}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t(lang, 'locked')}</h1>
          <p className="text-slate-300 text-sm">{t(lang, 'lockedMsg')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-slate-500 mb-1 block flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> {t(lang, 'hardwareFingerprint')}
            </label>
            <div className="px-3 py-2.5 rounded-lg bg-slate-900 text-success-400 font-mono text-sm break-all">
              {fingerprint || '—'}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 mb-1 block flex items-center gap-1.5">
              <Key className="w-4 h-4" /> {t(lang, 'licenseKey')}
            </label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder={t(lang, 'licenseKey')}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-primary-400"
            />
          </div>

          <button
            onClick={activate}
            disabled={activating || !key}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" /> {t(lang, 'activate')}
          </button>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
            {t(lang, 'antiCloneWarning')}
          </div>
        </div>
      </div>
    </div>
  );
}
