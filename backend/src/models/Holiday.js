const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.Mixed, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Holiday', HolidaySchema);
