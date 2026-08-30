/**
 * WaterReminderOverlay — Anime Character Hydration Companion (Iteration 3).
 *
 * Enhancements:
 * 1. ZERO JUMPING / SMOOTH GLIDE: Replaced rapid aggressive bounces with a gentle,
 *    delicate 2-3px walking glide and smooth cubic-bezier horizontal travel.
 * 2. SWEET & SLIGHT VOICE:
 *    - Web Audio API soft crystalline water droplet chime.
 *    - Strict female/sweet voice selection (Jenny, Aria, Ana, Michelle, UK Female, Samantha, Zira).
 *    - Optimized sweet anime companion acoustic parameters (pitch: 1.32, rate: 1.04, volume: 0.85).
 * 3. TEST MODE RESILIENCE: Clean dismiss without overriding user's scheduled work countdown.
 * 4. SEAMLESS STATE TRANSITIONS: Smooth 3D turning in place, water offering, and walk-out exit.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiDroplet, FiClock, FiX, FiCheckCircle } from 'react-icons/fi';
import waterGirlWalk from '../assets/water_girl_walk.png';
import waterGirlFront from '../assets/water_girl_front.png';

const AUTO_DISMISS_MS = 25000;
const WALK_IN_DURATION_MS = 2600;
const TURN_DURATION_MS = 400;
const OFFER_DELAY_MS = 250;
const WALK_OUT_DURATION_MS = 2200;

/* ───────── Dynamic CSS Keyframe Animations (Injected Once) ───────── */
const STYLE_ID = 'mindledger-water-companion-v3-keyframes';
const injectKeyframes = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Smooth horizontal walk-in across screen without jitter */
    @keyframes ml-wro-walkInAcross {
      0%   { transform: translateX(calc(100vw + 60px)); opacity: 0; }
      5%   { opacity: 1; }
      100% { transform: translateX(calc(50vw - 100px)); opacity: 1; }
    }

    /* Smooth horizontal walk-out past the right screen edge */
    @keyframes ml-wro-walkOutAcross {
      0%   { transform: translateX(calc(50vw - 100px)); opacity: 1; }
      95%  { opacity: 1; }
      100% { transform: translateX(calc(100vw + 380px)); opacity: 0; }
    }

    /* Subtle, delicate walking step glide (soft 3px step, zero jumping) */
    @keyframes ml-wro-walkingSteps {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%      { transform: translateY(-3px) rotate(-0.8deg); }
    }

    /* Smooth 3D Turn In: Side View -> 90deg -> Front View */
    @keyframes ml-wro-turnToFront {
      0%   { transform: perspective(700px) rotateY(0deg) scale(1); }
      50%  { transform: perspective(700px) rotateY(90deg) scale(0.98); }
      100% { transform: perspective(700px) rotateY(0deg) scale(1); }
    }

    /* Smooth 3D Turn Out: Front View -> 90deg -> Side View Facing Right */
    @keyframes ml-wro-turnToRight {
      0%   { transform: perspective(700px) rotateY(0deg) scale(1); }
      50%  { transform: perspective(700px) rotateY(90deg) scale(0.98); }
      100% { transform: perspective(700px) rotateY(0deg) scale(1); }
    }

    /* Gentle water offering gesture (subtle forward tilt, zero harsh bounce) */
    @keyframes ml-wro-offerWaterForward {
      0%   { transform: translateY(0) scale(1); }
      50%  { transform: translateY(-3px) scale(1.015); }
      100% { transform: translateY(0) scale(1); }
    }

    /* Gentle living idle breathing motion */
    @keyframes ml-wro-livingIdle {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-4px); }
    }

    /* Speech dialogue smooth soft spring entrance */
    @keyframes ml-wro-dialogueSpring {
      0%   { opacity: 0; transform: scale(0.9) translateY(12px); }
      70%  { opacity: 1; transform: scale(1.015) translateY(-2px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Speech dialogue quick soft collapse */
    @keyframes ml-wro-dialogueCollapse {
      0%   { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.9) translateY(8px); }
    }

    /* Button shimmer & pulse */
    @keyframes ml-wro-pulseGlow {
      0%, 100% { box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35); }
      50%      { box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5); }
    }

    /* Progress bar shrinking */
    @keyframes ml-wro-progressShrink {
      0%   { width: 100%; }
      100% { width: 0%; }
    }
  `;
  document.head.appendChild(style);
};

/**
 * Play a sweet, delicate crystalline chime using Web Audio API
 */
const playSweetChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic Note 1 (E6 - 1318.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Harmonic Note 2 (G6 - 1567.98 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, now + 0.08);
    gain2.gain.setValueAtTime(0.04, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.65);
  } catch {
    // Audio fallback
  }
};

/**
 * Play a sweet, pleasant, high-pitched female companion voice
 */
const speakHydrationPrompt = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    playSweetChime();

    const utterance = new SpeechSynthesisUtterance('Sunil, please drink your water!');
    // Sweet, slight, high, upbeat anime companion settings
    utterance.rate = 1.04;
    utterance.pitch = 1.32;
    utterance.volume = 0.85;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Prioritize sweetest natural female voices & exclude any heavy male voices
      const sweetFemaleVoice =
        voices.find((v) => {
          const name = v.name.toLowerCase();
          const isEnglish = v.lang.startsWith('en');
          const isSweet =
            name.includes('jenny') ||
            name.includes('aria') ||
            name.includes('ana') ||
            name.includes('michelle') ||
            name.includes('uk english female') ||
            name.includes('samantha') ||
            name.includes('victoria') ||
            name.includes('zira') ||
            name.includes('karen') ||
            name.includes('tessa') ||
            name.includes('fiona') ||
            name.includes('female');
          const isMale =
            name.includes('david') ||
            name.includes('mark') ||
            name.includes('george') ||
            name.includes('richard') ||
            name.includes('guy') ||
            name.includes('male') ||
            name.includes('stefan') ||
            name.includes('ravi') ||
            name.includes('sean');
          return isEnglish && isSweet && !isMale;
        }) ||
        voices.find((v) => {
          const name = v.name.toLowerCase();
          const isEnglish = v.lang.startsWith('en');
          const isMale =
            name.includes('david') ||
            name.includes('mark') ||
            name.includes('george') ||
            name.includes('richard') ||
            name.includes('guy') ||
            name.includes('male');
          return isEnglish && !isMale;
        }) ||
        voices[0];

      if (sweetFemaleVoice) {
        utterance.voice = sweetFemaleVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('MindLedger Water Voice Synthesis notice:', err);
  }
};

const WaterReminderOverlay = ({ visible, onDrinkWater, onRemindLater, onDismiss }) => {
  const [phase, setPhase] = useState('hidden');
  const [isFrontSprite, setIsFrontSprite] = useState(false);
  const hasSpokenRef = useRef(false);
  const timeoutsRef = useRef([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Pre-load speech synthesis voices
  useEffect(() => {
    injectKeyframes();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  // Main animation orchestrator
  useEffect(() => {
    if (visible) {
      clearAllTimeouts();
      hasSpokenRef.current = false;
      setIsFrontSprite(false);
      setPhase('walking_in');

      // 1. Walk in completes -> Start turning to face the user
      const t1 = setTimeout(() => {
        setPhase('turning');

        // Swap to front-facing sprite halfway through the 3D turn
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
              speakHydrationPrompt();
            }
            setPhase('idle');
          }, OFFER_DELAY_MS);
          timeoutsRef.current.push(tVoice);
        }, TURN_DURATION_MS);
        timeoutsRef.current.push(t2);
      }, WALK_IN_DURATION_MS);
      timeoutsRef.current.push(t1);

      // Auto-dismiss safety timeout
      const tAuto = setTimeout(() => {
        triggerExit();
      }, AUTO_DISMISS_MS);
      timeoutsRef.current.push(tAuto);
    } else {
      if (phase !== 'hidden' && phase !== 'walking_out' && phase !== 'turning_out') {
        triggerExit();
      }
    }

    return () => {
      clearAllTimeouts();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger smooth walk-away exit sequence
  const triggerExit = useCallback(() => {
    if (phase === 'walking_out' || phase === 'turning_out' || phase === 'hidden') return;
    clearAllTimeouts();
    setPhase('turning_out');

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Turn back to side profile
    const tSwap = setTimeout(() => {
      setIsFrontSprite(false);
    }, 180);
    timeoutsRef.current.push(tSwap);

    // After turn, walk out to offscreen right
    const tWalkOut = setTimeout(() => {
      setPhase('walking_out');

      const tDone = setTimeout(() => {
        setPhase('hidden');
        onDismiss?.();
      }, WALK_OUT_DURATION_MS);
      timeoutsRef.current.push(tDone);
    }, 320);
    timeoutsRef.current.push(tWalkOut);
  }, [phase, onDismiss, clearAllTimeouts]);

  // User Actions
  const handleDrink = () => {
    onDrinkWater?.();
    triggerExit();
  };

  const handleLater = () => {
    onRemindLater?.();
    triggerExit();
  };

  // Keyboard shortcut listener (Escape to dismiss)
  useEffect(() => {
    if (!visible || phase === 'hidden' || phase === 'walking_out') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, phase, triggerExit]);

  if (!visible && phase === 'hidden') return null;

  const isWalkingIn = phase === 'walking_in';
  const isTurningIn = phase === 'turning';
  const isFacing = phase === 'facing';
  const isIdle = phase === 'idle';
  const isTurningOut = phase === 'turning_out';
  const isWalkingOut = phase === 'walking_out';

  const showDialogue = isFacing || isIdle;
  const isExiting = isTurningOut || isWalkingOut;

  // Active sprite: side walking sprite during walk, front sprite during greeting/idle
  const activeSprite = isFrontSprite ? waterGirlFront : waterGirlWalk;

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
      {/* Click-away backdrop overlay */}
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

      {/* ───────── Character Motion Stage (Traversing the Viewport) ───────── */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: 0,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '14px',
          zIndex: 99999,
          pointerEvents: 'auto',
          animation: isWalkingIn
            ? `ml-wro-walkInAcross ${WALK_IN_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
            : isWalkingOut
            ? `ml-wro-walkOutAcross ${WALK_OUT_DURATION_MS}ms cubic-bezier(0.4, 0, 0.7, 1) forwards`
            : 'none',
          transform:
            isTurningIn || isFacing || isIdle || isTurningOut
              ? 'translateX(calc(50vw - 100px))'
              : undefined,
        }}
      >
        {/* ───────── Unified Speech Dialogue Card ───────── */}
        <div
          style={{
            position: 'relative',
            width: '340px',
            marginBottom: '42px',
            padding: '20px 22px 18px 22px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.95) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(186, 230, 253, 0.95)',
            borderRadius: '22px',
            boxShadow:
              '0 20px 45px -10px rgba(14, 165, 233, 0.28), 0 6px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(224, 242, 254, 0.8)',
            transformOrigin: 'bottom right',
            opacity: showDialogue ? 1 : 0,
            pointerEvents: showDialogue ? 'auto' : 'none',
            animation: isExiting
              ? 'ml-wro-dialogueCollapse 0.25s ease-in forwards'
              : showDialogue
              ? 'ml-wro-dialogueSpring 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'none',
            transition: 'opacity 0.2s',
          }}
        >
          {/* Speech pointer tail pointing towards the companion */}
          <div
            style={{
              position: 'absolute',
              right: '-11px',
              bottom: '38px',
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '12px solid rgba(186, 230, 253, 0.95)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '-9px',
              bottom: '38px',
              width: 0,
              height: 0,
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderLeft: '11px solid #f0f9ff',
            }}
          />

          {/* Top Pill & Close Button */}
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
                background: 'rgba(14, 165, 233, 0.12)',
                color: '#0284c7',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              <FiDroplet style={{ fontSize: '13px' }} />
              <span>Hydration Companion</span>
            </div>

            <button
              onClick={triggerExit}
              aria-label="Dismiss water reminder"
              style={{
                background: 'rgba(241, 245, 249, 0.8)',
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
                e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <FiX style={{ fontSize: '14px' }} />
            </button>
          </div>

          {/* Primary Header Message */}
          <h4
            style={{
              margin: '0 0 6px 0',
              fontSize: '16.5px',
              fontWeight: 800,
              color: '#0369a1',
              lineHeight: 1.35,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Sunil, please drink your water! 💧
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
            You&apos;ve been coding for a while. Stay hydrated to keep your focus sharp and your energy high!
          </p>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleDrink}
              style={{
                flex: '1.3',
                padding: '9px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
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
                background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
                animation: `ml-wro-progressShrink ${AUTO_DISMISS_MS}ms linear forwards`,
                animationDelay: `${WALK_IN_DURATION_MS + TURN_DURATION_MS}ms`,
              }}
            />
          </div>
        </div>

        {/* ───────── Anime Girl Sprite Rig & Walking Animations ───────── */}
        <div
          style={{
            position: 'relative',
            width: '185px',
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          <div
            style={{
              animation: isWalkingIn
                ? 'ml-wro-walkingSteps 0.48s ease-in-out infinite'
                : isTurningIn
                ? `ml-wro-turnToFront ${TURN_DURATION_MS}ms ease-in-out forwards`
                : isFacing
                ? 'ml-wro-offerWaterForward 0.6s ease-out forwards'
                : isIdle
                ? 'ml-wro-livingIdle 3.2s ease-in-out infinite'
                : isTurningOut
                ? 'ml-wro-turnToRight 0.32s ease-in-out forwards'
                : isWalkingOut
                ? 'ml-wro-walkingSteps 0.48s ease-in-out infinite'
                : 'none',
              transform: isWalkingOut ? 'scaleX(-1)' : undefined,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={activeSprite}
              alt="Anime Hydration Companion"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '345px',
                objectFit: 'contain',
                filter:
                  'drop-shadow(0 14px 30px rgba(14, 165, 233, 0.28)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.08))',
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
};

export default WaterReminderOverlay;
