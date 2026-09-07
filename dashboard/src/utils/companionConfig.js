/**
 * MindLedger — Anime Hydration Companion Configuration & Audio Engine
 *
 * Provides character rosters, animation entrance profiles, sweet acoustic voice presets,
 * Web Audio procedural chimes, and local persistence.
 *
 * Author: MindLedger Team
 * Created: 2026-09-06
 */

import waterGirlWalk from '../assets/water_girl_walk.png';
import waterGirlFront from '../assets/water_girl_front.png';
import companionSakura from '../assets/companion_sakura.png';
import companionHana from '../assets/companion_hana.png';
import companionAoi from '../assets/companion_aoi.png';

export const COMPANION_STORAGE_KEY = 'mindledger_companion_config_v1';

export const CHARACTERS = [
  {
    id: 'sakura',
    name: 'Sakura',
    title: 'Sweet Maid Caregiver',
    tag: 'Sweet Chibi',
    description: 'Devoted, ultra-polite chibi maid dedicated to keeping you refreshed and healthy.',
    walkSprite: companionSakura,
    frontSprite: companionSakura,
    defaultGreeting: 'Master Sunil, here is fresh water for you! Stay healthy~ 🌸',
    themeColor: '#db2777',
    badgeBg: '#fce7f3',
    badgeColor: '#be185d',
    accentGradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  },
  {
    id: 'hana',
    name: 'Hana',
    title: 'Cozy Neko Hydration Friend',
    tag: 'Playful Catgirl',
    description: 'Pastel catgirl companion who nudges you with gentle paw taps: "Stay hydrated, nya~!"',
    walkSprite: companionHana,
    frontSprite: companionHana,
    defaultGreeting: 'Nya~ Sunil! Time to pause and take a refreshing sip! 🐾',
    themeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeColor: '#6d28d9',
    accentGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
  },
  {
    id: 'aoi',
    name: 'Aoi',
    title: 'Cyberpunk Tech Assistant',
    tag: 'Sci-Fi Focus',
    description: 'Futuristic biometric companion monitoring your cognitive load and hydration levels.',
    walkSprite: companionAoi,
    frontSprite: companionAoi,
    defaultGreeting: 'Vitals check, Sunil: Hydration replenishment recommended now! ⚡',
    themeColor: '#0d9488',
    badgeBg: '#ccfbf1',
    badgeColor: '#0f766e',
    accentGradient: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
  },
  {
    id: 'aqua',
    name: 'Aqua / Mizuki',
    title: 'Water Spirit Maiden',
    tag: 'Classic Anime',
    description: 'Refreshing & cheerful aquatic spirit who blesses your desk with crisp hydration.',
    walkSprite: waterGirlWalk,
    frontSprite: waterGirlFront,
    defaultGreeting: 'Sunil, please drink your water! 💧',
    themeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    accentGradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
  },
];

export const ANIMATION_STYLES = [
  {
    id: 'glide',
    name: 'Glide & 3D Flip',
    description: 'Graceful smooth entrance from bottom-right, 3D flip facing user, and water presentation.',
    icon: '✨',
    badge: 'Recommended',
  },
  {
    id: 'bounce',
    name: 'Bouncy Chibi Hop',
    description: 'Playful rhythmic bunny hops across the screen with squash-and-stretch landing.',
    icon: '🐰',
    badge: 'Cute & Playful',
  },
  {
    id: 'float',
    name: 'Floating Bubble Fairy',
    description: 'Gentle aquatic drift floating with soft wave sway, hovering in place like a water fairy.',
    icon: '🫧',
    badge: 'Calm & Soothing',
  },
  {
    id: 'sparkle',
    name: 'Sparkle Portal Pop',
    description: 'Magical starburst portal pop-in with crystalline scale bounce and joyful greeting wave.',
    icon: '⭐',
    badge: 'High Energy',
  },
];

export const VOICE_PRESETS = [
  {
    id: 'ultra_sweet',
    name: 'Ultra Sweet Anime High',
    description: 'High-pitched, melodious, cheerful anime voice. Very cute & upbeat.',
    pitch: 1.48,
    rate: 1.05,
    volume: 0.90,
  },
  {
    id: 'gentle',
    name: 'Gentle Caregiver (Onee-san)',
    description: 'Calm, soothing, warm, and gentle reminder tone.',
    pitch: 1.25,
    rate: 0.98,
    volume: 0.88,
  },
  {
    id: 'chibi',
    name: 'Playful Chibi / Energetic',
    description: 'Bright, fast, super-energetic chibi companion tone.',
    pitch: 1.58,
    rate: 1.12,
    volume: 0.95,
  },
  {
    id: 'natural',
    name: 'Natural Melodic Companion',
    description: 'Balanced sweet English female voice with warm resonance.',
    pitch: 1.34,
    rate: 1.02,
    volume: 0.90,
  },
];

