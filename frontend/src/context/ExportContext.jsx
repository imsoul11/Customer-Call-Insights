import { createContext, useContext } from "react";

export const ExportContext = createContext({
  exportConfig: null,
  setExportConfig: () => {},
});

export const useExport = () => useContext(ExportContext);
