import { useEffect, useRef } from 'react';
import { useModalManager } from '@/contexts/ModalContext';

export function useGlobalEscClose(isOpen: boolean, onClose: () => void) {
  const { registerModal, unregisterModal } = useModalManager();
  const modalIdRef = useRef<string>();

  useEffect(() => {
    if (isOpen) {
      const modalId = `modal-${Date.now()}-${Math.random()}`;
      modalIdRef.current = modalId;
      registerModal(modalId, onClose);
      
      return () => {
        unregisterModal(modalId);
      };
    } else if (modalIdRef.current) {
      unregisterModal(modalIdRef.current);
      modalIdRef.current = undefined;
    }
  }, [isOpen, onClose, registerModal, unregisterModal]);

  useEffect(() => {
    return () => {
      if (modalIdRef.current) {
        unregisterModal(modalIdRef.current);
      }
    };
  }, [unregisterModal]);
}