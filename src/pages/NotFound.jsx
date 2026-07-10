import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-[#FF5C00]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <rect x="5" y="5" width="4" height="18" rx="1" fill="#FF5C00"/>
            <rect x="5" y="5" width="13" height="4" rx="1" fill="#FF5C00"/>
            <rect x="5" y="13" width="9" height="3.5" rx="1" fill="#FF5C00"/>
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-[#0A0A0A] mb-2">404</h1>
        <p className="text-[#6B6B6B] mb-6">Esta página no existe o el enlace ha expirado.</p>
        <button onClick={() => navigate('/dashboard')}
          className="bg-[#FF5C00] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#E05200] transition-all">
          Volver al Dashboard
        </button>
      </div>
    </div>
  )
}
