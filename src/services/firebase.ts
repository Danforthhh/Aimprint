import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey:            import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain:        import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId:         import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket:     import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId:             import.meta.env['VITE_FIREBASE_APP_ID'],
}

const app = initializeApp(firebaseConfig)

const recaptchaSiteKey = import.meta.env['VITE_RECAPTCHA_SITE_KEY']
if (import.meta.env.PROD && !recaptchaSiteKey) {
  console.error('VITE_RECAPTCHA_SITE_KEY is not set — App Check will not be initialized in production')
}
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
