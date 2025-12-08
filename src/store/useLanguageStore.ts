import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../constants/translations';
import type { Language } from '../constants/translations';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.vi) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'vi', // Default to Vietnamese
      setLanguage: (lang: Language) => set({ language: lang }),
      t: (key: keyof typeof translations.vi) => {
        const { language } = get();
        return translations[language][key] || translations['vi'][key] || key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);
