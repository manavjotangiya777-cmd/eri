const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    clockInAt: { type: Date, required: true },
    clockOutAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 }
});

const breakSchema = new mongoose.Schema({
    breakInAt: { type: Date, required: true },
    breakOutAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 }
});

const AttendanceSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    status: {
        type: String,
        enum: ['working', 'on_break', 'clocked_out'],
        default: 'clocked_out'
    },
    sessions: [sessionSchema],
    breaks: [breakSchema],
    totals: {
        totalClockSeconds: { type: Number, default: 0 },
        totalBreakSeconds: { type: Number, default: 0 },
        workSeconds: { type: Number, default: 0 },
        overtimeSeconds: { type: Number, default: 0 }
    },
    lastClockInAt: { type: Date, default: null },
    currentSessionOpen: { type: Boolean, default: false },
    currentBreakOpen: { type: Boolean, default: false },
    // Keep legacy fields for admin overview compatibility if possible
    is_late: { type: Boolean, default: false },
    late_minutes: { type: Number, default: 0 },
    is_early_leave: { type: Boolean, default: false },
    early_leave_minutes: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
