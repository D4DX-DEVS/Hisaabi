import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, LogOut, Trash2 } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger" // "danger" | "warning" | "logout"
}) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bgIconColor = {
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
    logout: "bg-slate-100 text-slate-600",
  }[type];

  const buttonColor = {
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    logout: "bg-slate-800 hover:bg-slate-900 focus:ring-slate-500",
  }[type];

  // Map icon to type
  const renderIcon = () => {
    if (type === 'logout') return <LogOut size={24} />;
    if (type === 'danger') return <Trash2 size={24} />;
    return <AlertTriangle size={24} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all sm:max-w-md w-full relative z-10 animate-fade-in">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 transition-colors rounded-full p-1 hover:bg-slate-100 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-5 ${bgIconColor}`}>
              {renderIcon()}
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">
              {title}
            </h3>

            <p className="text-sm text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            className={`w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto transition-colors ${buttonColor}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:mt-0 sm:w-auto transition-colors"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
