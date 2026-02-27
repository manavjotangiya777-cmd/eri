const mongoose = require('mongoose');

const ClientNoteSchema = new mongoose.Schema({
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    note: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('ClientNote', ClientNoteSchema);
