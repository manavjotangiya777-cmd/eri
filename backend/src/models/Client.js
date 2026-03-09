const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    company_name: { type: String, required: true },
    contact_person: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    sector: { type: String, enum: ['B2B', 'B2C', 'D2C', 'Other'], default: 'B2B' },
    industry: { type: String, enum: ['Government', 'Institutional', 'Private', 'Other'], default: 'Private' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    assigned_to: { type: mongoose.Schema.Types.Mixed, default: null }, // can be string or ObjectId
    created_by: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Client', ClientSchema);
