/**
 * WaterReminderOverlay — Customizable Anime Character Hydration Companion (Iteration 5)
 *
 * Enhancements:
 * 1. BULLETPROOF EXIT LIFECYCLE: Eliminated multi-second delayed state cascades and
 *    timeout race conditions that caused frozen ghost sprites on screen.
 * 2. SNAPPY EXIT: 420ms smooth, graceful fade-and-glide exit offscreen right.
 * 3. HARD RENDER GUARD: If phase is 'hidden' or if !visible and not in exiting transition,
 *    returns null immediately.
 * 4. MULTI-CHARACTER ROSTER: Sakura (Maid), Hana (Neko), Aoi (Cyberpunk), Aqua (Maiden).
 * 5. 4 ENTRANCE ANIMATION MOTIONS: Glide, Bouncy Hop, Floating Fairy, Sparkle Pop.
 * 6. SWEET VOICE ENGINE & WEB AUDIO CHIMES: Configurable pitch, pace, chimes.
 *
 * Author: MindLedger Team
 * Created: 2026-09-07
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiDroplet, FiClock, FiX, FiCheckCircle, FiHeart } from 'react-icons/fi';
import {
  CHARACTERS,
  loadCompanionConfig,
  speakSweetVoice,
} from '../utils/companionConfig';

const AUTO_DISMISS_MS = 25000;
const ENTER_DURATION_MS = 2600;
const TURN_DURATION_MS = 400;
const OFFER_DELAY_MS = 250;
const EXIT_DURATION_MS = 420;

/* ───────── Dynamic CSS Keyframe Animations ───────── */
const STYLE_ID = 'mindledger-water-companion-v5-keyframes';
const injectKeyframes = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* === 1. GLIDE ENTRANCE & STEPS === */
    @keyframes ml-wro-walkInAcross {
      0%   { transform: translateX(calc(100vw + 60px)); opacity: 0; }
      5%   { opacity: 1; }
      100% { transform: translateX(calc(50vw - 110px)); opacity: 1; }
    }
    @keyframes ml-wro-walkingSteps {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%      { transform: translateY(-4px) rotate(-1deg); }
    }

    /* === 2. BOUNCY CHIBI HOP ENTRANCE & STEPS === */
    @keyframes ml-wro-bounceInAcross {
      0%   { transform: translateX(calc(100vw + 80px)); opacity: 0; }
      5%   { opacity: 1; }
      100% { transform: translateX(calc(50vw - 110px)); opacity: 1; }
    }
    @keyframes ml-wro-bounceHopSteps {
      0%, 100% { transform: translateY(0px) scale(1, 1); }
      30%      { transform: translateY(-24px) scale(0.94, 1.06) rotate(1.5deg); }
      60%      { transform: translateY(-6px) scale(1.04, 0.96); }
      80%      { transform: translateY(0px) scale(1.06, 0.94); }
    }

    /* === 3. FLOATING BUBBLE FAIRY ENTRANCE & STEPS === */
    @keyframes ml-wro-floatInAcross {
      0%   { transform: translateX(calc(100vw + 80px)) translateY(-20px); opacity: 0; }
      15%  { opacity: 1; }
      100% { transform: translateX(calc(50vw - 110px)) translateY(0px); opacity: 1; }
    }
    @keyframes ml-wro-floatingWaveSteps {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25%      { transform: translateY(-12px) rotate(1.8deg); }
      50%      { transform: translateY(-3px) rotate(0deg); }
      75%      { transform: translateY(-16px) rotate(-1.8deg); }
    }

    /* === 4. SPARKLE STAR PORTAL POP ENTRANCE === */
    @keyframes ml-wro-sparklePopIn {
      0%   { transform: translateX(calc(50vw - 110px)) scale(0.1) rotate(-15deg); opacity: 0; filter: brightness(2); }
      50%  { opacity: 1; transform: translateX(calc(50vw - 110px)) scale(1.12) rotate(4deg); }
      75%  { transform: translateX(calc(50vw - 110px)) scale(0.96) rotate(-1deg); }
      100% { transform: translateX(calc(50vw - 110px)) scale(1) rotate(0deg); opacity: 1; filter: brightness(1); }
    }
    @keyframes ml-wro-sparkleTwinkleSteps {
      0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 12px rgba(253, 224, 71, 0.4)); }
      50%      { transform: translateY(-6px) scale(1.02); filter: drop-shadow(0 0 22px rgba(253, 224, 71, 0.7)); }
    }

    /* === 5. UNIVERSAL SMOOTH EXIT === */
    @keyframes ml-wro-exitSmooth {
      0%   { transform: translateX(calc(50vw - 110px)) scale(1); opacity: 1; }
      100% { transform: translateX(calc(100vw + 240px)) scale(0.95); opacity: 0; }
    }

    /* 3D Turns */
    @keyframes ml-wro-turnToFront {
      0%   { transform: perspective(700px) rotateY(0deg) scale(1); }
      50%  { transform: perspective(700px) rotateY(90deg) scale(0.98); }
      100% { transform: perspective(700px) rotateY(0deg) scale(1); }
    }

    /* Gesture & Idle */
    @keyframes ml-wro-offerWaterForward {
      0%   { transform: translateY(0) scale(1); }
      50%  { transform: translateY(-5px) scale(1.025); }
      100% { transform: translateY(0) scale(1); }
    }
    @keyframes ml-wro-livingIdle {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-5px); }
    }

    /* Dialogue Card Spring & Collapse */
    @keyframes ml-wro-dialogueSpring {
      0%   { opacity: 0; transform: scale(0.88) translateY(16px); }
      70%  { opacity: 1; transform: scale(1.02) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes ml-wro-dialogueCollapse {
      0%   { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.85) translateY(12px); }
    }

    /* Pulse Glow */
    @keyframes ml-wro-pulseGlow {
      0%, 100% { box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35); }
      50%      { box-shadow: 0 6px 24px rgba(14, 165, 233, 0.55); }
    }

    /* Progress bar shrinking */
    @keyframes ml-wro-progressShrink {
      0%   { width: 100%; }
      100% { width: 0%; }
    }
  `;
  document.head.appendChild(style);
};

const triggerWebNotification = (greetingText) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      new Notification('💧 Hydration Reminder — Time to Drink!', {
        body: greetingText || 'Sunil, please drink a fresh glass of water to stay energized and focused!',
        icon: '/logo.png',
      });
    }
  } catch {
    // fallback
  }
};

export default function WaterReminderOverlay({
  visible,
  onDrinkWater,
  onRemindLater,
  onDismiss,
}) {
  const [phase, setPhase] = useState('hidden');
  const [isFrontSprite, setIsFrontSprite] = useState(false);
  const [config, setConfig] = useState(loadCompanionConfig);
  const hasSpokenRef = useRef(false);
  const timeoutsRef = useRef([]);
  const exitTimerRef = useRef(null);

  // Resolve active character
  const character =
    CHARACTERS.find((c) => c.id === config.characterId) || CHARACTERS[0];
  const animStyle = config.animationStyle || 'glide';

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Listen for config changes
  useEffect(() => {
    injectKeyframes();
    const handleConfigUpdate = (e) => {
      if (e.detail) {
        setConfig({ ...e.detail });
      } else {
        setConfig(loadCompanionConfig());
      }
    };
    window.addEventListener('mindledger:companion-config-updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('mindledger:companion-config-updated', handleConfigUpdate);
    };
  }, []);

  // Trigger smooth, rapid exit sequence
  const triggerExit = useCallback(() => {
    if (phase === 'hidden' || phase === 'exiting') return;
    clearAllTimeouts();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPhase('exiting');

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setPhase('hidden');
      onDismiss?.();
    }, EXIT_DURATION_MS);
  }, [phase, onDismiss, clearAllTimeouts]);

  // Main animation orchestrator
  useEffect(() => {
    if (visible) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      clearAllTimeouts();
      // Reload freshest config
      const curConfig = loadCompanionConfig();
      setConfig(curConfig);

      hasSpokenRef.current = false;
      setIsFrontSprite(false);
      setPhase('entering');
      triggerWebNotification(curConfig.greetingText);

      // Duration of entrance depending on animation style
      const enterTime = animStyle === 'sparkle' ? 900 : ENTER_DURATION_MS;

      // 1. Entrance completes -> Turn / Face user
      const t1 = setTimeout(() => {
        setPhase('turning');

        // Swap to front-facing sprite halfway through
        const tSwap = setTimeout(() => {
          setIsFrontSprite(true);
        }, TURN_DURATION_MS / 2);
        timeoutsRef.current.push(tSwap);

        // Turn completes -> Face user & offer water
        const t2 = setTimeout(() => {
          setPhase('facing');

          // Sweet voice begins after facing user
          const tVoice = setTimeout(() => {
            if (!hasSpokenRef.current) {
              hasSpokenRef.current = true;
              speakSweetVoice(curConfig.greetingText || character.defaultGreeting, {
                pitch: curConfig.customPitch ?? 1.48,
                rate: curConfig.customRate ?? 1.05,
                volume: curConfig.customVolume ?? 0.90,
                chimeStyle: curConfig.chimeStyle ?? 'crystalline',
              });
            }
            setPhase('idle');
          }, OFFER_DELAY_MS);
          timeoutsRef.current.push(tVoice);
        }, TURN_DURATION_MS);
        timeoutsRef.current.push(t2);
      }, enterTime);
      timeoutsRef.current.push(t1);

      // Safety auto-dismiss
      const tAuto = setTimeout(() => {
        triggerExit();
      }, AUTO_DISMISS_MS);
      timeoutsRef.current.push(tAuto);
    } else {
      clearAllTimeouts();
      if (phase !== 'exiting') {
        setPhase('hidden');
      }
    }

    return () => {
      clearAllTimeouts();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actions
  const handleDrink = () => {
    onDrinkWater?.();
    triggerExit();
  };

  const handleLater = () => {
    onRemindLater?.();
    triggerExit();
  };

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    if (!visible || phase === 'hidden' || phase === 'exiting') return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') triggerExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, phase, triggerExit]);

  // HARD GUARD: never render when hidden or when visible is false and not exiting
  if (phase === 'hidden') return null;
  if (!visible && phase !== 'exiting') return null;

  const isEntering = phase === 'entering';
  const isTurningIn = phase === 'turning';
  const isFacing = phase === 'facing';
  const isIdle = phase === 'idle';
  const isExiting = phase === 'exiting';

  const showDialogue = isFacing || isIdle;

  // Active sprite: Front sprite during facing/greeting, Walk sprite during entrance/exit
  const activeSprite = isFrontSprite
    ? character.frontSprite
    : character.walkSprite || character.frontSprite;

  // Choose entrance container animation based on selected style
  let containerEntranceAnim = 'none';
  if (isEntering) {
    if (animStyle === 'glide') {
      containerEntranceAnim = `ml-wro-walkInAcross ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`;
    } else if (animStyle === 'bounce') {
      containerEntranceAnim = `ml-wro-bounceInAcross ${ENTER_DURATION_MS}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`;
    } else if (animStyle === 'float') {
      containerEntranceAnim = `ml-wro-floatInAcross ${ENTER_DURATION_MS}ms ease-out forwards`;
    } else if (animStyle === 'sparkle') {
      containerEntranceAnim = `ml-wro-sparklePopIn 850ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
    }
  } else if (isExiting) {
    containerEntranceAnim = `ml-wro-exitSmooth ${EXIT_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;
  }

  // Choose character sprite motion based on selected style
  let spriteMotionAnim = 'none';
  if (isEntering) {
    if (animStyle === 'glide') {
      spriteMotionAnim = 'ml-wro-walkingSteps 0.48s ease-in-out infinite';
    } else if (animStyle === 'bounce') {
      spriteMotionAnim = 'ml-wro-bounceHopSteps 0.42s ease-in-out infinite';
    } else if (animStyle === 'float') {
      spriteMotionAnim = 'ml-wro-floatingWaveSteps 1.8s ease-in-out infinite';
    } else if (animStyle === 'sparkle') {
      spriteMotionAnim = 'ml-wro-sparkleTwinkleSteps 0.8s ease-in-out infinite';
    }
  } else if (isTurningIn) {
    spriteMotionAnim = `ml-wro-turnToFront ${TURN_DURATION_MS}ms ease-in-out forwards`;
  } else if (isFacing) {
    spriteMotionAnim = 'ml-wro-offerWaterForward 0.6s ease-out forwards';
  } else if (isIdle) {
    spriteMotionAnim =
      animStyle === 'float'
        ? 'ml-wro-floatingWaveSteps 2.4s ease-in-out infinite'
        : 'ml-wro-livingIdle 3.2s ease-in-out infinite';
  } else if (isExiting) {
    spriteMotionAnim = 'ml-wro-walkingSteps 0.42s ease-in-out forwards';
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Click-away backdrop */}
      <div
        onClick={triggerExit}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          pointerEvents: showDialogue ? 'auto' : 'none',
          background: 'transparent',
        }}
      />

      {/* ───────── Character Motion Stage ───────── */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '16px',
          zIndex: 99999,
          pointerEvents: 'auto',
          animation: containerEntranceAnim,
          transform:
            !isEntering && !isExiting
              ? 'translateX(calc(50vw - 110px))'
              : undefined,
        }}
      >
        {/* ───────── Speech Dialogue Card ───────── */}
        <div
          style={{
            position: 'relative',
            width: '350px',
            marginBottom: '46px',
            padding: '20px 22px 18px 22px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: `1.5px solid ${character.themeColor}33`,
            borderRadius: '24px',
            boxShadow: `0 20px 45px -10px ${character.themeColor}40, 0 6px 18px rgba(0, 0, 0, 0.06)`,
            transformOrigin: 'bottom right',
            opacity: showDialogue ? 1 : 0,
            pointerEvents: showDialogue ? 'auto' : 'none',
            animation: isExiting
              ? `ml-wro-dialogueCollapse ${EXIT_DURATION_MS}ms ease-in forwards`
              : showDialogue
              ? 'ml-wro-dialogueSpring 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'none',
            transition: 'opacity 0.2s',
          }}
        >
          {/* Speech tail pointing to companion */}
          <div
            style={{
              position: 'absolute',
              right: '-11px',
              bottom: '42px',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: `12px solid ${character.themeColor}44`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '-9px',
              bottom: '42px',
              width: 0,
              height: 0,
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderLeft: '11px solid #ffffff',
            }}
          />

          {/* Top Pill & Close */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: character.badgeBg,
                color: character.badgeColor,
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <FiHeart style={{ fontSize: '13px' }} />
              <span>{character.name} ({character.title})</span>
            </div>

            <button
              onClick={triggerExit}
              aria-label="Dismiss water reminder"
              style={{
                background: 'rgba(241, 245, 249, 0.85)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(241, 245, 249, 0.85)';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <FiX style={{ fontSize: '14px' }} />
            </button>
          </div>

          {/* Primary Greeting Message */}
          <h4
            style={{
              margin: '0 0 6px 0',
              fontSize: '16.5px',
              fontWeight: 800,
              color: character.themeColor,
              lineHeight: 1.35,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {config.greetingText || character.defaultGreeting}
          </h4>

          {/* Supporting Text */}
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '12.5px',
              color: '#475569',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            You&apos;ve been working hard! Take a refreshing sip now to recharge your energy and keep your mind crystal clear.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleDrink}
              style={{
                flex: '1.3',
                padding: '9px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#ffffff',
                background: character.accentGradient,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: `0 4px 14px ${character.themeColor}55`,
                animation: 'ml-wro-pulseGlow 2.5s ease-in-out infinite',
                transition: 'transform 0.15s ease, filter 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.filter = 'brightness(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <FiCheckCircle style={{ fontSize: '14px' }} />
              <span>Drink (+250 ml)</span>
            </button>

            <button
              onClick={handleLater}
              style={{
                flex: '1',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                background: 'rgba(241, 245, 249, 0.9)',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.borderColor = '#94a3b8';
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(241, 245, 249, 0.9)';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <FiClock style={{ fontSize: '13px' }} />
              <span>Remind Later</span>
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '18px',
              right: '18px',
              height: '3px',
              borderRadius: '0 0 20px 20px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: character.accentGradient,
                animation: `ml-wro-progressShrink ${AUTO_DISMISS_MS}ms linear forwards`,
                animationDelay: `${ENTER_DURATION_MS + TURN_DURATION_MS}ms`,
              }}
            />
          </div>
        </div>

        {/* ───────── Anime Character Sprite Rig ───────── */}
        <div
          style={{
            position: 'relative',
            width: '200px',
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          <div
            style={{
              animation: spriteMotionAnim,
              transform: isExiting ? 'scaleX(-1)' : undefined,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={activeSprite}
              alt={character.name}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '345px',
                objectFit: 'contain',
                filter: `drop-shadow(0 14px 30px ${character.themeColor}44) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.08))`,
                userSelect: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
