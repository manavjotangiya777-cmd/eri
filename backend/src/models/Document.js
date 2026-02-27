const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    file_url: { type: String, required: true },
    file_type: { type: String, default: null },
    file_size: { type: Number, default: null },
    uploaded_by: { type: mongoose.Schema.Types.Mixed, default: null },
    client_id: { type: mongoose.Schema.Types.Mixed, default: null },
    visibility: { type: String, enum: ['employees', 'clients', 'public'], default: 'employees' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Document', DocumentSchema);
