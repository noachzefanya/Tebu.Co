import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CheckCircle, Camera, AlertCircle } from 'lucide-react';

/**
 * QRScannerModal — Full-screen dark glassmorphism QR scanner modal.
 *
 * Uses html5-qrcode's Html5Qrcode class for direct camera control.
 * Lifecycle:
 *   mount  → requests camera → starts scanning
 *   success → stops camera  → shows decoded result toast
 *   close  → stops camera   → calls onClose()
 *
 * Props:
 *   isOpen  {boolean}  – controls visibility
 *   onClose {function} – called when modal should close
 */

const SCANNER_ID = 'tebu-qr-scanner-region';

const STATUS = { IDLE: 'idle', STARTING: 'starting', SCANNING: 'scanning', SUCCESS: 'success', ERROR: 'error' };

export default function QRScannerModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [scannedData, setScannedData] = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const scannerRef  = useRef(null);   // Html5Qrcode instance
  const isStopping  = useRef(false);  // guard against double-stop

  /* ── Start camera ── */
  const startScanner = useCallback(async () => {
    if (scannerRef.current || isStopping.current) return;
    setStatus(STATUS.STARTING);
    setErrorMsg('');

    try {
      const qr = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [0], // QR_CODE only
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => { /* scan frame error — silent */ }
      );

      setStatus(STATUS.SCANNING);
    } catch (err) {
      console.error('[QRScannerModal] start error:', err);
      setErrorMsg(
        err?.message?.includes('Permission')
          ? 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.'
          : `Gagal membuka kamera: ${err?.message ?? err}`
      );
      setStatus(STATUS.ERROR);
      scannerRef.current = null;
    }
  }, []);

  /* ── Stop camera ── */
  const stopScanner = useCallback(async () => {
    if (isStopping.current || !scannerRef.current) return;
    isStopping.current = true;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch (e) {
      console.warn('[QRScannerModal] stop warning:', e);
    } finally {
      scannerRef.current = null;
      isStopping.current = false;
    }
  }, []);

  /* ── On success ── */
  const handleSuccess = useCallback((text) => {
    stopScanner();
    setScannedData(text);
    setStatus(STATUS.SUCCESS);
  }, [stopScanner]);

  /* ── Lifecycle: mount/unmount ── */
  useEffect(() => {
    if (!isOpen) return;
    // Small timeout lets the DOM node render before html5-qrcode touches it
    const t = setTimeout(() => startScanner(), 120);
    return () => {
      clearTimeout(t);
      stopScanner();
      setStatus(STATUS.IDLE);
      setScannedData(null);
      setErrorMsg('');
    };
  }, [isOpen, startScanner, stopScanner]);

  /* ── Handle close ── */
  const handleClose = useCallback(async () => {
    await stopScanner();
    setStatus(STATUS.IDLE);
    setScannedData(null);
    setErrorMsg('');
    onClose();
  }, [stopScanner, onClose]);

  /* ── Handle scan again ── */
  const handleScanAgain = useCallback(() => {
    setStatus(STATUS.IDLE);
    setScannedData(null);
    setTimeout(() => startScanner(), 120);
  }, [startScanner]);

  if (!isOpen) return null;

  return (
    /* ── Backdrop ── */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scanner QR Kode"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* ── Modal sheet ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'rgba(16,20,21,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                color: '#fff', letterSpacing: '-0.3px',
              }}
            >
              Scanner Petugas PG
            </h3>
            <p className="text-caps c-on-surface-var" style={{ marginTop: 2 }}>
              Arahkan kamera ke QR SPTA Truk
            </p>
          </div>
          <button
            aria-label="Tutup scanner"
            onClick={handleClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-surface-variant)', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scanner viewport ── */}
        {status !== STATUS.SUCCESS && (
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              background: '#000',
              minHeight: 300,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* html5-qrcode mounts the <video> into this div */}
            <div
              id={SCANNER_ID}
              style={{ width: '100%' }}
            />

            {/* Scanning overlay — corner brackets + centre reticle */}
            {status === STATUS.SCANNING && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {/* semi-transparent surround */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse 220px 220px at 50% 50%, transparent 44%, rgba(0,0,0,0.55) 45%)',
                }} />
                {/* scan-line animation */}
                <div style={{
                  position: 'absolute',
                  width: 220, height: 2,
                  background: 'linear-gradient(90deg, transparent, var(--color-tertiary), transparent)',
                  animation: 'scanLine 2s ease-in-out infinite',
                  opacity: 0.9,
                }} />
                {/* corner brackets */}
                {[
                  { top: '50%', left: '50%', mt: -110, ml: -110, bt: true, bl: true },
                  { top: '50%', left: '50%', mt: -110, ml:   90, bt: true, br: true },
                  { top: '50%', left: '50%', mt:   90, ml: -110, bb: true, bl: true },
                  { top: '50%', left: '50%', mt:   90, ml:   90, bb: true, br: true },
                ].map(({ mt, ml, bt, bl, br, bb }, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    marginTop: mt, marginLeft: ml,
                    width: 20, height: 20,
                    borderTopWidth:    bt ? 3 : 0,
                    borderLeftWidth:   bl ? 3 : 0,
                    borderRightWidth:  br ? 3 : 0,
                    borderBottomWidth: bb ? 3 : 0,
                    borderStyle: 'solid',
                    borderColor: 'var(--color-tertiary)',
                    borderRadius: bt && bl ? '4px 0 0 0' : bt && br ? '0 4px 0 0' : bb && bl ? '0 0 0 4px' : '0 0 4px 0',
                  }} />
                ))}
              </div>
            )}

            {/* Starting state */}
            {status === STATUS.STARTING && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                background: 'rgba(0,0,0,0.6)',
              }}>
                <Camera size={32} color="var(--color-tertiary)" />
                <p className="text-caps c-on-surface-var">Memuat kamera…</p>
              </div>
            )}
          </div>
        )}

        {/* ── Error state ── */}
        {status === STATUS.ERROR && (
          <div
            style={{
              background: 'rgba(255,180,171,0.08)',
              border: '1px solid rgba(255,180,171,0.2)',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, textAlign: 'center',
            }}
          >
            <AlertCircle size={28} color="var(--color-error)" />
            <p className="text-body" style={{ color: 'var(--color-error)', fontSize: 14 }}>
              {errorMsg}
            </p>
            <button
              onClick={handleScanAgain}
              style={{
                marginTop: 4,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 10, padding: '8px 20px',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 14,
              }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* ── Success state ── */}
        {status === STATUS.SUCCESS && scannedData && (
          <div
            style={{
              background: 'rgba(163,212,137,0.08)',
              border: '1px solid rgba(163,212,137,0.25)',
              borderRadius: 18, padding: '24px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              textAlign: 'center',
            }}
          >
            {/* Success icon */}
            <div
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(163,212,137,0.12)',
                border: '2px solid rgba(163,212,137,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CheckCircle size={32} color="var(--color-primary)" />
            </div>

            <div>
              <p className="text-caps c-primary" style={{ marginBottom: 6 }}>
                ✓ TIKET SPTA TERVERIFIKASI
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                  color: '#fff', letterSpacing: '0.03em',
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}
              >
                {scannedData}
              </p>
            </div>

            {/* Parsed fields if it's our format */}
            {scannedData.startsWith('TEBUCO-') && (
              <div
                style={{
                  width: '100%', display: 'grid',
                  gridTemplateColumns: '1fr 1fr', gap: 8,
                }}
              >
                {parseSPTA(scannedData).map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 10, padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginBottom: 3 }}>{label}</p>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button
                onClick={handleScanAgain}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 14, fontWeight: 600,
                  transition: 'background 0.15s',
                }}
              >
                Scan Lagi
              </button>
              <button
                onClick={handleClose}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'var(--color-tertiary)',
                  border: 'none', borderRadius: 12,
                  color: 'var(--color-on-tertiary)',
                  cursor: 'pointer', fontFamily: 'var(--font-display)',
                  fontSize: 15, fontWeight: 700,
                  boxShadow: '0 0 16px rgba(166,214,79,0.3)',
                  transition: 'background 0.15s',
                }}
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* ── Status bar ── */}
        {status === STATUS.SCANNING && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--color-tertiary)',
                display: 'inline-block',
                animation: 'pulse-glow 1.5s infinite',
              }}
            />
            <p className="text-caps c-on-surface-var">Mendeteksi kode QR…</p>
          </div>
        )}
      </div>

      {/* ── Keyframe styles injected inline ── */}
      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp  { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes scanLine {
          0%   { transform: translateY(-108px); opacity: 0.7; }
          50%  { transform: translateY(0px);    opacity: 1;   }
          100% { transform: translateY(108px);  opacity: 0.7; }
        }
        /* Hide html5-qrcode default UI controls that don't fit our design */
        #${SCANNER_ID} > img,
        #${SCANNER_ID} select,
        #${SCANNER_ID} div[style*="text-align: center"] { display: none !important; }
        #${SCANNER_ID} video { border-radius: 20px; width: 100% !important; height: auto !important; }
      `}</style>
    </div>
  );
}

/* ── Helper: parse TEBUCO SPTA payload into display fields ── */
function parseSPTA(code) {
  // Format: TEBUCO-SPTA-2026-0813-TRUK-B9281UY
  const parts = code.split('-');
  if (parts.length < 6) return [{ label: 'DATA', value: code }];
  return [
    { label: 'TAHUN',     value: parts[2] ?? '—' },
    { label: 'TGL SPTA',  value: parts[3] ? `${parts[3].slice(0,2)}/${parts[3].slice(2)}` : '—' },
    { label: 'TIPE',      value: parts[4] ?? '—' },
    { label: 'PLAT',      value: parts[5] ?? '—' },
  ];
}
