import api from './api';

export interface FollowUp {
  id: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  assignedTo: { _id: string; name: string } | string;
  assignedToId: string;
  scheduledDate: string;
  scheduledTime: string;
  type: 'call' | 'email' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  notes: string;
  course: string;
  createdBy: { _id: string; name: string } | string;
  createdAt: string;
}

export interface FollowUpStats {
  todaysFollowUps: number;
  overdueFollowUps: number;
  thisWeekFollowUps: number;
  completionRate: number;
}

export interface CreateFollowUpData {
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  assignedTo: string;
  scheduledDate: string;
  scheduledTime: string;
  type: 'call' | 'email' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  notes: string;
  course: string;
}

export const followupApi = {

  // Get all follow-ups with filters
 getFollowups: async (filters?: { assignedTo?: string; status?: string; date?: string }) => {
  const response = await api.get('/followups', { params: filters });
  return response.data; // Your backend returns the array directly
},

  getFollowUpsByEmployee: async (employeeId: string): Promise<FollowUp[]> => {
    const response = await api.get(`/followups/employee/${employeeId}`);
    return response.data;
  },



  // Get follow-up statistics
  getFollowUpStats: async (): Promise<FollowUpStats> => {
  const response = await api.get('/followups/stats');
  return response.data; // Your backend returns the stats object directly
},

  // Create new follow-up
  createFollowUp: async (data: CreateFollowUpData): Promise<FollowUp> => {
    const response = await api.post('/followups', data);
    return response.data.followUp;
  },

  // Get follow-up by ID
  getFollowUpById: async (id: string): Promise<FollowUp> => {
    const response = await api.get(`/followups/${id}`);
    return response.data;
  },

  // Update follow-up status
  updateFollowUpStatus: async (id: string, status: FollowUp['status']): Promise<FollowUp> => {
  const response = await api.put(`/followups/${id}/status`, { status });
  return response.data.followUp; // Your backend returns { message, followUp }
},

  // Update follow-up
  updateFollowUp: async (id: string, data: Partial<CreateFollowUpData>): Promise<FollowUp> => {
    const response = await api.put(`/followups/${id}`, data);
    return response.data.followUp;
  },

  // Delete follow-up
  deleteFollowUp: async (id: string): Promise<void> => {
    await api.delete(`/followups/${id}`);
  },
};