const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    month: { type: String, required: true }, // Format: '2026-03'

    // Scores
    attendance_score: { type: Number, default: 0 }, // max 20
    task_completion_score: { type: Number, default: 0 }, // max 30
    task_quality_score: { type: Number, default: 0 }, // max 15 (admin-rated)
    activity_engagement_score: { type: Number, default: 0 }, // max 10
    leave_management_score: { type: Number, default: 0 }, // max 10
    communication_score: { type: Number, default: 0 }, // max 10
    followup_score: { type: Number, default: 0 }, // max 10
    warning_penalty: { type: Number, default: 0 }, // negative score
    appreciation_bonus: { type: Number, default: 0 }, // positive score

    // Admin Inputs
    admin_rating: { type: Number, default: 0 }, // 1 to 5 (mapped to 15% quality score)
    admin_feedback: { type: String, default: null },

    // Totals
    final_score: { type: Number, default: 0 }, // max 100
    grade: {
        type: String,
        enum: ['Excellent', 'Good', 'Average', 'Needs Improvement', 'Not Evaluated'],
        default: 'Not Evaluated'
    },

    // Metadata cache to show on UI without complex aggregation
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

PerformanceSchema.index({ employee_id: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('EmployeePerformance', PerformanceSchema);
