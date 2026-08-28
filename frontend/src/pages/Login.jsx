import { useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import SocialLoginButtons from '../components/SocialLoginButtons'
import { persistSession } from '../services/apiClient'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const socialLoginEnabled = import.meta.env.VITE_SOCIAL_LOGIN_ENABLED === 'true'

function getRedirectTarget(from, fallback) {
  let target = ''

  if (typeof from === 'string') {
    target = from
  } else if (from?.pathname) {
    target = `${from.pathname}${from.search || ''}${from.hash || ''}`
  }

  return target.startsWith('/') && !target.startsWith('//') ? target : fallback
}

function getLoginError(error) {
  const message = error.response?.data?.error
  const translations = {
    'Invalid email format': 'Escribe un correo electrónico válido.',
    'Password required': 'La contraseña es obligatoria.',
    'Invalid email or password': 'El correo o la contraseña no son correctos.',
    'This account uses social login': 'Esta cuenta no tiene acceso por contraseña. Contacta con soporte.',
  }

  if (message) return translations[message] || message
  if (error.code === 'ERR_NETWORK') return 'No pudimos conectar con el servidor. Inténtalo de nuevo.'
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = getRedirectTarget(location.state?.from, '/dashboard')

  function validate() {
    const nextErrors = {}
    const normalizedEmail = email.trim()

    if (!normalizedEmail) nextErrors.email = 'Escribe tu correo electrónico.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Usa un formato como nombre@correo.com.'

    if (!password) nextErrors.password = 'Escribe tu contraseña.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const response = await axios.post('/api/auth/login', { email: email.trim().toLowerCase(), password })
      persistSession(response.data)
      toast.success('Sesión iniciada correctamente')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message = getLoginError(error)
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function socialLogin(provider, payload) {
    setServerError('')
    setIsSubmitting(true)
    try {
      const response = await axios.post(`/api/auth/${provider}`, payload)
      persistSession(response.data)
      toast.success('Sesión iniciada correctamente')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message = error.code === 'ERR_NETWORK'
        ? 'No pudimos conectar con el servidor. Inténtalo de nuevo.'
        : `No fue posible iniciar sesión con ${provider === 'google' ? 'Google' : 'Facebook'}.`
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function socialFailure(provider, cancelled = false) {
    const service = provider === 'google' ? 'Google' : 'Facebook'
    const message = cancelled ? `Cancelaste el inicio de sesión con ${service}.` : `No fue posible iniciar sesión con ${service}.`
    setServerError(message)
    toast.error(message)
  }

  return (
    <main id="main-content" className="auth-shell">
      <div className="auth-orb auth-orb--one" aria-hidden="true" />
      <div className="auth-orb auth-orb--two" aria-hidden="true" />

      <div className="auth-layout">
        <aside className="auth-story" aria-label="Bienvenida a Wilmas Fashion">
          <Link to="/" className="auth-brand auth-brand--light" aria-label="Wilmas Fashion, ir al inicio">
            <span className="auth-brand-mark auth-brand-mark--gold" aria-hidden="true">W</span>
            <span>
              <span className="auth-brand-name">Wilmas Fashion</span>
              <span className="auth-brand-caption">Estilo contemporáneo</span>
            </span>
          </Link>

          <div className="auth-story-copy">
            <span className="auth-kicker auth-kicker--light">Tu espacio personal</span>
            <h2>Tu próxima pieza favorita está más cerca.</h2>
            <p>Inicia sesión para continuar tu compra y mantener tu experiencia conectada.</p>
          </div>

          <div className="auth-story-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" strokeLinejoin="round" />
              <path d="m9.5 12 1.7 1.7 3.5-3.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Tus credenciales se envían de forma segura a la API de Wilmas Fashion.</span>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="login-title">
          <div className="lg:hidden">
            <Link to="/" className="auth-brand" aria-label="Wilmas Fashion, ir al inicio">
              <span className="auth-brand-mark" aria-hidden="true">W</span>
              <span className="auth-brand-name">Wilmas Fashion</span>
            </Link>
          </div>

          <Link to="/" className="auth-back-link">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M16 10H4m4-4-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver a la tienda
          </Link>

          <div className="auth-heading">
            <span className="auth-kicker">Bienvenido de nuevo</span>
            <h1 id="login-title">Inicia sesión</h1>
            <p>Ingresa tus datos para continuar donde lo dejaste.</p>
          </div>

          {serverError && (
            <div className="auth-alert" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.5h.01" strokeLinecap="round" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={submit} className="auth-form" noValidate>
            <div className="form-field">
              <label htmlFor="login-email" className="field-label">Correo electrónico</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <path d="M4 6.5h16v11H4z" strokeLinejoin="round" />
                  <path d="m5 7.5 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setErrors((current) => ({ ...current, email: '' }))
                    setServerError('')
                  }}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  placeholder="nombre@correo.com"
                  className="form-input form-input--icon"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  autoFocus
                />
              </div>
              {errors.email && <p id="login-email-error" className="field-error" role="alert">{errors.email}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="login-password" className="field-label">Contraseña</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" strokeLinecap="round" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({ ...current, password: '' }))
                    setServerError('')
                  }}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="form-input form-input--icon form-input--password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-controls="login-password"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="m4 4 16 16M10.7 10.8a2 2 0 0 0 2.5 2.5M9.5 5.4A10.4 10.4 0 0 1 12 5c5.5 0 9 7 9 7a16.3 16.3 0 0 1-2.2 3.1M6.2 6.2C4.1 7.7 3 10 3 12c0 0 3.5 7 9 7 1.2 0 2.3-.3 3.3-.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p id="login-password-error" className="field-error" role="alert">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          {socialLoginEnabled && (
            <SocialLoginButtons
              disabled={isSubmitting}
              onGoogle={(credential) => socialLogin('google', { credential })}
              onFacebook={(accessToken) => socialLogin('facebook', { accessToken })}
              onFailure={socialFailure}
            />
          )}

          <p className="auth-switch">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" state={location.state?.from ? { from: location.state.from } : undefined}>Crear una cuenta</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
