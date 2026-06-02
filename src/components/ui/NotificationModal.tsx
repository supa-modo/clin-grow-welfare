import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { TbAlertTriangle, TbCheck, TbTrash, TbX } from 'react-icons/tb';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
export type NotificationModalType = 'confirm' | 'delete';
export type NotificationModalInputType = 'text' | 'textarea';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: NotificationModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: (inputValue: string) => void;
  onCancel?: () => void;
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputType?: NotificationModalInputType;
  inputRows?: number;
}

export function NotificationModal({
  isOpen,
  onClose,
  type = 'confirm',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  onConfirm,
  onCancel,
  showInput = false,
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  inputValue = '',
  onInputChange,
  inputType = 'text',
  inputRows = 4
}: NotificationModalProps) {
  useBodyScrollLock(isOpen);
  const [mounted, setMounted] = useState(false);
  const [localInputValue, setLocalInputValue] = useState(inputValue);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setLocalInputValue(inputValue);
  }, [inputValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const config = useMemo(() => {
    if (type === 'delete') {
      return {
        icon: TbTrash,
        iconBg: 'bg-gradient-to-br from-secondary-600 to-secondary-500',
        borderColor: 'border-red-100',
        bgColor: 'bg-red-50/90',
        titleColor: 'text-red-900',
        messageColor: 'text-red-800',
        primaryButton: 'bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800'
      };
    }
    return {
      icon: TbAlertTriangle,
      iconBg: 'bg-gradient-to-br from-brand-600 to-brand-700',
      borderColor: 'border-brand-100',
      bgColor: 'bg-brand-50/80',
      titleColor: 'text-brand-800',
      messageColor: 'text-ink-700',
      primaryButton: 'bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800'
    };
  }, [type]);

  const isConfirmDisabled = showInput && inputRequired && !localInputValue.trim();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setLocalInputValue(v);
    onInputChange?.(v);
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm?.(localInputValue);
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="notification-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className={clsx('relative w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-panel', config.borderColor)}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              aria-label="Close"
            >
              <TbX className="h-5 w-5" />
            </button>
            <div className={clsx('px-4 py-4 sm:px-5', config.bgColor)}>
              <div className="flex items-start gap-4">
                <div className={clsx('rounded-2xl p-3 shadow-lg', config.iconBg)}>
                  <config.icon size={22} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={clsx('font-google text-base font-bold lg:text-lg', config.titleColor)}>{title}</h3>
                  <p className={clsx('mt-1 text-sm leading-relaxed', config.messageColor)}>{message}</p>
                  {showInput ? (
                    <div className="mt-4">
                      {inputLabel ? (
                        <label className="mb-1.5 block text-xs font-semibold text-ink-700">
                          {inputLabel}
                          {inputRequired ? <span className="ml-1 text-red-600">*</span> : null}
                        </label>
                      ) : null}
                      {inputType === 'textarea' ? (
                        <textarea
                          value={localInputValue}
                          onChange={handleInputChange}
                          placeholder={inputPlaceholder}
                          rows={inputRows}
                          className={clsx(
                            'w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                            isConfirmDisabled && inputRequired
                              ? 'border-red-300 focus:ring-red-200'
                              : 'border-ink-200 focus:ring-brand-200'
                          )}
                        />
                      ) : (
                        <input
                          value={localInputValue}
                          onChange={handleInputChange}
                          placeholder={inputPlaceholder}
                          className={clsx(
                            'w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                            isConfirmDisabled && inputRequired
                              ? 'border-red-300 focus:ring-red-200'
                              : 'border-ink-200 focus:ring-brand-200'
                          )}
                        />
                      )}
                      {isConfirmDisabled && inputRequired ? (
                        <p className="mt-1 text-xs text-red-600">This field is required.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2 pb-1 md:mt-6 md:gap-3 lg:flex-row">
                {showCancel ? (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-full border border-gray-400 bg-transparent px-5 py-2 text-sm font-semibold text-ink-700 transition-all hover:border-ink-400 hover:bg-ink-100"
                  >
                    {cancelText}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={clsx(
                    'flex-1 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all',
                    isConfirmDisabled ? 'cursor-not-allowed bg-ink-400 opacity-50' : config.primaryButton
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    {type === 'delete' ? <TbTrash className="h-5 w-5" /> : <TbCheck className="h-5 w-5" />}
                    {confirmText}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
