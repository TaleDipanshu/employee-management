import { useState, useEffect, useRef, useMemo } from "react";
import api from '@/lib/api';
import { employeeApi } from '@/lib/employee.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, UserPlus, MessageSquare, Phone, Calendar, Eye, Loader2, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, Send, Trash, Edit2 } from "lucide-react";
import { leadApi } from '@/lib/lead.api';
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';
import { Checkbox } from "@/components/ui/checkbox";
import { sendWhatsappMessage } from "@/lib/sendWhatsappMessage";
import { whatsappApi } from "@/lib/whatsApp.api";
import { useDebounce } from "@/hooks/useDebounce"; // Custom hook for debounced search

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'follow-up' | 'enrolled' | 'not-interested' | 'contacted';
  assignedTo: string;
  assignedToId?: string;
  createdDate: string;
  lastContact: string;
  notes: string;
  course: string;
  communications?: Array<{
    id: string;
    type: 'whatsapp' | 'call' | 'email';
    message: string;
    date: string;
    by?: string;
  }>;
  comments?: Array<{
    id: string;
    message: string;
    by: string;
    timestamp: string;
  }>;
}

interface ExcelLead {
  name: string;
  email: string;
  phone: string;
  source?: string;
  course?: string;
  notes?: string;
  status?: 'new' | 'follow-up' | 'enrolled' | 'not-interested' | 'contacted';
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface LeadManagementProps {
  userRole: 'admin' | 'employee';
}

export const LeadManagement = ({ userRole }: LeadManagementProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // NEW: Add assignee filters
  // Add these with your existing state variables
const [isDeleting, setIsDeleting] = useState(false);
const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
const [newComment, setNewComment] = useState("");
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [editLead, setEditLead] = useState<Lead | null>(null);
const [editLeadData, setEditLeadData] = useState<Partial<Lead>>({});



  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommunicating, setIsCommunicating] = useState<string | null>(null);
  // Add these with your existing state variables
const [isCommunicationConfirmOpen, setIsCommunicationConfirmOpen] = useState(false);
const [pendingCommunicationType, setPendingCommunicationType] = useState<'whatsapp' | 'call' | 'email' | null>(null);
const [pendingCommunicationLeadId, setPendingCommunicationLeadId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  
  // Excel upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<ExcelLead[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadStep, setUploadStep] = useState<'select' | 'preview' | 'uploading' | 'complete'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp bulk messaging states
  const [isBulkMessageDialogOpen, setIsBulkMessageDialogOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSendingMessages, setIsSendingMessages] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<{[key: string]: string}>({});

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    course: "",
    notes: ""
  });

  const courses = ["Airhostess/ Ground Staff / Hospitality", "Hospitality","Cabin Crew / Ground Staff", "English Speaking Course"," Interview Preparation","Personality Development"];
  const sources = ["WhatsApp", "Website", "Referral", "Social Media", "Advertisement","Walkin"];

  // Mobile responsive CSS styles
  const mobileStyles = `
    .lead-table-responsive {
      width: 100%;
      border-collapse: collapse;
    }
    
    .lead-table-responsive th,
    .lead-table-responsive td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .lead-table-responsive th {
      background-color: #f8fafc;
      font-weight: 600;
      font-size: 14px;
    }
    
    /* Desktop styles - keep buttons in one row */
    .mobile-actions {
      display: flex;
      gap: 4px;
      justify-content: flex-start;
      flex-wrap: nowrap; /* Prevent wrapping on desktop */
    }
    
    .mobile-actions .btn-mobile {
      flex-shrink: 0; /* Prevent buttons from shrinking */
      min-width: 32px; /* Minimum button width */
    }
    
    @media (max-width: 768px) {
      .mobile-card-view .lead-table-responsive,
      .mobile-card-view .lead-table-responsive thead,
      .mobile-card-view .lead-table-responsive tbody,
      .mobile-card-view .lead-table-responsive th,
      .mobile-card-view .lead-table-responsive td,
      .mobile-card-view .lead-table-responsive tr {
        display: block;
      }
      
      .mobile-card-view .lead-table-responsive thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
      }
      
      .mobile-card-view .lead-table-responsive tr {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 16px;
        padding: 16px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .mobile-card-view .lead-table-responsive td {
        border: none;
        border-bottom: 1px solid #f1f5f9;
        position: relative;
        padding: 8px 0;
        padding-left: 40%;
        margin-bottom: 8px;
      }
      
      .mobile-card-view .lead-table-responsive td:before {
        content: attr(data-label) ": ";
        position: absolute;
        left: 0;
        width: 35%;
        padding-right: 10px;
        white-space: nowrap;
        font-weight: 600;
        color: #64748b;
        font-size: 12px;
      }
      
      .mobile-card-view .lead-table-responsive td:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      /* Mobile-specific action button styles */
      .mobile-actions {
        display: flex;
        flex-wrap: wrap; /* Allow wrapping only on mobile */
        gap: 8px;
        justify-content: flex-start;
      }
      
      .mobile-actions .btn-mobile {
        flex: 1;
        min-width: 80px;
        max-width: 120px;
      }
      
      .mobile-select {
        width: 100%;
        max-width: none;
      }
      
      .mobile-info-stack {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .mobile-contact-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
    }
    
    @media (max-width: 480px) {
      .lead-table-responsive td {
        padding-left: 45%;
        font-size: 14px;
      }
      
      .lead-table-responsive td:before {
        width: 40%;
        font-size: 11px;
      }
    }
  `;

  // Excel template download
  const downloadTemplate = () => {
    const templateData = [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        source: "Website",
        course: "Web Development",
        notes: "Interested in full-stack development",
        status: "new"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    
    const colWidths = [
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, "leads_template.xlsx");
    toast.success("Template downloaded successfully");
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
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

  // Process Excel file
  const processExcelFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast.error("The Excel file is empty");
          return;
        }

        const processedLeads: ExcelLead[] = [];
        const errors: ValidationError[] = [];
        const seenPhones = new Set<string>();

        // Collect all existing phone numbers (ignore non-digits)
        const existingPhones = new Set(
          leads.map(l => l.phone.replace(/\D/g, ""))
        );

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2;

          const lead: ExcelLead = {
            name: String(row.name || row.Name || '').trim(),
            email: String(row.email || row.Email || '').trim().toLowerCase(),
            phone: String(row.phone || row.Phone || '').trim(),
            source: String(row.source || row.Source || '').trim(),
            course: String(row.course || row.Course || '').trim(),
            notes: String(row.notes || row.Notes || '').trim(),
            status: (row.status || row.Status || 'new').toLowerCase() as any
          };

          const phoneDigits = lead.phone.replace(/\D/g, "");

          if (!lead.name) {
            errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
          }

          if (!lead.phone) {
            errors.push({ row: rowNumber, field: 'phone', message: 'Phone is required' });
          } else {
            // Check duplicate in existing leads
            if (existingPhones.has(phoneDigits)) {
              errors.push({ row: rowNumber, field: 'phone', message: 'Duplicate phone number (already exists)' });
            }
            // Check duplicate in current upload
            if (seenPhones.has(phoneDigits)) {
              errors.push({ row: rowNumber, field: 'phone', message: 'Duplicate phone number in Excel file' });
            }
            seenPhones.add(phoneDigits);
          }

          if (lead.status && !['new', 'follow-up', 'enrolled', 'not-interested', 'contacted'].includes(lead.status)) {
            errors.push({ row: rowNumber, field: 'status', message: 'Invalid status. Must be: new, follow-up, enrolled, not-interested, or contacted' });
            lead.status = 'new';
          }

          if (!lead.status) lead.status = 'new';
          if (!lead.source) lead.source = 'Excel Import';

          processedLeads.push(lead);
        });

        setUploadPreview(processedLeads);
        setValidationErrors(errors);
        setUploadStep('preview');

        if (errors.length > 0) {
          toast.error(`Found ${errors.length} validation error(s). Please review before uploading.`);
        } else {
          toast.success(`Successfully processed ${processedLeads.length} leads from Excel file`);
        }

      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast.error("Error processing Excel file. Please check the file format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Upload leads to database
  const handleUploadLeads = async () => {
    if (validationErrors.length > 0) {
      toast.error("Please fix validation errors before uploading");
      return;
    }

    setIsUploading(true);
    setUploadStep('uploading');

    try {
      const batchSize = 10;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < uploadPreview.length; i += batchSize) {
        const batch = uploadPreview.slice(i, i + batchSize);
        
        try {
          const response = await api.post('/leads/bulk-import', {
            leads: batch
          });
          
          successCount += response.data.successCount || batch.length;
          
          if (response.data.errors && response.data.errors.length > 0) {
            errors.push(...response.data.errors);
            errorCount += response.data.errors.length;
          }
        } catch (error: any) {
          console.error(`Error uploading batch ${i / batchSize + 1}:`, error);
          errorCount += batch.length;
          errors.push(`Batch ${i / batchSize + 1}: ${error.message || 'Upload failed'}`);
        }
      }

      setUploadStep('complete');

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} leads`);
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} leads`);
        console.error('Upload errors:', errors);
      }

      await fetchLeads();

      setTimeout(() => {
        resetUploadState();
      }, 3000);

    } catch (error: any) {
      console.error('Error uploading leads:', error);
      toast.error(error.message || "Failed to upload leads");
      setUploadStep('preview');
    } finally {
      setIsUploading(false);
    }
  };

