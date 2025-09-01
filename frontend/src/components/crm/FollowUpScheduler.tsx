import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, AlertCircle, CheckCircle, User, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { followupApi, FollowUp, FollowUpStats, CreateFollowUpData } from "@/lib/followup.api";
import { employeeApi } from "@/lib/employee.api";
import api from "@/lib/api";
import { leadApi } from "@/lib/lead.api";

interface FollowUpSchedulerProps {
  userRole: 'admin' | 'employee';
}

// Define the Lead interface based on your schema
interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source: string;
  status: string;
  assignedTo?: string;
  course: string;
  notes?: string;
  lastContact?: string;
}

export const FollowUpScheduler = ({ userRole }: FollowUpSchedulerProps) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFollowUpDetail, setSelectedFollowUpDetail] = useState<FollowUp | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFollowUp, setNewFollowUp] = useState({
    leadId: "",
    leadName: "",
    leadPhone: "",
    leadEmail: "",
    assignedTo: "",
    scheduledDate: "",
    scheduledTime: "",
    type: "call",
    priority: "medium",
    notes: "",
    course: ""
  });
  const [followUpToDelete, setFollowUpToDelete] = useState<string | null>(null);

  const courses = ["Airhostess/ Ground Staff / Hospitality", "Hospitality","Cabin Crew / Ground Staff", "English Speaking Course"," Interview Preparation","Personality Development"];

  // Helper function to get lead name by ID
  const getLeadNameById = (leadId: string): string => {
    const lead = leads.find(l => l.id === leadId);
    return lead ? lead.name : leadId;
  };

  // Filter leads based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeads(leads);
    } else {
      const filtered = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredLeads(filtered);
    }
  }, [searchTerm, leads]);

  // Function to handle lead selection and auto-fill data
  const handleLeadSelection = (leadId: string) => {
    const selectedLead = leads.find(lead => lead.id === leadId);
    console.log('selected lead', selectedLead?.name);
    if (selectedLead) {
      setNewFollowUp(prev => ({
        ...prev,
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        leadPhone: selectedLead.phone || "",
        leadEmail: selectedLead.email || "",
        course: selectedLead.course || "",
        notes: selectedLead.notes || "",
        assignedTo: selectedLead.assignedTo || prev.assignedTo
      }));
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  // Fetch follow-ups and stats
  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      let followUpsPromise = followupApi.getFollowups();
      if (user?.role === 'employee' && user?._id) {
        followUpsPromise = followupApi.getFollowUpsByEmployee(user._id);
      }
      const [followUpsData, statsData] = await Promise.all([
        followUpsPromise,
        followupApi.getFollowUpStats()
      ]);
      
      const sortedFollowUps = followUpsData.sort((a, b) => {
        const createdA = new Date(a.createdAt || a.created_at);
        const createdB = new Date(b.createdAt || b.created_at);
        
        if (createdA.getTime() !== createdB.getTime()) {
          return createdB.getTime() - createdA.getTime();
        }
        
        const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
        const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
        return dateA.getTime() - dateB.getTime();
      });

      setFollowUps(sortedFollowUps);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching follow-ups:', error);
      toast({
        title: "Error",
        description: "Failed to load follow-ups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const data = await employeeApi.getAll();
      setEmployees(Array.isArray(data) ? data : data.employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Fetch complete lead data from lead API
  const fetchLeads = async () => {
    try {
      const leadsData = await leadApi.getLeads();
      const mappedLeads = leadsData.map((lead: any) => ({
        id: lead.id || lead._id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        assignedTo: lead.assignedTo,
        course: lead.course,
        notes: lead.notes,
        lastContact: lead.lastContact
      }));
      setLeads(mappedLeads);
      setFilteredLeads(mappedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to load leads",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFollowUps();
    if (userRole === 'admin') {
      fetchEmployees();
    }
    fetchLeads();
  }, []);

  const handleAddFollowUp = async () => {
    if (!newFollowUp.leadName || !newFollowUp.scheduledDate || !newFollowUp.scheduledTime || !newFollowUp.assignedTo) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Lead Name, Date, Time, Assign To)",
        variant: "destructive",
      });
      console.log('lead', newFollowUp);
      return;
    }

    try {
      setIsSubmitting(true);
      const createdFollowUp = await followupApi.createFollowUp({
        ...newFollowUp,
        type: newFollowUp.type as 'call' | 'email' | 'meeting',
      });
      
      setFollowUps(prevFollowUps => [createdFollowUp, ...prevFollowUps]);

      // Send WhatsApp notifications to assigned employees
      try {
        const assignedEmployees = employees.filter(emp =>
          newFollowUp.assignedTo.includes(emp.name) ||
          newFollowUp.assignedTo.includes(emp._id)
        );
        
        if (assignedEmployees.length > 0) {
          const toAndComponents = assignedEmployees
            .filter(emp => emp.phone && emp.phone !== 'Unknown')
            .map(emp => ({
              to: [emp.phone],
              components: {}
            }));

          if (toAndComponents.length > 0) {
            const messagePayload = {
              integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "918699099836",
              content_type: "template",
              payload: {
                type: "template",
                template: {
                  name: "followup_message",
                  language: {
                    code: "en",
                    policy: "deterministic"
                  },
                  namespace: "e651b91f_1778_4e15_ae7a_2e6550c44f89",
                  to_and_components: toAndComponents
                },
                messaging_product: "whatsapp"
              }
            };

            const response = await api.post('/whatsapp/send-bulk', messagePayload, {
              headers: {
                authkey: import.meta.env.VITE_AUTH_KEY
              }
            });
            console.log(`WhatsApp follow-up notifications sent successfully to ${toAndComponents.length} employees`);
          }
        }
      } catch (whatsappError) {
        console.error('Error sending WhatsApp follow-up notifications:', whatsappError);
      }

      // Reset form and close dialog
      setNewFollowUp({
        leadId: "",
        leadName: "",
        leadPhone: "",
        leadEmail: "",
        assignedTo: "",
        scheduledDate: "",
        scheduledTime: "",
        type: "call",
        priority: "medium",
        notes: "",
        course: ""
      });
      setIsAddDialogOpen(false);
      setIsConfirmDialogOpen(true);
      
      const updatedStats = await followupApi.getFollowUpStats();
      setStats(updatedStats);
    } catch (error: any) {
      console.error('Error creating follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (followUpId: string, newStatus: FollowUp['status']) => {
    try {
      const updatedFollowUp = await followupApi.updateFollowUpStatus(followUpId, newStatus);
      setFollowUps(followUps.map(followUp =>
        followUp.id === followUpId ? { ...followUp, ...updatedFollowUp } : followUp
      ));
      toast({
        title: "Success",
        description: "Follow-up status updated",
      });
    } catch (error: any) {
      console.error('Error updating follow-up status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleReschedule = async (followUpId: string, newDate: string, newTime: string) => {
    try {
      const updatedFollowUp = await followupApi.updateFollowUp(followUpId, {
        scheduledDate: newDate,
        scheduledTime: newTime,
        status: 'rescheduled'
      });
      setFollowUps(followUps.map(followUp =>
        followUp.id === followUpId ? { ...followUp, ...updatedFollowUp } : followUp
      ));
      toast({
        title: "Success",
        description: "Follow-up rescheduled successfully",
      });
    } catch (error: any) {
      console.error('Error rescheduling follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule",
        variant: "destructive",
      });
    }
  };

  const handleViewDetail = (followUp: FollowUp) => {
    setSelectedFollowUpDetail(followUp);
    setIsDetailDialogOpen(true);
  };

  const confirmDeleteFollowUp = (followUpId: string) => {
    setFollowUpToDelete(followUpId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (followUpToDelete) {
      await handleDeleteFollowUp(followUpToDelete);
      setFollowUpToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      await followupApi.deleteFollowUp(followUpId);
      setFollowUps(followUps.filter(followUp => followUp.id !== followUpId));
      toast({
        title: "Success",
        description: "Follow-up deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete follow-up",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: FollowUp['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'missed': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: FollowUp['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: FollowUp['type']) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '✉️';
      case 'whatsapp': return '💬';
      case 'meeting': return '🤝';
      default: return '📋';
    }
  };

  const filteredFollowUps = viewMode === 'list'
    ? followUps
    : followUps.filter(followUp => followUp.scheduledDate === selectedDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading follow-ups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      {/* Summary Cards - Responsive Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Follow-ups</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg sm:text-2xl font-bold">{stats?.todaysFollowUps || 0}</div>
            <p className="text-xs text-muted-foreground">
              {followUps.filter(f => f.scheduledDate === new Date().toISOString().split('T')[0] && f.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg sm:text-2xl font-bold">{stats?.overdueFollowUps || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">This Week</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg sm:text-2xl font-bold">{stats?.thisWeekFollowUps || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg sm:text-2xl font-bold">{stats?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Follow-up Scheduler</CardTitle>
              <CardDescription className="text-sm">Schedule and manage lead follow-ups</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select value={viewMode} onValueChange={(value) => setViewMode(value)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
              
              {userRole === 'admin' && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Schedule Follow-up</span>
                      <span className="sm:hidden">Schedule</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-2 sm:mx-auto max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Schedule New Follow-up</DialogTitle>
                      <DialogDescription className="text-sm">
                        Create a new follow-up appointment with a lead. Select a lead to auto-fill their information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Searchable Lead Name Dropdown - Required */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="leadName" className="text-sm">Lead Name *</Label>
                          <div className="relative">
                            <button
                              type="button"
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
                              }`}
                              onClick={() => !isSubmitting && setIsOpen(!isOpen)}
                              disabled={isSubmitting}
                            >
                              <span className={newFollowUp.leadName ? 'text-gray-900' : 'text-gray-500'}>
                                {newFollowUp.leadName || 'Select lead'}
                              </span>
                              <svg
                                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {isOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
                                {/* Search Input */}
                                <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder="Search leads..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="pl-8 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                
                                {/* Lead Options */}
                                <div className="max-h-60 overflow-auto">
                                  {filteredLeads.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      {searchTerm ? 'No leads found matching your search' : 'No leads available'}
                                    </div>
                                  ) : (
                                    filteredLeads.map(lead => (
                                      <button
                                        key={lead.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                        onClick={() => handleLeadSelection(lead.id)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{lead.name}</span>
                                          <span className="text-xs text-gray-500">
                                            {lead.phone} • {lead.course}
                                            {lead.email && ` • ${lead.email}`}
                                          </span>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Course Interest - Auto-filled from lead data but editable */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="course" className="text-sm">Course Interest</Label>
                          <Select
                            value={newFollowUp.course}
                            onValueChange={(value) => setNewFollowUp({ ...newFollowUp, course: value })}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map(course => (
                                <SelectItem key={course} value={course}>
                                  {course}
                                </SelectItem>
                              ))}
                              {/* Add the lead's course if it's not in the predefined courses list */}
                              {newFollowUp.course && !courses.includes(newFollowUp.course) && (
                                <SelectItem key={newFollowUp.course} value={newFollowUp.course}>
                                  {newFollowUp.course} (From Lead)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Phone - Auto-filled from lead data but editable */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="phone" className="text-sm">Phone</Label>
                          <Input
                            id="phone"
                            value={newFollowUp.leadPhone}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, leadPhone: e.target.value })}
                            placeholder="Enter phone"
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                        </div>
                        
                        {/* Email - Auto-filled from lead data but editable */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="email" className="text-sm">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newFollowUp.leadEmail}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, leadEmail: e.target.value })}
                            placeholder="Enter email"
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                        </div>
                        
                        {/* Assign To - Required */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="assignedTo" className="text-sm">Assign To *</Label>
                          <Select
                            value={newFollowUp.assignedTo}
                            onValueChange={(value) => setNewFollowUp({ ...newFollowUp, assignedTo: value })}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map(employee => (
                                <SelectItem key={employee._id} value={employee._id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Type */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="type" className="text-sm">Type</Label>
                          <Select
                            value={newFollowUp.type}
                            onValueChange={(value) => setNewFollowUp({ ...newFollowUp, type: value })}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">Phone Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Priority */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="priority" className="text-sm">Priority</Label>
                          <Select
                            value={newFollowUp.priority}
                            onValueChange={(value) => setNewFollowUp({ ...newFollowUp, priority: value })}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Date - Required */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="date" className="text-sm">Date *</Label>
                          <Input
                            id="date"
                            type="date"
                            value={newFollowUp.scheduledDate}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, scheduledDate: e.target.value })}
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                        </div>
                        
                        {/* Time - Required */}
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="time" className="text-sm">Time *</Label>
                          <Input
                            id="time"
                            type="time"
                            value={newFollowUp.scheduledTime}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, scheduledTime: e.target.value })}
                            disabled={isSubmitting}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Notes - Auto-filled from lead data but editable */}
                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="notes" className="text-sm">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newFollowUp.notes}
                          onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                          placeholder="Add any relevant notes..."
                          rows={3}
                          disabled={isSubmitting}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setSearchTerm('');
                          setIsOpen(false);
                        }} 
                        disabled={isSubmitting}
                        className="w-full sm:w-auto order-2 sm:order-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddFollowUp} 
                        disabled={isSubmitting}
                        className="w-full sm:w-auto order-1 sm:order-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scheduling...
                          </>
                        ) : (
                          'Schedule Follow-up'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {viewMode === 'calendar' && (
            <div className="mb-4">
              <Label htmlFor="dateSelect" className="text-sm">Select Date</Label>
              <Input
                id="dateSelect"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-48 mt-1"
              />
            </div>
          )}
          <div className="space-y-3 sm:space-y-4">
            {filteredFollowUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {viewMode === 'calendar'
                  ? `No follow-ups scheduled for ${selectedDate}`
                  : 'No follow-ups found'
                }
              </div>
            ) : (
              filteredFollowUps.map((followUp) => (
                <Card key={followUp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-base sm:text-lg">{getTypeIcon(followUp.type)}</span>
                          <h3 className="font-medium text-base sm:text-lg truncate">{getLeadNameById(followUp.leadName)}</h3>
                          {followUp.course && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {followUp.course}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{followUp.scheduledDate} at {followUp.scheduledTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{
                            typeof followUp.assignedTo === 'object' && followUp.assignedTo?.name
                              ? followUp.assignedTo.name
                              : 'N/A'
                          }</span>
                        </div>
                        {followUp.notes && (
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                            {followUp.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getPriorityColor(followUp.priority)} text-xs`}>
                            {followUp.priority}
                          </Badge>
                          <Badge className={`${getStatusColor(followUp.status)} text-xs`}>
                            {followUp.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2 sm:ml-4 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(followUp)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          View Detail
                        </Button>
                        
                        <Select
                          value={followUp.status}
                          onValueChange={(value) => handleStatusChange(followUp.id, value)}
                        >
                          <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-32 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                            <SelectItem value="rescheduled">Rescheduled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => confirmDeleteFollowUp(followUp.id)}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="mx-2 sm:mx-auto max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Follow-up Scheduled Successfully!
            </DialogTitle>
            <DialogDescription className="text-sm">
              Your follow-up has been created and assigned successfully. The assigned employee has been notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsConfirmDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="mx-2 sm:mx-auto max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Follow-up Details</DialogTitle>
            <DialogDescription className="text-sm">
              Complete information about this follow-up
            </DialogDescription>
          </DialogHeader>
          
          {selectedFollowUpDetail && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Lead Name</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {getLeadNameById(selectedFollowUpDetail.leadName)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Course Interest</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedFollowUpDetail.course || 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Phone</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedFollowUpDetail.leadPhone || 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Email</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedFollowUpDetail.leadEmail || 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Assigned To</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedFollowUpDetail.assignedTo?.name || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Type</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <span>{getTypeIcon(selectedFollowUpDetail.type)}</span>
                    {selectedFollowUpDetail.type}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Priority</Label>
                  <div className="mt-1">
                    <Badge className={`${getPriorityColor(selectedFollowUpDetail.priority)} text-xs`}>
                      {selectedFollowUpDetail.priority}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={`${getStatusColor(selectedFollowUpDetail.status)} text-xs`}>
                      {selectedFollowUpDetail.status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Scheduled Date</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {selectedFollowUpDetail.scheduledDate}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Scheduled Time</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {selectedFollowUpDetail.scheduledTime}
                  </p>
                </div>
              </div>
              
              {selectedFollowUpDetail.notes && (
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Notes</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md break-words">
                    {selectedFollowUpDetail.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="mx-2 sm:mx-auto max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to delete this follow-up? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="w-full sm:w-auto">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};