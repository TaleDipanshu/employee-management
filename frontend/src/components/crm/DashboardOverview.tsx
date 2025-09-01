import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Users, UserPlus, Calendar, CheckSquare, TrendingUp, AlertCircle, MessageSquare, Clock, Loader2, CheckCircle } from "lucide-react";
import { analyticsApi, DashboardSummary, LeadPerformance, EmployeePerformance, TaskAnalytics, LeadSource } from "@/lib/analytics.api";
import { followupApi } from "@/lib/followup.api";
import { toast } from "react-toastify";

interface DashboardOverviewProps {
  userRole: 'admin' | 'employee';
}

// Shimmer component
const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`} 
       style={{ 
         animation: 'shimmer 2s infinite linear',
         backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
       }}>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

// Loading skeleton components
const SummaryCardSkeleton = () => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Shimmer className="h-4 w-24 rounded" />
      <Shimmer className="h-8 w-8 rounded-lg" />
    </CardHeader>
    <CardContent>
      <Shimmer className="h-8 w-16 rounded mb-2" />
      <Shimmer className="h-3 w-20 rounded" />
    </CardContent>
  </Card>
);

const ChartCardSkeleton = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Shimmer className="h-5 w-5 rounded" />
        <Shimmer className="h-5 w-32 rounded" />
      </CardTitle>
      <Shimmer className="h-4 w-48 rounded" />
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center">
        <Shimmer className="h-full w-full rounded" />
      </div>
    </CardContent>
  </Card>
);

const EmployeeCardSkeleton = () => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <Shimmer className="h-5 w-32 rounded mb-2" />
      <div className="flex items-center space-x-4">
        <Shimmer className="h-4 w-16 rounded" />
        <Shimmer className="h-4 w-16 rounded" />
        <Shimmer className="h-4 w-20 rounded" />
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <Shimmer className="h-5 w-12 rounded mb-1" />
        <Shimmer className="h-3 w-10 rounded" />
      </div>
      <div className="w-16">
        <Shimmer className="h-2 w-full rounded" />
      </div>
    </div>
  </div>
);

const QuickStatSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Shimmer className="h-4 w-24 rounded" />
      <Shimmer className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Shimmer className="h-8 w-12 rounded mb-2" />
      <Shimmer className="h-3 w-28 rounded" />
    </CardContent>
  </Card>
);

const SummaryCard = ({ name, value, icon: Icon, color, change }: { name: string; value: number; icon: any; color: string; change: string }) => (
  <Card className="relative overflow-hidden shadow-lg border border-gray-200 rounded-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-lg font-semibold text-gray-800">{name}</CardTitle>
      <div className={`p-2 rounded-full ${color}`}>
        <Icon className="text-white w-6 h-6" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <CardDescription className="text-sm text-gray-500">{change}</CardDescription>
    </CardContent>
  </Card>
);

export const DashboardOverview = ({ userRole }: DashboardOverviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [leadPerformance, setLeadPerformance] = useState<LeadPerformance[]>([]);
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance[]>([]);
  const [taskAnalytics, setTaskAnalytics] = useState<TaskAnalytics[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [
        summary,
        performance,
        tasks,
        sources
      ] = await Promise.all([
        analyticsApi.getDashboardSummary(),
        analyticsApi.getLeadPerformance(),
        analyticsApi.getTaskAnalytics(),
        analyticsApi.getLeadSources()
      ]);

      setSummaryData(summary);
      setLeadPerformance(performance);
      setTaskAnalytics(tasks);
      setLeadSources(sources);

      // Fetch employee performance only for admin
      if (userRole === 'admin') {
        const employees = await analyticsApi.getEmployeePerformance();
        setEmployeePerformance(employees);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userRole]);

  // Fetch follow-ups due
  useEffect(() => {
    const fetchFollowUpsDue = async () => {
      try {
        const followUpCounts = await analyticsApi.getFollowUpCounts();
        setSummaryData((prev) => ({ ...prev, followUpsDue: followUpCounts.due }));
      } catch (error) {
        console.error("Error fetching follow-ups due:", error);
      }
    };

    fetchFollowUpsDue();
  }, []);

  // Transform lead performance data for chart
  const dailyConversions = leadPerformance.map(item => ({
    date: item.month,
    leads: item.leads,
    conversions: item.conversions
  }));

  // Transform task analytics for pie chart
  const leadStatusData = taskAnalytics.length > 0 ? taskAnalytics.map(item => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('-', ' '),
    value: item.completed + item.pending + item.overdue,
    fill: item.type === 'follow-up' ? '#10B981' : 
          item.type === 'enrolled' ? '#8B5CF6' : 
          item.type === 'not-interested' ? '#EF4444' : '#3B82F6'
  })) : [
    { name: 'New Leads', value: 45, fill: '#3B82F6' },
    { name: 'Follow Up', value: 30, fill: '#10B981' },
    { name: 'Enrolled', value: 15, fill: '#8B5CF6' },
    { name: 'Not Interested', value: 10, fill: '#EF4444' }
  ];

  // Summary cards data
  const summaryCards = [
    { 
      name: "Total Leads", 
      value: summaryData?.totalLeads || 0, 
      icon: UserPlus, 
      color: "bg-blue-500", 
      change: "+12%" 
    },
    { 
      name: "Active Employees", 
      value: summaryData?.activeEmployees || 0, 
      icon: Users, 
      color: "bg-green-500", 
      change: "+2" 
    },
    { 
      name: "Today's Tasks", 
      value: summaryData?.todaysTasks || 0, 
      icon: CheckSquare, 
      color: "bg-purple-500", 
      change: `${summaryData?.pendingTasks || 0} pending` 
    },
  ];

  // Add conversion rate calculation and display
  const totalLeads = leadPerformance.reduce((sum, item) => sum + item.leads, 0);
  const totalConversions = leadPerformance.reduce((sum, item) => sum + item.conversions, 0);
  const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(2) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <SummaryCardSkeleton key={index} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardSkeleton title="Lead Status Breakdown" />
          <ChartCardSkeleton title="Monthly Lead Performance" />
        </div>

        {/* Admin-only content skeleton */}
        {userRole === 'admin' && (
          <>
            {/* Employee Productivity Skeleton */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shimmer className="h-5 w-5 rounded" />
                  <Shimmer className="h-5 w-48 rounded" />
                </CardTitle>
                <Shimmer className="h-4 w-64 rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <EmployeeCardSkeleton key={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(2)].map((_, index) => (
                <QuickStatSkeleton key={index} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {summaryCards.map((card, index) => (
          <SummaryCard key={index} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Task Status Breakdown</span>
            </CardTitle>
            <CardDescription>Current distribution of all leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [value, name]}
                    labelFormatter={(label: any) => `${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {leadStatusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-sm text-gray-600">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Conversions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Monthly Lead Performance</span>
            </CardTitle>
            <CardDescription>Monthly overview of leads and conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyConversions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Total Leads" />
                  <Line type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {userRole === 'admin' && employeePerformance.length > 0 && (
        <>
          {/* Employee Productivity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Employee Productivity Overview</span>
              </CardTitle>
              <CardDescription>Performance metrics for team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employeePerformance.map((employee, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{employee.name}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>{employee.tasks} tasks</span>
                        <span>{employee.leads} leads</span>
                        <span>{employee.conversions} conversions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.pendingTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  3 overdue, 9 due today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missed Leads</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.missedLeads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  No follow-up in 48hrs
                </p>
              </CardContent>
            </Card>

            {/* Conversion Rate Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Percentage of leads converted to enrollments
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};