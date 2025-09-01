import api from '../lib/api';
import { store } from '../store';
import { loginSuccess, logout } from '../store/authSlice';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      store.dispatch(loginSuccess(response.data));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  logout: () => {
    store.dispatch(logout());
    window.location.href = '/login';
  },

  isAuthenticated: () => {
    return store.getState().auth.isAuthenticated;
  }
};
