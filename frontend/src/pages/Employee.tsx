import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserPlus, CheckSquare, Calendar, FileText } from "lucide-react";
import { LeadManagement } from "@/components/employee/Lead";
import { TaskManagement } from "@/components/employee/Task";
import { FollowUpScheduler } from "@/components/employee/Followup";
import { useState, useEffect } from "react";
// Toastify imports
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StudentDetails from "@/components/crm/forms";

const Employee = () => {
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: "admin" | "employee";
  } | null>(() => {
    const savedUser = localStorage.getItem("crm_user");
    const token = localStorage.getItem("crm_token");
    return savedUser && token ? JSON.parse(savedUser) : null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "leads";
  });

  const employeeName = currentUser?.name || "Employee";

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-start px-2 sm:px-4 lg:px-8">
      {/* Top Header */}
      <header className="w-full bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 lg:px-8 py-3 sm:py-4 mb-4 sm:mb-6 lg:mb-8 space-y-3 sm:space-y-0 rounded-b-lg sm:rounded-none">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12">
            <img
              src="/doitmyway.png"
              alt="Employee Management System Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 text-center sm:text-left">
            Employee Management System
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4 w-full sm:w-auto">
          <span className="text-gray-700 text-xs sm:text-sm lg:text-base text-center">
            Welcome, <span className="font-medium">{employeeName}</span>
          </span>
          <span className="bg-indigo-100 text-indigo-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
            Employee
          </span>
          <button
            className="bg-white border border-gray-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded shadow hover:bg-gray-50 font-medium text-xs sm:text-sm lg:text-base transition-colors"
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Card */}
      <Card className="w-full max-w-7xl mb-4 sm:mb-6 lg:mb-8 mx-2 sm:mx-4 lg:mx-0">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg lg:text-xl">My Workspace</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 lg:p-1">
          <Tabs
            defaultValue="leads"
            className="space-y-4 sm:space-y-6 py-2 sm:py-4 lg:py-1"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value)}
          >
            {/* Mobile Tabs - Horizontal Scroll */}
            <div className="block sm:hidden">
              <TabsList className="flex w-full overflow-x-auto bg-white p-1 rounded-lg shadow-sm mb-4 scrollbar-hide">
                <div className="flex space-x-1 min-w-max">
                  <TabsTrigger 
                    value="leads" 
                    className="flex items-center space-x-1 whitespace-nowrap px-3 py-2 text-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Leads</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tasks" 
                    className="flex items-center space-x-1 whitespace-nowrap px-3 py-2 text-xs"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Tasks</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="followups"
                    className="flex items-center space-x-1 whitespace-nowrap px-3 py-2 text-xs"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Follow-ups</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="student-details" 
                    className="flex items-center space-x-1 whitespace-nowrap px-3 py-2 text-xs"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Student Details</span>
                  </TabsTrigger>
                </div>
              </TabsList>
            </div>

            {/* Desktop/Tablet Tabs - Grid Layout */}
            <div className="hidden sm:block">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-white p-1 rounded-lg shadow-sm mb-6 gap-1">
                <TabsTrigger value="leads" className="flex items-center justify-center space-x-2 py-2 px-3">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Leads</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center justify-center space-x-2 py-2 px-3">
                  <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Tasks</span>
                </TabsTrigger>
                <TabsTrigger
                  value="followups"
                  className="flex items-center justify-center space-x-2 py-2 px-3"
                >
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Follow-ups</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="student-details" 
                  className="flex items-center justify-center space-x-2 py-2 px-3"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Student Details</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[400px] sm:min-h-[500px]">
              <TabsContent value="leads" className="mt-0">
                <LeadManagement userRole="employee" assignedTo={employeeName} />
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <TaskManagement
                  userRole="employee"
                  assignedToEmployeeName={employeeName}
                />
              </TabsContent>

              <TabsContent value="followups" className="mt-0">
                <FollowUpScheduler
                  userRole="employee"
                  assignedToEmployeeName={employeeName}
                />
              </TabsContent>

              <TabsContent value="student-details" className="mt-0">
                <div className="space-y-4 sm:space-y-6">
                  <StudentDetails />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Toast container */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 999999 }}
        className="mt-16 sm:mt-0"
      />

      {/* Enhanced Mobile Styles */}
      <style>{`
        @media (max-width: 640px) {
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        }
        
        @media (max-width: 480px) {
          .min-h-screen {
            min-height: 100vh;
            min-height: 100svh; /* For mobile browsers */
          }
        }
      `}</style>
    </div>
  );
};

export default Employee;
