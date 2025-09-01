import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import api from '@/lib/api';

interface WhatsAppTemplateProps {
  userRole: 'admin' | 'employee';
}

interface TemplateComponent {
  type: string;
  format?: string;
  text: string;
  example?: any;
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  example?: string[];
}

export const WhatsAppTemplate = ({ userRole }: WhatsAppTemplateProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("create");
  
  // Form state
  const [formData, setFormData] = useState({
    integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "918699099836",
    template_name: "",
    language: "en",
    category: "MARKETING",
    button_url: "true",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "",
        example: {
          header_text: [""] 
        }
      },
      {
        type: "BODY",
        text: "",
        example: {
          body_text: [["", "", ""]]
        }
      },
      {
        type: "FOOTER",
        text: ""
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "QUICK_REPLY",
            text: ""
          }
        ]
      }
    ]
  });

  // API key from environment variable
  const apiKey = import.meta.env.VITE_AUTH_KEY;

  // Variables state for body
  const [bodyVariables, setBodyVariables] = useState<string[]>([""]);  

  // URL button state
  const [hasUrlButton, setHasUrlButton] = useState(false);
  const [urlButtonText, setUrlButtonText] = useState("");
  const [urlButtonLink, setUrlButtonLink] = useState("");
  const [urlButtonVariable, setUrlButtonVariable] = useState("");

  // Quick reply buttons state
  const [quickReplyButtons, setQuickReplyButtons] = useState<string[]>([""]);  

  // Fetch existing templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      
      // Get the integrated number from form data or use environment variable
      const number = formData.integrated_number || import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "";
      
      if (!number) {
        alert("Please enter a WhatsApp number");
        setIsLoading(false);
        return;
      }
      
      // Use our backend proxy instead of directly calling MSG91 API
      const { data } = await api.get(
        `/whatsapp/templates/${number}`,
        {
          headers: {
            authkey: import.meta.env.VITE_AUTH_KEY
          },
          params: {
            template_name: '',
            template_status: '',
            template_language: ''
          }
        }
      );
      
      console.log("Templates data:", data);
      
      // Update templates state with the response data
      if (data && Array.isArray(data.data)) {
        setTemplates(data.data);
      } else {
        // Fallback to empty array if data format is unexpected
        setTemplates([]);
        toast.warning("No templates found or unexpected response format");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
      
      // For development/testing, use mock data if API fails
      if (import.meta.env.MODE === 'development') {
        setTemplates([
          {
            id: "template1",
            name: "Welcome Message",
            status: "APPROVED",
            category: "MARKETING"
          },
          {
            id: "template2",
            name: "Order Confirmation",
            status: "PENDING",
            category: "UTILITY"
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle select changes
  const handleSelectChange = (value: string, name: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle header text change
  const handleHeaderTextChange = (value: string) => {
    const updatedComponents = [...formData.components];
    const headerIndex = updatedComponents.findIndex(comp => comp.type === "HEADER");
    
    if (headerIndex !== -1) {
      updatedComponents[headerIndex] = {
        ...updatedComponents[headerIndex],
        text: value,
        example: {
          header_text: [value]
        }
      };
      
      setFormData(prev => ({
        ...prev,
        components: updatedComponents
      }));
    }
  };

  // Handle body text change
  const handleBodyTextChange = (value: string) => {
    // Replace placeholders with {{1}}, {{2}}, etc.
    let processedText = value;
    const variables: string[] = [];
    
    // Extract variables from text using regex
    const regex = /\{\{(\d+)\}\}/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      const varIndex = parseInt(match[1]) - 1;
      if (varIndex >= 0 && varIndex < bodyVariables.length) {
        variables[varIndex] = bodyVariables[varIndex] || "";
      }
    }
    
    // Update body component
    const updatedComponents = [...formData.components];
    const bodyIndex = updatedComponents.findIndex(comp => comp.type === "BODY");
    
    if (bodyIndex !== -1) {
      updatedComponents[bodyIndex] = {
        ...updatedComponents[bodyIndex],
        text: processedText,
        example: {
          body_text: [variables.length > 0 ? variables : ["", "", ""]]
        }
      };
      
      setFormData(prev => ({
        ...prev,
        components: updatedComponents
      }));
    }
  };

  // Handle footer text change
  const handleFooterTextChange = (value: string) => {
    const updatedComponents = [...formData.components];
    const footerIndex = updatedComponents.findIndex(comp => comp.type === "FOOTER");
    
    if (footerIndex !== -1) {
      updatedComponents[footerIndex] = {
        ...updatedComponents[footerIndex],
        text: value
      };
      
      setFormData(prev => ({
        ...prev,
        components: updatedComponents
      }));
    }
  };

  // Handle body variable change
  const handleBodyVariableChange = (index: number, value: string) => {
    const updatedVariables = [...bodyVariables];
    updatedVariables[index] = value;
    setBodyVariables(updatedVariables);
    
    // Update the body component example
    const updatedComponents = [...formData.components];
    const bodyIndex = updatedComponents.findIndex(comp => comp.type === "BODY");
    
    if (bodyIndex !== -1) {
      updatedComponents[bodyIndex] = {
        ...updatedComponents[bodyIndex],
        example: {
          body_text: [updatedVariables]
        }
      };
      
      setFormData(prev => ({
        ...prev,
        components: updatedComponents
      }));
    }
  };

  // Add body variable
  const addBodyVariable = () => {
    setBodyVariables(prev => [...prev, ""]);
  };

  // Remove body variable
  const removeBodyVariable = (index: number) => {
    if (bodyVariables.length > 1) {
      const updatedVariables = bodyVariables.filter((_, i) => i !== index);
      setBodyVariables(updatedVariables);
      
      // Update the body component example
      const updatedComponents = [...formData.components];
      const bodyIndex = updatedComponents.findIndex(comp => comp.type === "BODY");
      
      if (bodyIndex !== -1) {
        updatedComponents[bodyIndex] = {
          ...updatedComponents[bodyIndex],
          example: {
            body_text: [updatedVariables]
          }
        };
        
        setFormData(prev => ({
          ...prev,
          components: updatedComponents
        }));
      }
    }
  };

  // Handle URL button toggle
  const handleUrlButtonToggle = (enabled: boolean) => {
    setHasUrlButton(enabled);
    
    // Update buttons component
    updateButtonsComponent();
  };

  // Handle quick reply button change
  const handleQuickReplyChange = (index: number, value: string) => {
    const updatedButtons = [...quickReplyButtons];
    updatedButtons[index] = value;
    setQuickReplyButtons(updatedButtons);
    
    // Update buttons component
    updateButtonsComponent();
  };

  // Add quick reply button
  const addQuickReplyButton = () => {
    if (quickReplyButtons.length < 2) { // Maximum 2 quick reply buttons
      setQuickReplyButtons(prev => [...prev, ""]);
    }
  };

  // Remove quick reply button
  const removeQuickReplyButton = (index: number) => {
    if (quickReplyButtons.length > 1) {
      const updatedButtons = quickReplyButtons.filter((_, i) => i !== index);
      setQuickReplyButtons(updatedButtons);
      
      // Update buttons component
      updateButtonsComponent();
    }
  };

  // Update buttons component
  const updateButtonsComponent = () => {
    const buttons: TemplateButton[] = [];
    
    // Add quick reply buttons
    quickReplyButtons.forEach(text => {
      if (text.trim()) {
        buttons.push({
          type: "QUICK_REPLY",
          text
        });
      }
    });
    
    // Add URL button if enabled
    if (hasUrlButton && urlButtonText.trim()) {
      const urlButton: TemplateButton = {
        type: "URL",
        text: urlButtonText,
        url: urlButtonLink || "https://example.com"
      };
      
      if (urlButtonVariable) {
        urlButton.url = `${urlButton.url}/{{${urlButtonVariable}}}`;
        urlButton.example = [urlButton.url.replace(`{{${urlButtonVariable}}}`, "example")];
      }
      
      buttons.push(urlButton);
    }
    
    // Update the buttons component
    const updatedComponents = [...formData.components];
    const buttonsIndex = updatedComponents.findIndex(comp => comp.type === "BUTTONS");
    
    if (buttonsIndex !== -1) {
      updatedComponents[buttonsIndex] = {
        ...updatedComponents[buttonsIndex],
        buttons
      };
      
      setFormData(prev => ({
        ...prev,
        components: updatedComponents
      }));
    }
  };

  // Submit template
  const submitTemplate = async () => {
    try {
      setIsLoading(true);
      
      // Use our backend proxy instead of directly calling MSG91 API
      const { data } = await api.post(
        '/whatsapp/templates',
        formData,
        {
          headers: {
            authkey: import.meta.env.VITE_AUTH_KEY
          }
        }
      );
      
      console.log(data);
      
      toast.success("Template submitted successfully");
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error submitting template:", error);
      toast.error("Failed to submit template");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      integrated_number: "",
      template_name: "",
      language: "en",
      category: "MARKETING",
      button_url: "true",
      components: [
        {
          type: "HEADER",
          format: "TEXT",
          text: "",
          example: {
            header_text: [""] 
          }
        },
        {
          type: "BODY",
          text: "",
          example: {
            body_text: [["", "", ""]]
          }
        },
        {
          type: "FOOTER",
          text: ""
        },
        {
          type: "BUTTONS",
          buttons: [
            {
              type: "QUICK_REPLY",
              text: ""
            }
          ]
        }
      ]
    });
    setBodyVariables([""]);
    setHasUrlButton(false);
    setUrlButtonText("");
    setUrlButtonLink("");
    setUrlButtonVariable("");
    setQuickReplyButtons([""]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>WhatsApp Template Management</span>
          </CardTitle>
          <CardDescription>
            Create and manage WhatsApp message templates for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="fetch_number">WhatsApp Number</Label>
                <Input
                  id="fetch_number"
                  placeholder="Enter your WhatsApp number to fetch templates"
                  value={formData.integrated_number || import.meta.env.VITE_MSG91_WHATSAPP_NUMBER}
                  onChange={(e) => setFormData(prev => ({ ...prev, integrated_number: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => fetchTemplates()}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Fetch Templates
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Template</TabsTrigger>
              <TabsTrigger value="manage">Manage Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="integrated_number">WhatsApp Number</Label>
                  <Input
                    id="integrated_number"
                    name="integrated_number"
                    placeholder="Enter your integrated WhatsApp number"
                    value={formData.integrated_number}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template_name">Template Name</Label>
                  <Input
                    id="template_name"
                    name="template_name"
                    placeholder="Enter template name"
                    value={formData.template_name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => handleSelectChange(value, "language")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange(value, "category")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Header Section */}
                <div>
                  <Label htmlFor="header_text">Header Text</Label>
                  <Input
                    id="header_text"
                    placeholder="Enter header text"
                    value={formData.components[0].text}
                    onChange={(e) => handleHeaderTextChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                {/* Body Section */}
                <div>
                  <Label htmlFor="body_text">Body Text</Label>
                  <Textarea
                    id="body_text"
                    placeholder="Enter body text. Use {{1}}, {{2}}, etc. for variables"
                    value={formData.components[1].text}
                    onChange={(e) => handleBodyTextChange(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                  
                  {/* Body Variables */}
                  <div className="mt-4">
                    <Label>Body Variables</Label>
                    <div className="space-y-2 mt-1">
                      {bodyVariables.map((variable, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Variable {{${index + 1}}}`}
                            value={variable}
                            onChange={(e) => handleBodyVariableChange(index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeBodyVariable(index)}
                            disabled={bodyVariables.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addBodyVariable}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Variable
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Footer Section */}
                <div>
                  <Label htmlFor="footer_text">Footer Text</Label>
                  <Input
                    id="footer_text"
                    placeholder="Enter footer text"
                    value={formData.components[2].text}
                    onChange={(e) => handleFooterTextChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                {/* Buttons Section */}
                <div className="space-y-4">
                  <Label>Buttons</Label>
                  
                  {/* Quick Reply Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-normal">Quick Reply Buttons (Max 2)</Label>
                    {quickReplyButtons.map((button, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Quick Reply Button ${index + 1}`}
                          value={button}
                          onChange={(e) => handleQuickReplyChange(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeQuickReplyButton(index)}
                          disabled={quickReplyButtons.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {quickReplyButtons.length < 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addQuickReplyButton}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Quick Reply
                      </Button>
                    )}
                  </div>
                  
                  {/* URL Button */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="url_button"
                        checked={hasUrlButton}
                        onChange={(e) => handleUrlButtonToggle(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="url_button" className="text-sm font-normal cursor-pointer">
                        Include URL Button
                      </Label>
                    </div>
                    
                    {hasUrlButton && (
                      <div className="space-y-2 pl-6">
                        <Input
                          placeholder="Button Text"
                          value={urlButtonText}
                          onChange={(e) => {
                            setUrlButtonText(e.target.value);
                            updateButtonsComponent();
                          }}
                        />
                        <Input
                          placeholder="URL (e.g., https://example.com)"
                          value={urlButtonLink}
                          onChange={(e) => {
                            setUrlButtonLink(e.target.value);
                            updateButtonsComponent();
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="url_variable"
                            checked={!!urlButtonVariable}
                            onChange={(e) => {
                              setUrlButtonVariable(e.target.checked ? "4" : "");
                              updateButtonsComponent();
                            }}
                            className="rounded"
                          />
                          <Label htmlFor="url_variable" className="text-sm font-normal cursor-pointer">
                            Include Variable in URL
                          </Label>
                        </div>
                        {urlButtonVariable && (
                          <Input
                            placeholder="Variable Number (e.g., 4)"
                            value={urlButtonVariable}
                            onChange={(e) => {
                              setUrlButtonVariable(e.target.value);
                              updateButtonsComponent();
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
                <Button 
                  onClick={submitTemplate} 
                  disabled={isLoading || !formData.integrated_number || !formData.template_name}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit Template
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="manage" className="mt-6">
              {templates.length > 0 ? (
                <div className="space-y-4">
                  {templates.map((template, index) => (
                    <Card key={template.id || index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{template.name || template.template_name}</h3>
                            <p className="text-sm text-gray-500">
                              {template.category || template.template_category || 'N/A'} | 
                              {template.language || template.template_language || 'EN'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${(template.status === 'APPROVED' || template.template_status === 'APPROVED') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {template.status || template.template_status || 'PENDING'}
                            </span>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No templates found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    You haven't created any templates yet
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};