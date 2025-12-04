import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/th'; // Thai locale
import 'dayjs/locale/en'; // English locale

import enTranslations from './locales/en.json';
import thTranslations from './locales/th.json';

// Function to update dayjs locale based on i18n language
const updateDayjsLocale = (lang: string) => {
  if (lang === 'th') {
    dayjs.locale('th');
  } else {
    dayjs.locale('en');
  }
};

i18n
  .use(LanguageDetector) // Detects user's browser language
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      th: {
        translation: thTranslations,
      },
    },
    fallbackLng: 'en', // Default language
    supportedLngs: ['en', 'th'], // Supported languages
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then browser
      caches: ['localStorage'], // Cache language preference
      lookupLocalStorage: 'i18nextLng', // Key in localStorage
    },
  });

// Initialize dayjs locale on startup
updateDayjsLocale(i18n.language);

// Update dayjs locale when language changes
i18n.on('languageChanged', (lng) => {
  updateDayjsLocale(lng);
});

export default i18n;

