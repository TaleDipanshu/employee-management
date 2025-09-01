import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import taskReducer from './taskSlice';
import employeeReducer from './employeeSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer,
    employees: employeeReducer
  },
});