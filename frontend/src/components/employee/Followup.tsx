import React from 'react';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle, CheckCircle, User, Phone, Mail } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { followupApi } from "@/lib/followup.api";
import { useToast } from "@/hooks/use-toast";

interface FollowUp {
  id: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  assignedTo: { _id: string; name: string } | string;
  scheduledDate: string;
  scheduledTime: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  notes: string;
  course: string;
}

interface FollowUpStats {
  todaysFollowUps: number;
  overdueFollowUps: number;
  thisWeekFollowUps: number;
  completionRate: number;
}

export const FollowUpScheduler = () => {
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<FollowUpStats>({
    todaysFollowUps: 0,
    overdueFollowUps: 0,
    thisWeekFollowUps: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [followUpToDelete, setFollowUpToDelete] = useState<FollowUp | null>(null);
   const [selectedFollowUpDetail, setSelectedFollowUpDetail] = useState<FollowUp | null>(null);
   const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    const fetchFollowUpsAndStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch follow-ups (backend automatically filters for employee role)
        const result = await followupApi.getFollowups();
        if (Array.isArray(result)) {
          setFollowUps(result);
        } else {
          console.warn('followupApi.getFollowUps did not return an array:', result);
          setFollowUps([]);
        }

        // Fetch statistics (backend automatically filters for employee role)
        const statsResult = await followupApi.getFollowUpStats();
        setStats(statsResult);

      } catch (error: any) {
        console.error('Error fetching follow-ups:', error);
        toast({
          title: "Error",
          description: "Failed to fetch follow-ups",
          variant: "destructive",
        });
        setFollowUps([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowUpsAndStats();
  }, [toast]);

  const handleStatusChange = async (followUpId: string, newStatus: FollowUp['status']) => {
    try {
      setIsLoading(true);
      const updatedFollowUp = await followupApi.updateFollowUpStatus(followUpId, newStatus);
      
      // Update local state
      setFollowUps(prev => prev.map(fu => 
        fu.id === followUpId ? updatedFollowUp : fu
      ));

      // Refresh stats after status change
      const updatedStats = await followupApi.getFollowUpStats();
      setStats(updatedStats);

      toast({
        title: "Success",
        description: "Follow-up status updated successfully",
      });

    } catch (error: any) {
      console.error('Error updating follow-up status:', error);
      toast({
        title: "Error",
        description: "Failed to update follow-up status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    try {
      setIsLoading(true);
      await followupApi.deleteFollowUp(followUpId);

      // Update local state
      setFollowUps((prev) => prev.filter((fu) => fu.id !== followUpId));

      toast({
        title: "Success",
        description: "Follow-up deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting follow-up:", error);
      toast({
        title: "Error",
        description: "Failed to delete follow-up",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

 const handleViewDetail = (followUp: FollowUp) => {
    setSelectedFollowUpDetail(followUp);
    setIsDetailDialogOpen(true);
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
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return '💬';
      case 'meeting': return '🤝';
      default: return '📋';
    }
  };

  const filteredFollowUps = (followUps || []).filter(followUp => {
    const statusMatch = statusFilter === 'all' || followUp.status === statusFilter;
    
    if (viewMode === 'calendar') {
      return statusMatch && followUp.scheduledDate === selectedDate;
    }
    return statusMatch;
  });

  return (
    <div className="space-y-6 p-2 sm:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Follow-ups</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.todaysFollowUps}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.overdueFollowUps}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">This Week</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.thisWeekFollowUps}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled follow-ups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <User className="h-5 w-5" />
                <span>My Follow-ups</span>
              </CardTitle>
              <CardDescription className="text-sm">View and manage your assigned follow-ups</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={viewMode} onValueChange={(value: 'calendar' | 'list') => setViewMode(value)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="calendar">Calendar View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {viewMode === 'calendar' && (
            <div className="mb-4">
              <Label htmlFor="dateSelect">Select Date</Label>
              <Input
                id="dateSelect"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-48 mt-1"
              />
            </div>
          )}

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading follow-ups...
              </div>
            ) : filteredFollowUps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {viewMode === 'calendar' 
                  ? `No follow-ups scheduled for ${selectedDate}`
                  : statusFilter === 'all' 
                    ? 'No follow-ups assigned to you'
                    : `No ${statusFilter} follow-ups found`
                }
              </div>
            ) : (
              filteredFollowUps.map((followUp) => (
                <div key={followUp.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg hover:bg-gray-50 space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                        {getTypeIcon(followUp.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-base sm:text-lg truncate">{followUp.leadName}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{followUp.leadPhone}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{followUp.leadEmail}</span>
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 text-sm text-gray-600 mt-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">{followUp.course}</Badge>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-xs sm:text-sm">{followUp.scheduledDate} at {followUp.scheduledTime}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="capitalize text-xs sm:text-sm">{followUp.type}</span>
                            {followUp.assignedTo && typeof followUp.assignedTo === 'object' && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center space-x-1 text-xs sm:text-sm">
                                  <User className="h-3 w-3" />
                                  <span>{followUp.assignedTo.name}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {followUp.notes && (
                          <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                            <strong>Notes:</strong> 
                            <span className="block sm:inline sm:ml-1 break-words">{followUp.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:flex-shrink-0">
                    <Badge className={`${getPriorityColor(followUp.priority)} text-center`}>
                      {followUp.priority}
                    </Badge>
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
                      onValueChange={(value: FollowUp['status']) => handleStatusChange(followUp.id, value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>

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
                                        {selectedFollowUpDetail.leadName}
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
                    
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setFollowUpToDelete(followUp);
                            setDeleteDialogOpen(true);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Delete
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="mx-2 max-w-[calc(100vw-16px)] sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Confirm Deletion</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm">Are you sure you want to delete this follow-up?</p>
                        <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0">
                          <Button 
                            variant="outline" 
                            onClick={() => setDeleteDialogOpen(false)}
                            className="w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => followUpToDelete && handleDeleteFollowUp(followUpToDelete.id)}
                            className="w-full sm:w-auto"
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
