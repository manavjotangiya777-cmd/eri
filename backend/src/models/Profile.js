const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    full_name: { type: String, default: null },
    role: {
        type: String,
        enum: ['admin', 'hr', 'employee', 'client', 'bde'],
        default: 'employee'
    },
    department: { type: String, default: null },
    designation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    date_of_birth: { type: Date, default: null },
    hire_date: { type: Date, default: null },
    avatar_url: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    skip_ip_restriction: { type: Boolean, default: false },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null }, // If client, stores company id
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for 'designation' details
ProfileSchema.virtual('designation', {
    ref: 'Designation',
    localField: 'designation_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for 'client' details
ProfileSchema.virtual('client', {
    ref: 'Client',
    localField: 'client_id',
    foreignField: '_id',
    justOne: true
});

module.exports = mongoose.model('Profile', ProfileSchema);