const openEditDialog = (lead: Lead) => {
    setEditLead(lead);
    setEditLeadData({ ...lead });
    setIsEditDialogOpen(true);
  };

  // Edit Lead Handler
  const handleEditLead = async () => {
    if (!editLeadData.name || !editLeadData.phone) {
      toast.error("Name and Phone are required");
      return;
    }
    try {
      setIsSubmitting(true);
      await leadApi.editLead(editLead?.id, editLeadData);
      setIsEditDialogOpen(false);
      setEditLead(null);
      await fetchLeads();
      toast.success("Lead updated");
    } catch (err: any) {
      toast.error("Failed to edit lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Comments
  const handleAddComment = async () => {
    if (!selectedLead || !newComment.trim()) return;
    try {
      const res = await leadApi.addComment(selectedLead.id, newComment);
      setSelectedLead(prev =>
        prev ? { ...prev, comments: [...(prev.comments || []), res.comment] } : prev
      );
      setNewComment("");
      toast.success("Comment added");
    } catch (err: any) {
      toast.error("Failed to add comment");
    }
  };


  // Reset upload state
  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setValidationErrors([]);
    setUploadStep('select');
    setIsUploadDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch leads with filters - UPDATED with assignee filter
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/leads');
      
      const leadsData = Array.isArray(response.data) ? response.data : [];
      
      const processedLeads = leadsData.map((lead: any) => {
        if (userRole === 'admin') {
          const employee = employees.find(emp => emp.name === lead.assignedTo);
          return {
            ...lead,
            assignedToId: employee?._id || null,
            assignedTo: lead.assignedTo || 'Not assigned'
          };
        }
        return {
          ...lead,
          assignedTo: lead.assignedTo || 'Not assigned'
        };
      });
      
      setLeads(processedLeads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error(error.message || "Failed to fetch leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeApi.getAll();
        setEmployees(Array.isArray(data) ? data : data.employees);
      } catch (error) {
        // Optionally handle error
      }
    };
    fetchEmployees();
  }, []);

  // Initial load and filter changes - UPDATED to include assigneeFilter
  useEffect(() => {
    fetchLeads();
  }, []); // Only fetch once on component mount

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Client-side filtering
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.phone.includes(searchLower) ||
        (lead.course || "").toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchesAssignee = assigneeFilter === "all" || lead.assignedTo === assigneeFilter;
      
      return matchesSearch && matchesStatus && matchesSource && matchesAssignee;
    });
  }, [leads, debouncedSearchTerm, statusFilter, sourceFilter, assigneeFilter]);



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

  // Toggle lead selection for bulk messaging
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  // Toggle select all leads
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(lead => lead.id));
    }
    setSelectAll(!selectAll);
  };

  // Open bulk message dialog
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
      const variables: {[key: string]: string} = {};
      template.components.forEach((component: any, index: number) => {
        if (component.type === 'BODY' && component.text) {
          const matches = component.text.match(/\{\{(\d+)\}\}/g) || [];
          matches.forEach((match: string) => {
            const varNumber = match.replace(/[\{\}]/g, '');
            variables[`body_${varNumber}`] = '';
          });
        } else if (component.type === 'HEADER' && component.format === 'TEXT') {
          variables['header_1'] = '';
        }
      });
      setTemplateVariables(variables);
    }
  };

  // Handle variable input change
  const handleVariableChange = (key: string, value: string) => {
    setTemplateVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Send bulk WhatsApp messages
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
          components[`${componentType}_${index}`] = {
            type: "text",
            value: value
          };
        });
        
        return {
          to: [lead.phone],
          components
        };
      });
      
      const messagePayload = {
        integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER,
        content_type: "template",
        payload: {
          type: "template",
          template: {
            name: template.name,
            language: {
              code: template.language || "en",
              policy: "deterministic"
            },
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

  // Handle adding new lead
  const handleAddLead = async () => {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      toast.error("Please fill in all required fields (Name, Phone)");
      return;
    }

    // Check for duplicate phone number (ignore non-digits)
    const duplicate = leads.find(
      (lead) => lead.phone.replace(/\D/g, "") === newLead.phone.replace(/\D/g, "")
    );
    if (duplicate) {
      toast.error("A lead with this phone number already exists.");
      return;
    }

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
      
      await fetchLeads();
      toast.success("Lead added successfully");
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast.error(error.message || "Failed to add lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Delete
const handleBulkDelete = async () => {
  if (selectedLeads.length === 0) {
    toast.warning("No leads selected for deletion");
    return;
  }

  if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} selected leads? This action cannot be undone.`)) {
    return;
  }

  setIsDeleting(true);

  try {
    // Use bulk delete API if available
    const result = await leadApi.bulkDeleteLeads(selectedLeads);
    
    toast.success(`Successfully deleted ${result.deletedCount} leads`);
    
    // Reset selection and refresh
    setSelectedLeads([]);
    setSelectAll(false);
    await fetchLeads();

  } catch (error: any) {
    console.error('Bulk delete error:', error);
    toast.error(error.response?.data?.message || 'Failed to delete selected leads');
  } finally {
    setIsDeleting(false);
  }
};


// Actual delete function after confirmation
const confirmBulkDelete = async () => {
  setIsDeleteConfirmOpen(false);
  setIsDeleting(true);

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Delete leads one by one (since no bulk delete API exists)
    for (const leadId of selectedLeads) {
      try {
        await leadApi.deleteLead(leadId);
        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Failed to delete lead ${leadId}: ${error.message}`);
      }
    }

    // Show results
    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} leads`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} leads`);
      console.error('Delete errors:', errors);
    }

    // Reset selection and refresh
    setSelectedLeads([]);
    setSelectAll(false);
    await fetchLeads();

  } catch (error: any) {
    console.error('Bulk delete error:', error);
    toast.error('Failed to delete selected leads');
  } finally {
    setIsDeleting(false);
  }
};


