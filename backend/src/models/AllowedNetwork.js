const mongoose = require('mongoose');

const AllowedNetworkSchema = new mongoose.Schema({
    ip_address: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    is_active: { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('AllowedNetwork', AllowedNetworkSchema);
