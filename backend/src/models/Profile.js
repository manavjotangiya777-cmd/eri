const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    shift_type: {
        type: String,
        enum: ['full_day', 'half_day'],
        default: 'full_day'
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save hook to hash password
ProfileSchema.pre('save', async function (next) {
    if (!this.isModified('password_hash')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Pre-update hook for findOneAndUpdate (handles findByIdAndUpdate)
ProfileSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();
    if (update.password_hash) {
        try {
            const salt = await bcrypt.genSalt(10);
            update.password_hash = await bcrypt.hash(update.password_hash, salt);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

// Method to compare password
ProfileSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password_hash);
};

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
