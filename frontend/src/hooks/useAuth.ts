import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAuth, clearAuth } from '@/store/slices/authSlice';
import { authApi } from '@/lib/auth.api';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const dispatch = useDispatch();

    useEffect(() => {
        const token = localStorage.getItem('crm_token');
        if (!token) {
            setLoading(false);
            return;
        }
        // Verify token and get user info
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            const response = await authApi.login({ email, password });
            
            if (!response?.token) {
                throw new Error('No token received');
            }

            localStorage.setItem('token', response.token);
            setUser(response.user);
            dispatch(setAuth(response));
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        authApi.logout();
        setUser(null);
    };

    return {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };
};