import React from 'react';

export const AVATAR_PRESETS = [
  { id: 'preset-1', label: 'Emerald Spark', color: '#2A5C4B', bg: 'linear-gradient(135deg, #2A5C4B, #1E4236)', symbol: '✨' },
  { id: 'preset-2', label: 'Sapphire Wave', color: '#2563EB', bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)', symbol: '🌊' },
  { id: 'preset-3', label: 'Sunset Amber', color: '#D97706', bg: 'linear-gradient(135deg, #D97706, #B45309)', symbol: '🌅' },
  { id: 'preset-4', label: 'Royal Violet', color: '#7C3AED', bg: 'linear-gradient(135deg, #7C3AED, #6D28D9)', symbol: '👑' },
  { id: 'preset-5', label: 'Crimson Pulse', color: '#DC2626', bg: 'linear-gradient(135deg, #DC2626, #B91C1C)', symbol: '⚡' },
  { id: 'preset-6', label: 'Teal Orbit', color: '#0D9488', bg: 'linear-gradient(135deg, #0D9488, #0F766E)', symbol: '🪐' },
  { id: 'preset-7', label: 'Coral Glow', color: '#E11D48', bg: 'linear-gradient(135deg, #E11D48, #BE123C)', symbol: '🔥' },
  { id: 'preset-8', label: 'Forest Crown', color: '#15803D', bg: 'linear-gradient(135deg, #15803D, #166534)', symbol: '🌲' },
  { id: 'preset-9', label: 'Indigo Shield', color: '#4F46E5', bg: 'linear-gradient(135deg, #4F46E5, #4338CA)', symbol: '🛡️' },
  { id: 'preset-10', label: 'Golden Rocket', color: '#CA8A04', bg: 'linear-gradient(135deg, #CA8A04, #A16207)', symbol: '🚀' },
  { id: 'preset-11', label: 'Slate Beacon', color: '#475569', bg: 'linear-gradient(135deg, #475569, #334155)', symbol: '💡' },
  { id: 'preset-12', label: 'Rose Prism', color: '#DB2777', bg: 'linear-gradient(135deg, #DB2777, #BE185D)', symbol: '💎' },
];

export function getAvatarPreset(presetId) {
  if (!presetId) return null;
  return AVATAR_PRESETS.find((p) => p.id === presetId) || null;
}

export function renderAvatarSvg(presetId, size = 32, label = 'User profile avatar', className = '', customStyle = {}) {
  const preset = typeof presetId === 'string' ? getAvatarPreset(presetId) : null;

  if (!preset) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '50%', flexShrink: 0, ...customStyle }}
        className={`app-avatar-svg app-avatar-svg--default ${className}`}
        aria-label={label}
      >
        <rect width="36" height="36" rx="18" fill="var(--avatar-default-bg, #475569)" />
        <path
          d="M18 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-7 18c0-3.87 3.13-7 7-7s7 3.13 7 7v1H11v-1z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: '50%', flexShrink: 0, ...customStyle }}
      className={`app-avatar-svg app-avatar-svg--preset ${className}`}
      aria-label={preset.label || label}
    >
      <rect width="36" height="36" rx="18" fill={preset.color} />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontSize="16"
        fill="#ffffff"
        style={{ fontFamily: 'sans-serif' }}
      >
        {preset.symbol}
      </text>
    </svg>
  );
}
