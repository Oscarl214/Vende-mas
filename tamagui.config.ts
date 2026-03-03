import { createTamagui } from 'tamagui';
import { config as defaultConfig } from '@tamagui/config/v3';

const vendeMasTokens = {
  ...defaultConfig.tokens,
  color: {
    ...defaultConfig.tokens.color,
    brandPrimary: '#0F766E',
    brandPrimaryLight: '#14B8A6',
    brandPrimaryDark: '#0D5F58',
    brandSecondary: '#1F2937',
    brandSecondaryLight: '#374151',
    brandAccent: '#F97316',
    brandAccentLight: '#FB923C',
    brandBackground: '#FFF7ED',
    brandBackgroundDark: '#111827',
    brandText: '#1F2937',
    brandTextLight: '#6B7280',
    brandTextInverse: '#FFFFFF',
    brandBorder: '#E5E7EB',
    brandBorderDark: '#374151',
    brandError: '#EF4444',
    brandSuccess: '#16A34A',
    brandWarning: '#F59E0B',
  },
};

export const config = createTamagui({
  ...defaultConfig,
  tokens: vendeMasTokens,
});

export default config;

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
