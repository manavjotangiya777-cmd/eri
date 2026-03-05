const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const AllowedNetwork = require('../src/models/AllowedNetwork');

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkIPs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const ips = await AllowedNetwork.find({});
        console.log('--- Allowed IPs Audit ---');
        console.log(JSON.stringify(ips, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkIPs();
