const mongoose = require('mongoose');

const PaymentMilestoneSchema = new mongoose.Schema({
    client_id: { type: mongoose.Schema.Types.Mixed, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'paid'], default: 'pending' },
    order_index: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('PaymentMilestone', PaymentMilestoneSchema);
