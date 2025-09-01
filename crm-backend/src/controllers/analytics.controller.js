const Lead = require('../models/lead.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');

// Get lead performance data (monthly)
exports.getLeadPerformance = async (req, res) => {
    try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));

        const leads = await Lead.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    leads: { $sum: 1 },
                    conversions: { $sum: { $cond: [{ $eq: ["$status", "enrolled"] }, 1, 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedData = leads.map(item => ({
            month: months[item._id - 1],
            leads: item.leads,
            conversions: item.conversions
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get employee performance data
exports.getEmployeePerformance = async (req, res) => {
    try {
        const employees = await User.aggregate([
            {
                $match: { role: 'employee' }
            },
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'tasks'
                }
            },
            {
                $lookup: {
                    from: 'leads',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'leads'
                }
            },
            {
                $project: {
                    name: 1,
                    tasks: { $size: { $filter: { input: "$tasks", as: "task", cond: { $eq: ["$$task.status", "completed"] } } } },
                    leads: { $size: "$leads" },
                    conversions: { $size: { $filter: { input: "$leads", as: "lead", cond: { $eq: ["$$lead.status", "enrolled"] } } } },
                    score: { $multiply: [{ $divide: [{ $size: { $filter: { input: "$tasks", as: "task", cond: { $eq: ["$$task.status", "completed"] } } } }, { $add: [{ $size: "$tasks" }, 1] }] }, 100] }
                }
            }
        ]);

        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get task analytics
exports.getTaskAnalytics = async (req, res) => {
    try {
        const taskAnalytics = await Task.aggregate([
            {
                $group: {
                    _id: "$type",
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                    overdue: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } }
                }
            }
        ]);

        const formattedData = taskAnalytics.map(item => ({
            type: item._id,
            completed: item.completed,
            pending: item.pending,
            overdue: item.overdue
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get lead source analytics
exports.getLeadSources = async (req, res) => {
    try {
        const sourceColors = {
            'WhatsApp': '#25D366',
            'Website': '#3B82F6',
            'Referral': '#10B981',
            'Social Media': '#8B5CF6',
            'Advertisement': '#F59E0B'
        };

        const leadSources = await Lead.aggregate([
            {
                $group: {
                    _id: "$source",
                    value: { $sum: 1 }
                }
            }
        ]);

        const formattedData = leadSources.map(item => ({
            name: item._id,
            value: item.value,
            color: sourceColors[item._id]
        }));

        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get dashboard summary data
exports.getDashboardSummary = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        // Get total leads
        const totalLeads = await Lead.countDocuments();

        // Get active employees
        const activeEmployees = await User.countDocuments({ role: 'employee' });

        // Get today's tasks
        const todaysTasks = await Task.countDocuments({
            createdAt: { $gte: today }
        });

        // Get follow-ups due (leads with status 'follow-up' and no contact in 48 hours)
        const followUpsDue = await Lead.countDocuments({
            status: 'follow-up',
            lastContact: { $lt: yesterday }
        });

        // Get pending tasks
        const pendingTasks = await Task.countDocuments({
            status: 'pending'
        });

        // Get missed leads (no follow-up in 48 hours)
        const missedLeads = await Lead.countDocuments({
            lastContact: { $lt: yesterday },
            status: { $in: ['new', 'follow-up'] }
        });

        // Get WhatsApp messages sent today (placeholder - you can implement actual WhatsApp tracking)
        const whatsappMessages = 156; // This would come from your WhatsApp integration

        res.json({
            totalLeads,
            activeEmployees,
            todaysTasks,
            followUpsDue,
            pendingTasks,
            missedLeads,
            whatsappMessages
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Lead Funnel (counts for each stage)
exports.getLeadFunnel = async (req, res) => {
  try {
    const newCount = await Lead.countDocuments({ status: 'new' });
    const followUpCount = await Lead.countDocuments({ status: 'follow-up' });
    const proposalSentCount = await Lead.countDocuments({ status: 'proposal-sent' });
    const enrolledCount = await Lead.countDocuments({ status: 'enrolled' });
    const notInterestedCount = await Lead.countDocuments({ status: 'not-interested' });
    res.json({
      new: newCount,
      followUp: followUpCount,
      proposalSent: proposalSentCount,
      enrolled: enrolledCount,
      notInterested: notInterestedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lead Quality Score by Source (dummy logic, replace with real if needed)
exports.getLeadQuality = async (req, res) => {
  try {
    // If you have a qualityScore field, use it. Otherwise, return random for demo.
    const sources = await Lead.aggregate([
      { $group: { _id: "$source", score: { $avg: "$qualityScore" } } }
    ]);
    res.json(sources.map(s => ({ source: s._id, score: Math.round(s.score || Math.random() * 40 + 60) })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Missed Leads Table (detailed rows)
exports.getMissedLeads = async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const leads = await Lead.find({
      lastContact: { $lt: yesterday },
      status: { $in: ['new', 'follow-up'] }
    }).populate('assignedTo', 'name');
    res.json(leads.map(lead => ({
      name: lead.name,
      source: lead.source,
      daysSinceLastContact: Math.floor((Date.now() - new Date(lead.lastContact)) / (1000 * 60 * 60 * 24)),
      assignedTo: lead.assignedTo?.name || '',
      actionRequired: 'Immediate follow-up required'
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};