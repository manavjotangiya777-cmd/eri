const mongoose = require('mongoose');
const uri = 'mongodb+srv://manavjotangiya777_db_user:manav123@cluster0.nkiv4xo.mongodb.net/it_company_crm';

async function checkAllProfiles() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
        const profiles = await mongoose.connection.db.collection('profiles').find().toArray();
        console.log('Total Profiles found:', profiles.length);
        profiles.forEach(p => {
            console.log(`- ${p.username} (${p.full_name || 'No Full Name'}) | Role: ${p.role} | Active: ${p.is_active}`);
        });
        process.exit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAllProfiles();
