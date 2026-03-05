const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const SystemSettings = require('../src/models/SystemSettings');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const settings = await SystemSettings.findOne({});
        console.log('--- System Settings Audit ---');
        console.log(JSON.stringify(settings, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSettings();
