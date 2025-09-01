import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../lib/api';

export const fetchEmployees = createAsyncThunk('employees/fetchAll', async () => {
  const response = await api.get('/employees/all/users');
  return response.data;
});

const employeeSlice = createSlice({
  name: 'employees',
  initialState: {
    list: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = 'succeeded';
      });
  }
});

export default employeeSlice.reducer;