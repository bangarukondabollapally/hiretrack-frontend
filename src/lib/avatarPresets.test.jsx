import { describe, it, expect } from 'vitest';
import { AVATAR_PRESETS, renderAvatarSvg, getAvatarPreset } from './avatarPresets';

describe('avatarPresets', () => {
  it('contains 12 built-in presets with valid properties', () => {
    expect(AVATAR_PRESETS).toHaveLength(12);
    AVATAR_PRESETS.forEach((preset) => {
      expect(preset.id).toMatch(/^preset-(1[0-2]|[1-9])$/);
      expect(preset.color).toBeTruthy();
      expect(preset.label).toBeTruthy();
    });
  });

  it('retrieves preset by key', () => {
    const p1 = getAvatarPreset('preset-1');
    expect(p1).toBeDefined();
    expect(p1.id).toBe('preset-1');

    const invalid = getAvatarPreset('invalid-key');
    expect(invalid).toBeNull();
  });

  it('renders SVG element correctly for presets and fallback', () => {
    const presetSvg = renderAvatarSvg('preset-1', 'A', 32);
    expect(presetSvg).not.toBeNull();
    expect(presetSvg.type).toBe('svg');

    const fallbackSvg = renderAvatarSvg(null, 'B', 32);
    expect(fallbackSvg).toBe('B');
  });
});
