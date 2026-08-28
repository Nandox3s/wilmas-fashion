import { useState } from 'react'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
const facebookAppId = String(import.meta.env.VITE_FACEBOOK_APP_ID || '').trim()

let facebookSdkPromise
function loadFacebookSdk() {
  if (!facebookAppId) return Promise.reject(new Error('FACEBOOK_NOT_CONFIGURED'))
  if (window.FB) return Promise.resolve(window.FB)
  if (facebookSdkPromise) return facebookSdkPromise
  facebookSdkPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      facebookSdkPromise = null
      reject(new Error('FACEBOOK_SDK_TIMEOUT'))
    }, 12000)
    window.fbAsyncInit = () => {
      window.FB.init({ appId: facebookAppId, cookie: false, xfbml: false, version: 'v23.0' })
      window.clearTimeout(timeout)
      resolve(window.FB)
    }
    const existing = document.getElementById('facebook-jssdk')
    if (existing) {
      existing.addEventListener('error', () => {
        window.clearTimeout(timeout)
        facebookSdkPromise = null
        reject(new Error('FACEBOOK_SDK_FAILED'))
      }, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'
    script.onerror = () => {
      window.clearTimeout(timeout)
      facebookSdkPromise = null
      reject(new Error('FACEBOOK_SDK_FAILED'))
    }
    document.head.appendChild(script)
  })
  return facebookSdkPromise
}

function GoogleButton({ disabled, onCredential, onFailure }) {
  if (!googleClientId) return <button type="button" className="social-button" disabled title="Configura VITE_GOOGLE_CLIENT_ID">Continuar con Google</button>
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className={disabled ? 'social-google social-google--disabled' : 'social-google'}>
        <GoogleLogin
          onSuccess={(result) => result.credential ? onCredential(result.credential) : onFailure('google')}
          onError={() => onFailure('google')}
          useOneTap={false}
          text="continue_with"
          shape="pill"
          width="320"
          locale="es"
        />
      </div>
    </GoogleOAuthProvider>
  )
}

export default function SocialLoginButtons({ disabled, onGoogle, onFacebook, onFailure }) {
  const [facebookLoading, setFacebookLoading] = useState(false)

  async function startFacebook() {
    if (disabled || facebookLoading) return
    setFacebookLoading(true)
    try {
      const FB = await loadFacebookSdk()
      try {
        FB.login((response) => {
          setFacebookLoading(false)
          if (response.authResponse?.accessToken) onFacebook(response.authResponse.accessToken)
          else onFailure('facebook', true)
        }, { scope: 'public_profile,email', return_scopes: true })
      } catch {
        setFacebookLoading(false)
        onFailure('facebook')
      }
    } catch {
      setFacebookLoading(false)
      onFailure('facebook')
    }
  }

  return (
    <div className="social-login">
      <div className="auth-divider"><span>o</span></div>
      <GoogleButton disabled={disabled} onCredential={onGoogle} onFailure={onFailure} />
      <button type="button" className="social-button social-button--facebook" onClick={startFacebook} disabled={disabled || facebookLoading || !facebookAppId} title={!facebookAppId ? 'Configura VITE_FACEBOOK_APP_ID' : undefined}>
        {facebookLoading ? <span className="social-provider-spinner" aria-hidden="true" /> : (
          <svg className="social-facebook-mark" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M13.7 22v-9h3l.45-3.5H13.7V7.27c0-1.01.28-1.7 1.73-1.7h1.85V2.44c-.32-.04-1.42-.14-2.7-.14-2.67 0-4.5 1.63-4.5 4.62V9.5H7.05V13h3.03v9h3.62Z" />
          </svg>
        )}
        {facebookLoading ? 'Conectando con Facebook…' : 'Continuar con Facebook'}
      </button>
    </div>
  )
}
