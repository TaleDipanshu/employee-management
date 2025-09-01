const Task = require('../models/task.model');
const User = require('../models/user.model');
const axios = require('axios');

// Create a new task
exports.createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, priority, dueDate, type } = req.body;

        // Verify all assigned users exist
        const users = await User.find({ _id: { $in: assignedTo } });
        if (users.length !== assignedTo.length) {
            return res.status(400).json({ message: 'One or more assigned users not found' });
        }

        const task = new Task({
            title,
            description,
            assignedTo,
            priority,
            dueDate,
            type
        });

        await task.save();

        // Populate assigned users' information
        await task.populate('assignedTo', 'name email phone');

        // Send WhatsApp notification to assigned users
        const authKey = process.env.MSG91_AUTH_KEY;
        const integratedNumber = process.env.MSG91_WHATSAPP_NUMBER;
        
        if (authKey && integratedNumber) {
            for (const user of task.assignedTo) {
                if (user.phone) {
                    try {
                        // Format due date
                        const dueDate = new Date(task.dueDate).toLocaleDateString();
                        
                        // Prepare message text
                        const messageText = `Hello ${user.name},\n\nYou have been assigned a new task:\n\nTitle: ${task.title}\nPriority: ${task.priority}\nDue Date: ${dueDate}\n\nDescription: ${task.description}\n\nPlease check your dashboard for more details.`;
                        
                        // Send WhatsApp message
                        await axios.post(`${req.protocol}://${req.get('host')}/api/whatsapp/send?authkey=${process.env.MSG91_AUTH_KEY || authKey}`, {
                            integrated_number: process.env.MSG91_WHATSAPP_NUMBER || integratedNumber,
                            recipient_number: user.phone,
                            content_type: 'text',
                            text: messageText
                        });
                        
                        console.log(`WhatsApp notification sent to ${user.name} at ${user.phone}`);
                    } catch (error) {
                        console.error(`Failed to send WhatsApp notification to ${user.name}:`, error.message);
                    }
                }
            }
        }

        res.status(201).json({
            message: 'Task created successfully',
            task: formatTaskResponse(task)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all tasks with filters
exports.getTasks = async (req, res) => {
    try {
        const { status, priority, searchTerm } = req.query;
        const query = {};

        // Apply filters
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // If employee, only show assigned tasks
        if (req.user.role === 'employee') {
            query.assignedTo = req.user._id;
        }

        const tasks = await Task.find(query)
            .populate('assignedTo', 'name')
            .populate('comments.createdBy', 'name')
            .sort({ createdAt: -1 });

        res.json(tasks.map(task => formatTaskResponse(task)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'in-progress', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const task = await Task.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate('assignedTo', 'name');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({
            message: 'Task status updated successfully',
            task: task
        });
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Add comment to task
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.comments.push({
            text,
            createdBy: req.user._id,
            createdAt: new Date() // Explicitly set the timestamp
        });

        await task.save();
        await task.populate('comments.createdBy', 'name');

        res.json({
            message: 'Comment added successfully',
            task: formatTaskResponse(task)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add assign task functionality
exports.assignTask = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.assignedTo = assignedTo;
        await task.save();
        await task.populate('assignedTo', 'name');

        res.json({
            message: 'Task assigned successfully',
            task: formatTaskResponse(task)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete task
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Only admin or assigned users can delete
        if (req.user.role !== 'admin' && !task.assignedTo.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted successfully', id: req.params.id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add update task functionality
exports.updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const task = await Task.findByIdAndUpdate(
            id,
            updates,
            { new: true }
        ).populate('assignedTo', 'name');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({
            message: 'Task updated successfully',
            task: formatTaskResponse(task)
        });
    } catch (err) {
        console.error('Task update error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Helper function to format task response - UPDATED TO INCLUDE TIME
const formatTaskResponse = (task) => {
    return {
        id: task._id,
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo.map(user => user.name),
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate.toISOString().split('T')[0],
        createdDate: task.createdAt.toISOString().split('T')[0],
        type: task.type,
        comments: task.comments.map(comment => {
            // Format with both date and time
            const dateTimeStr = comment.createdAt.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const userName = comment.createdBy ? comment.createdBy.name : 'Unknown';
            return `${dateTimeStr} - ${userName}: ${comment.text}`;
        })
    };
};

// Get task by ID
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name')
            .populate('comments.createdBy', 'name');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(formatTaskResponse(task));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};