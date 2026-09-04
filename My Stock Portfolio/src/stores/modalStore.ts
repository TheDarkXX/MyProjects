import { create } from 'zustand';

export type ModalType = 'confirm' | 'alert' | 'prompt';
export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ModalOptions {
  type?: ModalType;
  variant?: ModalVariant;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions;
  resolve: ((val: any) => void) | null;

  openModal: (options: ModalOptions) => Promise<any>;
  closeModal: (result: any) => void;

  confirm: (title: string, message?: string, options?: Partial<ModalOptions>) => Promise<boolean>;
  alert: (title: string, message?: string, options?: Partial<ModalOptions>) => Promise<void>;
  prompt: (title: string, message?: string, defaultValue?: string, options?: Partial<ModalOptions>) => Promise<string | null>;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: { title: '' },
  resolve: null,

  openModal: (options: ModalOptions) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },

  closeModal: (result: any) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({ isOpen: false, resolve: null });
  },

  confirm: (title: string, message?: string, options?: Partial<ModalOptions>) => {
    return get().openModal({
      type: 'confirm',
      variant: options?.variant || 'warning',
      title,
      message,
      confirmText: options?.confirmText || 'ยืนยัน',
      cancelText: options?.cancelText || 'ยกเลิก',
      ...options,
    });
  },

  alert: (title: string, message?: string, options?: Partial<ModalOptions>) => {
    return get().openModal({
      type: 'alert',
      variant: options?.variant || 'info',
      title,
      message,
      confirmText: options?.confirmText || 'ตกลง',
      ...options,
    });
  },

  prompt: (title: string, message?: string, defaultValue?: string, options?: Partial<ModalOptions>) => {
    return get().openModal({
      type: 'prompt',
      variant: options?.variant || 'info',
      title,
      message,
      defaultValue: defaultValue || '',
      placeholder: options?.placeholder || 'กรอกข้อมูล...',
      confirmText: options?.confirmText || 'บันทึก',
      cancelText: options?.cancelText || 'ยกเลิก',
      ...options,
    });
  },
}));
