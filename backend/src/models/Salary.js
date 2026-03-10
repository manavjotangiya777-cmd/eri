const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },

    // Earnings
    basic_salary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 }, // Incentive/Bonus
    incentives: { type: Number, default: 0 },

    // Attendance Stats
    total_working_days: { type: Number, default: 26 },
    leave_days: { type: Number, default: 0 },
    late_entries: { type: Number, default: 0 },

    // Deductions
    leave_deductions: { type: Number, default: 0 }, // Auto Calculated
    late_penalty: { type: Number, default: 0 }, // Auto Calculated (3 lates = 0.5 day)
    pf: { type: Number, default: 0 },
    other_deductions: { type: Number, default: 0 },

    // Summary
    gross_salary: { type: Number, required: true },
    total_deductions: { type: Number, required: true },
    net_salary: { type: Number, required: true },

    status: {
        type: String,
        enum: ['pending', 'paid', 'cancelled'],
        default: 'pending'
    },
    payment_method: {
        type: String,
        enum: ['bank_transfer', 'cash', 'cheque', 'other'],
        default: 'bank_transfer'
    },
    payment_date: { type: Date, default: null },
    transaction_id: { type: String, default: null },
    notes: { type: String, default: null },
    pdf_path: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Adding a virtual for user details to make it easier to fetch list
SalarySchema.virtual('user', {
    ref: 'Profile',
    localField: 'user_id',
    foreignField: '_id',
    justOne: true
});

module.exports = mongoose.model('Salary', SalarySchema);
