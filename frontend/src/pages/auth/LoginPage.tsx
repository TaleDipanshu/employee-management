import { LoginForm } from '@/components/crm/LoginForm';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { user, login } = useAuthContext(); // Use only AuthContext

    useEffect(() => {
        if (user) {
            // Redirect based on role immediately if user exists
            navigate(user.role === 'admin' ? '/dashboard' : '/employee');
        }
    }, [user, navigate]);

    const handleLogin = async (email: string, password: string) => {
        try {
            await login(email, password);
            // No need to handle redirect here, useEffect will handle it
        } catch (error) {
            throw error;
        }
    };

    return <LoginForm onLogin={handleLogin} />;
};