export const CHIME_STYLES = [
  {
    id: 'crystalline',
    name: 'Crystalline Water Drops',
    description: 'Harmonic dual-sine chime (E6/G6) mimicking pure drops of spring water.',
  },
  {
    id: 'sparkle',
    name: 'Magical Sparkle Triad',
    description: 'Ascending 3-note magical twinkle triad (C6, E6, G6).',
  },
  {
    id: 'marimba',
    name: 'Kawaii Soft Marimba',
    description: 'Gentle, warm, organic wooden mallet tap notes.',
  },
  {
    id: 'none',
    name: 'Mute Chime (Voice Only)',
    description: 'No acoustic chime before speech.',
  },
];

export const DEFAULT_COMPANION_CONFIG = {
  characterId: 'sakura',
  animationStyle: 'glide',
  voicePreset: 'ultra_sweet',
  customPitch: 1.48,
  customRate: 1.05,
  customVolume: 0.90,
  chimeStyle: 'crystalline',
  greetingText: 'Sunil, please drink your water! 💧',
};

/**
 * Load companion configuration from localStorage
 */
export function loadCompanionConfig() {
  if (typeof window === 'undefined') return DEFAULT_COMPANION_CONFIG;
  try {
    const raw = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANION_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COMPANION_CONFIG, ...parsed };
  } catch {
    return DEFAULT_COMPANION_CONFIG;
  }
}

/**
 * Save companion configuration to localStorage and broadcast event
 */
export function saveCompanionConfig(config) {
  if (typeof window === 'undefined') return;
  try {
    const data = { ...DEFAULT_COMPANION_CONFIG, ...config };
    localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('mindledger:companion-config-updated', { detail: data }));
  } catch (e) {
    console.warn('Failed to save companion config:', e);
  }
}

/**
 * Play a procedural Web Audio chime based on chosen style
 */
export function playChimeSound(chimeStyle = 'crystalline') {
  if (typeof window === 'undefined' || chimeStyle === 'none') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (chimeStyle === 'crystalline') {
      // Harmonic Note 1 (E6 - 1318.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);
      gain1.gain.setValueAtTime(0.07, now);
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
      gain2.gain.setValueAtTime(0.05, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.65);
    } else if (chimeStyle === 'sparkle') {
      // 3-note ascending twinkle: C6, E6, G6, B6
      const notes = [1046.5, 1318.5, 1568.0, 1975.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } else if (chimeStyle === 'marimba') {
      // Warm resonant wood tap notes
      const notes = [880.0, 1174.6];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    }
  } catch (err) {
    console.warn('Web Audio chime error:', err);
  }
}

/**
 * Filter and pick the sweetest, most natural female voice available in the browser
 */
export function getSweetestFemaleVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Natural cloud neural voices (Edge / Chrome Natural)
  const premiumNatural = voices.find((v) => {
    const name = v.name.toLowerCase();
    return (
      (name.includes('natural') || name.includes('online')) &&
      v.lang.startsWith('en') &&
      (name.includes('jenny') || name.includes('aria') || name.includes('ana') || name.includes('michelle'))
    );
  });
  if (premiumNatural) return premiumNatural;

  // 2. High-quality sweet female voices
  const sweetFemale = voices.find((v) => {
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
      (name.includes('female') && !name.includes('male'));
    const isMale =
      name.includes('david') ||
      name.includes('mark') ||
      name.includes('george') ||
      name.includes('richard') ||
      name.includes('guy') ||
      name.includes('male');
    return isEnglish && isSweet && !isMale;
  });
  if (sweetFemale) return sweetFemale;

  // 3. Fallback: Any non-male English voice
  return voices.find((v) => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male')) || voices[0];
}

/**
 * Speak the hydration prompt with sweet voice parameters
 */
export function speakSweetVoice(text, options = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    if (options.chimeStyle) {
      playChimeSound(options.chimeStyle);
    }

    const utteranceText = text || 'Sunil, please drink your water!';
    const utterance = new SpeechSynthesisUtterance(utteranceText);

    utterance.pitch = options.pitch ?? 1.48;
    utterance.rate = options.rate ?? 1.05;
    utterance.volume = options.volume ?? 0.90;

    const voice = getSweetestFemaleVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Small delay if chime is playing so the voice starts smoothly right after the note
    const delay = options.chimeStyle && options.chimeStyle !== 'none' ? 220 : 0;
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, delay);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
