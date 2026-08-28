import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('React render error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f3ef] px-4 py-12 text-center">
        <section className="w-full max-w-xl rounded-[2rem] border border-[#39232c]/10 bg-white p-8 shadow-sm sm:p-12" role="alert">
          <p className="eyebrow">Wilmas Fashion</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-[#28161e]">Algo salió mal.</h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-[#705d65]">No pudimos mostrar esta sección. Puedes intentarlo nuevamente o volver al inicio.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => { this.setState({ failed: false }); window.location.reload() }} className="button-primary">Reintentar</button>
            <a href="/" className="button-secondary">Volver al inicio</a>
          </div>
        </section>
      </main>
    )
  }
}
