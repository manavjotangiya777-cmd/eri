const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    date: { type: String, required: true }, // e.g. '2026-03-17'
    login_count: { type: Number, default: 0 },
    ai_usage_count: { type: Number, default: 0 },
    // Other daily metrics can be added here
}, { timestamps: true });

ActivitySchema.index({ employee_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeActivity', ActivitySchema);
