const mongoose = require('mongoose');

const UpdateNoteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    noted_by: { type: mongoose.Schema.Types.Mixed, default: null },
    noted_at: { type: Date, default: Date.now },
}, { _id: true });

const FollowUpSchema = new mongoose.Schema({
    followup_id: { type: String, default: null }, // e.g. EI-FUP-001 (auto-gen)
    title: { type: String, required: true },
    task_type: {
        type: String,
        enum: [
            'update_levanu',
            'work_karavanu',
            'document_collect',
            'client_followup',
            'payment_followup',
            'internal_coordination',
        ],
        default: 'client_followup',
    },
    // Related person/source
    related_name: { type: String, default: null }, // e.g. Client name / Employee name
    related_type: {
        type: String,
        enum: ['client', 'employee', 'vendor', 'department', 'other'],
        default: 'client',
    },
    // Who handles it
    assigned_to: { type: mongoose.Schema.Types.Mixed, default: null },
    assigned_by: { type: mongoose.Schema.Types.Mixed, default: null },
    // Content
    description: { type: String, default: null },
    required_items: [{ type: String }], // what to collect/submit
    communication_method: {
        type: String,
        enum: ['call', 'whatsapp', 'email', 'meeting', 'other'],
        default: 'call',
    },
    // Dates
    deadline: { type: Date, default: null },
    next_action_date: { type: Date, default: null },
    // Status
    status: {
        type: String,
        enum: ['pending', 'in_followup', 'waiting_client', 'completed'],
        default: 'pending',
    },
    // Updates
    update_notes: [UpdateNoteSchema],
    // Optional link to a task
    related_task_id: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Auto-generate followup_id
FollowUpSchema.pre('save', async function (next) {
    if (!this.followup_id) {
        const count = await this.constructor.countDocuments();
        this.followup_id = `EI-FUP-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

module.exports = mongoose.model('FollowUp', FollowUpSchema);
