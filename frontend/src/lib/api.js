import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';


// Get token from localStorage
const getToken = () => localStorage.getItem('crm_token');

// Define API endpoints (optional helper object)
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
  },
  users: '/users',
  products: '/products',
  orders: '/orders',
};

// Create the API object
const api = {
  get: async (url, params) => {
    const token = getToken();
    const config = {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      params,
    };
    return axios.get(`${BASE_URL}${url}`, config);
  },

  post: async (url, data, headers = {}) => {
    const token = getToken();
    const config = {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    };
    return axios.post(`${BASE_URL}${url}`, data, config);
  },

  put: async (url, data, headers = {}) => {
    const token = getToken();
    const config = {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    };
    return axios.put(`${BASE_URL}${url}`, data, config);
  },

  delete: async (url, data, headers = {}) => {
    const token = getToken();
    const config = {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      data,
    };
    return axios.delete(`${BASE_URL}${url}`, config);
  },
};

// Add response interceptor globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ Correct export
export default api;
