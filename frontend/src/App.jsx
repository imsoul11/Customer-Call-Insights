import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { CallLogs } from './pages/CallLogs';
import Dashboard from './pages/Dashboard';
import { CallAnalysis } from './pages/CallAnalysis';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExportContext } from './context/ExportContext';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';
import UserManagement from './pages/UserManagement'; // Assuming this page exists

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth(); // Assuming useAuth provides the user role

  if (!allowedRoles.includes(user?.role)) {
    // Redirect to login if not authenticated or not allowed
    return <Navigate to="/login" />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/login" />;
};

const App = () => {
  const { user } = useAuth();
  const [exportConfig, setExportConfig] = useState(null);

  return (
    <ExportContext.Provider value={{ exportConfig, setExportConfig }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Admin is routed to User Management directly */}
            {user?.role === 'admin' && (
              <Route path="*" element={<Navigate to="dashboard/usermanagement" />} />
            )}

            {/* Employee and Manager have access to the same dashboard options */}
            {(user?.role === 'manager' || user?.role === 'employee') && (
              <>
                <Route index element={<Navigate to="dashboard" />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/calllogs" element={<CallLogs />} />
                <Route path="dashboard/callanalysis" element={<CallAnalysis />} />
                <Route path="dashboard/leaderboard" element={<Leaderboard />} />
              </>
            )}

            {/* Admin-Only User Management Route */}
            <Route
              path="/dashboard/usermanagement"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            
          </Route>

          {/* Common login route for all roles */}
          <Route path="/login" element={<Login />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Routes>
    </ExportContext.Provider>
  );
};

export default App;
