import React from 'react';
import { renderAvatarSvg } from '../lib/avatarPresets';

export default function Avatar({
  avatarDataUrl = null,
  avatarPreset = null,
  size = 32,
  alt = 'User avatar',
  className = '',
  style = {},
}) {
  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt={alt}
        className={`app-avatar ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return renderAvatarSvg(avatarPreset, size, alt, className, style);
}
