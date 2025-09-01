import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { FileText, Download, Calendar, Users, TrendingUp, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyticsApi, LeadFunnel, LeadQuality, MissedLead, LeadPerformance, EmployeePerformance, TaskAnalytics, LeadSource } from "@/lib/analytics.api";

// Import libraries for exporting data
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";

// Extend the jsPDF interface for jsPDF-autotable to recognize the 'previous' property
declare module "jspdf" {
  interface jsPDF {
    autoTable: {
      previous: {
        finalY: number;
      };
    };
  }
}

interface ReportsAnalyticsProps {
  userRole: 'admin' | 'employee';
}

export const ReportsAnalytics = ({ userRole }: ReportsAnalyticsProps) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // State for all API data
  const [leadPerformanceData, setLeadPerformanceData] = useState<LeadPerformance[]>([]);
  const [employeePerformanceData, setEmployeePerformanceData] = useState<EmployeePerformance[]>([]);
  const [taskAnalytics, setTaskAnalytics] = useState<TaskAnalytics[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<LeadSource[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  
  // State for Leads tab API data
  const [leadFunnel, setLeadFunnel] = useState<LeadFunnel | null>(null);
  const [leadQuality, setLeadQuality] = useState<LeadQuality[]>([]);
  const [missedLeads, setMissedLeads] = useState<MissedLead[]>([]);
  
  // Loading states
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  
  // Error states
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Load Overview data
  useEffect(() => {
    setOverviewLoading(true);
    Promise.all([
      analyticsApi.getLeadPerformance(),
      analyticsApi.getLeadSources(),
      analyticsApi.getDashboardSummary()
    ])
      .then(([performance, sources, summary]) => {
        setLeadPerformanceData(performance);
        setLeadSourceData(sources);
        setDashboardSummary(summary);
        setOverviewLoading(false);
      })
      .catch((err) => {
        setOverviewError("Failed to load overview data");
        setOverviewLoading(false);
      });
  }, []);

  // Load Employee Performance data
  useEffect(() => {
    if (userRole === 'admin') {
      setEmployeesLoading(true);
      analyticsApi.getEmployeePerformance()
        .then((data) => {
          setEmployeePerformanceData(data);
          setEmployeesLoading(false);
        })
        .catch((err) => {
          setEmployeesError("Failed to load employee data");
          setEmployeesLoading(false);
        });
    }
  }, [userRole]);

  // Load Task Analytics data
  useEffect(() => {
    setTasksLoading(true);
    analyticsApi.getTaskAnalytics()
      .then((data) => {
        setTaskAnalytics(data);
        setTasksLoading(false);
      })
      .catch((err) => {
        setTasksError("Failed to load task data");
        setTasksLoading(false);
      });
  }, []);

  // Load Leads data
  useEffect(() => {
    setLeadsLoading(true);
    Promise.all([
      analyticsApi.getLeadFunnel(),
      analyticsApi.getLeadQuality(),
      analyticsApi.getMissedLeads()
    ])
      .then(([funnel, quality, missed]) => {
        setLeadFunnel(funnel);
        setLeadQuality(quality);
        setMissedLeads(missed);
        setLeadsLoading(false);
      })
      .catch((err) => {
        setLeadsError("Failed to load analytics data");
        setLeadsLoading(false);
      });
  }, []);

  /**
   * Handles the export of the report to either PDF or Excel format.
   * @param format - The desired export format ('excel' or 'pdf').
   */
  const handleExportReport = (format: 'excel' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });

    try {
      if (format === 'pdf') {
        exportToPdf();
      } else {
        exportToExcel();
      }
      toast({
        title: "Report Ready",
        description: `${format.toUpperCase()} report has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: `Could not generate the ${format.toUpperCase()} report.`,
        variant: "destructive",
      });
    }
  };

  /**
   * Exports the analytics data to an Excel file with multiple sheets.
   */
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Lead Performance
    const leadPerformanceSheet = XLSX.utils.json_to_sheet(leadPerformanceData);
    XLSX.utils.book_append_sheet(wb, leadPerformanceSheet, "Lead Performance");

    // Sheet 2: Employee Performance
    if (userRole === 'admin' && employeePerformanceData.length > 0) {
      const employeeSheetData = employeePerformanceData.map(e => ({
        ...e,
        'Conversion Rate': e.leads > 0 ? ((e.conversions / e.leads) * 100).toFixed(1) + '%' : '0.0%'
      }));
      const employeeSheet = XLSX.utils.json_to_sheet(employeeSheetData);
      XLSX.utils.book_append_sheet(wb, employeeSheet, "Employee Performance");
    }

    // Sheet 3: Task Analytics
    const taskSheetData = taskAnalytics.map(t => {
        const total = t.completed + t.pending + t.overdue;
        return {
            ...t,
            'Completion Rate': total > 0 ? ((t.completed / total) * 100).toFixed(1) + '%' : '0.0%'
        }
    });
    const taskSheet = XLSX.utils.json_to_sheet(taskSheetData);
    XLSX.utils.book_append_sheet(wb, taskSheet, "Task Analytics");
    
    // Sheet 4: Lead Sources
    const leadSourceSheet = XLSX.utils.json_to_sheet(leadSourceData);
    XLSX.utils.book_append_sheet(wb, leadSourceSheet, "Lead Sources");

    // Sheet 5: Missed Leads
    const missedLeadsSheet = XLSX.utils.json_to_sheet(missedLeads);
    XLSX.utils.book_append_sheet(wb, missedLeadsSheet, "Missed Leads");

    XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /**
   * Exports the analytics data to a PDF document.
   */
  const exportToPdf = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 15; // Initial y position

    doc.setFontSize(18);
    doc.text("Analytics & Reports", 14, y);
    y += 10;

    // Helper function to add a new page if content overflows
    const checkAndAddPage = (requiredHeight: number) => {
        if (y + requiredHeight > pageHeight - 10) { // 10 as a margin
            doc.addPage();
            y = 15;
        }
    }

    // Section: Lead Performance
    checkAndAddPage(40);
    doc.setFontSize(14);
    doc.text("Lead Performance Trend", 14, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Month', 'Total Leads', 'Conversions']],
      body: leadPerformanceData.map(item => [item.month, item.leads, item.conversions]),
    });
    y = doc.autoTable.previous.finalY + 10;

    // Section: Employee Performance
    if (userRole === 'admin' && employeePerformanceData.length > 0) {
        checkAndAddPage(40);
        doc.setFontSize(14);
        doc.text("Employee Performance", 14, y);
        y += 5;
        autoTable(doc, {
            startY: y,
            head: [['Employee', 'Tasks Completed', 'Leads Handled', 'Conversions', 'Conversion Rate']],
            body: employeePerformanceData.map(emp => [
                emp.name, 
                emp.tasks, 
                emp.leads, 
                emp.conversions, 
                `${emp.leads > 0 ? ((emp.conversions / emp.leads) * 100).toFixed(1) : '0.0'}%`
            ]),
        });
        y = doc.autoTable.previous.finalY + 10;
    }

    // Section: Task Analytics
    checkAndAddPage(40);
    doc.setFontSize(14);
    doc.text("Task Analytics", 14, y);
    y += 5;
    autoTable(doc, {
        startY: y,
        head: [['Task Type', 'Completed', 'Pending', 'Overdue', 'Completion Rate']],
        body: taskAnalytics.map(task => {
            const total = task.completed + task.pending + task.overdue;
            const completionRate = total > 0 ? ((task.completed / total) * 100).toFixed(1) : '0.0';
            return [task.type, task.completed, task.pending, task.overdue, `${completionRate}%`];
        }),
    });
    y = doc.autoTable.previous.finalY + 10;

    // Section: Missed Leads
    checkAndAddPage(40);
    doc.setFontSize(14);
    doc.text("Missed Leads & Opportunities", 14, y);
    y += 5;
    autoTable(doc, {
        startY: y,
        head: [['Lead Name', 'Source', 'Days Since Last Contact', 'Assigned To', 'Action Required']],
        body: missedLeads.map(lead => [lead.name, lead.source, `${lead.daysSinceLastContact} days`, lead.assignedTo, lead.actionRequired]),
    });

    doc.save(`Analytics_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const conversionRate = leadPerformanceData.length > 0 
    ? ((leadPerformanceData.reduce((sum, item) => sum + item.conversions, 0) / 
        leadPerformanceData.reduce((sum, item) => sum + item.leads, 0)) * 100).toFixed(1)
    : "0.0";

  const totalLeads = leadPerformanceData.reduce((sum, item) => sum + item.leads, 0);
  const totalConversions = leadPerformanceData.reduce((sum, item) => sum + item.conversions, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Reports & Analytics</span>
              </CardTitle>
              <CardDescription>Comprehensive insights and performance metrics</CardDescription>
            </div>
            
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              {conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
          <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
          <TabsTrigger value="leads">Lead Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {overviewLoading && <div>Loading overview data...</div>}
          {overviewError && <div className="text-red-500">{overviewError}</div>}
          {!overviewLoading && !overviewError && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Performance Trend</CardTitle>
                  <CardDescription>Monthly leads and conversions overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={leadPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Total Leads" />
                        <Line type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} name="Conversions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lead Sources</CardTitle>
                  <CardDescription>Distribution of lead sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadSourceData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {leadSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {userRole === 'admin' ? (
            <>
              {employeesLoading && <div>Loading employee data...</div>}
              {employeesError && <div className="text-red-500">{employeesError}</div>}
              {!employeesLoading && !employeesError && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Employee Performance Metrics</CardTitle>
                      <CardDescription>Individual performance breakdown for team members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Tasks Completed</TableHead>
                              <TableHead>Leads Handled</TableHead>
                              <TableHead>Conversions</TableHead>
                              <TableHead>Conversion Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employeePerformanceData.map((employee) => (
                              <TableRow key={employee.name}>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.tasks}</TableCell>
                                <TableCell>{employee.leads}</TableCell>
                                <TableCell>{employee.conversions}</TableCell>
                                <TableCell>
                                  <Badge variant={employee.score >= 90 ? 'default' : employee.score >= 80 ? 'secondary' : 'destructive'}>
                                    {employee.score}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Employee Performance Comparison</CardTitle>
                      <CardDescription>Visual comparison of team member performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={employeePerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="conversions" fill="#3B82F6" name="Conversions" />
                            <Bar dataKey="tasks" fill="#10B981" name="Tasks Completed" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription>
                  Employee performance reports are only available to administrators.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {tasksLoading && <div>Loading task data...</div>}
          {tasksError && <div className="text-red-500">{tasksError}</div>}
          {!tasksLoading && !tasksError && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Task Analytics</CardTitle>
                  <CardDescription>Breakdown of task completion by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task Type</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Overdue</TableHead>
                          <TableHead>Completion Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taskAnalytics.map((task) => {
                          const total = task.completed + task.pending + task.overdue;
                          const completionRate = total > 0 ? ((task.completed / total) * 100).toFixed(1) : '0.0';
                          
                          return (
                            <TableRow key={task.type}>
                              <TableCell className="font-medium">{task.type}</TableCell>
                              <TableCell>
                                <Badge variant="default">{task.completed}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{task.pending}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{task.overdue}</Badge>
                              </TableCell>
                              <TableCell>{completionRate}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Trends</CardTitle>
                  <CardDescription>Visual representation of task completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completed" fill="#10B981" name="Completed" />
                        <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                        <Bar dataKey="overdue" fill="#EF4444" name="Overdue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          {leadsLoading && <div>Loading analytics...</div>}
          {leadsError && <div className="text-red-500">{leadsError}</div>}
          {!leadsLoading && !leadsError && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Conversion Funnel</CardTitle>
                    <CardDescription>Journey of leads through the conversion process</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <span>New Leads</span>
                        <Badge>{leadFunnel?.new ?? "-"}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                        <span>Follow-up Stage</span>
                        <Badge>{leadFunnel?.followUp ?? "-"}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                        <span>Proposal Sent</span>
                        <Badge>{leadFunnel?.proposalSent ?? "-"}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <span>Enrolled</span>
                        <Badge>{leadFunnel?.enrolled ?? "-"}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                        <span>Not Interested</span>
                        <Badge>{leadFunnel?.notInterested ?? "-"}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lead Quality Score</CardTitle>
                    <CardDescription>Average quality score by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leadQuality.map((source) => (
                        <div key={source.source} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{source.source}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${source.score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{source.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Missed Leads & Opportunities</CardTitle>
                  <CardDescription>Leads that need immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Name</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Days Since Last Contact</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Action Required</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {missedLeads.map((lead, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>{lead.source}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{lead.daysSinceLastContact} days</Badge>
                            </TableCell>
                            <TableCell>{lead.assignedTo}</TableCell>
                            <TableCell>{lead.actionRequired}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};