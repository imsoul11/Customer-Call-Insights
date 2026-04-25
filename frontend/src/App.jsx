import { useState } from 'react';
import { CallSyncProvider } from './context/CallSyncContext';
import { ExportContext } from './context/ExportContext';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  const [exportConfig, setExportConfig] = useState(null);
  return (
    <ExportContext.Provider value={{ exportConfig, setExportConfig }}>
      <CallSyncProvider>
        <AppRoutes />
      </CallSyncProvider>
    </ExportContext.Provider>
  );
};

export default App;
