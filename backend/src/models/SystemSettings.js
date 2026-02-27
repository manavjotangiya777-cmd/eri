const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
    company_name: { type: String, default: 'error Infotech' },
    company_email: { type: String, default: null },
    company_phone: { type: String, default: null },
    company_address: { type: String, default: null },
    work_start_time: { type: String, default: '09:00' },
    work_end_time: { type: String, default: '18:00' },
    lunch_start_time: { type: String, default: '13:00' },
    lunch_end_time: { type: String, default: '14:00' },
    work_hours_per_day: { type: Number, default: 8 },
    late_threshold_minutes: { type: Number, default: 15 },
    // Saturday working day rule
    saturday_rule: {
        type: String,
        enum: ['all_off', 'all_on', '2nd_4th_off', '1st_3rd_off', 'custom'],
        default: 'all_off'  // Sunday always off, Saturday configurable
    },
    // Used only when saturday_rule = 'custom': array of week numbers (1-5) that are OFF
    saturday_off_weeks: { type: [Number], default: [] },
    invoice_template: { type: String, default: null },
    company_logo: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
