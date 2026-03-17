require('dotenv').config();
const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const Attendance = require('./src/models/Attendance');
const Task = require('./src/models/Task');
const FollowUp = require('./src/models/FollowUp');
const Message = require('./src/models/Message');
const Warning = require('./src/models/Warning');
const Appreciation = require('./src/models/Appreciation');
const EmployeeActivity = require('./src/models/EmployeeActivity');
const Leave = require('./src/models/Leave');
const EmployeePerformance = require('./src/models/EmployeePerformance');

async function analyze() {
    await mongoose.connect(process.env.MONGODB_URI);

    const userId = '69a6d55d12412c9beeb85948'; // Parth Patadiya
    const month = '2026-03';
    const firstDay = new Date(2026, 2, 1);
    const lastDay = new Date(2026, 3, 0);

    const results = {
        attendance: await Attendance.find({ user_id: userId, date: { $regex: '^' + month } }),
        tasks: await Task.find({ assigned_to: { $in: [userId, userId.toString()] } }),
        followups: await FollowUp.find({ assigned_to: { $in: [userId, userId.toString()] } }),
        warnings: await Warning.find({ user_id: userId, created_at: { $gte: firstDay, $lte: lastDay } }),
        appreciations: await Appreciation.find({ employee_id: userId, created_at: { $gte: firstDay, $lte: lastDay } }),
        messages: await Message.countDocuments({ sender_id: userId, created_at: { $gte: firstDay, $lte: lastDay } }),
        activity: await EmployeeActivity.find({ employee_id: userId, date: { $regex: '^' + month } }),
        leaves: await Leave.find({ user_id: userId, start_date: { $gte: firstDay, $lte: lastDay } }),
        performance: await EmployeePerformance.findOne({ employee_id: userId, month: month })
    };

    console.log(JSON.stringify(results, null, 2));
    process.exit();
}

analyze();
