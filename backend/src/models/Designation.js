const mongoose = require('mongoose');

const DesignationSchema = new mongoose.Schema({
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    name: { type: String, required: true },
    description: { type: String, default: null },
    is_active: { type: Boolean, default: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for 'departments' to match frontend expectation
DesignationSchema.virtual('departments', {
    ref: 'Department',
    localField: 'department_id',
    foreignField: '_id',
    justOne: true
});

module.exports = mongoose.model('Designation', DesignationSchema);
