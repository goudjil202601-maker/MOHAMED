// Hardware fingerprint using Canvas, WebGL, and hardware concurrency
export async function getHardwareFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  let canvasHash = '0';

  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('POS-FP-2026', 4, 4);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('POS-FP-2026', 8, 8);
    canvasHash = hashString(canvas.toDataURL());
  }

  let webglHash = '0';
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (gl) {
      const glContext = gl as WebGLRenderingContext;
      const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
      const renderer = debugInfo ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      webglHash = hashString(vendor + renderer);
    }
  } catch {
    // ignore
  }

  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0;
  const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;

  return hashString(`${canvasHash}-${webglHash}-${cores}-${memory}-${screenInfo}`);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
}

// License key generation (standalone keygen uses this)
// Key format: TYPE-FINGERPRINT-CHECKSUM
export function generateLicenseKey(fingerprint: string, type: 'trial' | 'lifetime'): string {
  const prefix = type === 'trial' ? 'T' : 'L';
  const fp = fingerprint.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const payload = `${prefix}${fp}`;
  const checksum = hashString(payload + 'POS_SECRET_2026').slice(0, 6);
  return `${payload}-${checksum}`;
}

export function validateLicenseKey(key: string, fingerprint: string): 'trial' | 'lifetime' | null {
  const clean = key.trim().toUpperCase();
  const match = clean.match(/^([TL])([A-Z0-9]{8})-([A-Z0-9]{6})$/);
  if (!match) return null;
  const [, typeChar, fp, checksum] = match;
  const expectedFp = fingerprint.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (fp !== expectedFp) return null;
  const payload = `${typeChar}${fp}`;
  const expectedChecksum = hashString(payload + 'POS_SECRET_2026').slice(0, 6);
  if (checksum !== expectedChecksum) return null;
  return typeChar === 'T' ? 'trial' : 'lifetime';
}
