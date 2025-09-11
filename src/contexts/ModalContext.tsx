import React, { createContext, useContext, useEffect, useState } from 'react';

interface ModalContextType {
  registerModal: (id: string, onClose: () => void) => void;
  unregisterModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<Map<string, () => void>>(new Map());

  const registerModal = (id: string, onClose: () => void) => {
    setModals(prev => new Map(prev).set(id, onClose));
  };

  const unregisterModal = (id: string) => {
    setModals(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modals.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        // Fechar o último modal registrado (mais recente)
        const lastModal = Array.from(modals.values()).pop();
        lastModal?.();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modals]);

  return (
    <ModalContext.Provider value={{ registerModal, unregisterModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalManager() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalProvider');
  }
  return context;
}