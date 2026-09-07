/**
 * CustomizePage — Anime Companion Customization Studio
 *
 * Allows users to choose their anime companion character, configure cute animation styles,
 * fine-tune voice sweetness/pitch/speed, pick acoustic chimes, and test animations live.
 *
 * Author: MindLedger Team
 * Created: 2026-09-06
 */

import React, { useState, useEffect } from 'react';
import {
  FiCheck,
  FiClock,
  FiDroplet,
  FiHeart,
  FiMusic,
  FiPlay,
  FiRefreshCw,
  FiSave,
  FiSliders,
  FiStar,
  FiVolume2,
  FiZap,
} from 'react-icons/fi';
import Toast from '../components/Toast';
import {
  ANIMATION_STYLES,
  CHARACTERS,
  CHIME_STYLES,
  DEFAULT_COMPANION_CONFIG,
  loadCompanionConfig,
  playChimeSound,
  saveCompanionConfig,
  speakSweetVoice,
  VOICE_PRESETS,
} from '../utils/companionConfig';

export default function CustomizePage() {
  const [config, setConfig] = useState(loadCompanionConfig);
  const [toasts, setToasts] = useState([]);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setConfig(loadCompanionConfig());
  }, []);

  const addToast = (type, message, title) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Selected character metadata
  const selectedCharacter =
    CHARACTERS.find((c) => c.id === config.characterId) || CHARACTERS[0];

  // Character selection
  const handleSelectCharacter = (charId) => {
    const char = CHARACTERS.find((c) => c.id === charId);
    setConfig((prev) => ({
      ...prev,
      characterId: charId,
      // Default to character's greeting if user hasn't heavily modified it
      greetingText: prev.greetingText === DEFAULT_COMPANION_CONFIG.greetingText && char
        ? char.defaultGreeting
        : prev.greetingText,
    }));
  };

  // Animation style selection
  const handleSelectAnimation = (animId) => {
    setConfig((prev) => ({ ...prev, animationStyle: animId }));
  };

  // Voice preset selection
  const handleSelectVoicePreset = (presetId) => {
    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      voicePreset: presetId,
      customPitch: preset.pitch,
      customRate: preset.rate,
      customVolume: preset.volume,
    }));
  };

  // Chime sound selection
  const handleSelectChime = (chimeId) => {
    setConfig((prev) => ({ ...prev, chimeStyle: chimeId }));
    playChimeSound(chimeId);
  };

  // Live voice test
  const handleTestVoice = () => {
    setIsPlayingVoice(true);
    speakSweetVoice(config.greetingText || selectedCharacter.defaultGreeting, {
      pitch: config.customPitch,
      rate: config.customRate,
      volume: config.customVolume,
      chimeStyle: config.chimeStyle,
    });
    setTimeout(() => setIsPlayingVoice(false), 2800);
  };

  // Launch live companion overlay preview on-screen
  const handleTestCompanionOnScreen = () => {
    saveCompanionConfig(config);
    window.dispatchEvent(new CustomEvent('mindledger:trigger-water-overlay'));
    addToast('info', `Previewing ${selectedCharacter.name} on your screen with ${config.animationStyle} animation!`, 'Companion Preview');
  };

  // Save preferences
  const handleSavePreferences = () => {
    saveCompanionConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    addToast('success', 'Companion character, animation style, and voice preferences saved successfully!', 'Preferences Saved');
  };

  // Reset to default
  const handleResetDefaults = () => {
    setConfig(DEFAULT_COMPANION_CONFIG);
    saveCompanionConfig(DEFAULT_COMPANION_CONFIG);
    addToast('info', 'Companion settings reset to factory defaults.', 'Settings Reset');
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Toast Notification Container */}
      <div className="toast-container" style={{ zIndex: 100000 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            title={toast.title}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* ───────── Hero Banner & Action Bar ───────── */}
      <div
        className="card"
        style={{
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.3)',
        }}
      >
        {/* Ambient Glows */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '120px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${selectedCharacter.themeColor}55 0%, transparent 70%)`,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.12)', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
              <FiStar style={{ color: '#facc15' }} />
              <span>MindLedger Companion Studio</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Customize Your Hydration Companion
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', maxWidth: '620px', lineHeight: 1.5 }}>
              Choose your favorite anime character, select cute entrance animation styles, tune a sweeter melodic reminder voice, and personalize your desktop reminder experience.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleTestCompanionOnScreen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <FiPlay style={{ fontSize: '15px' }} />
              <span>🎬 Test On-Screen</span>
            </button>

            <button
              onClick={handleSavePreferences}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                background: selectedCharacter.accentGradient,
                border: 'none',
                boxShadow: `0 4px 18px ${selectedCharacter.themeColor}88`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <FiSave style={{ fontSize: '15px' }} />
              <span>{savedSuccess ? 'Saved!' : 'Save Companion'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────── SECTION 1: Anime Character Roster ───────── */}
      <div className="card" style={{ borderRadius: '18px', padding: '24px 28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ec489918', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777' }}>
              <FiHeart style={{ fontSize: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                1. Select Your Anime Companion
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Pick the character sprite that appears on your screen when hydration is due
              </p>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active: <strong style={{ color: selectedCharacter.themeColor }}>{selectedCharacter.name}</strong>
          </span>
        </div>

        {/* Characters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {CHARACTERS.map((char) => {
            const isSelected = config.characterId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => handleSelectCharacter(char.id)}
                style={{
                  position: 'relative',
                  padding: '20px',
                  borderRadius: '16px',
                  border: isSelected
                    ? `2.5px solid ${char.themeColor}`
                    : '1.5px solid var(--border-color)',
                  background: isSelected
                    ? `linear-gradient(180deg, ${char.badgeBg}44 0%, #ffffff 100%)`
                    : 'var(--bg-card)',
                  boxShadow: isSelected
                    ? `0 12px 28px -6px ${char.themeColor}33, 0 0 0 1px ${char.themeColor}33`
                    : 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = char.themeColor;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Active Checkmark Pill */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: char.themeColor,
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      boxShadow: `0 2px 8px ${char.themeColor}66`,
                    }}
                  >
                    <FiCheck /> Active
                  </div>
                )}

                {/* Character Avatar Preview */}
                <div
                  style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${char.badgeBg} 0%, transparent 70%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    position: 'relative',
                  }}
                >
                  <img
                    src={char.frontSprite || char.walkSprite}
                    alt={char.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: `drop-shadow(0 6px 14px ${char.themeColor}44)`,
                    }}
                  />
                </div>

                {/* Badge Tag */}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 9px',
                    borderRadius: '12px',
                    backgroundColor: char.badgeBg,
                    color: char.badgeColor,
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '8px',
                  }}
                >
                  {char.tag}
                </span>

                <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
                  {char.name}
                </h4>
                <div style={{ fontSize: '12px', fontWeight: 600, color: char.themeColor, marginBottom: '8px' }}>
                  {char.title}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                  {char.description}
                </p>

                {/* Sample Greeting Snippet */}
                <div
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(241, 245, 249, 0.7)',
                    fontSize: '11.5px',
                    color: '#475569',
                    fontStyle: 'italic',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  &ldquo;{char.defaultGreeting}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────── SECTION 2: Animation Entrance Styles ───────── */}
      <div className="card" style={{ borderRadius: '18px', padding: '24px 28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FiZap style={{ fontSize: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                2. Choose Entrance Animation Motion
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Select how your companion enters from the bottom-right corner onto your screen
              </p>
            </div>
          </div>
        </div>

        {/* Animation Styles Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {ANIMATION_STYLES.map((anim) => {
            const isSelected = config.animationStyle === anim.id;
            return (
              <div
                key={anim.id}
                onClick={() => handleSelectAnimation(anim.id)}
                style={{
                  position: 'relative',
                  padding: '18px 20px',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #2563eb' : '1.5px solid var(--border-color)',
                  backgroundColor: isSelected ? '#eff6ff' : 'var(--bg-card)',
                  boxShadow: isSelected ? '0 8px 20px -4px rgba(37, 99, 235, 0.25)' : 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = '#93c5fd';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>{anim.icon}</span>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: isSelected ? '#1d4ed8' : 'var(--text-main)' }}>
                      {anim.name}
                    </h4>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1d4ed8' : '#64748b' }}>
                    {anim.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                  {anim.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────── SECTION 3: Sweet Voice & Acoustic Studio ───────── */}
      <div className="card" style={{ borderRadius: '18px', padding: '24px 28px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#10b98118', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <FiVolume2 style={{ fontSize: '18px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                3. Sweet Voice & Acoustic Audio Engine
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Fine-tune voice sweetness, melodic pitch, Web Audio chimes, and custom greeting phrases
              </p>
            </div>
          </div>

          <button
            onClick={handleTestVoice}
            disabled={isPlayingVoice}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FiPlay style={{ fontSize: '13px' }} />
            <span>{isPlayingVoice ? 'Playing...' : '▶ Listen & Test Voice'}</span>
          </button>
        </div>

        {/* Voice Presets Chips */}
        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
            Voice Sweetness Preset
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {VOICE_PRESETS.map((vp) => {
              const isSelected = config.voicePreset === vp.id;
              return (
                <div
                  key={vp.id}
                  onClick={() => handleSelectVoicePreset(vp.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #059669' : '1.5px solid var(--border-color)',
                    backgroundColor: isSelected ? '#ecfdf5' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isSelected ? '#047857' : 'var(--text-main)', marginBottom: '2px' }}>
                    {vp.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {vp.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sliders Grid: Pitch, Speed, Chime */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '22px', marginBottom: '22px' }}>
          {/* Pitch Slider */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Voice Pitch (Sweetness)</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>{config.customPitch?.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.9"
              max="1.75"
              step="0.05"
              value={config.customPitch ?? 1.48}
              onChange={(e) => setConfig({ ...config, customPitch: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#059669' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              <span>Standard (1.0x)</span>
              <span>Sweet Melodic (1.48x)</span>
              <span>Anime High (1.75x)</span>
            </div>
          </div>

          {/* Speech Rate Slider */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Speech Pace & Speed</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>{config.customRate?.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.25"
              step="0.02"
              value={config.customRate ?? 1.05}
              onChange={(e) => setConfig({ ...config, customRate: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#059669' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              <span>Relaxed (0.85x)</span>
              <span>Natural (1.05x)</span>
              <span>Brisk (1.25x)</span>
            </div>
          </div>

          {/* Chime Style Selector */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Harmonic Water Chime
            </span>
            <select
              value={config.chimeStyle || 'crystalline'}
              onChange={(e) => handleSelectChime(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {CHIME_STYLES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Plays a delicate crystalline note before speech to gently capture your attention.
            </div>
          </div>
        </div>

        {/* Custom Greeting Phrase Input */}
        <div style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
            Custom Greeting Phrase
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="text"
              value={config.greetingText || ''}
              onChange={(e) => setConfig({ ...config, greetingText: e.target.value })}
              placeholder="e.g. Sunil, please drink your water! 💧"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #86efac',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
            <button
              onClick={() => {
                setConfig({ ...config, greetingText: selectedCharacter.defaultGreeting });
                addToast('info', 'Reset greeting phrase to character default.', 'Greeting Reset');
              }}
              title="Reset to character default greeting"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #86efac',
                backgroundColor: '#ffffff',
                color: '#166534',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset Default
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>Presets:</span>
            {[
              'Sunil, please drink your water! 💧',
              'Master Sunil, fresh water for you! Stay healthy~ 🌸',
              'Nya~ Sunil! Time to pause and take a sip! 🐾',
              'Vitals check, Sunil: Hydration replenishment recommended now! ⚡',
            ].map((presetText, idx) => (
              <button
                key={idx}
                onClick={() => setConfig({ ...config, greetingText: presetText })}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #86efac',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#15803d',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                {presetText}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────── Bottom Action Bar ───────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 24px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          onClick={handleResetDefaults}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FiRefreshCw /> Reset Defaults
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleTestCompanionOnScreen}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1.5px solid #3b82f6',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FiPlay /> Test On-Screen
          </button>

          <button
            onClick={handleSavePreferences}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: selectedCharacter.accentGradient,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: `0 4px 14px ${selectedCharacter.themeColor}55`,
            }}
          >
            <FiSave /> {savedSuccess ? 'Preferences Saved!' : 'Save Companion'}
          </button>
        </div>
      </div>
    </div>
  );
}
