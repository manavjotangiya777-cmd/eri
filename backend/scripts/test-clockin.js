const axios = require('axios');

async function testClockIn() {
    try {
        console.log('Testing Clock-in for eri.DM.m2 at current time...');
        const res = await axios.post('http://localhost:5001/api/attendance/clock-in', {
            user_id: '69a6e12512412c9beeb86710'
        });
        console.log('Record:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}

testClockIn();
