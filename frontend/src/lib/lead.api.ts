import api from "./api"
import type { Lead } from "@/types"

export const leadApi = {
  // Get all leads with filters
  getLeads: async (filters?: { status?: string; source?: string; searchTerm?: string; assignedTo?: string }) => {
    const response = await api.get("/leads", { params: filters })
    return response.data
  },

  // Create new lead
  createLead: async (leadData: Omit<Lead, "id" | "status" | "assignedTo" | "createdDate" | "lastContact">) => {
    const response = await api.post("/leads", leadData)
    return response.data
  },

  editLead: async (
    leadId: string,
    leadData: Partial<{
      name: string
      email: string
      phone: string
      source: string
      course: string
      notes: string
    }>,
  ) => {
    const response = await api.put(`/leads/${leadId}`, leadData)
    return response.data
  },

  // Bulk import leads from Excel
  bulkImportLeads: async (
    leads: Array<{
      name: string
      email?: string // Made optional
      phone: string
      source?: string
      course?: string
      notes?: string
      status?: "new" | "follow-up" | "enrolled" | "not-interested"
    }>,
  ) => {
    const response = await api.post("/leads/bulk-import", { leads })
    return response.data
  },

  // Get lead by ID
  getLeadById: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  // Update lead status (use PUT instead of PATCH)
  updateStatus: async (leadId: string, status: Lead["status"]) => {
    const response = await api.put(`/leads/${leadId}/status`, { status })
    return response.data
  },

  // Assign lead to employee (use PUT instead of PATCH)
  assignLead: async (leadId: string, assignedTo: string) => {
    const response = await api.put(`/leads/${leadId}/assign`, { assignedTo })
    return response.data
  },

  // Add communication
  addCommunication: async (id: string, data: { type: "whatsapp" | "call" | "email"; message: string }) => {
    const response = await api.post(`/leads/${id}/communications`, data)
    return response.data
  },

  addComment: async (leadId: string, message: string) => {
    const response = await api.post(`/leads/${leadId}/comments`, { message })
    return response.data
  },

  getComments: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/comments`)
    return response.data
  },

  // Delete lead
  deleteLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },

  // In lead.api.ts - CORRECT syntax for axios DELETE with body
  bulkDeleteLeads: async (leadIds: string[]) => {
    const response = await api.post("/leads/bulk-delete", { leadIds })
    return response.data
  },
}
