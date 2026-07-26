import React, { createContext, useContext, useState } from "react";

const ModalContext = createContext({
  modalState: null,
  setModalState: () => {},
  loading: false,
  setLoading: () => {},
});

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const [loading, setLoading] = useState(false);
  return (
    <ModalContext.Provider value={{ modalState, setModalState, loading, setLoading }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}

export default ModalContext;
