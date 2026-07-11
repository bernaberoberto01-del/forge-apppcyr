import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Forge Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 max-w-sm w-full text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="font-bold text-[#0A0A0A] mb-2">Algo ha fallado</h2>
            <p className="text-sm text-[#6B6B6B] mb-4">
              {this.state.error?.message || 'Error inesperado'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="bg-[#FF5C00] text-white text-sm font-semibold px-6 py-3 rounded-xl">
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
