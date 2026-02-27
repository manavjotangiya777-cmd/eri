const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    participant_1: { type: mongoose.Schema.Types.Mixed, default: null },
    participant_2: { type: mongoose.Schema.Types.Mixed, default: null },
    chat_type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    group_name: { type: String, default: null },
    group_description: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null },
    last_message: { type: String, default: null },
    last_message_at: { type: Date, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Chat', ChatSchema);
