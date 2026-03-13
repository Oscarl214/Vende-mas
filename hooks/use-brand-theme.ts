import { useMemo } from 'react';
import { useTheme } from 'tamagui';
import { useSession } from '@/hooks/use-session';

type BrandTheme = {
  primary: string;
  primaryDark: string;
  primarySoftBg: string;
  accent: string;
  accentSoftBg: string;
  secondary: string;
  secondaryBg: string;
  onPrimary: string;
  onSecondary: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustLightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const adjust = (v: number) => clamp(v * factor);
  const r = Math.round(adjust(rgb.r));
  const g = Math.round(adjust(rgb.g));
  const b = Math.round(adjust(rgb.b));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function softBackground(hex: string): string {
  // Lighten bright colors a bit and darken very dark ones slightly.
  const lum = luminance(hex);
  if (lum > 0.7) {
    return adjustLightness(hex, 0.9);
  }
  if (lum < 0.2) {
    return adjustLightness(hex, 1.2);
  }
  return adjustLightness(hex, 1.05);
}

function chooseOnColor(hex: string): string {
  // Return white or near-black depending on luminance for contrast.
  const lum = luminance(hex);
  return lum > 0.55 ? '#111827' : '#FFFFFF';
}

export function useBrandTheme(): BrandTheme {
  const { profile } = useSession();
  const theme = useTheme();

  return useMemo(() => {
    const primaryHex =
      profile?.brand_colors?.primary ?? String(theme.brandPrimary?.val ?? '#0F766E');
    const secondaryHex =
      profile?.brand_colors?.secondary ?? String(theme.brandSecondary?.val ?? '#1F2937');
    const accentHex =
      profile?.brand_colors?.accent ?? String(theme.brandAccent?.val ?? '#F97316');

    const primaryDark = adjustLightness(primaryHex, 0.8);
    const accentSoftBg = softBackground(accentHex);
    const primarySoftBg = softBackground(primaryHex);
    const secondaryBg = softBackground(secondaryHex);

    const onPrimary = chooseOnColor(primaryHex);
    const onSecondary = chooseOnColor(secondaryHex);

    return {
      primary: primaryHex,
      primaryDark,
      primarySoftBg,
      accent: accentHex,
      accentSoftBg,
      secondary: secondaryHex,
      secondaryBg,
      onPrimary,
      onSecondary,
    };
  }, [profile?.brand_colors?.primary, profile?.brand_colors?.secondary, profile?.brand_colors?.accent, theme]);
}

