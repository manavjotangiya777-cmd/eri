const mongoose = require('mongoose');

const AppreciationSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    given_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    badge: {
        type: String,
        enum: ['Star Performer', 'Team Player', 'Problem Solver', 'Innovator', 'Customer Champion', 'Going Extra Mile', 'Leadership', 'Other'],
        default: 'Star Performer'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Appreciation', AppreciationSchema);