// Optional: Delete all filtered leads
const handleDeleteAllFiltered = async () => {
  if (filteredLeads.length === 0) {
    toast.warning("No leads to delete");
    return;
  }

  if (!window.confirm(`Are you sure you want to delete ALL ${filteredLeads.length} displayed leads? This action cannot be undone.`)) {
    return;
  }

  setIsDeleting(true);

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const lead of filteredLeads) {
      try {
        await leadApi.deleteLead(lead.id);
        successCount++;
      } catch (error: any) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} leads`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to delete ${errorCount} leads`);
    }

    setSelectedLeads([]);
    setSelectAll(false);
    await fetchLeads();

  } catch (error: any) {
    console.error('Delete all error:', error);
    toast.error('Failed to delete leads');
  } finally {
    setIsDeleting(false);
  }
};


  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      setIsLoading(true);
      const updatedLead = await leadApi.updateStatus(leadId, newStatus);
      
      setLeads(prevLeads => prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
      
      toast.success("Lead status updated successfully");
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast.error(error.message || "Failed to update lead status");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle lead reassignment
  const handleAssignLead = async (leadId: string, assigneeId: string) => {
    try {
      setIsLoading(true);
      const updatedLead = await leadApi.assignLead(leadId, assigneeId);
      
      const employee = employees.find(emp => emp._id === assigneeId);
      const employeeName = employee ? employee.name : 'Unknown';
      const employeePhone = employee && 'phone' in employee ? (employee as any).phone : 'Unknown';
      
      setLeads(prevLeads => prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, assignedTo: employeeName, assignedToId: assigneeId } : lead
      ));

      let messageSent = false;
      if (employeePhone && employeePhone !== 'Unknown' && !messageSent) {
        try {
          const messagePayload = {
            integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "918699099836",
            content_type: "template",
            payload: {
              type: "template",
              template: {
                name: "lead_assign_notification",
                language: {
                  code: "en",
                  policy: "deterministic"
                },
                to_and_components: [
                  {
                    to: [employeePhone],
                    components: {}
                  }
                ]
              },
              messaging_product: "whatsapp"
            }
          };

          const response = await api.post('/whatsapp/send-bulk', messagePayload, {
            headers: {
              authkey: import.meta.env.VITE_AUTH_KEY
            }
          });

          console.log('WhatsApp notification sent successfully to:', employeePhone);
          messageSent = true;
        } catch (whatsappError) {
          console.error('Error sending WhatsApp notification:', whatsappError);
        }
      }

      toast.success("Lead reassigned successfully");
    } catch (error: any) {
      console.error('Error reassigning lead:', error);
      toast.error(error.message || "Failed to reassign lead");
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
      
      // Update the lead with current IST datetime
      setLeads(leads.map(lead =>
        lead.id === leadId
          ? { 
              ...lead, 
              lastContact: new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })
            }
          : lead
      ));

      toast.success(`${type} communication recorded`);
    } catch (error: any) {
      console.error(`Error recording ${type} communication:`, error);
      toast.error(error.message || `Failed to record ${type} communication`);
    } finally {
      setIsCommunicating(null);
    }
  };

  // Function to request communication with confirmation
