const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    client_id: { type: mongoose.Schema.Types.Mixed, required: true },
    milestone_id: { type: mongoose.Schema.Types.Mixed, default: null },
    invoice_number: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' },
    due_date: { type: Date, default: null },
    notes: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
