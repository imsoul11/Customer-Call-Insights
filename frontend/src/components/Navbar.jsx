import React from 'react';
import ThemeToggle from './Themetoggle'; // Adjust the path as needed
import { Button } from "@/components/ui/button"; // Adjust the path as needed
import { useAuth } from "@/context/AuthContext"; // Assuming you have an Auth context
import { useNavigate } from "react-router-dom"; // For navigation
import { useExport } from "@/context/ExportContext";

const escapeCSVValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return `"${String(value).replace(/"/g, '""')}"`;
};

// Utility function to download CSV
const downloadCSV = ({ headers, rows, filename }) => {
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCSVValue).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Navbar = ({ component, pageData }) => {
  const { logout } = useAuth(); // Get the logout function from the Auth context
  const { exportConfig } = useExport();
  const navigate = useNavigate(); // Hook to programmatically navigate
  const canExport = Boolean(exportConfig?.headers?.length);

  const handleLogout = async () => {
    try {
      await logout(); // Assuming logout is an async function
      navigate('/login'); // Redirect to the login page after logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleDownloadCSV = () => {
    if (!canExport) {
      return;
    }

    downloadCSV({
      headers: exportConfig.headers,
      rows: exportConfig.rows || [],
      filename: exportConfig.filename || "export.csv",
    });
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800">
      {component}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-4">
        <Button onClick={handleDownloadCSV} disabled={!canExport}>Download CSV</Button> {/* Download CSV Button */}
      </div>
        <Button onClick={handleLogout}>Logout</Button>
      </div>
    </nav>
  );
};

export default Navbar;
