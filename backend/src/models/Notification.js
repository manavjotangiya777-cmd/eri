const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    target_role: {
        type: String,
        enum: ['all', 'admin', 'hr', 'employee', 'client', 'none'],
        default: 'all'
    },
    target_user: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
    type: {
        type: String,
        enum: ['system', 'announcement', 'birthday', 'task', 'attendance', 'leave', 'chat', 'warning', 'followup'],
        default: 'system'
    },
    is_read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }],
    created_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} } // For extra data like task_id, etc.
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// ── Auto-cleanup to keep only last 30 notifications ────────────────
async function cleanupNotifications(model) {
    try {
        const count = await model.countDocuments();
        const LIMIT = 500;
        if (count > LIMIT) {
            const excess = count - LIMIT;
            // Find the oldest [excess] notifications
            const oldest = await model.find()
                .sort({ created_at: 1 })
                .limit(excess)
                .select('_id');

            if (oldest.length > 0) {
                const idsToDelete = oldest.map(n => n._id);
                await model.deleteMany({ _id: { $in: idsToDelete } });
                console.log(`[Notification Cleanup] Deleted ${idsToDelete.length} oldest notifications. Count now: ${LIMIT}`);
            }
        }
    } catch (err) {
        console.error('Notification cleanup error:', err);
    }
}

// Hook for individual saves (Task creation, Leave update, etc.)
NotificationSchema.post('save', async function () {
    await cleanupNotifications(this.constructor);
});

// Hook for insertMany (Chat messages)
NotificationSchema.post('insertMany', async function () {
    await cleanupNotifications(this.constructor);
});

module.exports = mongoose.model('Notification', NotificationSchema);
