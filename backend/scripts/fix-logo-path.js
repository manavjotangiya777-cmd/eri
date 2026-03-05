const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const SystemSettings = require('../src/models/SystemSettings');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixLogo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const settings = await SystemSettings.findOne({});
        if (settings) {
            // The existing file we found was 1772115020966-image-removebg-preview.png
            settings.company_logo = '/uploads/1772115020966-image-removebg-preview.png';
            await settings.save();
            console.log('Logo path updated successfully to existing file.');
        } else {
            console.log('No settings found to update.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixLogo();
