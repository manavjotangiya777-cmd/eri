const mongoose = require('mongoose');
const Profile = require('./src/models/Profile');
const SystemSettings = require('./src/models/SystemSettings');

async function check() {
    await mongoose.connect('mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm');
    
    console.log('--- System Settings ---');
    const settings = await SystemSettings.findOne();
    console.log(JSON.stringify(settings, null, 2));
    
    console.log('\n--- Profiles with HALF DAY ---');
    const users = await Profile.find({ shift_type: 'half_day' });
    console.log(users.map(u => ({ id: u._id, username: u.username, full_name: u.full_name, shift_type: u.shift_type })));
    
    await mongoose.disconnect();
}

check().catch(err => { console.error(err); process.exit(1); });
