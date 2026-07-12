import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Forbidden from './pages/Forbidden';

const AppLayout = ({ children, title }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-vh-100">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      <div
        className="d-flex flex-column min-vh-100"
        style={{ marginLeft: isSidebarCollapsed ? '78px' : '240px' }}
      >
        <Header title={title} />
        <main className="flex-grow-1 p-3 p-md-4">{children}</main>
      </div>
    </div>
  );
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role_id === 3) return <Navigate to="/drivers" replace />;
  if (user.role_id === 4) return <Navigate to="/expenses" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/" element={<RootRedirect />} />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoleIds={[1, 2]}>
              <AppLayout title="Operational Dashboard">
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/vehicles" element={
            <ProtectedRoute allowedRoleIds={[1]}>
              <AppLayout title="Fleet Registry">
                <Vehicles />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/drivers" element={
            <ProtectedRoute allowedRoleIds={[1, 3]}>
              <AppLayout title="Driver Registry">
                <Drivers />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/trips" element={
            <ProtectedRoute allowedRoleIds={[1, 2]}>
              <AppLayout title="Trip Dispatches">
                <Trips />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/maintenance" element={
            <ProtectedRoute allowedRoleIds={[1]}>
              <AppLayout title="Maintenance Shop Logs">
                <Maintenance />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/expenses" element={
            <ProtectedRoute allowedRoleIds={[1, 4]}>
              <AppLayout title="Fuel & Expenses Audit">
                <Expenses />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoleIds={[1, 3, 4]}>
              <AppLayout title="Audits & Analytics reports">
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoleIds={[1, 2, 3, 4]}>
              <AppLayout title="System Settings">
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
