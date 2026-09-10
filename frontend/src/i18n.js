import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslation from './locales/en/translation.json'
import hiTranslation from './locales/hi/translation.json'
import frTranslation from './locales/fr/translation.json'
import esTranslation from './locales/es/translation.json'
import deTranslation from './locales/de/translation.json'

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  fr: { translation: frTranslation },
  es: { translation: esTranslation },
  de: { translation: deTranslation },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',

    detection: {
      order:              ['localStorage', 'navigator'],
      caches:             ['localStorage'],
      lookupLocalStorage: 'fms_language',
    },

    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
