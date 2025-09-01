import { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, addTask, updateTaskStatus, deleteTask, addComment } from '@/store/taskSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckSquare, Clock, AlertTriangle, Calendar } from "lucide-react";
import { toast } from 'react-toastify';
import { TaskService } from '@/lib/task.api';
import api from "@/lib/api";

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  createdDate: string;
  type: string;
  comments: string[];
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

interface TaskManagementProps {
  userRole: 'admin' | 'employee';
}

export const TaskManagement = ({ userRole }: TaskManagementProps) => {
  const dispatch = useDispatch();
  const { list: tasks, status } = useSelector((state: any) => state.tasks);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Add these new state variables for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: [] as string[],
    priority: "medium" as Task['priority'],
    dueDate: "",
    type: ""
  });

  const taskTypes = ["Follow-up", "Course Preparation", "Administration", "Marketing", "Technical"];

  // Mobile responsive styles
  const mobileStyles = `
    .task-table-responsive {
      width: 100%;
      border-collapse: collapse;
    }
    
    .task-table-responsive th,
    .task-table-responsive td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .task-table-responsive th {
      background-color: #f8fafc;
      font-weight: 600;
      font-size: 14px;
    }
    
    @media (max-width: 768px) {
      .mobile-card-view .task-table-responsive,
      .mobile-card-view .task-table-responsive thead,
      .mobile-card-view .task-table-responsive tbody,
      .mobile-card-view .task-table-responsive th,
      .mobile-card-view .task-table-responsive td,
      .mobile-card-view .task-table-responsive tr {
        display: block;
      }
      
      .mobile-card-view .task-table-responsive thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
      }
      
      .mobile-card-view .task-table-responsive tr {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 16px;
        padding: 16px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .mobile-card-view .task-table-responsive td {
        border: none;
        border-bottom: 1px solid #f1f5f9;
        position: relative;
        padding: 8px 0;
        padding-left: 45%;
        margin-bottom: 8px;
        font-size: 15px;
      }
      
      .mobile-card-view .task-table-responsive td:before {
        content: attr(data-label) ": ";
        position: absolute;
        left: 0;
        width: 40%;
        padding-right: 10px;
        white-space: nowrap;
        font-weight: 600;
        color: #64748b;
        font-size: 12px;
      }
      
      .mobile-card-view .task-table-responsive td:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .mobile-actions {
        display: flex;
        flex-wrap: wrap;
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
      
      .task-info-stack {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .assigned-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    }
    
    @media (max-width: 480px) {
      .task-table-responsive td {
        padding-left: 50%;
        font-size: 14px;
      }
      
      .task-table-responsive td:before {
        width: 45%;
        font-size: 11px;
      }
    }
  `;

  // Fetch tasks and employees on component mount
  useEffect(() => {
    dispatch(fetchTasks({ status: statusFilter, priority: priorityFilter, searchTerm }));
    const fetchEmployees = async () => {
      try {
        const response = await TaskService.getUsers();
        setEmployees(response.data);
      } catch (error) {
        toast.error("Failed to fetch employees");
      }
    };
    fetchEmployees();
  }, [dispatch, statusFilter, priorityFilter, searchTerm]);

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.description || !newTask.dueDate || newTask.assignedTo.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const taskData = {
        ...newTask,
        assignedTo: employees
          .filter(emp => newTask.assignedTo.includes(emp.name))
          .map(emp => emp._id)
      };
      
      await dispatch(addTask(taskData));
      await dispatch(fetchTasks({})); // Refresh the task list
      
      // Send WhatsApp notifications to assigned employees
      const assignedEmployees = employees.filter(emp => newTask.assignedTo.includes(emp.name));
      
      if (assignedEmployees.length > 0) {
        try {
          // Prepare to_and_components for all assigned employees
          const toAndComponents = assignedEmployees
            .filter(emp => emp.phone && emp.phone !== 'Unknown') // Only employees with valid phone numbers
            .map(emp => ({
              to: [emp.phone],
              components: {}
            }));

          if (toAndComponents.length > 0) {
            // Prepare message payload
            const messagePayload = {
              integrated_number: import.meta.env.VITE_MSG91_WHATSAPP_NUMBER || "918699099836",
              content_type: "template",
              payload: {
                type: "template",
                template: {
                  name: "task_assign_message",
                  language: {
                    code: "en",
                    policy: "deterministic"
                  },
                  to_and_components: toAndComponents
                },
                messaging_product: "whatsapp"
              }
            };

            // Send WhatsApp notifications using api.post to handle CORS
            const response = await api.post('/whatsapp/send-bulk', messagePayload, {
              headers: {
                authkey: import.meta.env.VITE_AUTH_KEY
              }
            });

            console.log(`WhatsApp notifications sent successfully to ${toAndComponents.length} employees`);
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp notifications:', whatsappError);
          // Don't throw here to avoid breaking the task creation process
        }
      }
      
      setNewTask({
        title: "",
        description: "",
        assignedTo: [],
        priority: "medium",
        dueDate: "",
        type: ""
      });
      setIsAddDialogOpen(false);
      toast.success("Task created successfully");
    } catch (error: any) {
      console.error('Task creation error:', error);
      toast.error(error.response?.data?.message || "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
        await TaskService.updateTaskStatus(taskId, newStatus);
        // Refresh tasks after status update
        dispatch(fetchTasks({ status: statusFilter, priority: priorityFilter, searchTerm }));
        toast.success("Task status updated successfully");
    } catch (error: any) {
        console.error('Status update error:', error);
        toast.error(error.response?.data?.message || "Failed to update task status");
    }
  };

  // Updated delete handler with immediate refresh
  const handleDeleteTask = async (taskId: string) => {
    try {
      await dispatch(deleteTask(taskId));
      // Refresh tasks after deletion to update UI immediately
      dispatch(fetchTasks({ status: statusFilter, priority: priorityFilter, searchTerm }));
      toast.success("Task deleted successfully");
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string, status: Task['status']) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && status !== 'completed';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesAssignedTo = assignedToFilter === "all" || task.assignedTo.includes(assignedToFilter);
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignedTo;
  });

  const handleEmployeeToggle = (employeeName: string, isChecked: boolean) => {
    if (isChecked) {
      setNewTask({ ...newTask, assignedTo: [...newTask.assignedTo, employeeName] });
    } else {
      setNewTask({ ...newTask, assignedTo: newTask.assignedTo.filter(name => name !== employeeName) });
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    if (!text.trim()) return;

    try {
      await dispatch(addComment({ taskId, text }));

      // Format date & time
      const timestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      // Update local state for immediate UI feedback
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prevTask => ({
          ...prevTask!,
          comments: [
            ...prevTask!.comments,
            `${timestamp} - You: ${text}`
          ]
        }));
      }

      toast.success("Comment added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
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
                <CheckSquare className="h-5 w-5" />
                <span>Task Management</span>
              </CardTitle>
              <CardDescription>Create, assign, and track tasks for your team</CardDescription>
            </div>
            {userRole === 'admin' && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Task</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                      Create and assign a new task to team members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Enter task title"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Enter task description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="type">Task Type</Label>
                        <Select onValueChange={(value) => setNewTask({ ...newTask, type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select task type" />
                          </SelectTrigger>
                          <SelectContent>
                            {taskTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={newTask.priority} onValueChange={(value: Task['priority']) => setNewTask({ ...newTask, priority: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Assign To (Select multiple)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {employees.map(employee => (
                          <label key={employee._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newTask.assignedTo.includes(employee.name)}
                              onChange={(e) => handleEmployeeToggle(employee.name, e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-sm">{employee.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTask} disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {employees.map(employee => (
                  <SelectItem key={employee._id} value={employee.name}>{employee.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mobile-card-view">
            <div className="rounded-md border overflow-hidden">
              <Table className="task-table-responsive">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell data-label="Task">
                        <div className="task-info-stack">
                          <div className="font-medium flex items-center space-x-2">
                            <span>{task.title}</span>
                            {isOverdue(task.dueDate, task.status) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{task.type}</div>
                          <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                        </div>
                      </TableCell>
                      <TableCell data-label="Assigned To">
                        <div className="assigned-badges">
                          {task.assignedTo.map(employee => (
                            <Badge key={employee} variant="outline" className="text-xs">
                              {employee}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell data-label="Priority">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell data-label="Status">
                        <Select 
                          value={task.status} 
                          onValueChange={(value: Task['status']) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className="mobile-select w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell data-label="Due Date">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''}`}>
                            {task.dueDate}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Actions">
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTask(task)}
                            className="btn-mobile"
                          >
                            View Details
                          </Button>
                          {userRole === 'admin' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setTaskToDelete(task.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="btn-mobile"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View and manage task information and comments.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Task Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {selectedTask.title}</div>
                    <div><strong>Type:</strong> {selectedTask.type}</div>
                    <div><strong>Priority:</strong> <Badge className={getPriorityColor(selectedTask.priority)}>{selectedTask.priority}</Badge></div>
                    <div><strong>Status:</strong> <Badge className={getStatusColor(selectedTask.status)}>{selectedTask.status}</Badge></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Created:</strong> {selectedTask.createdDate}</div>
                    <div><strong>Due Date:</strong> {selectedTask.dueDate}</div>
                    <div><strong>Assigned To:</strong></div>
                    <div className="ml-4">
                      {selectedTask.assignedTo.map(employee => (
                        <Badge key={employee} variant="outline" className="mr-1 mb-1">
                          {employee}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedTask.description}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Comments</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        {comment}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No comments yet</p>
                  )}
                </div>
                <div className="mt-3 flex space-x-2">
                  <Input
                    placeholder="Add a comment..."
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && selectedTask) {
                        const input = e.currentTarget;
                        const text = input.value.trim();
                        if (text) {
                          await handleAddComment(selectedTask.id, text);
                          input.value = '';
                        }
                      }
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setTaskToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => taskToDelete && handleDeleteTask(taskToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {status === 'loading' && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};
