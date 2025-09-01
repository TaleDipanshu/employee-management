import api from './api';

export const TaskService = {
    getTasks: (filters?: { status?: string; priority?: string; searchTerm?: string; assignedTo?: string }) => 
        api.get('/tasks', { params: filters }),
    
    getUsers: () => api.get('/employees/all/employees'),
    
    createTask: (taskData: any) => 
        api.post('/tasks', taskData),
    
    updateTask: (id: string, taskData: any) => 
        api.put(`/tasks/${id}`, taskData),
    
    updateTaskStatus: (id: string, status: string) => 
        api.put(`/tasks/${id}/status`, { status })
            .then(response => response.data)
            .catch(error => {
                console.error('Task status update error:', error);
                throw error;
            }),
    
    deleteTask: (id: string) => 
        api.delete(`/tasks/${id}`),
    
    addComment: (taskId: string, text: string) => 
        api.post(`/tasks/${taskId}/comments`, { text })
};