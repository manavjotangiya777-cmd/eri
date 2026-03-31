const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const Attendance = require('./src/models/Attendance');

// Import the logic from api.js manually for ease, but actually I'll just write a cleanup script that clears the bad 10:00 AM data.

async function fix() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    
    // 1. Clear the bad snapshots that were set by default 'full_day'
    console.log('Clearing bad shift snapshots...');
    await Attendance.updateMany({}, { 
        $unset: { 
            shift_type: "", 
            shift_start_time: "", 
            shift_end_time: "", 
            shift_work_hours: "", 
            late_threshold: "" 
        } 
    });
    
    console.log('Done cleaning. Now you should click Sync with Schedule again from the UI.');
    await mongoose.disconnect();
}

fix().catch(console.error);
