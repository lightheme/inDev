import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { removeToast } from '../../store/slices/uiSlice'
import './Toast.css'

export const ToastContainer = () => {
  const toasts = useAppSelector((state) => state.ui.toasts)
  const dispatch = useAppDispatch()

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          dispatch(removeToast(toast.id))
        }, toast.duration)
        return () => clearTimeout(timer)
      }
    })
  }, [toasts, dispatch])

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => dispatch(removeToast(toast.id))}
        >
          <div className="toast-content">
            <span className="toast-icon">{getIcon(toast.type)}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✓'
    case 'error':
      return '✕'
    case 'warning':
      return '⚠'
    case 'info':
    default:
      return 'ℹ'
  }
}
