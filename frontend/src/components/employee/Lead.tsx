import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, UserPlus, MessageSquare, Phone, Calendar, Eye, Loader2, Send, FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, Trash} from "lucide-react";
import { leadApi } from '@/lib/lead.api';
import { toast } from "react-toastify";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'follow-up' | 'enrolled' | 'not-interested' | 'contacted';
  assignedTo: string;
  createdDate: string;
  lastContact: string;
  notes: string;
  course: string;
  communications?: Array<{
    id: string;
    type: 'whatsapp' | 'call' | 'email';
    message: string;
    date: string;
  }>;
  comments?: Array<{
    id: string;
    message: string;
    by: string;
    timestamp: string;
  }>;
}


interface LeadManagementProps {
  userRole: 'admin' | 'employee';
  assignedTo?: string;
}

interface ExcelLead {
  name: string;
  email: string;
  phone: string;
  source?: string;
  course?: string;
  notes?: string;
  status?: "new" | "follow-up" | "enrolled" | "not-interested" | "contacted";
}

export const LeadManagement = ({ userRole, assignedTo }: LeadManagementProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommunicating, setIsCommunicating] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  // Bulk WhatsApp messaging states
  const [isBulkMessageDialogOpen, setIsBulkMessageDialogOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<{ [key: string]: string }>({});
  const [isCommunicationConfirmOpen, setIsCommunicationConfirmOpen] = useState(false);
const [pendingCommunicationType, setPendingCommunicationType] = useState<'whatsapp' | 'call' | 'email' | null>(null);
const [pendingCommunicationLeadId, setPendingCommunicationLeadId] = useState<string | null>(null);


  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    course: "",
    notes: ""
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<ExcelLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [uploadStep, setUploadStep] = useState<"select" | "preview" | "uploading" | "complete">("select");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employees = ["Sarah Johnson", "Mike Chen", "Emily Davis", "David Wilson"];
  const courses = ["Airhostess/ Ground Staff / Hospitality", "Hospitality","Cabin Crew / Ground Staff", "English Speaking Course"," Interview Preparation","Personality Development"];
  const sources = ["WhatsApp", "Website", "Referral", "Social Media", "Advertisement","Walkin"];

  // Fetch WhatsApp templates
  const fetchWhatsAppTemplates = async () => {
    try {
      const integratedNumber = import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "";
      if (!integratedNumber) {
        toast.error("WhatsApp integrated number not configured");
        return;
      }

      const { data } = await api.get(
        `/whatsapp/templates/${integratedNumber}`,
        {
          headers: {
            authkey: import.meta.env.VITE_AUTH_KEY
          },
          params: {
            template_status: 'APPROVED'
          }
        }
      );

      if (data && Array.isArray(data.data)) {
        setWhatsappTemplates(data.data);
      } else {
        setWhatsappTemplates([]);
        toast.warning("No approved templates found");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch WhatsApp templates");
    }
  };

const requestCommunication = (leadId: string, type: 'whatsapp' | 'call' | 'email') => {
  setPendingCommunicationLeadId(leadId);
  setPendingCommunicationType(type);
  setIsCommunicationConfirmOpen(true);
};

const confirmCommunication = async () => {
  if (pendingCommunicationLeadId && pendingCommunicationType) {
    await handleCommunication(pendingCommunicationLeadId, pendingCommunicationType);
  }
  setIsCommunicationConfirmOpen(false);
  setPendingCommunicationLeadId(null);
  setPendingCommunicationType(null);
};

const cancelCommunication = () => {
  setIsCommunicationConfirmOpen(false);
  setPendingCommunicationLeadId(null);
  setPendingCommunicationType(null);
};


  const handleAddComment = async () => {
  if (!selectedLead || !newComment.trim()) return;
  try {
    // Use your existing API structure, adapt as needed:
    const res = await leadApi.addComment(selectedLead.id, newComment);
    setSelectedLead(prev =>
      prev ? {
        ...prev,
        comments: [...(prev.comments || []), res.comment],
      } : prev
    );
    setNewComment("");
    toast.success("Comment added");
  } catch (err: any) {
    toast.error("Failed to add comment");
  }
};

  // Toggle selecting a lead
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Select / deselect all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(lead => lead.id));
    }
    setSelectAll(!selectAll);
  };

  // Open bulk messaging dialog
  const openBulkMessageDialog = () => {
    if (selectedLeads.length === 0) {
      toast.warning("Please select at least one lead");
      return;
    }
    fetchWhatsAppTemplates();
    setIsBulkMessageDialogOpen(true);
  };

  // Handle template selection
  const handleTemplateSelection = (templateName: string) => {
    setSelectedTemplate(templateName);
    setTemplateVariables({});
    
    const template = whatsappTemplates.find(t => t.name === templateName);
    if (template && template.components) {
      const variables: { [key: string]: string } = {};
      template.components.forEach((component: any) => {
        if (component.type === 'BODY' && component.text) {
          const matches = component.text.match(/\{\{(\d+)\}\}/g) || [];
          matches.forEach(match => {
            const varNumber = match.replace(/[{}]/g, '');
            variables[`body_${varNumber}`] = '';
          });
        } else if (component.type === 'HEADER' && component.format === 'TEXT') {
          variables['header_1'] = '';
        }
      });
      setTemplateVariables(variables);
    }
  };

  // Handle variable change
  const handleVariableChange = (key: string, value: string) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Send bulk messages
  const sendBulkMessages = async () => {
    if (selectedLeads.length === 0 || !selectedTemplate) {
      toast.warning("Please select leads and a template");
      return;
    }

    setIsSendingMessages(true);

    try {
      const template = whatsappTemplates.find(t => t.name === selectedTemplate);
      if (!template) {
        toast.error("Template not found");
        setIsSendingMessages(false);
        return;
      }

      const selectedLeadsData = leads.filter(lead => selectedLeads.includes(lead.id));
      const toAndComponents = selectedLeadsData.map(lead => {
        const components: any = {};
        Object.entries(templateVariables).forEach(([key, value]) => {
          const [componentType, index] = key.split('_');
          components[`${componentType}_${index}`] = { type: 'text', value };
        });
        return { to: [lead.phone], components };
      });

      const messagePayload = {
        integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER,
        content_type: 'template',
        payload: {
          type: 'template',
          template: {
            name: template.name,
            language: {
              code: template.language || 'en',
              policy: 'deterministic'
            },
            to_and_components: toAndComponents
          },
          messaging_product: 'whatsapp'
        }
      };

      await api.post('/whatsapp/send-bulk', messagePayload, {
        headers: {
          authkey: import.meta.env.VITE_AUTH_KEY
        }
      });

      toast.success(`WhatsApp messages sent to ${selectedLeadsData.length} leads`);
      setIsBulkMessageDialogOpen(false);
      setSelectedLeads([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      toast.error("Failed to send WhatsApp messages");
    } finally {
      setIsSendingMessages(false);
    }
  };

  // Fetch leads with filters
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      
      if (statusFilter !== "all") params.status = statusFilter;
      if (sourceFilter !== "all") params.source = sourceFilter;
      if (searchTerm) params.search = searchTerm;
      if (userRole === 'employee' && assignedTo) params.assignedTo = assignedTo;

      const result = await leadApi.getLeads(params);
      setLeads(Array.isArray(result) ? result : []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    fetchLeads();
  }, [statusFilter, sourceFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchLeads();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle adding new lead
  const handleAddLead = async () => {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Email, Phone)",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newLead.email.trim() && !emailRegex.test(newLead.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/leads', {
        ...newLead,
        name: newLead.name.trim(),
        email: newLead.email.trim(),
        phone: newLead.phone.trim(),
        notes: newLead.notes.trim()
      });
      
      setNewLead({ name: "", email: "", phone: "", source: "", course: "", notes: "" });
      setIsAddDialogOpen(false);
      
      // Refresh the leads list
      await fetchLeads();

      toast({
        title: "Success",
        description: "Lead added successfully",
      });
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      setIsLoading(true);
      // Call the API and get the updated lead
      const updatedLead = await leadApi.updateStatus(leadId, newStatus);

      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId ? { ...lead, status: updatedLead.status } : lead
        )
      );

      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle lead reassignment
  const handleAssignLead = async (leadId: string, assignee: string) => {
    try {
      setIsLoading(true);
      const updatedLead = await leadApi.assignLead(leadId, assignee);
      
      setLeads(prevLeads => prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, assignedTo: assignee } : lead
      ));

      toast({
        title: "Success",
        description: "Lead reassigned successfully",
      });
    } catch (error: any) {
      console.error('Error reassigning lead:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign lead",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle communication
  const handleCommunication = async (leadId: string, type: 'whatsapp' | 'call' | 'email') => {
    try {
      setIsCommunicating(leadId);
      
      await api.post(`/leads/${leadId}/communications`, {
        type,
        message: `${type} communication recorded`,
        date: new Date().toISOString()
      });
      
      // Update local state to reflect new communication
      setLeads(leads.map(lead => 
        lead.id === leadId 
          ? { ...lead, lastContact: new Date().toISOString().split('T')[0] }
          : lead
      ));

      toast({
        title: "Success",
        description: `${type} communication recorded`,
      });
    } catch (error: any) {
      console.error(`Error recording ${type} communication:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to record ${type} communication`,
        variant: "destructive",
      });
    } finally {
      setIsCommunicating(null);
    }
  };

  // View lead details
  const handleViewLead = async (leadId: string) => {
    try {
      const { data } = await api.get(`/leads/${leadId}`);
      setSelectedLead(data);
    } catch (error: any) {
      console.error('Error fetching lead details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lead details",
        variant: "destructive",
      });
    }
  };

  // Delete lead confirmation dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Open delete confirmation dialog
  const openDeleteDialog = (leadId: string) => {
    setLeadToDelete(leadId);
    setIsDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setLeadToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Handle deleting a lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      setIsLoading(true);
      await leadApi.deleteLead(leadId);
      setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
      toast.success("Lead deleted successfully");
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error(error.message || "Failed to delete lead");
    } finally {
      setIsLoading(false);
    }
  };

  // Download Excel Template
  const downloadTemplate = () => {
    const templateData = [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        source: "Website",
        course: "Web Development",
        notes: "Interested in full-stack development",
        status: "new",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");

    XLSX.writeFile(wb, "leads_template.xlsx");
    toast.success("Template downloaded successfully");
  };

  // Handle File Selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadFile(file);
    processExcelFile(file);
  };

  // Process Excel File
  const processExcelFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast.error("The Excel file is empty");
          return;
        }

        const processedLeads: ExcelLead[] = [];
        const errors: { row: number; field: string; message: string }[] = [];

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2;

          const lead: ExcelLead = {
            name: String(row.name || row.Name || "").trim(),
            email: String(row.email || row.Email || "").trim().toLowerCase(),
            phone: String(row.phone || row.Phone || "").trim(),
            source: String(row.source || row.Source || "").trim(),
            course: String(row.course || row.Course || "").trim(),
            notes: String(row.notes || row.Notes || "").trim(),
            status: (row.status || row.Status || "new").toLowerCase() as any,
          };

          if (!lead.name) errors.push({ row: rowNumber, field: "name", message: "Name is required" });
          if (!lead.phone) errors.push({ row: rowNumber, field: "phone", message: "Phone is required" });

          processedLeads.push(lead);
        });

        setUploadPreview(processedLeads);
        setValidationErrors(errors);
        setUploadStep("preview");

        if (errors.length > 0) {
          toast.error(`Found ${errors.length} validation error(s). Please review before uploading.`);
        } else {
          toast.success(`Successfully processed ${processedLeads.length} leads from Excel file`);
        }
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error("Error processing Excel file. Please check the file format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Upload Leads
  const handleUploadLeads = async () => {
    if (validationErrors.length > 0) {
      toast.error("Please fix validation errors before uploading");
      return;
    }

    setIsUploading(true);
    setUploadStep("uploading");

    try {
      const response = await api.post("/leads/bulk-import", { leads: uploadPreview });
      toast.success(`Successfully uploaded ${response.data.successCount} leads`);
      setUploadStep("complete");
    } catch (error) {
      console.error("Error uploading leads:", error);
      toast.error("Failed to upload leads");
      setUploadStep("preview");
    } finally {
      setIsUploading(false);
    }
  };

  // Reset Upload State
  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setValidationErrors([]);
    setUploadStep("select");
    setIsUploadDialogOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'follow-up': return 'bg-yellow-100 text-yellow-800';
      case 'enrolled': return 'bg-green-100 text-green-800';
      case 'not-interested': return 'bg-red-100 text-red-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'call': return <Phone className="h-4 w-4 text-blue-600" />;
      case 'email': return <Calendar className="h-4 w-4 text-purple-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = lead.name.toLowerCase().includes(searchLower) ||
                         lead.email.toLowerCase().includes(searchLower) ||
                         lead.phone.includes(searchTerm) ||
                         lead.course.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  return (
    <div className="space-y-4 px-2 sm:px-4 lg:space-y-6 lg:px-0">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <UserPlus className="h-5 w-5" />
                <span>Lead Management</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">Manage and track all your leads and their progress</CardDescription>
            </div>
            
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex w-full items-center justify-center space-x-2 sm:w-auto">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload Excel</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-2 max-w-4xl max-h-[90vh] overflow-y-auto sm:mx-0 sm:max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2 text-lg">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span>Upload Leads from Excel</span>
                    </DialogTitle>
                  </DialogHeader>

                  {uploadStep === "select" && (
                    <div className="space-y-4 py-4">
                      <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full sm:w-auto">
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                      <Label htmlFor="excel-upload">Select Excel File</Label>
                      <Input
                        id="excel-upload"
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                      />
                    </div>
                  )}

                  {uploadStep === "preview" && (
                    <div className="space-y-2">
                      <Badge>{uploadPreview.length} leads found</Badge>
                      {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Found {validationErrors.length} validation error(s). Please review before uploading.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {uploadStep === "uploading" && (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Uploading leads...</p>
                    </div>
                  )}

                  {uploadStep === "complete" && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-4" />
                      <p>Upload Complete!</p>
                    </div>
                  )}

                  <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                    {uploadStep === "select" && <Button onClick={resetUploadState} className="w-full sm:w-auto">Cancel</Button>}
                    {uploadStep === "preview" && <Button onClick={handleUploadLeads} className="w-full sm:w-auto">Upload Leads</Button>}
                    {(uploadStep === "uploading" || uploadStep === "complete") && <Button onClick={resetUploadState} className="w-full sm:w-auto">Close</Button>}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                onClick={openBulkMessageDialog} 
                disabled={selectedLeads.length === 0}
                className="flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send WhatsApp ({selectedLeads.length})</span>
                <span className="sm:hidden">WhatsApp ({selectedLeads.length})</span>
              </Button>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex w-full items-center justify-center space-x-2 sm:w-auto" disabled={isSubmitting}>
                    <Plus className="h-4 w-4" />
                    <span>Add Lead</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-2 max-w-md sm:mx-0">
                  <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new lead.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newLead.name}
                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                        placeholder="Enter full name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        placeholder="Enter email address"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                        placeholder="Enter phone number"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="source">Source</Label>
                      <Select 
                        onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {sources.map(source => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="course">Course</Label>
                      <Select 
                        onValueChange={(value) => setNewLead({ ...newLead, course: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course} value={course}>
                              {course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newLead.notes}
                        onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddLead} disabled={isSubmitting} className="w-full sm:w-auto">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Lead'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-sm"
              disabled={isLoading}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="not-interested">Not Interested</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Card View for Small Screens */}
          <div className="block lg:hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading leads...</span>
                </div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                {leads.length === 0 ? "No leads found" : "No leads match your filters"}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={selectAll} 
                      onCheckedChange={toggleSelectAll} 
                      aria-label="Select all leads" 
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </div>
                  <span className="text-sm text-gray-500">{filteredLeads.length} leads</span>
                </div>
                
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          aria-label={`Select ${lead.name}`}
                        />
                        <div>
                          <h3 className="font-medium text-sm">{lead.name}</h3>
                          <p className="text-xs text-gray-500">{lead.course || "No course specified"}</p>
                        </div>
                      </div>
                      <Select 
                        value={lead.status} 
                        onValueChange={(value: Lead['status']) => handleStatusChange(lead.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="enrolled">Enrolled</SelectItem>
                          <SelectItem value="not-interested">Not Interested</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="text-xs">
                        <span className="text-gray-500">Email:</span> {lead.email}
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Phone:</span> {lead.phone}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">{lead.source || "Unknown"}</Badge>
                        <span className="text-xs text-gray-500">
                          Last contact: {lead.lastContact || "Never"}
                        </span>
                      </div>
                      {userRole === 'admin' ? (
                        <Select 
                          value={lead.assignedTo} 
                          onValueChange={(value) => handleAssignLead(lead.id, value)}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(employee => (
                              <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs">
                          <span className="text-gray-500">Assigned to:</span> {lead.assignedTo}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLead(lead.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCommunication(lead.id, 'whatsapp')}
                          disabled={isCommunicating === lead.id}
                          className="h-8 w-8 p-0"
                        >
                          {isCommunicating === lead.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCommunication(lead.id, 'call')}
                          disabled={isCommunicating === lead.id}
                          className="h-8 w-8 p-0"
                        >
                          {isCommunicating === lead.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Phone className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(lead.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="h-12 px-4 text-left align-middle font-medium">
                      <Checkbox 
                        checked={selectAll} 
                        onCheckedChange={toggleSelectAll} 
                        aria-label="Select all leads" 
                      />
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Lead Info</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Source</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Assigned To</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Last Contact</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="h-24 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading leads...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="h-24 text-center">
                        <div className="text-gray-500">
                          {leads.length === 0 ? "No leads found" : "No leads match your filters"}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <Checkbox 
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                            aria-label={`Select ${lead.name}`}
                          />
                        </td>
                        <td className="p-4 align-middle">
                          <div>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-gray-500">{lead.course || "No course specified"}</div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div>
                            <div className="text-sm">{lead.email}</div>
                            <div className="text-sm text-gray-500">{lead.phone}</div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline">{lead.source || "Unknown"}</Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <Select 
                            value={lead.status} 
                            onValueChange={(value: Lead['status']) => handleStatusChange(lead.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="follow-up">Follow-up</SelectItem>
                              <SelectItem value="enrolled">Enrolled</SelectItem>
                              <SelectItem value="not-interested">Not Interested</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 align-middle">
                          {userRole === 'admin' ? (
                            <Select 
                              value={lead.assignedTo} 
                              onValueChange={(value) => handleAssignLead(lead.id, value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map(employee => (
                                  <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm">{lead.assignedTo}</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <span className="text-sm">{lead.lastContact || "Never"}</span>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLead(lead.id)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                           <Button 
  variant="outline" 
  size="sm"
  onClick={() => requestCommunication(lead.id, 'whatsapp')}
  disabled={isCommunicating === lead.id}
  className="h-8 w-8 p-0"
>

                              {isCommunicating === lead.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <MessageSquare className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
  variant="outline"
  size="sm"
  onClick={() => requestCommunication(lead.id, 'call')}
  disabled={isCommunicating === lead.id}
  className="h-8 w-8 p-0"
>

                              {isCommunicating === lead.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Phone className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(lead.id)}
                            >
                              <Trash className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="mx-2 max-w-2xl max-h-[90vh] overflow-y-auto sm:mx-0 sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Complete information and communication history for this lead.
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedLead.name}</div>
                    <div><strong>Email:</strong> {selectedLead.email}</div>
                    <div><strong>Phone:</strong> {selectedLead.phone}</div>
                    <div><strong>Course:</strong> {selectedLead.course || "Not specified"}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Lead Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Source:</strong> {selectedLead.source || "Unknown"}</div>
                    <div><strong>Status:</strong> <Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge></div>
                    <div><strong>Assigned To:</strong> {selectedLead.assignedTo}</div>
                    <div><strong>Created:</strong> {selectedLead.createdDate}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedLead.notes || "No notes available"}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Communication History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedLead.communications && selectedLead.communications.length > 0 ? (
                    selectedLead.communications.map((comm) => (
                      <div key={comm.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        {getCommunicationIcon(comm.type)}
                        <span className="text-sm flex-1">{comm.message}</span>
                        <span className="text-xs text-gray-500">{comm.date}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No communication history available
                    </div>
                  )}
                </div>
              </div>
              {/* Comments Section */}
<div>
  <h4 className="font-medium mb-2">Comments</h4>
  <div className="space-y-2 max-h-40 overflow-y-auto">
    {(selectedLead.comments?.length ?? 0) > 0
      ? selectedLead.comments!.map(c => (
        <div key={c.id} className="p-2 bg-gray-50 rounded border">
          <p className="text-sm">{c.message}</p>
          <div className="text-xs text-gray-500">
            By: {c.by} • {c.timestamp}
          </div>
        </div>
      ))
      : (
        <div className="text-sm text-gray-500 text-center py-4">
          No comments yet
        </div>
      )}
  </div>
  <div className="mt-3 flex gap-2">
    <Input
      className="flex-1"
      placeholder="Write a comment..."
      value={newComment}
      onChange={e => setNewComment(e.target.value)}
    />
    <Button
      className="px-4"
      disabled={!newComment.trim() || !selectedLead}
      onClick={handleAddComment}
    >
      Add
    </Button>
  </div>
</div>

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk WhatsApp Message Dialog */}
      <Dialog open={isBulkMessageDialogOpen} onOpenChange={setIsBulkMessageDialogOpen}>
        <DialogContent className="mx-2 sm:max-w-[600px] sm:mx-0">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Messages</DialogTitle>
            <DialogDescription>
              Send template-based WhatsApp messages to selected leads.
            </DialogDescription>
          </DialogHeader>

          {/* Selected Leads List */}
          <div className="space-y-4 py-4">
            <div>
              <Label>Selected Leads ({selectedLeads.length})</Label>
              <div className="text-sm text-gray-500 max-h-24 overflow-y-auto border rounded p-2">
                {leads
                  .filter(lead => selectedLeads.includes(lead.id))
                  .map(lead => (
                    <div key={lead.id}>{lead.name} ({lead.phone})</div>
                  ))}
              </div>
            </div>

            {/* Select Template */}
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {whatsappTemplates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Variables */}
            {selectedTemplate && Object.keys(templateVariables).length > 0 && (
              <div className="space-y-3">
                <Label>Template Variables</Label>
                {Object.entries(templateVariables).map(([key, value]) => (
                  <div key={key}>
                    <Label htmlFor={key}>{key.replace('_', ' ').toUpperCase()}</Label>
                    <Input
                      id={key}
                      value={value}
                      onChange={(e) => handleVariableChange(key, e.target.value)}
                      placeholder={`Enter value for ${key}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button variant="outline" onClick={() => setIsBulkMessageDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={sendBulkMessages} disabled={isSendingMessages || !selectedTemplate} className="w-full sm:w-auto">
              {isSendingMessages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Messages
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent className="mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Do you really want to delete this lead? Please confirm your action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button variant="outline" onClick={closeDeleteDialog} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (leadToDelete) handleDeleteLead(leadToDelete);
                closeDeleteDialog();
              }}
              className="w-full sm:w-auto"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCommunicationConfirmOpen} onOpenChange={setIsCommunicationConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center space-x-2">
        {pendingCommunicationType === 'whatsapp' && <MessageSquare className="h-5 w-5 text-green-600" />}
        {pendingCommunicationType === 'call' && <Phone className="h-5 w-5 text-blue-600" />}
        {pendingCommunicationType === 'email' && <Calendar className="h-5 w-5 text-purple-600" />}
        <span>Confirm Communication</span>
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to record the <strong>{pendingCommunicationType}</strong> communication?
        This will update the lead's last contact time and add a communication record.
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Communication Recording</span>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          This will mark that you have communicated with the lead via {pendingCommunicationType}.
          The system will automatically update the last contact timestamp.
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={cancelCommunication}
        disabled={isCommunicating !== null}
      >
        Cancel
      </Button>
      <Button
        onClick={confirmCommunication}
        disabled={isCommunicating !== null}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isCommunicating !== null ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recording...
          </>
        ) : (
          <>
            {pendingCommunicationType === 'whatsapp' && <MessageSquare className="mr-2 h-4 w-4" />}
            {pendingCommunicationType === 'call' && <Phone className="mr-2 h-4 w-4" />}
            {pendingCommunicationType === 'email' && <Calendar className="mr-2 h-4 w-4" />}
            Record {pendingCommunicationType && (pendingCommunicationType.charAt(0).toUpperCase() + pendingCommunicationType.slice(1))} Communication
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </div>
  );
};
