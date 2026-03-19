const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Task = require(path.join(__dirname, 'src/models/Task'));

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing from .env');

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const tasks = await Task.find({}).lean();
    console.log('Total tasks in DB:', tasks.length);

    // Rule 1: Missing task_type + has planned_date -> weekly_plan
    const weeklyPlanResult = await Task.updateMany(
        { task_type: { $exists: false }, planned_date: { $ne: null } },
        { $set: { task_type: 'weekly_plan' } }
    );
    console.log('Migration Result (WeeklyPlan/Candidates):', weeklyPlanResult);

    // Rule 2: Missing task_type + no planned_date -> official
    const officialResult = await Task.updateMany(
        { task_type: { $exists: false }, planned_date: null },
        { $set: { task_type: 'official' } }
    );
    console.log('Migration Result (Official/Others):', officialResult);

    mongoose.connection.close();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
