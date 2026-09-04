import React, { useState, useEffect, useRef } from 'react';
import { useModalStore, ModalVariant } from '../../stores/modalStore';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';

export const AppModal: React.FC = () => {
  const { isOpen, options, closeModal } = useModalStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(options.defaultValue || '');
      // Focus input after modal mounts
      setTimeout(() => {
        if (options.type === 'prompt' && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, options.defaultValue, options.type]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (options.type === 'prompt') {
      closeModal(inputValue.trim());
    } else if (options.type === 'confirm') {
      closeModal(true);
    } else {
      closeModal(true);
    }
  };

  const handleCancel = () => {
    if (options.type === 'prompt') {
      closeModal(null);
    } else if (options.type === 'confirm') {
      closeModal(false);
    } else {
      closeModal(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const renderIcon = (variant: ModalVariant = 'info') => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case 'success':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  const confirmBtnBg = (variant: ModalVariant = 'info') => {
    switch (variant) {
      case 'danger':
        return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-[0_4px_16px_rgba(244,63,94,0.35)] text-white';
      case 'warning':
        return 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-[0_4px_16px_rgba(245,158,11,0.35)] text-white';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_4px_16px_rgba(16,185,129,0.35)] text-white';
      case 'info':
      default:
        return 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-[0_4px_16px_rgba(99,102,241,0.35)] text-white';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={handleCancel}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="relative w-full max-w-md bg-[#12151E] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] text-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={handleCancel}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-[#1A1D2D] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          {renderIcon(options.variant)}
          <div className="flex-1 pr-6">
            <h3 className="text-base font-bold text-white tracking-tight">
              {options.title}
            </h3>
            {options.message && (
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                {options.message}
              </p>
            )}
          </div>
        </div>

        {/* Input if Prompt */}
        {options.type === 'prompt' && (
          <div className="my-4">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={options.placeholder}
              className="w-full bg-[#1A1D2D] border border-[#2A2E45] focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-[#2A2E45]/60">
          {(options.type === 'confirm' || options.type === 'prompt') && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#1A1D2D] border border-transparent hover:border-[#2A2E45] transition-all"
            >
              {options.cancelText || 'ยกเลิก'}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={clsx(
              "px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              confirmBtnBg(options.variant)
            )}
          >
            {options.confirmText || (options.type === 'alert' ? 'ตกลง' : 'ยืนยัน')}
          </button>
        </div>
      </div>
    </div>
  );
};
