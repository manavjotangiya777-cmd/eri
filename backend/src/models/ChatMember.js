const mongoose = require('mongoose');

const ChatMemberSchema = new mongoose.Schema({
    chat_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    is_admin: { type: Boolean, default: false },
    joined_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure one member entry per user per chat
ChatMemberSchema.index({ chat_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ChatMember', ChatMemberSchema);
