const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Task = require('./src/models/Task');

    console.log('Connected');

    // Rule: Any task with planned_date should be weekly_plan
    const result = await Task.updateMany(
        { planned_date: { $ne: null }, task_type: { $ne: 'weekly_plan' } },
        { $set: { task_type: 'weekly_plan' } }
    );
    console.log('Migrated to weekly_plan:', result);

    // Rule: Any task WITHOUT planned_date should be official
    const result2 = await Task.updateMany(
        { planned_date: null, task_type: { $ne: 'official' } },
        { $set: { task_type: 'official' } }
    );
    console.log('Migrated to official:', result2);

    mongoose.connection.close();
}
run();
