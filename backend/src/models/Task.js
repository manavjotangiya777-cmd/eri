const mongoose = require('mongoose');

const WorkUpdateSchema = new mongoose.Schema({
    text: { type: String, required: true },
    updated_by: { type: mongoose.Schema.Types.Mixed, default: null },
    updated_at: { type: Date, default: Date.now },
}, { _id: true });

const AttachmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['file', 'link'], default: 'link' },
}, { _id: true });

const TaskSchema = new mongoose.Schema({
    task_id: { type: String, default: null }, // e.g. EI-TASK-001 (auto-generated)
    title: { type: String, required: true },
    description: { type: String, default: null },
    department: { type: String, default: null }, // Development, Digital Marketing, BDE, Design, Support
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'],
        default: 'pending'
    },
    // Dates
    start_date: { type: Date, default: null },
    deadline: { type: Date, default: null },
    completion_date: { type: Date, default: null },
    estimated_time: { type: String, default: null }, // e.g. "6 Hours", "2 Days"
    // Relationships
    assigned_to: { type: mongoose.Schema.Types.Mixed, default: null },
    assigned_by: { type: mongoose.Schema.Types.Mixed, default: null },
    client_id: { type: mongoose.Schema.Types.Mixed, default: null },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null },
    // Rich fields
    requirements: [{ type: String }], // array of requirement points
    attachments: [AttachmentSchema],
    work_updates: [WorkUpdateSchema],
    review_notes: { type: String, default: null }, // Manager/Admin feedback
    // Time
    total_time_spent: { type: Number, default: 0 }, // in seconds
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Auto-generate task_id before saving if not set
TaskSchema.pre('save', async function (next) {
    if (!this.task_id) {
        const count = await this.constructor.countDocuments();
        this.task_id = `EI-TASK-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Task', TaskSchema);
