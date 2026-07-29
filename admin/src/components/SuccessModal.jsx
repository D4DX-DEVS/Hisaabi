import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';

export default function SuccessModal({
    isOpen,
    onClose,
    title = "Success!",
    message = "The operation was completed successfully.",
    buttonText = "Continue",
    autoCloseTimeout = null // If provided, modal closes automatically after ms
}) {

    // Prevent body scroll and handle auto-close
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';

            if (autoCloseTimeout) {
                const timer = setTimeout(() => {
                    onClose();
                }, autoCloseTimeout);
                return () => {
                    clearTimeout(timer);
                    document.body.style.overflow = 'unset';
                };
            }
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, autoCloseTimeout, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all sm:max-w-sm w-full relative z-10 animate-fade-in text-center p-8">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                    <X size={20} />
                </button>

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 mb-6 text-emerald-500">
                    <CheckCircle2 size={48} strokeWidth={1.5} />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">
                    {title}
                </h3>

                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                >
                    {buttonText}
                </button>
            </div>
        </div>,
        document.body
    );
}
