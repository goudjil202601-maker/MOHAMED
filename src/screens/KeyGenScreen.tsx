import { useState } from 'react';
import { getHardwareFingerprint, generateLicenseKey } from '@/lib/fingerprint';
import { Copy, Key, Check, Fingerprint } from 'lucide-react';

export function KeyGenScreen() {
  const [fingerprint, setFingerprint] = useState('');
  const [licenseType, setLicenseType] = useState<'trial' | 'lifetime'>('lifetime');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!fingerprint || fingerprint.length < 6) return;
    setLoading(true);
    const key = generateLicenseKey(fingerprint, licenseType);
    setGeneratedKey(key);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Key Generator</h1>
          <p className="text-slate-400 text-sm">Standalone license key generation tool</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {/* Fingerprint Input */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4" /> Client Hardware Fingerprint
            </label>
            <input
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value.toUpperCase().trim())}
              placeholder="Enter client fingerprint..."
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-primary-400"
            />
          </div>

          {/* License Type */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">License Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLicenseType('trial')}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  licenseType === 'trial'
                    ? 'border-warning-400 bg-warning-50 text-warning-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                24-Hour Trial
              </button>
              <button
                onClick={() => setLicenseType('lifetime')}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  licenseType === 'lifetime'
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Lifetime
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generate}
            disabled={loading || !fingerprint}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" /> Generate Key
          </button>

          {/* Generated Key */}
          {generatedKey && (
            <div className="border-t border-slate-100 pt-4 animate-fade-in">
              <label className="text-sm text-slate-500 mb-1.5 block">Generated License Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-slate-900 text-success-400 font-mono text-sm break-all">
                  {generatedKey}
                </div>
                <button
                  onClick={copy}
                  className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <p className="text-xs text-success-500 mt-1">Copied to clipboard</p>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          This tool is completely separate from the POS application.
        </p>
      </div>
    </div>
  );
}