const requestCommunication = (leadId: string, type: 'whatsapp' | 'call' | 'email') => {
  setPendingCommunicationLeadId(leadId);
  setPendingCommunicationType(type);
  setIsCommunicationConfirmOpen(true);
};

// Function to confirm and execute communication
const confirmCommunication = async () => {
  if (pendingCommunicationLeadId && pendingCommunicationType) {
    await handleCommunication(pendingCommunicationLeadId, pendingCommunicationType);
  }
  setIsCommunicationConfirmOpen(false);
  setPendingCommunicationLeadId(null);
  setPendingCommunicationType(null);
};

// Function to cancel communication
const cancelCommunication = () => {
  setIsCommunicationConfirmOpen(false);
  setPendingCommunicationLeadId(null);
  setPendingCommunicationType(null);
};


  // View lead details
  const handleViewLead = async (leadId: string) => {
    try {
      const { data } = await api.get(`/leads/${leadId}`);
      setSelectedLead(data);
    } catch (error: any) {
      console.error('Error fetching lead details:', error);
      toast.error(error.message || "Failed to fetch lead details");
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

  return (
    <div className="space-y-6">
      <style>{mobileStyles}</style>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Lead Management</span>
              </CardTitle>
              <CardDescription>Manage and track all your leads and their progress</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Excel</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span>Upload Leads from Excel</span>
                    </DialogTitle>
                    <DialogDescription>
                      Upload multiple leads at once using an Excel file (.xlsx, .xls) or CSV file.
                    </DialogDescription>
                  </DialogHeader>

                  {uploadStep === 'select' && (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Step 1: Download Template (Optional)</h4>
                        <Button variant="outline" size="sm" onClick={downloadTemplate}>
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Your Excel file should contain columns: <strong>name</strong>, <strong>phone</strong> (required),
                          and optionally: email, source, course, notes, status
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="excel-upload">Step 2: Select Excel File</Label>
                        <Input
                          id="excel-upload"
                          type="file"
                          ref={fileInputRef}
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                  )}

                  {uploadStep === 'preview' && (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Step 3: Preview & Validate</h4>
                        <Badge variant="outline">
                          {uploadPreview.length} leads found
                        </Badge>
                      </div>

                      {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div className="font-medium">Found {validationErrors.length} validation error(s):</div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {validationErrors.slice(0, 10).map((error, index) => (
                                  <div key={index} className="text-sm">
                                    Row {error.row}: {error.field} - {error.message}
                                  </div>
                                ))}
                                {validationErrors.length > 10 && (
                                  <div className="text-sm font-medium">
                                    ... and {validationErrors.length - 10} more errors
                                  </div>
                                )}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="border rounded-lg max-h-96 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Name</th>
                              <th className="p-2 text-left">Email</th>
                              <th className="p-2 text-left">Phone</th>
                              <th className="p-2 text-left">Source</th>
                              <th className="p-2 text-left">Course</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadPreview.slice(0, 50).map((lead, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-2">{lead.name}</td>
                                <td className="p-2">{lead.email}</td>
                                <td className="p-2">{lead.phone}</td>
                                <td className="p-2">{lead.source}</td>
                                <td className="p-2">{lead.course}</td>
                                <td className="p-2">
                                  <Badge variant="outline" className="text-xs">
                                    {lead.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {uploadPreview.length > 50 && (
                          <div className="p-2 text-center text-gray-500 text-sm border-t">
                            ... and {uploadPreview.length - 50} more leads
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadStep === 'uploading' && (
                    <div className="space-y-4 py-8">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <h4 className="font-medium">Uploading leads...</h4>
                        <p className="text-sm text-gray-500">Please wait while we process your leads</p>
                      </div>
                    </div>
                  )}

                  {uploadStep === 'complete' && (
                    <div className="space-y-4 py-8">
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-4" />
                        <h4 className="font-medium text-green-600">Upload Complete!</h4>
                        <p className="text-sm text-gray-500">Your leads have been successfully uploaded</p>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    {uploadStep === 'select' && (
                      <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                    )}
                    
                    {uploadStep === 'preview' && (
                      <>
                        <Button variant="outline" onClick={resetUploadState}>
                          Start Over
                        </Button>
                        <Button
                          onClick={handleUploadLeads}
                          disabled={validationErrors.length > 0 || isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            `Upload ${uploadPreview.length} Leads`
                          )}
                        </Button>
                      </>
                    )}

                    {(uploadStep === 'uploading' || uploadStep === 'complete') && (
                      <Button variant="outline" onClick={resetUploadState}>
                        Close
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2" disabled={isSubmitting}>
                    <Plus className="h-4 w-4" />
                    <span>Add Lead</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
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
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddLead} disabled={isSubmitting}>
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
        <CardContent>
          {/* UPDATED: Filters section with assignee filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-sm"
              disabled={isLoading}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
              <SelectTrigger className="sm:w-48">
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
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* NEW: Assignee filter */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter} disabled={isLoading}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="Not assigned">Unassigned</SelectItem>
                {employees.map(employee => (
                  <SelectItem key={employee._id} value={employee.name}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        {/* Bulk Actions */}
<div className="flex justify-between items-center mb-4">
  <div className="flex gap-2">
    <Button 
      variant="outline" 
      onClick={openBulkMessageDialog} 
      disabled={selectedLeads.length === 0 || isDeleting}
      className="flex items-center gap-2"
    >
      <Send className="h-4 w-4" />
      Send WhatsApp ({selectedLeads.length})
    </Button>
    
    <Button 
      variant="outline" 
      onClick={handleBulkDelete}
      disabled={selectedLeads.length === 0 || isDeleting}
      className="flex items-center gap-2 text-red-600 hover:text-red-700"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash className="h-4 w-4" />
      )}
      Delete Selected ({selectedLeads.length})
    </Button>
  </div>
</div>


          
          {/* Responsive Table Container */}
          <div className="mobile-card-view">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="lead-table-responsive">
                  <thead>
                    <tr>
                      <th>
                        <Checkbox 
                          checked={selectAll} 
                          onCheckedChange={toggleSelectAll} 
                          aria-label="Select all leads"
                        />
                      </th>
                      <th>Lead Info</th>
                      <th>Contact</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Last Contact</th>
                      <th>Actions</th>
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
                        <tr key={lead.id}>
                          <td data-label="Select">
                            <Checkbox 
                              checked={selectedLeads.includes(lead.id)} 
                              onCheckedChange={() => toggleLeadSelection(lead.id)} 
                              aria-label={`Select ${lead.name}`}
                            />
                          </td>
                          <td data-label="Lead Info">
                            <div className="mobile-info-stack">
                              <div className="font-medium">{lead.name}</div>
                              <div className="text-sm text-gray-500">{lead.course || "No course specified"}</div>
                            </div>
                          </td>
                          <td data-label="Contact">
                            <div className="mobile-contact-info">
                              <div className="text-sm">{lead.email}</div>
                              <div className="text-sm text-gray-500">{lead.phone}</div>
                            </div>
                          </td>
                          <td data-label="Source">
                            <Badge variant="outline">{lead.source || "Unknown"}</Badge>
                          </td>
                          <td data-label="Status">
                            <Select
                              value={lead.status}
                              onValueChange={(value: Lead['status']) => handleStatusChange(lead.id, value)}
                            >
                              <SelectTrigger className="mobile-select w-32">
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
                          <td data-label="Assigned To">
                            {userRole === 'admin' ? (
                              <Select
                                value={lead.assignedToId || ''}
                                onValueChange={(value) => handleAssignLead(lead.id, value)}
                              >
                                <SelectTrigger className="mobile-select w-36">
                                  <SelectValue placeholder={lead.assignedTo || "Assign to..."} />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.map(employee => (
                                    <SelectItem key={employee._id} value={employee._id}>
                                      {employee.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm">{lead.assignedTo || "Not assigned"}</span>
                            )}
                          </td>
                          <td data-label="Last Contact">
                            <span className="text-sm" title={lead.lastContact}>
                              {lead.lastContact === 'Never' ? 'Never' : lead.lastContact}
                            </span>
                          </td>
                          <td data-label="Actions">
  <div className="mobile-actions" style={{ minWidth: '160px' }}>
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleViewLead(lead.id)}
      className="btn-mobile"
    >
      <Eye className="h-3 w-3" />
    </Button>
    <Button
  variant="outline"
  size="sm"
  onClick={() => openEditDialog(lead)}
  className="btn-mobile"
>
  <Edit2 className="h-3 w-3" />
</Button>

    {/* Updated WhatsApp Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => requestCommunication(lead.id, 'whatsapp')}
      disabled={isCommunicating === lead.id}
      className="btn-mobile"
    >
      {isCommunicating === lead.id ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <MessageSquare className="h-3 w-3" />
      )}
    </Button>
    
    {/* Updated Call Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => requestCommunication(lead.id, 'call')}
      disabled={isCommunicating === lead.id}
      className="btn-mobile"
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
      className="btn-mobile"
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
          </div>
        </CardContent>
      </Card>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update details below and save changes.</DialogDescription>
          </DialogHeader>
          {editLead && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editName">Full Name *</Label>
                <Input
                  id="editName"
                  value={editLeadData.name || ""}
                  onChange={e => setEditLeadData({ ...editLeadData, name: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editLeadData.email || ""}
                  onChange={e => setEditLeadData({ ...editLeadData, email: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editPhone">Phone *</Label>
                <Input
                  id="editPhone"
                  value={editLeadData.phone || ""}
                  onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editLeadData.notes || ""}
                  onChange={e => setEditLeadData({ ...editLeadData, notes: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleEditLead} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog (with Comments section) */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Lead Details</DialogTitle>
      <DialogDescription>
        Complete information and communication history for this lead.
      </DialogDescription>
    </DialogHeader>
    {selectedLead && (
      <div className="grid gap-6 py-4">
        {/* Contact and Info blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <strong>Status:</strong>
                <Badge className={getStatusColor(selectedLead.status)}>
                  {selectedLead.status}
                </Badge>
              </div>
              <div><strong>Assigned To:</strong> {selectedLead.assignedTo}</div>
              <div><strong>Created:</strong> {selectedLead.createdDate}</div>
            </div>
          </div>
        </div>
        {/* Notes */}
        <div>
          <h4 className="font-medium mb-2">Notes</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {selectedLead.notes || "No notes available"}
          </p>
        </div>
        {/* Communication History */}
        <div>
          <h4 className="font-medium mb-2">Communication History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(selectedLead.communications?.length ?? 0) > 0
              ? selectedLead.communications!.map(comm => (
                  <div
                    key={comm.id}
                    className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                  >
                    {getCommunicationIcon(comm.type)}
                    <span className="text-sm flex-1">{comm.message}</span>
                    <span className="text-xs text-gray-500">
                      {comm.by ? `By: ${comm.by}, ` : ""}
                      {comm.date}
                    </span>
                  </div>
                ))
              : (
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
      <Button variant="outline" onClick={() => setSelectedLead(null)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Bulk WhatsApp Message Dialog */}
      <Dialog open={isBulkMessageDialogOpen} onOpenChange={setIsBulkMessageDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Messages</DialogTitle>
            <DialogDescription>
              Send template-based WhatsApp messages to selected leads.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-1.5">
              <Label>Selected Leads ({selectedLeads.length})</Label>
              <div className="text-sm text-gray-500 max-h-24 overflow-y-auto border rounded p-2">
                {leads
                  .filter(lead => selectedLeads.includes(lead.id))
                  .map(lead => (
                    <div key={lead.id} className="mb-1">
                      {lead.name} ({lead.phone})
                    </div>
                  ))
                }
              </div>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="template">Select Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateSelection}
              >
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
            
            {selectedTemplate && Object.keys(templateVariables).length > 0 && (
              <div className="flex flex-col space-y-3">
                <Label>Template Variables</Label>
                {Object.entries(templateVariables).map(([key, value]) => (
                  <div key={key} className="flex flex-col space-y-1.5">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendBulkMessages} disabled={isSendingMessages || !selectedTemplate}>
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

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Lead Details</DialogTitle>
      <DialogDescription>
        Complete information and communication history for this lead.
      </DialogDescription>
    </DialogHeader>
    {selectedLead && (
      <div className="grid gap-6 py-4">
        {/* Contact and Info blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <strong>Status:</strong>{" "}
                <Badge className={getStatusColor(selectedLead.status)}>
                  {selectedLead.status}
                </Badge>
              </div>
              <div><strong>Assigned To:</strong> {selectedLead.assignedTo}</div>
              <div><strong>Created:</strong> {selectedLead.createdDate}</div>
            </div>
          </div>
        </div>
        {/* Notes */}
        <div>
          <h4 className="font-medium mb-2">Notes</h4>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {selectedLead.notes || "No notes available"}
          </p>
        </div>
        {/* Communication History */}
        <div>
          <h4 className="font-medium mb-2">Communication History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {(selectedLead.communications?.length ?? 0) > 0
              ? selectedLead.communications.map(comm => (
                  <div key={comm.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    {getCommunicationIcon(comm.type)}
                    <span className="text-sm flex-1">{comm.message}</span>
                    <span className="text-xs text-gray-500">
                      {comm.by ? `By: ${comm.by}, ` : ""}
                      {comm.date}
                    </span>
                  </div>
                ))
              : (
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
              ? selectedLead.comments.map(c => (
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
      <Button variant="outline" onClick={() => setSelectedLead(null)}>
        Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Do you really want to delete this lead? Please confirm your action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (leadToDelete) handleDeleteLead(leadToDelete);
                closeDeleteDialog();
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simple Bulk Delete Confirmation Dialog */}
<Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <span>Are you sure?</span>
      </DialogTitle>
      <DialogDescription>
        You are about to delete {selectedLeads.length} selected lead(s). This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-2">Leads to be deleted:</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {leads
            .filter(lead => selectedLeads.includes(lead.id))
            .map(lead => (
              <div key={lead.id} className="text-sm text-red-700">
                • {lead.name} ({lead.phone})
              </div>
            ))
          }
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button 
        variant="outline" 
        onClick={() => setIsDeleteConfirmOpen(false)}
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button 
        variant="destructive"
        onClick={confirmBulkDelete}
        disabled={isDeleting}
        className="bg-red-600 hover:bg-red-700"
      >
        {isDeleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash className="mr-2 h-4 w-4" />
            Yes, Delete {selectedLeads.length} Lead(s)
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Communication Confirmation Dialog */}
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
            Record {pendingCommunicationType?.charAt(0).toUpperCase() + pendingCommunicationType?.slice(1)} Communication
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


    </div>
  );
};
