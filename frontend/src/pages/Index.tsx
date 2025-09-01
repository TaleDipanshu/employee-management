import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Calendar, CheckSquare, TrendingUp, FileText } from "lucide-react";
import { DashboardOverview } from "@/components/crm/DashboardOverview";
import { EmployeeManagement } from "@/components/crm/EmployeeManagement";
import { LeadManagement } from "@/components/crm/LeadManagement";
import { TaskManagement } from "@/components/crm/TaskManagement";
import { FollowUpScheduler } from "@/components/crm/FollowUpScheduler";
import { ReportsAnalytics } from "@/components/crm/ReportsAnalytics";
import { LoginForm } from "@/components/crm/LoginForm";
import { toast, ToastContainer } from "react-toastify";
import api from "../lib/api";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import  StudentDetails  from "@/components/crm/forms"; // Import StudentDetails component

const Index = () => {
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: "admin" | "employee";
  } | null>(() => {
    const savedUser = localStorage.getItem("crm_user");
    const token = localStorage.getItem("crm_token");
    return savedUser && token ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();

  // Initialize isLoggedIn based on currentUser
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("crm_token");
    const savedUser = localStorage.getItem("crm_user");
    return !!(token && savedUser);
  });

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;

      // Only allow admin users to login
      if (user.role !== "admin") {
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      localStorage.setItem("crm_token", token);

      // Create consistent user object
      const userObj = {
        name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        role: user.role,
      };

      localStorage.setItem("crm_user", JSON.stringify(userObj));
      setCurrentUser(userObj);
      setIsLoggedIn(true);

      toast.success("Login successful");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    navigate("/login");
    toast.success("Logged out successfully!");
  };

  // Check if user is admin before showing the dashboard
  if (!isLoggedIn || !currentUser || currentUser.role !== "admin") {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Get the active tab from localStorage or default to 'leads'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "leads";
  });

  // Update localStorage when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("activeTab", value);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 mr-4">
                  <img src="/doitmyway.png" alt="Employee Management System Logo" className="w-full h-full object-cover rounded-full" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left">Employee Management System</h1>
              </div>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <span className="text-sm text-gray-600">Welcome, {currentUser?.name}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                  {currentUser?.role}
                </span>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            {/* ✅ Equal Spacing Tab Bar */}
            <TabsList className="flex w-full bg-white p-1 rounded-lg shadow-sm">
              <TabsTrigger value="dashboard" className="flex-1 flex items-center justify-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex-1 flex items-center justify-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Employees</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex-1 flex items-center justify-center space-x-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Leads</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1 flex items-center justify-center space-x-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="followups" className="flex-1 flex items-center justify-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-ups</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex-1 flex items-center justify-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="student-details" className="flex-1 flex items-center justify-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Student Details</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardOverview userRole={currentUser.role} />
            </TabsContent>

            <TabsContent value="employees" className="space-y-6">
              <EmployeeManagement />
            </TabsContent>

            <TabsContent value="leads" className="space-y-6">
              <LeadManagement userRole={currentUser.role} />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              <TaskManagement userRole={currentUser.role} />
            </TabsContent>

            <TabsContent value="followups" className="space-y-6">
              <FollowUpScheduler userRole={currentUser.role} />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <ReportsAnalytics userRole={currentUser.role} />
            </TabsContent>

            <TabsContent value="student-details" className="space-y-6">
              <StudentDetails />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Index;
