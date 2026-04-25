import { createContext, useContext, useState } from "react";

const CallSyncContext = createContext({
  callsUpdatedAt: 0,
  notifyCallsUpdated: () => {},
});

export const useCallSync = () => useContext(CallSyncContext);

export function CallSyncProvider({ children }) {
  const [callsUpdatedAt, setCallsUpdatedAt] = useState(0);

  const notifyCallsUpdated = () => {
    setCallsUpdatedAt(Date.now());
  };

  return (
    <CallSyncContext.Provider value={{ callsUpdatedAt, notifyCallsUpdated }}>
      {children}
    </CallSyncContext.Provider>
  );
}
