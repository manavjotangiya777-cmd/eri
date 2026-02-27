const mongoose = require('mongoose');

const AbsenceSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    reason: {
        type: String,
        enum: ['no_clockin', 'approved_leave'],
        required: true
    },
    leave_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Leave', default: null },
    note: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound unique index: one absence per user per date
AbsenceSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Absence', AbsenceSchema);
