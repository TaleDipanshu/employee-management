const mongoose = require('mongoose');

const followupSchema = new mongoose.Schema({
    leadName: {
        type: String,
        required: true,
        trim: true
    },
    leadPhone: {
        type: String,
        required: false, // Made optional
        trim: true,
        default: ''
    },
    leadEmail: {
        type: String,
        required: false, // Made optional
        trim: true,
        lowercase: true,
        default: ''
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduledDate: {
        type: Date,
        required: true
    },
    scheduledTime: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['call', 'email', 'whatsapp', 'meeting'],
        required: false, // Made optional
        default: 'call'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'missed', 'rescheduled'],
        default: 'scheduled'
    },
    notes: {
        type: String,
        default: ''
    },
    course: {
        type: String,
        required: false, // Made optional
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FollowUp', followupSchema);
