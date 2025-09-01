import { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, addTask, updateTaskStatus, deleteTask } from '@/store/taskSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckSquare, Clock, AlertTriangle, Calendar, MoreVertical } from "lucide-react";
import { toast } from 'react-toastify';
import { TaskService } from '@/lib/task.api';
import api from "@/lib/api";

interface Comment {
  text: string;
  timestamp?: string;
  user?: string;
}

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
  comments: (string | Comment)[];
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
  assignedToEmployeeName?: string;
}

export const TaskManagement = ({ userRole, assignedToEmployeeName }: TaskManagementProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [employees, setEmployees] = useState<Employee[]>([]);

  const dispatch = useDispatch();

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: [] as string[],
    priority: "medium" as Task['priority'],
    dueDate: "",
    type: ""
  });

  const taskTypes = ["Follow-up", "Course Preparation", "Administration", "Marketing", "Technical"];

  // Function to refresh tasks data
  const fetchTasksData = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;
      if (userRole === 'employee' && assignedToEmployeeName) params.assignedTo = assignedToEmployeeName;

      const response = await TaskService.getTasks(params);
      setTasks(response.data);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error(error.response?.data?.message || "Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tasks and employees on component mount
  useEffect(() => {
    fetchTasksData();

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
      await fetchTasksData(); // Refresh the task list
      
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
        await api.put(`/tasks/${taskId}/status`, { status: newStatus });
        await fetchTasksData(); // Refresh tasks after status update
        toast.success("Task status updated successfully");
    } catch (error: any) {
        console.error('Status update error:', error);
        toast.error(error.response?.data?.message || "Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.delete(`/tasks/${taskId}`);
      await fetchTasksData(); // Refresh tasks after deletion
      toast.success("Task deleted successfully");
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

  // Filter tasks for the current employee only if userRole is 'employee'
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleEmployeeToggle = (employeeName: string, isChecked: boolean) => {
    if (isChecked) {
      setNewTask({ ...newTask, assignedTo: [...newTask.assignedTo, employeeName] });
    } else {
      setNewTask({ ...newTask, assignedTo: newTask.assignedTo.filter(name => name !== employeeName) });
    }
  };

  // Handle adding comment - FIXED VERSION
  const handleAddComment = async (taskId: string, text: string) => {
    if (!text.trim()) return;

    try {
      // Call the backend API to add comment
      await TaskService.addComment(taskId, text);

      // Refresh the tasks data to get updated comments from backend
      await fetchTasksData();

      // Update selectedTask if it's the current task being viewed
      if (selectedTask && selectedTask.id === taskId) {
        const updatedTask = tasks.find(task => task.id === taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }

      toast.success("Comment added successfully");
    } catch (error: any) {
      console.error('Add comment error:', error);
      toast.error(error.response?.data?.message || "Failed to add comment");
    }
  };

  // Update selected task when tasks change
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find(task => task.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks, selectedTask?.id]);

  // Normalize comments to ensure they have proper structure
  const normalizeComment = (comment: string | Comment): Comment => {
    if (typeof comment === 'string') {
      // Check if string has datetime format (MM/DD/YYYY, HH:MM:SS AM/PM - User: text)
      const datetimeRegex = /^(\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}:\d{2}\s(?:AM|PM)) - (.+?): (.+)$/;
      const datetimeMatch = comment.match(datetimeRegex);
      
      if (datetimeMatch) {
        return {
          text: datetimeMatch[3],
          timestamp: datetimeMatch,
          user: datetimeMatch
        };
      }
      
      // Check if string has old date-only format (MM/DD/YYYY - User: text)
      const dateOnlyRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}) - (.+?): (.+)$/;
      const dateMatch = comment.match(dateOnlyRegex);
      
      if (dateMatch) {
        return {
          text: dateMatch[3],
          timestamp: dateMatch,
          user: dateMatch
        };
      } else {
        // Old comment without timestamp
        return {
          text: comment,
          timestamp: undefined,
          user: undefined
        };
      }
    }
    return comment;
  };

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <CheckSquare className="h-5 w-5" />
                <span>Task Management</span>
              </CardTitle>
              <CardDescription className="text-sm">Create, assign, and track tasks for your team</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-2 max-w-[calc(100vw-16px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
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
                <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddTask} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col space-y-4 mb-6">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border">
            <Table>
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
  {filteredTasks.length === 0 ? (
    <TableRow>
      <TableCell colSpan={6} className="text-center py-10 text-xl text-gray-500">
        There is no task at this time ⌚.
      </TableCell>
    </TableRow>
  ) : (
    filteredTasks.map((task) => (
      <TableRow key={task.id}>
        <TableCell>
          <div>
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
        <TableCell>
          <div className="space-y-1">
            {task.assignedTo.map((employee, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {employee}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
        </TableCell>
        <TableCell>
          <Select
            value={task.status}
            onValueChange={(value: Task['status']) => handleStatusChange(task.id, value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span
              className={`text-sm ${
                isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''
              }`}
            >
              {task.dueDate}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTask(task)}
            >
              View Details
            </Button>
            {userRole === 'admin' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))
  )}
</TableBody>

            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center space-x-2">
                          <span className="truncate">{task.title}</span>
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{task.type}</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 line-clamp-2">{task.description}</div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.assignedTo.slice(0, 2).map((employee, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {employee}
                        </Badge>
                      ))}
                      {task.assignedTo.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{task.assignedTo.length - 2} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''}`}>
                          {task.dueDate}
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        <Select 
                          value={task.status} 
                          onValueChange={(value: Task['status']) => handleStatusChange(task.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      {userRole === 'admin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="mx-2 max-w-[calc(100vw-16px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View and manage task information and comments.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="ml-4 flex flex-wrap gap-1">
                      {selectedTask.assignedTo.map((employee, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
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
                    selectedTask.comments.map((commentData, index) => {
                      const comment = normalizeComment(commentData);
                      return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                          <div className="text-sm font-medium text-gray-900 mb-1 break-words">
                            {comment.text}
                          </div>
                          {comment.timestamp && (
                            <div className="flex items-center text-xs text-gray-500 flex-wrap">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{comment.timestamp}</span>
                              {comment.user && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>{comment.user}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500 italic">No comments yet</p>
                  )}
                </div>
                <div className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
                  <Button
                    onClick={async () => {
                      const input = document.querySelector('input[placeholder="Add a comment..."]') as HTMLInputElement;
                      const text = input?.value.trim();
                      if (text && selectedTask) {
                        await handleAddComment(selectedTask.id, text);
                        input.value = '';
                      }
                    }}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};
