import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import PageLoading from '../components/PageLoading';
import { useAuth } from '../context/AuthContext';
import { CallLogs } from '../pages/CallLogs';
import Dashboard from '../pages/Dashboard';
import { CallAnalysis } from '../pages/CallAnalysis';
import Login from '../pages/Login';
import Leaderboard from '../pages/Leaderboard';
import UserManagement from '../pages/UserManagement';
import GenerateAnalysis from '../pages/GenerateAnalysis';

const employeeRoutes = ['manager', 'employee'];

const RoleHomeRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoading variant="table" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/dashboard/usermanagement" replace />;
  }

  if (employeeRoutes.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoading variant="table" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <RoleHomeRedirect />;
  }

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<RoleHomeRedirect />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={employeeRoutes}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/calllogs"
          element={
            <ProtectedRoute allowedRoles={employeeRoutes}>
              <CallLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/callanalysis"
          element={
            <ProtectedRoute allowedRoles={employeeRoutes}>
              <CallAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/leaderboard"
          element={
            <ProtectedRoute allowedRoles={employeeRoutes}>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/generate-analysis"
          element={
            <ProtectedRoute allowedRoles={employeeRoutes}>
              <GenerateAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard/usermanagement"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Route>
    </Routes>
  );
}
