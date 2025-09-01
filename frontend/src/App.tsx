import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ROLE_ADMIN, ROLE_EMPLOYEE } from './lib/constants';
import { LoginPage } from './pages/LoginPage';
import UnauthorizedPage from './pages/Unauthorized';
import Index from './pages/Index';
import Employee from './pages/Employee';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]} />}>
          <Route index element={<Index />} />
        </Route>
        
        {/* Redirect /dashboard to /admin for backward compatibility */}
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

        {/* Employee routes */}
        <Route path="/employee" element={<ProtectedRoute allowedRoles={[ROLE_EMPLOYEE]} />}>
          <Route index element={<Employee />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App
