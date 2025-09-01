import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    user: { _id: string; role: string; name: string } | null;
    isLoading: boolean;
    setUser: (user: { _id: string; name: string; role: 'admin' | 'employee' } | null) => void;
}

// Create context with proper initial value
const AuthContext = createContext<AuthContextType>({
    login: async () => {},
    logout: () => {},
    user: null,
    isLoading: false,
    setUser: () => {}
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate(); // Move useNavigate inside the component
    
    // Initialize user from localStorage on mount
    const [user, setUserState] = useState<AuthContextType['user']>(() => {
        const savedUser = localStorage.getItem('crm_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [isLoading, setIsLoading] = useState(true); // Start with true for initial load

    // Initialize user from localStorage and handle storage events
    useEffect(() => {
        const token = localStorage.getItem('crm_token');
        const savedUser = localStorage.getItem('crm_user');
        
        if (token && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUserState(parsedUser);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('crm_token');
                localStorage.removeItem('crm_user');
            }
        }
        setIsLoading(false);
    }, []);

    // Add storage event listener for cross-tab sync
    useEffect(() => {
        const handleStorage = () => {
            const savedUser = localStorage.getItem('crm_user');
            setUserState(savedUser ? JSON.parse(savedUser) : null);
        };
        
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user: authUser } = response.data;
            
            localStorage.setItem('crm_token', token);
            localStorage.setItem('crm_user', JSON.stringify(authUser));
            setUserState(authUser);
        } catch (error) {
            localStorage.removeItem('crm_token');
            localStorage.removeItem('crm_user');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setUserState(null);
        navigate('/login');
    };

    const setUser = (newUser: { _id: string; name: string; role: 'admin' | 'employee' } | null) => {
        if (newUser) {
            localStorage.setItem('crm_user', JSON.stringify(newUser));
        } else {
            localStorage.removeItem('crm_user');
            localStorage.removeItem('crm_token');
        }
        setUserState(newUser);
    };

    return (
        <AuthContext.Provider value={{ login, logout, user, isLoading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// Simplify context consumption
export const useAuthContext = () => useContext(AuthContext);