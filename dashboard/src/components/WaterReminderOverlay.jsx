/**
 * WaterReminderOverlay — Animated anime character water reminder overlay.
 *
 * A cute anime girl slides in from the bottom-right edge of the screen,
 * walks toward the center-right, holds out a glass of water, and says
 * "Sunil, please drink your water!" with action buttons.
 *
 * 100% in-browser — zero OS-level notification calls — zero crash risk.
 */
import React, { useState, useEffect, useCallback } from 'react';
import waterGirlImg from '../assets/water_girl.jpg';

const AUTO_DISMISS_MS = 20000;

/* ───────── inline keyframes (injected once) ───────── */
const STYLE_ID = 'water-reminder-overlay-keyframes';
const injectKeyframes = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes wro-slideIn {
      0%   { transform: translateX(120%); opacity: 0; }
      60%  { transform: translateX(-8%);  opacity: 1; }
      80%  { transform: translateX(4%);   opacity: 1; }
      100% { transform: translateX(0);    opacity: 1; }
    }
    @keyframes wro-fadeOut {
      0%   { opacity: 1; transform: translateX(0); }
      100% { opacity: 0; transform: translateX(80%); }
    }
    @keyframes wro-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-10px); }
    }
    @keyframes wro-bubblePop {
      0%   { transform: scale(0.3) translateY(20px); opacity: 0; }
      60%  { transform: scale(1.08) translateY(-4px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes wro-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center;  }
    }
    @keyframes wro-progressShrink {
      0%   { width: 100%; }
      100% { width: 0%; }
    }
  `;
  document.head.appendChild(style);
};

const WaterReminderOverlay = ({ visible, onDrinkWater, onRemindLater, onDismiss }) => {
  const [phase, setPhase] = useState('enter'); // enter | idle | exit
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  /* auto-dismiss timer */
  useEffect(() => {
    if (!visible) return;
    setPhase('enter');
    setDismissed(false);
    const timer = setTimeout(() => handleDismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(() => {
    if (dismissed) return;
    setDismissed(true);
    setPhase('exit');
    setTimeout(() => onDismiss?.(), 600);
  }, [dismissed, onDismiss]);

  const handleDrink = () => {
    onDrinkWater?.();
    handleDismiss();
  };

  const handleLater = () => {
    onRemindLater?.();
    handleDismiss();
  };

  if (!visible) return null;

  const isExiting = phase === 'exit';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 99999,
        pointerEvents: 'none',
        width: '480px',
        height: '520px',
        overflow: 'visible',
      }}
    >
      {/* Semi-transparent click-away backdrop (right side only) */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          pointerEvents: 'auto',
          background: 'transparent',
        }}
      />

      {/* Main animated container */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
          zIndex: 99999,
          animation: isExiting
            ? 'wro-fadeOut 0.6s ease-in forwards'
            : 'wro-slideIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
      >
        {/* Speech Bubble */}
        <div
          style={{
            background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #e0f2fe 100%)',
            border: '2px solid #7dd3fc',
            borderRadius: '20px',
            padding: '16px 22px',
            marginBottom: '12px',
            maxWidth: '320px',
            boxShadow: '0 8px 32px rgba(14, 165, 233, 0.2), 0 2px 8px rgba(0,0,0,0.08)',
            animation: isExiting ? 'none' : 'wro-bubblePop 0.6s ease-out 0.8s both',
            position: 'relative',
          }}
        >
          {/* Bubble tail */}
          <div
            style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '12px solid #7dd3fc',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid #e0f2fe',
            }}
          />

          <p
            style={{
              margin: '0 0 4px 0',
              fontSize: '16px',
              fontWeight: 700,
              color: '#0369a1',
              lineHeight: 1.4,
            }}
          >
            Hey Sunil! Please drink your water!
          </p>
          <p
            style={{
              margin: '0 0 14px 0',
              fontSize: '13px',
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            You have been coding for a while. Stay hydrated to keep your focus sharp and energy high!
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDrink}
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(14, 165, 233, 0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 5px 20px rgba(14,165,233,0.5)'; }}
              onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 3px 12px rgba(14,165,233,0.35)'; }}
            >
              Drink Water (+250ml)
            </button>
            <button
              onClick={handleLater}
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                background: 'rgba(241, 245, 249, 0.95)',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.target.style.transform = 'scale(1.03)'; e.target.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.background = 'rgba(241,245,249,0.95)'; }}
            >
              Remind Later
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '20px',
              right: '20px',
              height: '3px',
              borderRadius: '0 0 20px 20px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                animation: `wro-progressShrink ${AUTO_DISMISS_MS}ms linear forwards`,
                animationDelay: '1.2s',
              }}
            />
          </div>
        </div>

        {/* Character Image */}
        <div
          style={{
            animation: isExiting ? 'none' : 'wro-float 3s ease-in-out infinite',
            animationDelay: '1.5s',
          }}
        >
          <img
            src={waterGirlImg}
            alt="MindLedger Water Reminder Character"
            style={{
              width: '220px',
              height: 'auto',
              filter: 'drop-shadow(0 8px 24px rgba(14, 165, 233, 0.25))',
              borderRadius: '16px',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WaterReminderOverlay;
