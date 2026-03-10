const mongoose = require('mongoose');

const CashFlowSchema = new mongoose.Schema({
    type: { type: String, enum: ['inflow', 'outflow'], required: true },
    category: { type: String, required: true }, // e.g., 'Project Payment', 'Salary', 'Rent'
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    payment_mode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Other'], default: 'UPI' },

    // Links (Optional)
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    salary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salary', default: null },

    // Details
    paid_to: { type: String, default: null }, // For outflow
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null }, // For inflow
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null }, // For outflow

    notes: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('CashFlow', CashFlowSchema);
