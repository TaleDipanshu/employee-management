import api from './api';

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'employee';
    };
}

export const authApi = {
    login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    logout: async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('token');
    }
};
