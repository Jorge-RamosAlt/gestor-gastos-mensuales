import React, { useState, useCallback, useMemo } from 'react';
import { ToastContext } from './ToastContext';
export { ToastContext };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    toast: {
      success: (msg, duration) => addToast(msg, 'success', duration),
      error: (msg, duration) => addToast(msg, 'error', duration),
      warning: (msg, duration) => addToast(msg, 'warning', duration),
      info: (msg, duration) => addToast(msg, 'info', duration),
    },
    removeToast,
  }), [addToast, removeToast]);

  const getToastColor = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-600 text-white';
      case 'error': return 'bg-red-600 text-white';
      case 'warning': return 'bg-amber-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:top-4 md:right-4 bottom-4 md:bottom-auto left-4 md:left-auto">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${getToastColor(t.type)} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in pointer-events-auto`}
          >
            <span className="text-lg">{getIcon(t.type)}</span>
            <p className="text-sm font-medium">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-lg font-bold opacity-70 hover:opacity-100 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

