import api from './api';

export interface LeadPerformance {
  month: string;
  leads: number;
  conversions: number;
}

export interface EmployeePerformance {
  _id: string;
  name: string;
  tasks: number;
  leads: number;
  conversions: number;
  score: number;
}

export interface TaskAnalytics {
  type: string;
  completed: number;
  pending: number;
  overdue: number;
}

export interface LeadSource {
  name: string;
  value: number;
  color: string;
}

export interface DashboardSummary {
  totalLeads: number;
  activeEmployees: number;
  todaysTasks: number;
  followUpsDue: number;
  pendingTasks: number;
  missedLeads: number;
}

export interface LeadFunnel {
  new: number;
  followUp: number;
  proposalSent: number;
  enrolled: number;
  notInterested: number;
}

export interface LeadQuality {
  source: string;
  score: number;
}

export interface MissedLead {
  name: string;
  source: string;
  daysSinceLastContact: number;
  assignedTo: string;
  actionRequired: string;
}

export const analyticsApi = {
  getLeadPerformance: async (): Promise<LeadPerformance[]> => {
    const response = await api.get('/analytics/lead-performance');
    return response.data;
  },

  getEmployeePerformance: async (): Promise<EmployeePerformance[]> => {
    const response = await api.get('/analytics/employee-performance');
    return response.data;
  },

  getTaskAnalytics: async (): Promise<TaskAnalytics[]> => {
    const response = await api.get('/analytics/task-analytics');
    return response.data;
  },

  getLeadSources: async (): Promise<LeadSource[]> => {
    const response = await api.get('/analytics/lead-sources');
    return response.data;
  },

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/analytics/dashboard-summary');
    return response.data;
  },

  getLeadFunnel: async (): Promise<LeadFunnel> => {
    const response = await api.get('/analytics/lead-funnel');
    return response.data;
  },

  getLeadQuality: async (): Promise<LeadQuality[]> => {
    const response = await api.get('/analytics/lead-quality');
    return response.data;
  },

  getMissedLeads: async (): Promise<MissedLead[]> => {
    const response = await api.get('/analytics/missed-leads');
    return response.data;
  },

  // Get follow-up counts by status
  getFollowUpCounts: async (): Promise<{ scheduled: number; completed: number; missed: number; rescheduled: number; due: number }> => {
    const response = await api.get('/followups/counts');
    return response.data;
  },
};
