const mongoose = require('mongoose');

const TaskTimeLogSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // in seconds
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TaskTimeLog', TaskTimeLogSchema);
