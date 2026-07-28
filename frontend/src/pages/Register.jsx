import { useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getRedirectTarget(from, fallback) {
  let target = ''

  if (typeof from === 'string') {
    target = from
  } else if (from?.pathname) {
    target = `${from.pathname}${from.search || ''}${from.hash || ''}`
  }

  return target.startsWith('/') && !target.startsWith('//') ? target : fallback
}

function getRegisterError(error) {
  const message = error.response?.data?.error
  const translations = {
    'Name is required': 'Escribe tu nombre.',
    'Invalid email format': 'Escribe un correo electrónico válido.',
    'Password must be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email already registered': 'Ya existe una cuenta con este correo.',
  }

  if (message) return translations[message] || message
  if (error.code === 'ERR_NETWORK') return 'No pudimos conectar con el servidor. Inténtalo de nuevo.'
  return 'No pudimos crear tu cuenta. Inténtalo de nuevo.'
}

function persistSession(data) {
  if (!data?.token) throw new Error('Missing authentication token')

  window.localStorage.setItem('token', data.token)
  window.localStorage.setItem('wf_user', JSON.stringify(data.user || {}))

  if (data.user?.role) window.localStorage.setItem('role', data.user.role)
  else window.localStorage.removeItem('role')
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = getRedirectTarget(location.state?.from, '/')

  function validate() {
    const nextErrors = {}
    const normalizedName = name.trim()
    const normalizedEmail = email.trim()

    if (!normalizedName) nextErrors.name = 'Escribe tu nombre.'
    else if (normalizedName.length < 2) nextErrors.name = 'El nombre debe tener al menos 2 caracteres.'

    if (!normalizedEmail) nextErrors.email = 'Escribe tu correo electrónico.'
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = 'Usa un formato como nombre@correo.com.'

    if (!password) nextErrors.password = 'Crea una contraseña.'
    else if (password.length < 6) nextErrors.password = 'Usa al menos 6 caracteres.'

    if (!passwordConfirmation) nextErrors.passwordConfirmation = 'Confirma tu contraseña.'
    else if (passwordConfirmation !== password) nextErrors.passwordConfirmation = 'Las contraseñas no coinciden.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submit(event) {
    event.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const response = await axios.post('/api/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
      persistSession(response.data)
      toast.success('Tu cuenta está lista')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      const message = getRegisterError(error)
      setServerError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="auth-shell">
      <div className="auth-orb auth-orb--one" aria-hidden="true" />
      <div className="auth-orb auth-orb--two" aria-hidden="true" />

      <div className="auth-layout">
        <aside className="auth-story" aria-label="Crea tu cuenta en Wilmas Fashion">
          <Link to="/" className="auth-brand auth-brand--light" aria-label="Wilmas Fashion, ir al inicio">
            <span className="auth-brand-mark auth-brand-mark--gold" aria-hidden="true">W</span>
            <span>
              <span className="auth-brand-name">Wilmas Fashion</span>
              <span className="auth-brand-caption">Estilo contemporáneo</span>
            </span>
          </Link>

          <div className="auth-story-copy">
            <span className="auth-kicker auth-kicker--light">Una experiencia a tu medida</span>
            <h2>Crea tu cuenta y continúa descubriendo tu estilo.</h2>
            <p>Guarda tu sesión y disfruta un proceso de compra más fluido desde cualquier dispositivo.</p>
          </div>

          <ul className="auth-benefits" aria-label="Beneficios de crear una cuenta">
            <li>
              <span aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              Continúa tu compra sin perder el contexto.
            </li>
            <li>
              <span aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              Accede de forma rápida y segura.
            </li>
            <li>
              <span aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              Conserva una experiencia personalizada.
            </li>
          </ul>
        </aside>

        <section className="auth-card" aria-labelledby="register-title">
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
            <span className="auth-kicker">Empieza aquí</span>
            <h1 id="register-title">Crea tu cuenta</h1>
            <p>Completa tus datos para comenzar. Solo tomará un momento.</p>
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
              <label htmlFor="register-name" className="field-label">Nombre completo</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" strokeLinecap="round" />
                </svg>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setErrors((current) => ({ ...current, name: '' }))
                    setServerError('')
                  }}
                  autoComplete="name"
                  placeholder="Tu nombre"
                  className="form-input form-input--icon"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'register-name-error' : undefined}
                  autoFocus
                />
              </div>
              {errors.name && <p id="register-name-error" className="field-error" role="alert">{errors.name}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="register-email" className="field-label">Correo electrónico</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <path d="M4 6.5h16v11H4z" strokeLinejoin="round" />
                  <path d="m5 7.5 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="register-email"
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
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                />
              </div>
              {errors.email && <p id="register-email-error" className="field-error" role="alert">{errors.email}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="register-password" className="field-label">Contraseña</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" strokeLinecap="round" />
                </svg>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({ ...current, password: '', passwordConfirmation: '' }))
                    setServerError('')
                  }}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className="form-input form-input--icon form-input--password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'register-password-error' : 'register-password-hint'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  aria-controls="register-password register-password-confirmation"
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
              {errors.password
                ? <p id="register-password-error" className="field-error" role="alert">{errors.password}</p>
                : <p id="register-password-hint" className="field-hint">Usa al menos 6 caracteres.</p>}
            </div>

            <div className="form-field">
              <label htmlFor="register-password-confirmation" className="field-label">Confirmar contraseña</label>
              <div className="form-control-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="form-control-icon" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" strokeLinecap="round" />
                </svg>
                <input
                  id="register-password-confirmation"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(event) => {
                    setPasswordConfirmation(event.target.value)
                    setErrors((current) => ({ ...current, passwordConfirmation: '' }))
                    setServerError('')
                  }}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  className="form-input form-input--icon"
                  aria-invalid={Boolean(errors.passwordConfirmation)}
                  aria-describedby={errors.passwordConfirmation ? 'register-password-confirmation-error' : undefined}
                />
              </div>
              {errors.passwordConfirmation && <p id="register-password-confirmation-error" className="field-error" role="alert">{errors.passwordConfirmation}</p>}
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="auth-switch">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" state={location.state?.from ? { from: location.state.from } : undefined}>Iniciar sesión</Link>
          </p>
          <p className="auth-privacy">Al continuar, aceptas el tratamiento de tus datos para gestionar tu cuenta y tus compras.</p>
        </section>
      </div>
    </main>
  )
}
