import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import commonEN from './locales/en/common.json';
import startPageEN from './locales/en/startPage.json';
import setupEN from './locales/en/setup.json';
import wordsEN from './locales/en/words.json';
import endPageEN from './locales/en/endPage.json';

// Russian translations
import commonRU from './locales/ru/common.json';
import startPageRU from './locales/ru/startPage.json';
import setupRU from './locales/ru/setup.json';
import wordsRU from './locales/ru/words.json';
import endPageRU from './locales/ru/endPage.json';

const resources = {
  en: {
    common: commonEN,
    startPage: startPageEN,
    setup: setupEN,
    words: wordsEN,
    endPage: endPageEN,
  },
  ru: {
    common: commonRU,
    startPage: startPageRU,
    setup: setupRU,
    words: wordsRU,
    endPage: endPageRU,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'startPage', 'setup', 'words', 'endPage'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
