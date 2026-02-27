const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    chat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    content: { type: String, required: false },
    file_url: { type: String, default: null },
    file_type: { type: String, default: null },
    file_name: { type: String, default: null },
    is_read: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Message', MessageSchema);
