import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
    const { user: contextUser } = useAuthContext();
    const { isAuthenticated, role, loading } = useSelector((state: any) => state.auth);
    const location = useLocation();
    
    // Check both context and redux state
    const user = contextUser || (isAuthenticated ? { role } : null);

    if (loading) return <div className="p-4">Loading authorization...</div>;
    
    // Immediate localStorage check
    const hasToken = localStorage.getItem('crm_token');
    if (!user && hasToken) {
        return <div className="p-4">Validating session...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if current route matches user role
    const baseRoute = user.role === 'admin' ? '/admin' : '/employee';
    if (!location.pathname.startsWith(baseRoute)) {
        return <Navigate to={baseRoute} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;