const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.Mixed, required: true },
    leave_type: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    reason: { type: String, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewed_by: { type: mongoose.Schema.Types.Mixed, default: null },
    reviewed_at: { type: Date, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Leave', LeaveSchema);
