/**
 * ConfirmModal — reemplaza window.confirm() nativo en toda la app.
 * El confirm nativo bloquea el tab del Chrome Extension permanentemente.
 *
 * Uso:
 *   const [confirm, ConfirmUI] = useConfirm()
 *   // en JSX: {ConfirmUI}
 *   // para pedir confirmación: const ok = await confirm({ title, message, danger })
 */

import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = useCallback(({ title, message, danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, danger, confirmText, cancelText, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const ConfirmUI = state ? (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-[#0A0A0A] text-base mb-1">
          {state.title || 'Confirmar acción'}
        </h3>
        {state.message && (
          <p className="text-sm text-[#6B6B6B] mt-1 mb-4 leading-relaxed">
            {state.message}
          </p>
        )}
        {!state.message && <div className="mb-4" />}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium text-[#6B6B6B] hover:bg-[#F5F5F0] transition-all active:scale-95"
          >
            {state.cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 ${
              state.danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-acento hover:bg-acento-hover'
            }`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return [confirm, ConfirmUI]
}
