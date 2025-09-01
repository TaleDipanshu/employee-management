import axios from 'axios';

const api = axios.create({
    baseURL:  'https://crm-coaching-2.onrender.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('crm_token');
    console.log('token ', token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('crm_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
