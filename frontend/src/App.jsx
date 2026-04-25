import { useState } from 'react';
import { ExportContext } from './context/ExportContext';
import AppRoutes from './routes/AppRoutes';

const App = () => {
  const [exportConfig, setExportConfig] = useState(null);
  return (
    <ExportContext.Provider value={{ exportConfig, setExportConfig }}>
      <AppRoutes />
    </ExportContext.Provider>
  );
};

export default App;
