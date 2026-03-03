import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, saveLanguage } from '@/lib/i18n';

type LanguageContextType = {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  changeLanguage: async () => {},
  ready: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    initI18n().then(() => {
      setLanguage(i18n.language);
      setReady(true);
    });
  }, []);

  const changeLanguage = useCallback(async (lang: string) => {
    await i18n.changeLanguage(lang);
    await saveLanguage(lang);
    setLanguage(lang);
  }, []);

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, ready }}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
}
