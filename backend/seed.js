const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Profile = require('./src/models/Profile');
const SystemSettings = require('./src/models/SystemSettings');
const Department = require('./src/models/Department');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data (optional)
        // await Profile.deleteMany();
        // await SystemSettings.deleteMany();
        // await Department.deleteMany();

        // Create Admin User if not exists
        const adminExists = await Profile.findOne({ username: 'admin' });
        if (!adminExists) {
            await Profile.create({
                username: 'admin',
                password_hash: 'admin123', // In real app, hash this!
                full_name: 'System Admin',
                role: 'admin',
                is_active: true
            });
            console.log('Admin user created: admin / admin123');
        }

        // Create Default System Settings
        const settingsCount = await SystemSettings.countDocuments();
        if (settingsCount === 0) {
            await SystemSettings.create({
                company_name: 'error Infotech',
                work_start_time: '09:00',
                work_end_time: '18:00',
                work_hours_per_day: 8
            });
            console.log('Default system settings created');
        }

        // Create Departments if none
        const deptCount = await Department.countDocuments();
        if (deptCount === 0) {
            await Department.create([
                { name: 'Engineering', description: 'Software development' },
                { name: 'Human Resources', description: 'HR and recruitment' },
                { name: 'Sales', description: 'Business development' }
            ]);
            console.log('Default departments created');
        }

        console.log('Seeding complete!');
        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
