import React, { useState, useCallback } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

// Simple in-memory toast store for now
let toastStore: Toast[] = []
let listeners: Set<() => void> = new Set()

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2)
  const newToast: Toast = {
    ...toast,
    id,
    duration: toast.duration ?? 5000
  }
  
  toastStore = [...toastStore, newToast]
  listeners.forEach(listener => listener())
  
  // Auto dismiss
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id)
    }, newToast.duration)
  }
}

const dismissToast = (id: string) => {
  toastStore = toastStore.filter(toast => toast.id !== id)
  listeners.forEach(listener => listener())
}

export const useToast = () => {
  const [, forceUpdate] = useState({})
  
  const rerender = useCallback(() => {
    forceUpdate({})
  }, [])
  
  React.useEffect(() => {
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [rerender])
  
  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    addToast(newToast)
  }, [])
  
  const dismiss = useCallback((id: string) => {
    dismissToast(id)
  }, [])
  
  return {
    toasts: toastStore,
    toast,
    dismiss
  }
}

