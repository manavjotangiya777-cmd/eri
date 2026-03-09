const mongoose = require('mongoose');

const WarningSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    target_role: { type: String, enum: ['all', 'employee', 'bde', 'hr', 'individual'], default: 'all' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null }, // for particular user
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
    expires_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Warning', WarningSchema);
