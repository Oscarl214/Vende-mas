import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import es from '@/locales/es.json';
import en from '@/locales/en.json';

const LANGUAGE_KEY = 'app_language';

function getDeviceLanguage(): string {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'es';
  return locale.startsWith('es') ? 'es' : 'en';
}

export async function getSavedLanguage(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function saveLanguage(lang: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  } catch {}
}

export async function initI18n(): Promise<void> {
  const saved = await getSavedLanguage();
  const lng = saved ?? getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
