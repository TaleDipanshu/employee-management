import api from '../lib/api';
import { store } from '../store/store';
import { setAuth, clearAuth } from '../store/slices/authSlice';

export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;

      // Save token in localStorage and Axios
      api.setToken(token);

      // Update Redux store
      store.dispatch(setAuth({ token, user }));

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    // Remove token from storage
    api.removeToken();

    // Clear Redux auth state
    store.dispatch(clearAuth());

    // Redirect to login
    window.location.href = '/login';
  },

  checkAuth: () => {
    // Optional: check Redux state AND token in storage
    const stateAuth = store.getState().auth.isAuthenticated;
    const tokenExists = !!api.getToken();
    return stateAuth && tokenExists;
  },
};

export default authService;
