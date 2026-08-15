import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { getElapsedHours, formatElapsed } from '../utils/sugarcaneMath.js';

export default function NotificationBanner({ activeSpta }) {
  const [urgency, setUrgency] = useState(null); // 'warning' | 'critical' | null
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    if (!activeSpta || !activeSpta.harvest_time) {
      setUrgency(null);
      return;
    }

    const checkStatus = () => {
      const elapsed = getElapsedHours(activeSpta.harvest_time);
      
      if (elapsed > 18) {
        setUrgency('critical');
        setMessage(`🚨 Peringatan Kritis: Waktu tunda giling melewati 18 jam (${formatElapsed(elapsed)} berlalu)! Segera lakukan penimbangan sebelum tebu ditolak pabrik. Sisa ${Math.max(0, 24 - elapsed).toFixed(1)} jam.`);
      } else if (elapsed > 6) {
        setUrgency('warning');
        setMessage(`⚠️ Perhatian: Tebu telah ditebang lebih dari 6 jam (${formatElapsed(elapsed)} berlalu). Mutu nira mulai menurun. Pastikan armada segera berangkat.`);
      } else {
        setUrgency(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [activeSpta]);

  if (!urgency) return null;

  const isCritical = urgency === 'critical';
  const bg = isCritical ? 'rgba(255,180,171,0.95)' : 'rgba(245, 158, 11, 0.95)';
  const color = isCritical ? '#410002' : '#451a03';

  return (
    <div style={{
      position: 'absolute', top: 70, left: 16, right: 16, zIndex: 50,
      background: bg, color: color,
      padding: '12px 16px', borderRadius: 12,
      display: 'flex', alignItems: 'flex-start', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {isCritical ? <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} /> : <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />}
      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
        {message}
      </p>
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
