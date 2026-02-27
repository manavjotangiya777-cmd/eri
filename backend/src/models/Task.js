const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed', 'pending', 'cancelled'], default: 'todo' },
    deadline: { type: Date, default: null },
    assigned_to: { type: mongoose.Schema.Types.Mixed, default: null },
    client_id: { type: mongoose.Schema.Types.Mixed, default: null },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null },
    total_time_spent: { type: Number, default: 0 }, // in seconds
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Task', TaskSchema);
