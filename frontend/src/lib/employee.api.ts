import api from './api';

export const employeeApi = {
  // Get all employees (admin only)
  getAll: async () => {
    const response = await api.get('/admin/employees');
    return response.data;
  },

  // Get employee by ID (admin only)
  getById: async (id: string) => {
    const response = await api.get(`/admin/employees/${id}`);
    return response.data;
  },

  // Create a new employee (admin only)
  create: async (data: { name: string; email: string; password: string; phone: string }) => {
    const response = await api.post('/admin/register-employee', data);
    return response.data;
  },

  // Update employee (admin only)
  update: async (id: string, data: { name?: string; password?: string; phone?: string }) => {
    // Email updates are not allowed for security reasons
    const response = await api.put(`/admin/employees/${id}`, data);
    return response.data;
  },

  // Delete employee (admin only)
  delete: async (id: string) => {
    const response = await api.delete(`/admin/employees/${id}`);
    return response.data;
  },
};