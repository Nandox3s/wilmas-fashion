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
    window.fbAsyncInit = () => {
      window.FB.init({ appId: facebookAppId, cookie: false, xfbml: false, version: 'v23.0' })
      resolve(window.FB)
    }
    const existing = document.getElementById('facebook-jssdk')
    if (existing) return
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'
    script.onerror = () => { facebookSdkPromise = null; reject(new Error('FACEBOOK_SDK_FAILED')) }
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
      FB.login((response) => {
        setFacebookLoading(false)
        if (response.authResponse?.accessToken) onFacebook(response.authResponse.accessToken)
        else onFailure('facebook', true)
      }, { scope: 'public_profile,email', return_scopes: true })
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
        <span className="social-facebook-mark" aria-hidden="true">f</span>
        {facebookLoading ? 'Conectando con Facebook…' : 'Continuar con Facebook'}
      </button>
    </div>
  )
}
