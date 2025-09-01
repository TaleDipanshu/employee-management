import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../lib/api';

export const checkAuth = createAsyncThunk(
    'auth/check',
    async () => {
        const token = localStorage.getItem('crm_token');
        if (!token) throw new Error('No token found');

        try {
            const response = await api.get('/auth/verify');
            return response.data;
        } catch (error) {
            localStorage.removeItem('crm_token');
            throw error;
        }
    }
);

// Add this reducer to the authSlice
const authSlice = createSlice({
    name: 'auth',
    reducers: {
        setAuth: (state, action) => {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.role = action.payload.user.role;
            state.loading = false;
        }
    },
    initialState: {
        const initialState = {
          isAuthenticated: localStorage.getItem('crm_token') !== null,
          role: localStorage.getItem('crm_user') ? JSON.parse(localStorage.getItem('crm_user')!).role : null,
          loading: false
        };
        
        // Add this case to your extraReducers
        extraReducers: (builder) => {
          builder.addCase(login.fulfilled, (state, action) => {
            state.isAuthenticated = true;
            state.role = action.payload.role;
          });
          // Add similar cases for logout/reject cases
        }
    },
    // Add this case to your extraReducers
    extraReducers: (builder) => {
        builder.addCase(login.fulfilled, (state, action) => {
            state.isAuthenticated = true;
            state.role = action.payload.role;
        });
        // Add similar cases for logout/reject cases
    }
});

// Export the generated action
export const { setAuth } = authSlice.actions;

export default authSlice.reducer;