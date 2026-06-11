import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import de from './locales/de.json'
import en from './locales/en.json'
import gsw from './locales/gsw.json'
import fr from './locales/fr.json'
import es from './locales/es.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      en: { translation: en },
      gsw: { translation: gsw },
    },
    fallbackLng: 'de',
    supportedLngs: ['de', 'en', 'gsw', 'fr', 'es'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
  })

export default i18n

