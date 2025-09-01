const FollowUp = require('../models/followup.model');
const User = require('../models/user.model');

const formatFollowUpResponse = (followUp) => {
  return {
    id: followUp._id,
    leadName: followUp.leadName,
    leadPhone: followUp.leadPhone,
    leadEmail: followUp.leadEmail,
    assignedTo: followUp.assignedTo && typeof followUp.assignedTo === 'object'
      ? { _id: followUp.assignedTo._id, name: followUp.assignedTo?.name || 'N/A' }
      : null,
    scheduledDate: followUp.scheduledDate?.toISOString().split('T')[0] || null,
    scheduledTime: followUp.scheduledTime,
    type: followUp.type,
    priority: followUp.priority,
    notes: followUp.notes,
    course: followUp.course,
    status: followUp.status,
    createdBy: followUp.createdBy && typeof followUp.createdBy === 'object'
      ? { _id: followUp.createdBy._id, name: followUp.createdBy?.name || 'N/A' }
      : null,
    createdAt: followUp.createdAt,
    updatedAt: followUp.updatedAt,
  };
};



// Create a new follow-up
exports.createFollowUp = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can create follow-ups' });
    }
    try {
        const {
            leadName,
            leadPhone,
            leadEmail,
            assignedTo,
            scheduledDate,
            scheduledTime,
            type,
            priority,
            notes,
            course
        } = req.body;

        // Verify the assigned employee exists
        const employee = await User.findById(assignedTo);
        if (!employee || employee.role !== 'employee') {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const followUp = new FollowUp({
            leadName,
            leadPhone,
            leadEmail,
            assignedTo,
            scheduledDate,
            scheduledTime,
            type,
            priority,
            notes,
            course,
            createdBy: req.user._id
        });

        await followUp.save();
        await followUp.populate('assignedTo', 'name');

        res.status(201).json({
            message: 'Follow-up scheduled successfully',
            followUp: formatFollowUpResponse(followUp)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all follow-ups with filters
exports.getFollowUps = async (req, res) => {
    try {
        const { status, date, assignedTo } = req.query;
        const query = {};

        // Apply filters
        if (status && status !== 'all') {
            query.status = { $ne: 'completed' };
        }
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.scheduledDate = { $gte: startDate, $lt: endDate };
        }
        if (assignedTo) query.assignedTo = assignedTo;

        // If employee, only show assigned follow-ups
        if (req.user.role === 'employee') {
            query.assignedTo = req.user._id;
        }

        const followUps = await FollowUp.find(query)
            .populate('assignedTo', 'name')
            .populate('createdBy', 'name')
            .sort({ scheduledDate: 1, scheduledTime: 1 });

        res.json(followUps.map(followUp => formatFollowUpResponse(followUp)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get follow-ups by employee ID
exports.getFollowUpsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Ensure the requesting user is either an admin or the employee themselves
        if (req.user.role !== 'admin' && req.user._id.toString() !== employeeId) {
            return res.status(403).json({ message: 'Not authorized to view these follow-ups' });
        }

        const followUps = await FollowUp.find({ assignedTo: employeeId })
            .populate('assignedTo', 'name')
            .populate('createdBy', 'name')
            .sort({ scheduledDate: 1, scheduledTime: 1 });

        res.json(followUps.map(followUp => formatFollowUpResponse(followUp)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get follow-up by ID
exports.getFollowUpById = async (req, res) => {
    try {
        const followUp = await FollowUp.findById(req.params.id)
            .populate('assignedTo', 'name')
            .populate('createdBy', 'name');

        if (!followUp) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }

        res.json(formatFollowUpResponse(followUp));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update follow-up status
exports.updateFollowUpStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['scheduled', 'completed', 'missed', 'rescheduled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const followUp = await FollowUp.findById(id);
        if (!followUp) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }

        // Check if user has permission (admin or assigned employee)
        if (req.user.role !== 'admin' && followUp.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this follow-up' });
        }

        followUp.status = status;
        await followUp.save();

        const updatedFollowUp = await FollowUp.findById(id)
            .populate('assignedTo', 'name')
            .populate('createdBy', 'name');

        res.json({
            message: 'Status updated successfully',
            followUp: formatFollowUpResponse(updatedFollowUp)
        });
    } catch (error) {
        console.error('Error updating follow-up status:', error);
        res.status(500).json({ message: 'Failed to update follow-up status' });
    }
};

// Update follow-up (reschedule)
exports.updateFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const followUp = await FollowUp.findById(id);
        if (!followUp) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }

        // Check if user has permission
        if (req.user.role !== 'admin' && followUp.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this follow-up' });
        }

        // Update allowed fields
        const allowedFields = ['scheduledDate', 'scheduledTime', 'type', 'priority', 'notes', 'status'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                followUp[field] = updateData[field];
            }
        });

        await followUp.save();

        const updatedFollowUp = await FollowUp.findById(id)
            .populate('assignedTo', 'name')
            .populate('createdBy', 'name');

        res.json({
            message: 'Follow-up updated successfully',
            followUp: formatFollowUpResponse(updatedFollowUp)
        });
    } catch (error) {
        console.error('Error updating follow-up:', error);
        res.status(500).json({ message: 'Failed to update follow-up' });
    }
};

// Delete follow-up
exports.deleteFollowUp = async (req, res) => {
    try {
        const { id } = req.params;

        const followUp = await FollowUp.findById(id);
        if (!followUp) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }

        // Check if user has permission
        if (req.user.role !== 'admin' && followUp.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this follow-up' });
        }

        await FollowUp.findByIdAndDelete(id);

        res.json({ message: 'Follow-up deleted successfully' });
    } catch (error) {
        console.error('Error deleting follow-up:', error);
        res.status(500).json({ message: 'Failed to delete follow-up' });
    }
};

// Get follow-up statistics
exports.getFollowUpStats = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        // Build query based on user role
        const query = {};
        if (req.user.role === 'employee') {
            query.assignedTo = req.user._id;
        }

        // Today's follow-ups
        const todaysFollowUps = await FollowUp.countDocuments({
            ...query,
            scheduledDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        // Overdue follow-ups
        const overdueFollowUps = await FollowUp.countDocuments({
            ...query,
            scheduledDate: { $lt: today },
            status: 'scheduled'
        });

        // This week's follow-ups
        const thisWeekFollowUps = await FollowUp.countDocuments({
            ...query,
            scheduledDate: { $gte: weekStart, $lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) }
        });

        // Completion rate (this month)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const completedThisMonth = await FollowUp.countDocuments({
            ...query,
            status: 'completed',
            scheduledDate: { $gte: monthStart }
        });
        const totalThisMonth = await FollowUp.countDocuments({
            ...query,
            scheduledDate: { $gte: monthStart }
        });

        const completionRate = totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;

        res.json({
            todaysFollowUps,
            overdueFollowUps,
            thisWeekFollowUps,
            completionRate
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get follow-up counts by status
exports.getFollowUpCounts = async (req, res) => {
    try {
        const counts = await FollowUp.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedCounts = counts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        // Calculate due follow-ups (not completed)
        const dueCount = await FollowUp.countDocuments({ status: { $ne: "completed" } });

        res.json({
            scheduled: formattedCounts.scheduled || 0,
            completed: formattedCounts.completed || 0,
            missed: formattedCounts.missed || 0,
            rescheduled: formattedCounts.rescheduled || 0,
            due: dueCount // Add due follow-ups count
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};