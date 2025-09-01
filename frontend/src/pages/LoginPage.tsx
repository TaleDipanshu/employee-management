import { LoginForm } from '@/components/crm/LoginForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
    const { login } = useAuthContext();
    const navigate = useNavigate();

    const handleLogin = async (email: string, password: string) => {
        try {
            await login(email, password);
            console.log('token:', localStorage.getItem('crm_token'));
            navigate('/admin');
        } catch (error) {
            // Error handling is done in LoginForm
            console.error('Login failed:', error);
        }
    };

    return <LoginForm onLogin={handleLogin} />;
};
