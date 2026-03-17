const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const factory = require('../controllers/handlerFactory');

// Models
const Profile = require('../models/Profile');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const SystemSettings = require('../models/SystemSettings');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Holiday = require('../models/Holiday');
const Announcement = require('../models/Announcement');
const Document = require('../models/Document');
const PaymentMilestone = require('../models/PaymentMilestone');
const Invoice = require('../models/Invoice');
const ChatMember = require('../models/ChatMember');
const TaskTimeLog = require('../models/TaskTimeLog');
const ClientNote = require('../models/ClientNote');
const AllowedNetwork = require('../models/AllowedNetwork');
const Notification = require('../models/Notification');
const FollowUp = require('../models/FollowUp');
const Warning = require('../models/Warning');
const Salary = require('../models/Salary');
const CashFlow = require('../models/CashFlow');
const EmployeeActivity = require('../models/EmployeeActivity');
const EmployeePerformance = require('../models/EmployeePerformance');
const Appreciation = require('../models/Appreciation');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Request Logging Middleware
const IST_TIMEZONE = 'Asia/Kolkata';
const getISTDateString = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date);
};
const getISTTimeParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false, timeZone: IST_TIMEZONE
    });
    const parts = formatter.formatToParts(date);
    return {
        h: parseInt(parts.find(p => p.type === 'hour').value),
        m: parseInt(parts.find(p => p.type === 'minute').value),
        s: parseInt(parts.find(p => p.type === 'second').value)
    };
};

const trackActivity = async (user_id, field) => {
    try {
        if (!user_id) return;
        const date = getISTDateString();
        const update = { $inc: {} };
        update.$inc[field] = 1;
        await EmployeeActivity.findOneAndUpdate(
            { employee_id: user_id, date },
            update,
            { upsert: true }
        );
    } catch (e) { console.error('Activity track error:', e); }
};

router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    if (Object.keys(req.query).length) console.log('Query:', req.query);
    next();
});

// Middleware to ensure Office WiFi for Attendance
const ensureOfficeNetwork = async (req, res, next) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return next(); // Can't check without user_id

        const user = await Profile.findById(user_id);
        if (!user) return next();

        // Only restrict Employees and BDEs. Admin and HR can clock in from anywhere.
        if (user.role !== 'employee' && user.role !== 'bde') return next();

        // Check if this specific employee is authorized to skip restriction
        if (user.skip_ip_restriction) return next();

        const allowedIps = await AllowedNetwork.find({ is_active: true }).distinct('ip_address');

        // If no IPs configured, allow all (don't lock out everyone by default)
        if (allowedIps.length === 0) return next();

        let userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '').split(',')[0].replace('::ffff:', '').trim();
        if (userIp === '::1') userIp = '127.0.0.1';

        console.log(`[Network Restriction Check] User: ${user.username}, Role: ${user.role}, Attempting from IP: ${userIp}`);

        if (!allowedIps.includes(userIp)) {
            return res.status(403).json({
                error: 'Restricted Action',
                message: `Action allowed only from office WiFi. (Detected IP: ${userIp})`
            });
        }
        next();
    } catch (err) {
        console.error('Network check error:', err);
        next();
    }
};

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.originalname, mimetype: req.file.mimetype });
});

// Helper: safely convert string to ObjectId
const toObjectId = (str) => {
    if (!str || str === 'undefined' || str === 'null' || str === '') return null;
    try {
        if (typeof str !== 'string') return str; // Already an object/ObjectId
        return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
    } catch (e) {
        return null;
    }
};

// Helper to define standard routes
const defineStandardRoutes = (path, Model, populateOptions) => {
    router.route(path)
        .get(factory.getAll(Model, populateOptions))
        .post(factory.createOne(Model))
        .put(factory.updateOne(Model))
        .patch(factory.updateOne(Model))
        .delete(factory.deleteOne(Model));

    router.route(`${path}/:id`)
        .get(factory.getOne(Model, populateOptions))
        .put(factory.updateOne(Model))
        .patch(factory.updateOne(Model))
        .delete(factory.deleteOne(Model));
};

// --- Custom Routes ---

// Auth Routes
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existing = await Profile.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Username already exists' });

        const userCount = await Profile.countDocuments();
        const role = userCount === 0 ? 'admin' : 'employee';

        const user = await Profile.create({
            username,
            password_hash: password,
            role: role
        });

        const commonChat = await Chat.findOne({ group_name: 'Common Group', chat_type: 'group' });
        if (commonChat) {
            await ChatMember.findOneAndUpdate(
                { chat_id: commonChat._id, user_id: user._id },
                { chat_id: commonChat._id, user_id: user._id, joined_at: new Date() },
                { upsert: true }
            );
        }

        res.status(201).json({ success: true, user: { id: user._id, role: user.role } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const jwt = require('jsonwebtoken');
    const { username, password } = req.body;
    try {
        // Support login via email OR username
        let user = null;
        if (username && username.includes('@')) {
            user = await Profile.findOne({ email: username.toLowerCase().trim() });
        }
        if (!user) {
            user = await Profile.findOne({ username });
        }
        if (!user) {
            console.log(`Login failed: User not found - ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Secure password comparison
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log(`Login failed: Password mismatch for user - ${user.username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`Login successful: ${user.username}`);

        // Track Login Performance Action
        trackActivity(user._id, 'login_count');

        const commonChat = await Chat.findOne({ group_name: 'Common Group', chat_type: 'group' });
        if (commonChat) {
            await ChatMember.findOneAndUpdate(
                { chat_id: commonChat._id, user_id: user._id },
                { chat_id: commonChat._id, user_id: user._id, joined_at: new Date() },
                { upsert: true }
            );
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: factory.mapId(user)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// System Settings
router.get('/system_settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) settings = await SystemSettings.create({});
        const obj = settings.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/system_settings', async (req, res) => {
    try {
        let settings = await SystemSettings.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true
        });
        const obj = settings.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance Custom Logic
router.get('/attendance/today', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const now = new Date();
        const today = getISTDateString(now);

        const record = await Attendance.findOne({ user_id, date: today });
        if (record) {
            const obj = record.toObject({ virtuals: true });
            obj.id = obj._id.toString();
            return res.json(obj);
        }
        res.json(null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/attendance/clock-in', ensureOfficeNetwork, async (req, res) => {
    // ── Helper: compute is_late + late_minutes for a user at a given time ──
    const computeLateness = async (userId, now) => {
        const settings = await SystemSettings.findOne();
        const user = await Profile.findById(userId);
        const shiftType = user?.shift_type || 'full_day';

        const startTime = shiftType === 'half_day'
            ? (settings?.half_day_start_time || '09:00')
            : (settings?.work_start_time || '09:00');
        const threshold = shiftType === 'half_day'
            ? (settings?.half_day_late_threshold ?? 15)
            : (settings?.late_threshold_minutes ?? 15);

        if (!startTime) return { is_late: false, late_minutes: 0 };

        const { h: nowH, m: nowM } = getISTTimeParts(now);
        const [targetH, targetM] = startTime.split(':').map(Number);

        const nowTotalMinutes = nowH * 60 + nowM;
        const targetTotalMinutes = targetH * 60 + targetM;
        const limitTotalMinutes = targetTotalMinutes + threshold;

        if (nowTotalMinutes > limitTotalMinutes) {
            return {
                is_late: true,
                late_minutes: nowTotalMinutes - targetTotalMinutes
            };
        }
        return { is_late: false, late_minutes: 0 };
    };

    try {
        const { user_id } = req.body;
        const now = new Date();
        const today = getISTDateString(now);

        let record = await Attendance.findOne({ user_id, date: today });

        if (record) {
            if (record.currentSessionOpen) return res.status(400).json({ error: 'Already working' });
            if (record.status === 'on_break') return res.status(400).json({ error: 'Cannot clock in while on break' });

            // Recalculate lateness only on the very first session of the day
            if (record.sessions.length === 0) {
                const { is_late, late_minutes } = await computeLateness(user_id, now);
                record.is_late = is_late;
                record.late_minutes = late_minutes;
            }
        } else {
            // Brand-new record — compute lateness for the first clock-in
            const { is_late, late_minutes } = await computeLateness(user_id, now);
            record = await Attendance.create({ user_id, date: today, is_late, late_minutes });
        }

        record.sessions.push({ clockInAt: now });
        record.status = 'working';
        record.currentSessionOpen = true;
        record.lastClockInAt = now;

        await record.save();
        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/attendance/clock-out', ensureOfficeNetwork, async (req, res) => {
    try {
        const { user_id } = req.body;
        const now = new Date();
        const today = getISTDateString(now);

        let record = await Attendance.findOne({ user_id, date: today });
        if (!record || !record.currentSessionOpen) return res.status(400).json({ error: 'No active session' });
        if (record.status === 'on_break') return res.status(400).json({ error: 'Cannot clock out while on break' });

        // Minimum 1 minute rule
        const diffSeconds = Math.floor((now - record.lastClockInAt) / 1000);
        if (diffSeconds < 60) {
            return res.status(400).json({ error: 'Minimum 1 minute of work required before clocking out' });
        }

        // Close last session
        const lastSession = record.sessions[record.sessions.length - 1];
        lastSession.clockOutAt = now;
        lastSession.durationSeconds = diffSeconds;

        // Update totals
        record.totals.totalClockSeconds += diffSeconds;
        record.totals.workSeconds = record.totals.totalClockSeconds - record.totals.totalBreakSeconds;

        // ── Overtime & Early Leave Calculation ─────────────────────────
        try {
            const settings = await SystemSettings.findOne();
            const user = await Profile.findById(user_id);
            const shiftType = user?.shift_type || 'full_day';
            const overtimeEnabled = settings?.overtime_enabled !== false;

            const thresholdHours = shiftType === 'half_day'
                ? (settings?.half_day_overtime_threshold_hours ?? 4)
                : (settings?.overtime_threshold_hours ?? 8);
            const thresholdSeconds = thresholdHours * 3600;

            // Overtime
            if (overtimeEnabled) {
                record.totals.overtimeSeconds = Math.max(0, record.totals.workSeconds - thresholdSeconds);
            } else {
                record.totals.overtimeSeconds = 0;
            }

            // Early Leave
            if (record.totals.workSeconds < thresholdSeconds) {
                record.is_early_leave = true;
                record.early_leave_minutes = Math.round((thresholdSeconds - record.totals.workSeconds) / 60);
            } else {
                record.is_early_leave = false;
                record.early_leave_minutes = 0;
            }
        } catch (e) {
            record.totals.overtimeSeconds = 0;
            record.is_early_leave = false;
        }

        record.status = 'clocked_out';
        record.currentSessionOpen = false;

        await record.save();
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/attendance/break-in', ensureOfficeNetwork, async (req, res) => {
    try {
        const { user_id } = req.body;
        const now = new Date();
        const today = getISTDateString(now);

        let record = await Attendance.findOne({ user_id, date: today });
        if (!record || record.status !== 'working') return res.status(400).json({ error: 'You must be working to start a break' });

        record.breaks.push({ breakInAt: now });
        record.status = 'on_break';
        record.currentBreakOpen = true;

        await record.save();
        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/attendance/break-out', ensureOfficeNetwork, async (req, res) => {
    try {
        const { user_id } = req.body;
        const now = new Date();
        const today = getISTDateString(now);

        let record = await Attendance.findOne({ user_id, date: today });
        if (!record || record.status !== 'on_break') return res.status(400).json({ error: 'No active break' });

        const lastBreak = record.breaks[record.breaks.length - 1];

        // Minimum 1 minute break rule
        const breakSeconds = Math.floor((now - lastBreak.breakInAt) / 1000);
        if (breakSeconds < 60) {
            return res.status(400).json({ error: 'Minimum 1 minute break required before ending break' });
        }

        lastBreak.breakOutAt = now;
        lastBreak.durationSeconds = breakSeconds;

        record.totals.totalBreakSeconds += lastBreak.durationSeconds;
        record.totals.workSeconds = Math.max(0, record.totals.totalClockSeconds - record.totals.totalBreakSeconds);

        record.status = 'working';
        record.currentBreakOpen = false;

        await record.save();
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ABSENCE ROUTES
// ============================================================
const Absence = require('../models/Absence');

// GET all absences (with populated user)
router.get('/absences', async (req, res) => {
    try {
        const { from, to, user_id } = req.query;
        const filter = {};
        if (user_id) filter.user_id = toObjectId(user_id);
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = from;
            if (to) filter.date.$lte = to;
        }
        const absences = await Absence.find(filter)
            .populate('user_id', 'username full_name role department')
            .sort({ date: -1 });
        const mapped = absences.map(a => {
            const obj = a.toObject({ virtuals: true });
            obj.id = obj._id.toString();
            return obj;
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /absences/generate — scan date range and auto-create absence records
router.post('/absences/generate', async (req, res) => {
    try {
        const { from, to } = req.body;

        if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

        const settings = await SystemSettings.findOne() || {};
        const holidays = await Holiday.find({}).lean();
        const holidayDates = new Set(holidays.map(h => h.date ? h.date.split('T')[0] : null).filter(Boolean));

        // Get all active employees
        const employees = await Profile.find({ role: 'employee', is_active: { $ne: false } }).lean();

        // Get approved leaves in range
        const approvedLeaves = await require('../models/Leave').find({
            status: 'approved',
            start_date: { $lte: new Date(to) },
            end_date: { $gte: new Date(from) }
        }).lean();

        // Get all attendance records in range
        const attendanceRecords = await Attendance.find({
            date: { $gte: from, $lte: to }
        }).lean();

        const attendanceSet = new Set(
            attendanceRecords.map(a => `${a.user_id.toString()}_${a.date}`)
        );

        // Helper: get week-of-month for a Saturday (1=1st Sat, 2=2nd Sat, etc.)
        const getSaturdayWeekOfMonth = (date) => {
            // Count how many Saturdays have occurred in this month up to and including this date
            const d = new Date(date);
            const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
            let count = 0;
            const cur2 = new Date(firstDay);
            while (cur2 <= d) {
                if (cur2.getDay() === 6) count++;
                cur2.setDate(cur2.getDate() + 1);
            }
            return count; // 1, 2, 3, 4, or 5
        };

        // Helper: is this Saturday a working day?
        const isSaturdayWorking = (date) => {
            const rule = settings.saturday_rule || 'all_off';
            if (rule === 'all_off') return false;
            if (rule === 'all_on') return true;
            const weekNum = getSaturdayWeekOfMonth(date);
            if (rule === '2nd_4th_off') return weekNum !== 2 && weekNum !== 4; // 1st,3rd,5th are working
            if (rule === '1st_3rd_off') return weekNum !== 1 && weekNum !== 3; // 2nd,4th,5th are working
            if (rule === 'custom') {
                const offWeeks = settings.saturday_off_weeks || [];
                return !offWeeks.includes(weekNum); // working if NOT in off list
            }
            return false;
        };

        // Build working dates in range (Sunday always off, Saturday uses rule)
        const dates = [];
        const cur = new Date(from);
        const end = new Date(to);
        while (cur <= end) {
            const day = cur.getDay();
            const dateStr = cur.toISOString().split('T')[0];
            const isSun = day === 0;
            const isSat = day === 6;

            let isWorkingDay = false;
            if (!isSun && !isSat) {
                isWorkingDay = true; // Mon-Fri always working
            } else if (isSat) {
                isWorkingDay = isSaturdayWorking(cur);
            }

            if (isWorkingDay && !holidayDates.has(dateStr)) {
                dates.push(dateStr);
            }
            cur.setDate(cur.getDate() + 1);
        }

        // Only process past/today dates
        const today = getISTDateString();
        const validDates = dates.filter(d => d <= today);

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (const employee of employees) {
            const empId = employee._id.toString();

            for (const date of validDates) {
                // Check if on approved leave this date
                const onLeave = approvedLeaves.find(l => {
                    const uid = l.user_id?.toString();
                    if (uid !== empId) return false;
                    const start = l.start_date.toISOString().split('T')[0];
                    const end = l.end_date.toISOString().split('T')[0];
                    return date >= start && date <= end;
                });

                const hasAttendance = attendanceSet.has(`${empId}_${date}`);

                let reason = null;
                let leave_id = null;

                if (onLeave) {
                    reason = 'approved_leave';
                    leave_id = onLeave._id;
                } else if (!hasAttendance) {
                    // USER REQUEST: Only mark as absent for TODAY if shift has already ended
                    if (date === today) {
                        const shiftEnd = employee.shift_type === 'half_day' ? settings.half_day_end_time : settings.work_end_time;
                        if (shiftEnd) {
                            const [targetH, targetM] = shiftEnd.split(':').map(Number);
                            const { h: nowH, m: nowM } = getISTTimeParts();

                            if ((nowH * 60 + nowM) < (targetH * 60 + targetM)) {
                                continue; // Shift hasn't ended yet, don't mark as absent
                            }
                        }
                    }
                    reason = 'no_clockin';
                }

                if (!reason) continue;

                try {
                    await Absence.findOneAndUpdate(
                        { user_id: employee._id, date },
                        { user_id: employee._id, date, reason, leave_id, note: onLeave ? onLeave.leave_type : null },
                        { upsert: true, new: true }
                    );
                    created++;
                } catch (e) {
                    if (e.code === 11000) { skipped++; } // already exists
                    else errors.push(`${employee.username}/${date}: ${e.message}`);
                }
            }
        }

        res.json({ success: true, created, skipped, errors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a specific absence record
router.delete('/absences/:id', async (req, res) => {
    try {
        await Absence.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dashboard Stats
router.get('/dashboard_stats', async (req, res) => {
    try {
        const { user_id, role } = req.query;

        const totalUsers = await Profile.countDocuments();
        const totalClients = await Client.countDocuments();
        const totalTasks = await Task.countDocuments();
        const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

        let myTasks = 0;
        let pendingTasks = 0;
        let completedTasks = 0;

        if (role === 'admin' || role === 'hr') {
            pendingTasks = await Task.countDocuments({ status: { $ne: 'completed' } });
            completedTasks = await Task.countDocuments({ status: 'completed' });
        } else if (role === 'client') {
            const profile = await Profile.findById(user_id);
            if (profile && profile.client_id) {
                const cid = profile.client_id;
                const cidVar = [cid.toString(), cid];
                myTasks = await Task.countDocuments({ client_id: { $in: cidVar } });
                pendingTasks = await Task.countDocuments({ client_id: { $in: cidVar }, status: { $ne: 'completed' } });
                completedTasks = await Task.countDocuments({ client_id: { $in: cidVar }, status: 'completed' });
            }
        } else {
            const uIdVar = [user_id, toObjectId(user_id)];
            myTasks = await Task.countDocuments({ assigned_to: { $in: uIdVar } });
            pendingTasks = await Task.countDocuments({ assigned_to: { $in: uIdVar }, status: { $ne: 'completed' } });
            completedTasks = await Task.countDocuments({ assigned_to: { $in: uIdVar }, status: 'completed' });
        }

        res.json({
            totalUsers,
            totalClients,
            totalTasks,
            pendingLeaves,
            myTasks,
            pendingTasks,
            completedTasks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Automatic Notifications Triggers ---
// These routes wrap standard CRUD with automatic notifications

router.post('/announcements', async (req, res) => {
    try {
        const announcement = await Announcement.create(req.body);
        await Notification.create({
            title: `📢 New Announcement: ${announcement.title}`,
            message: announcement.content.substring(0, 150) + (announcement.content.length > 150 ? '...' : ''),
            target_role: 'all',
            type: 'announcement',
            created_by: req.body.created_by ? toObjectId(req.body.created_by) : null
        });
        res.status(201).json(announcement);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/holidays', async (req, res) => {
    try {
        const holiday = await Holiday.create(req.body);
        await Notification.create({
            title: `🏖️ New Holiday: ${holiday.name}`,
            message: `A new holiday has been scheduled for ${new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
            target_role: 'all',
            type: 'system',
            created_by: req.body.created_by ? toObjectId(req.body.created_by) : null
        });
        res.status(201).json(holiday);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/tasks', async (req, res) => {
    try {
        const task = await Task.create(req.body);
        if (task.assigned_to) {
            await Notification.create({
                title: `📝 New Task Assigned`,
                message: `You have been assigned a new task: ${task.title}`,
                target_user: task.assigned_to,
                target_role: 'none',
                type: 'task'
            });
        }
        res.status(201).json(task);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/leaves', async (req, res) => {
    try {
        const leave = await Leave.create(req.body);
        const user = await Profile.findById(leave.user_id);

        await Notification.create({
            title: `📅 New Leave Application`,
            message: `${user?.full_name || 'An employee'} has applied for ${leave.day_type === 'half_day' ? 'Half Day' : leave.leave_type} from ${new Date(leave.start_date).toLocaleDateString()}.`,
            target_role: user?.role === 'hr' ? 'admin' : 'hr',
            type: 'leave',
            created_by: leave.user_id
        });

        res.status(201).json(leave);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

const handleLeaveUpdate = async (req, res) => {
    try {
        const id = req.params.id || req.query.id;
        if (!id) return res.status(400).json({ error: 'Leave ID required' });

        const oldLeave = await Leave.findById(id);
        const leave = await Leave.findByIdAndUpdate(id, req.body, { new: true });

        if (oldLeave && leave && oldLeave.status !== leave.status) {
            const statusLabel = leave.status.charAt(0).toUpperCase() + leave.status.slice(1);
            await Notification.create({
                title: `📅 Leave Request ${statusLabel}`,
                message: `Your leave request for ${new Date(leave.start_date).toLocaleDateString()} has been ${leave.status}.`,
                target_user: toObjectId(leave.user_id),
                target_role: 'none',
                type: 'leave'
            });
        }
        res.json(leave);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

const handleTaskUpdate = async (req, res) => {
    try {
        const id = req.params.id || req.query.id;
        if (!id) return res.status(400).json({ error: 'Task ID required' });

        const oldTask = await Task.findById(id);
        const task = await Task.findByIdAndUpdate(id, req.body, { new: true });

        // If assigned_to changed, notify the new user
        if (task && task.assigned_to && (!oldTask || oldTask.assigned_to?.toString() !== task.assigned_to.toString())) {
            await Notification.create({
                title: `📝 Task Re-assigned`,
                message: `You have been assigned a task: ${task.title}`,
                target_user: task.assigned_to,
                target_role: 'none',
                type: 'task'
            });
        }
        res.json(task);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

router.put('/leaves', handleLeaveUpdate);
router.patch('/leaves', handleLeaveUpdate);
router.put('/leaves/:id', handleLeaveUpdate);
router.patch('/leaves/:id', handleLeaveUpdate);

const handleAttendanceAdminUpdate = async (req, res, next) => {
    if (!req.body.admin_update_times) return next();

    try {
        const id = req.params.id || req.query.id;
        const record = await Attendance.findById(id).populate('user_id');
        if (!record) return res.status(404).json({ error: 'Attendance not found' });

        const updates = req.body;
        if (updates.sessions) record.sessions = updates.sessions;
        if (updates.breaks) record.breaks = updates.breaks;

        let totalClockSeconds = 0;
        let totalBreakSeconds = 0;
        let isCurrentSessionOpen = false;
        let isCurrentBreakOpen = false;

        if (record.sessions) {
            record.sessions.forEach(s => {
                if (s.clockInAt && s.clockOutAt) {
                    s.durationSeconds = Math.floor((new Date(s.clockOutAt) - new Date(s.clockInAt)) / 1000);
                    totalClockSeconds += s.durationSeconds;
                } else if (s.clockInAt) {
                    isCurrentSessionOpen = true;
                }
            });
        }

        if (record.breaks) {
            record.breaks.forEach(b => {
                if (b.breakInAt && b.breakOutAt) {
                    b.durationSeconds = Math.floor((new Date(b.breakOutAt) - new Date(b.breakInAt)) / 1000);
                    totalBreakSeconds += b.durationSeconds;
                } else if (b.breakInAt) {
                    isCurrentBreakOpen = true;
                }
            });
        }

        record.currentSessionOpen = isCurrentSessionOpen;
        record.currentBreakOpen = isCurrentBreakOpen;

        if (isCurrentSessionOpen && record.sessions && record.sessions.length > 0) {
            record.lastClockInAt = record.sessions[record.sessions.length - 1].clockInAt;
        }

        record.totals = record.totals || {};
        record.totals.totalClockSeconds = totalClockSeconds;
        record.totals.totalBreakSeconds = totalBreakSeconds;
        record.totals.workSeconds = Math.max(0, totalClockSeconds - totalBreakSeconds);

        const settings = await SystemSettings.findOne();
        const firstClockIn = record.sessions && record.sessions.length > 0 ? record.sessions[0].clockInAt : null;

        if (firstClockIn) {
            const shiftType = record.user_id?.shift_type || 'full_day';
            const startTimeStr = shiftType === 'half_day' ? (settings?.half_day_start_time || '09:00') : (settings?.work_start_time || '09:00');
            const threshold = shiftType === 'half_day' ? (settings?.half_day_late_threshold ?? 15) : (settings?.late_threshold_minutes ?? 15);

            const { h: inH, m: inM } = getISTTimeParts(new Date(firstClockIn));
            const [targetH, targetM] = startTimeStr.split(':').map(Number);

            const nowTotalMinutes = inH * 60 + inM;
            const targetTotalMinutes = targetH * 60 + targetM;
            const limitTotalMinutes = targetTotalMinutes + threshold;

            if (nowTotalMinutes > limitTotalMinutes) {
                record.is_late = true;
                record.late_minutes = nowTotalMinutes - targetTotalMinutes;
            } else {
                record.is_late = false;
                record.late_minutes = 0;
            }
        }

        const shiftType = record.user_id?.shift_type || 'full_day';
        const overtimeEnabled = settings?.overtime_enabled !== false;
        const oThresholdHours = shiftType === 'half_day'
            ? (settings?.half_day_overtime_threshold_hours ?? 4)
            : (settings?.overtime_threshold_hours ?? 8);
        const thresholdSeconds = oThresholdHours * 3600;

        if (overtimeEnabled) {
            record.totals.overtimeSeconds = Math.max(0, record.totals.workSeconds - thresholdSeconds);
        } else {
            record.totals.overtimeSeconds = 0;
        }

        if (record.totals.workSeconds < thresholdSeconds) {
            record.is_early_leave = true;
            record.early_leave_minutes = Math.round((thresholdSeconds - record.totals.workSeconds) / 60);
        } else {
            record.is_early_leave = false;
            record.early_leave_minutes = 0;
        }

        const uid = record.user_id._id || record.user_id;
        record.user_id = uid;

        await record.save();

        const newRecord = await Attendance.findById(record._id).populate('user_id');
        const o = newRecord.toObject({ virtuals: true });
        o.id = o._id.toString();

        return res.json(o);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

router.put('/attendance', handleAttendanceAdminUpdate);
router.patch('/attendance', handleAttendanceAdminUpdate);
router.put('/attendance/:id', handleAttendanceAdminUpdate);
router.patch('/attendance/:id', handleAttendanceAdminUpdate);

router.put('/tasks', handleTaskUpdate);
router.patch('/tasks', handleTaskUpdate);
router.put('/tasks/:id', handleTaskUpdate);
router.patch('/tasks/:id', handleTaskUpdate);
router.post('/tasks', factory.createOne(Task));
router.delete('/tasks', factory.deleteOne(Task));
router.delete('/tasks/:id', factory.deleteOne(Task));

// --- Standard CRUD Routes --- 
defineStandardRoutes('/profiles', Profile, 'designation client');
defineStandardRoutes('/clients', Client);

// Modified Tasks route to restrict visibility for employees
router.get('/tasks', async (req, res) => {
    try {
        const { assigned_to, user_id, role } = req.query;
        let query = {};

        // If not admin/hr, restrict to assigned tasks only
        if (role !== 'admin' && role !== 'hr') {
            const effectiveUserId = user_id || assigned_to;
            if (effectiveUserId) {
                query.assigned_to = { $in: [effectiveUserId, toObjectId(effectiveUserId)] };
            } else {
                // If no user_id provided but they aren't admin/hr, show nothing or return error
                return res.json([]);
            }
        } else if (assigned_to) {
            query.assigned_to = { $in: [assigned_to, toObjectId(assigned_to)] };
        }

        const tasks = await Task.find(query)
            .populate('assigned_to', 'full_name username')
            .populate('client_id', 'company_name')
            .sort({ created_at: -1 });

        res.json(tasks.map(t => {
            const o = t.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

defineStandardRoutes('/attendance', Attendance, 'user_id');
defineStandardRoutes('/leaves', Leave);
defineStandardRoutes('/departments', Department);
defineStandardRoutes('/designations', Designation, 'departments');
defineStandardRoutes('/holidays', Holiday);
defineStandardRoutes('/followups', FollowUp);

// --- Warnings Routes Re-defined below with security ---

// /announcements/my MUST be before /announcements to avoid route shadowing
router.get('/announcements/my', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ created_at: -1 });
        res.json(announcements.map(a => {
            const o = a.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ created_at: -1 });
        res.json(announcements.map(a => {
            const o = a.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/announcements', async (req, res) => {
    const { id } = req.query;
    try {
        const a = await Announcement.findByIdAndUpdate(id, req.body, { new: true });
        if (!a) return res.status(404).json({ error: 'Not found' });
        const o = a.toObject({ virtuals: true });
        o.id = o._id.toString();
        res.json(o);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/announcements', async (req, res) => {
    const { id } = req.query;
    try {
        await Announcement.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/documents/my', async (req, res) => {
    try {
        const { user_id, role } = req.query;
        let profile = null;
        if (user_id) profile = await Profile.findById(user_id);

        let query = { visibility: 'public' };

        if (role === 'admin' || role === 'hr') {
            query = {}; // See all
        } else if (role === 'client') {
            const variantCid = profile?.client_id ? [profile.client_id.toString(), profile.client_id] : [];
            query = {
                $or: [
                    { visibility: 'public' },
                    { visibility: 'clients' },
                    { client_id: { $in: variantCid } }
                ]
            };
        } else {
            // Employee
            query = {
                $or: [
                    { visibility: 'public' },
                    { visibility: 'employees' }
                ]
            };
        }

        const docs = await Document.find(query).sort({ created_at: -1 });
        res.json(docs.map(d => {
            const o = d.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Custom overrides already handled above for: 
// POST /announcements, POST /holidays, POST /tasks, POST /leaves, PATCH /leaves/:id

defineStandardRoutes('/documents', Document);
defineStandardRoutes('/milestones', PaymentMilestone);
// --- Invoice Download Route ---
router.get('/invoices/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const client = await Client.findById(invoice.client_id);
        const milestone = invoice.milestone_id ? await PaymentMilestone.findById(invoice.milestone_id) : null;
        const settings = await SystemSettings.findOne() || {};

        let template = settings.invoice_template;

        const data = {
            company_name: String(settings.company_name || 'error Infotech'),
            company_email: String(settings.company_email || ''),
            company_phone: String(settings.company_phone || ''),
            company_address: String(settings.company_address || ''),
            invoice_number: String(invoice.invoice_number || ''),
            invoice_date: new Date(invoice.created_at).toLocaleDateString(),
            due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A',
            client_company: String(client ? client.company_name : 'N/A'),
            client_contact: String(client ? client.contact_person : 'N/A'),
            client_email: String(client ? client.email : 'N/A'),
            client_address: String(client ? client.address : 'N/A'),
            amount: String(invoice.amount.toLocaleString()),
            notes: String(invoice.notes || ''),
            invoice_notes: String(invoice.notes || ''),
            milestone_title: String(milestone ? milestone.title : 'Services Rendered / Milestone Payment'),
            milestone_description: String(milestone ? (milestone.description || '') : ''),
            status: String(invoice.status || ''),
            status_color: invoice.status === 'paid' ? '#059669' : '#d97706'
        };

        // Handle logo precisely
        const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
        data.company_logo = settings.company_logo ? `${baseUrl}${settings.company_logo}` : '';
        data.logo_html = data.company_logo ? `<img src="${data.company_logo}" style="max-height: 60px; margin-bottom: 10px;" alt="Logo">` : '';

        if (!template) {
            // Updated Fallback (No logic helpers, pure placeholders)
            template = `<!DOCTYPE html><html><head><style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1a202c; background-color: #ffffff; }
                .invoice-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; position: relative; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .top-left-shapes { position: absolute; top: 0; left: 0; width: 400px; height: 200px; z-index: 1; pointer-events: none; }
                .shape-1 { position: absolute; top: 0; left: 0; width: 80px; height: 80px; background: #2d3748; clip-path: polygon(0 0, 100% 0, 0 100%); }
                .shape-2 { position: absolute; top: 0; left: 40px; width: 140px; height: 140px; background: #319795; clip-path: polygon(0 0, 100% 0, 0 100%); opacity: 0.8; }
                .shape-3 { position: absolute; top: 0; left: 100px; width: 160px; height: 100px; background: #2c5282; clip-path: polygon(0 0, 100% 0, 0 100%); opacity: 0.9; }
                .bottom-right-shapes { position: absolute; bottom: 0; right: 0; width: 250px; height: 150px; z-index: 1; pointer-events: none; }
                .b-shape-1 { position: absolute; bottom: 0; right: 0; width: 150px; height: 100px; background: #2d3748; clip-path: polygon(100% 0, 100% 100%, 0 100%); }
                .b-shape-2 { position: absolute; bottom: 0; right: 50px; width: 120px; height: 140px; background: #319795; clip-path: polygon(100% 0, 100% 100%, 0 100%); opacity: 0.7; }
                .header { padding: 50px 60px 20px; display: flex; justify-content: flex-end; position: relative; z-index: 10; }
                .content { padding: 0 60px; position: relative; z-index: 10; }
                .invoice-title { font-size: 42px; font-weight: 900; color: #1a365d; margin: 0; letter-spacing: -1.5px; }
                .bill-section { display: flex; justify-content: space-between; margin-top: 30px; gap: 40px; }
                .bill-to { width: 45%; }
                .bill-to h3 { color: #2c5282; font-size: 18px; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; display: inline-block; padding-bottom: 2px; }
                .bill-to p { margin: 3px 0; font-size: 14px; color: #4a5568; line-height: 1.4; }
                .invoice-meta { width: 45%; text-align: left; font-size: 14px; color: #2d3748; }
                .invoice-meta p { margin: 4px 0; font-weight: 600; display: flex; justify-content: space-between; border-bottom: 1px dotted #e2e8f0; }
                .invoice-meta span { font-weight: 400; color: #4a5568; }
                .payment-info-box { margin-top: 35px; }
                .payment-info-box h3 { color: #2c5282; font-size: 18px; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; display: inline-block; padding-bottom: 2px; }
                .payment-info-box p { margin: 4px 0; font-size: 13px; display: flex; justify-content: space-between; }
                .table-container { margin-top: 45px; }
                .invoice-table { width: 100%; border-collapse: collapse; }
                .invoice-table th { text-align: left; padding: 12px 10px; border-bottom: 2px solid #1a365d; color: #1a365d; font-weight: 800; text-transform: uppercase; font-size: 13px; }
                .invoice-table td { padding: 18px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; }
                .text-right { text-align: right; }
                .totals-section { margin-top: 30px; float: right; width: 280px; }
                .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; color: #4a5568; }
                .grand-total-row { margin-top: 15px; border-top: 2px solid #1a365d; padding-top: 12px; font-weight: 900; font-size: 19px; color: #1a365d; display: flex; justify-content: space-between; }
                .footer { margin-top: 80px; padding: 0 60px 50px; position: relative; z-index: 10; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 100px; font-weight: 900; color: rgba(226, 232, 240, 0.20); white-space: nowrap; z-index: 0; pointer-events: none; letter-spacing: 12px; text-transform: uppercase; }
                .terms { margin-top: 40px; font-size: 12px; color: #718096; border-left: 3px solid #edf2f7; padding-left: 15px; }
                @media print { .invoice-page { margin: 0; box-shadow: none; } }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            </head><body>
            <div id="invoice-content" class="invoice-page">
                <div class="top-left-shapes"><div class="shape-1"></div><div class="shape-2"></div><div class="shape-3"></div></div>
                <div class="bottom-right-shapes"><div class="b-shape-1"></div><div class="b-shape-2"></div></div>
                <div class="watermark">{{company_name}}</div>
                <div class="header"><div>{{logo_html}}</div></div>
                <div class="content">
                    <h1 class="invoice-title">INVOICE</h1>
                    <p style="margin: 6px 0 0; font-weight: 700; font-size: 16px; color: #2d3748;">Bill Number: <span style="font-weight: 400; color: #4a5568;">#{{invoice_number}}</span></p>
                    <div class="bill-section">
                        <div class="bill-to">
                            <h3>Bill To:</h3>
                            <p><strong>{{client_company}}</strong></p>
                            <p>{{client_contact}}</p>
                            <p>{{client_email}}</p>
                            <p>{{client_address}}</p>
                        </div>
                        <div class="invoice-meta">
                            <p>Invoice Number: <span>#{{invoice_number}}</span></p>
                            <p>Date: <span>{{invoice_date}}</span></p>
                            <p>Due Date: <span>{{due_date}}</span></p>
                            <div class="payment-info-box">
                                <h3>Payment Information:</h3>
                                <p style="font-weight:700;">Bank: <span style="font-weight:400;">HDFC Bank Ltd.</span></p>
                                <p style="font-weight:700;">Name: <span style="font-weight:400;">Morgen Mexwell</span></p>
                                <p style="font-weight:700;">Account: <span style="font-weight:400;">0123 4567 8901</span></p>
                            </div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="invoice-table">
                            <thead><tr><th width="10%">Item</th><th width="50%">Description</th><th width="20%" class="text-right">Price</th><th width="20%" class="text-right">Total</th></tr></thead>
                            <tbody><tr>
                                <td>01.</td>
                                <td><strong>{{milestone_title}}</strong><br><span style="font-size: 12px; color: #718096;">{{milestone_description}}</span></td>
                                <td class="text-right">₹{{amount}}</td>
                                <td class="text-right">₹{{amount}}</td>
                            </tr></tbody>
                        </table>
                    </div>
                    <div style="overflow: hidden;">
                        <div class="totals-section">
                            <div class="total-row"><span>Sub Total:</span><span>₹{{amount}}</span></div>
                            <div class="total-row"><span>Sales Tax:</span><span>₹0.00</span></div>
                            <div class="grand-total-row"><span>TOTAL:</span><span>₹{{amount}}</span></div>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <div style="font-size: 13px; color: #4a5568;">
                        <p style="margin-bottom: 4px;"><strong>Pay to:</strong></p>
                        <p style="margin: 0;">BSB: 000-000</p>
                        <p style="margin: 0;">Account Number: 0000 0000</p>
                    </div>
                    <div class="terms">
                        <p style="font-weight: 700; color: #2d3748; margin-bottom: 4px; text-transform: uppercase;">Term and Conditions:</p>
                        <p>Payment is due 30 days from the invoice date.</p>
                        <p>{{notes}}</p>
                    </div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    const element = document.getElementById('invoice-content');
                    const opt = {
                        margin: 0,
                        filename: 'Invoice_{{invoice_number}}.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    
                    // Generate and Download
                    html2pdf().set(opt).from(element).save().then(() => {
                        // Optional: close window after download starts
                        // setTimeout(() => window.close(), 1000);
                    });
                };
            </script>
            </body></html>`;
        }

        let html = template;
        Object.keys(data).forEach(key => {
            // Correctly escape curly braces: match literal { repeated 2-3 times
            const regex = new RegExp(`\\{{2,3}\\s*${key}\\s*\\}{2,3}`, 'g');
            html = html.replace(regex, data[key]);
        });

        res.setHeader('Content-Type', 'text/html');
        // Use 'inline' instead of 'attachment' so the browser opens the page 
        // and runs the JavaScript to generate the PDF
        res.setHeader('Content-Disposition', 'inline');
        res.send(html);
    } catch (err) {
        console.error('Invoice download error:', err);
        res.status(500).json({ error: err.message });
    }
});

defineStandardRoutes('/invoices', Invoice);
defineStandardRoutes('/task_time_logs', TaskTimeLog);
defineStandardRoutes('/client_notes', ClientNote);
defineStandardRoutes('/allowed_networks', AllowedNetwork);

// --- Task Time Logs (Custom) ---
router.post('/task_time_logs/start', async (req, res) => {
    try {
        const { task_id, user_id } = req.body;
        // Check if user has ANY active timer
        const active = await TaskTimeLog.findOne({ user_id, end_time: null });
        if (active) {
            return res.status(400).json({ error: 'You already have an active timer running.' });
        }

        const log = await TaskTimeLog.create({
            task_id: toObjectId(task_id),
            user_id: toObjectId(user_id),
            start_time: new Date()
        });

        // Update task status to in_progress if it was pending
        await Task.findByIdAndUpdate(task_id, { status: 'in_progress' });

        const obj = log.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.status(201).json(obj);
    } catch (err) {
        console.error('Start timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/task_time_logs/pause', async (req, res) => {
    try {
        const { task_id, user_id } = req.body;
        const active = await TaskTimeLog.findOne({
            task_id: toObjectId(task_id),
            user_id: toObjectId(user_id),
            end_time: null
        });

        if (!active) {
            return res.status(404).json({ error: 'No active timer found for this task.' });
        }

        const endTime = new Date();
        const duration = Math.floor((endTime - active.start_time) / 1000); // seconds

        active.end_time = endTime;
        active.duration = duration;
        await active.save();

        // Update task total time
        await Task.findByIdAndUpdate(task_id, {
            $inc: { total_time_spent: duration }
        });

        const obj = active.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) {
        console.error('Pause timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/task_time_logs/active', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'User ID required' });

        const active = await TaskTimeLog.findOne({
            user_id: toObjectId(user_id),
            end_time: null
        }).populate('task_id');

        if (!active) return res.json(null);

        const obj = active.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        if (obj.task_id) {
            // Match frontend expectation for the active timer structure
            obj.tasks = { title: obj.task_id.title };
            obj.task_id = obj.task_id._id.toString();
        }
        res.json(obj);
    } catch (err) {
        console.error('Get active timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Chat Routes (Custom) ---

// Get my chats (by user_id via participant_1 or participant_2 OR group membership)
router.get('/chats', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            // No user_id = return all chats (admin view)
            const all = await Chat.find().sort({ last_message_at: -1, created_at: -1 });
            return res.json(all.map(c => { const o = c.toObject({ virtuals: true }); o.id = o._id.toString(); return o; }));
        }

        // --- Direct chats ---
        // participant_1/participant_2 are Mixed, stored as strings OR objectIds
        // So we query both forms to be safe
        let userObjectId = null;
        if (mongoose.isValidObjectId(user_id)) {
            userObjectId = new mongoose.Types.ObjectId(user_id);
        }
        const idVariants = userObjectId ? [user_id, userObjectId] : [user_id];

        const directChats = await Chat.find({
            chat_type: 'direct',
            $or: [
                { participant_1: { $in: idVariants } },
                { participant_2: { $in: idVariants } }
            ]
        }).sort({ last_message_at: -1, created_at: -1 });

        // --- Group chats: look up ChatMember with ObjectId ---
        let memberOf = [];
        if (userObjectId) {
            memberOf = await ChatMember.find({ user_id: userObjectId }).select('chat_id');
        }

        // Fallback: also try string match in case stored differently (legacy or mixed)
        if (memberOf.length === 0) {
            memberOf = await ChatMember.find({ user_id: user_id.toString() }).select('chat_id');
        }

        const groupChatIds = memberOf.map(m => m.chat_id.toString());
        let groupChats = [];
        if (groupChatIds.length > 0) {
            groupChats = await Chat.find({
                chat_type: 'group',
                _id: { $in: groupChatIds }
            }).sort({ last_message_at: -1, created_at: -1 });
        }

        const allChats = [...groupChats, ...directChats];
        res.json(allChats.map(c => {
            const o = c.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        console.error('GET /chats error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get or create a direct chat between two users
router.post('/chats/get-or-create', async (req, res) => {
    try {
        const { target_user_id, current_user_id } = req.body;
        let chat = await Chat.findOne({
            chat_type: 'direct',
            $or: [
                { participant_1: current_user_id, participant_2: target_user_id },
                { participant_1: target_user_id, participant_2: current_user_id }
            ]
        });
        if (!chat) {
            chat = await Chat.create({
                participant_1: current_user_id,
                participant_2: target_user_id,
                chat_type: 'direct'
            });
        }
        const obj = chat.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create group chat
router.post('/chats/group', async (req, res) => {
    try {
        const { group_name, group_description, member_ids, created_by } = req.body;

        const chat = await Chat.create({
            chat_type: 'group',
            group_name,
            group_description,
            created_by: toObjectId(created_by)
        });

        // Add creator as first member (admin)
        if (created_by) {
            await ChatMember.findOneAndUpdate(
                { chat_id: chat._id, user_id: toObjectId(created_by) },
                { $set: { is_admin: true, joined_at: new Date() } },
                { upsert: true, new: true }
            );
        }

        // Add other members
        if (Array.isArray(member_ids)) {
            for (const uid of member_ids) {
                // Skip creator if they're in the member_ids list (already added above)
                if (uid.toString() !== created_by.toString()) {
                    await ChatMember.findOneAndUpdate(
                        { chat_id: chat._id, user_id: toObjectId(uid) },
                        { $setOnInsert: { is_admin: false, joined_at: new Date() } },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        const obj = chat.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.status(201).json(obj);
    } catch (err) {
        console.error('POST /chats/group error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get or create the Global/Common chat
router.get('/chats/common', async (req, res) => {
    try {
        console.log('GET /chats/common called with user_id:', req.query.user_id);
        let chat = await Chat.findOne({ group_name: 'Common Group', chat_type: 'group' });
        if (!chat) {
            chat = await Chat.create({
                chat_type: 'group',
                group_name: 'Common Group',
                group_description: 'Universal chat for all employees and admins',
                created_by: null // System created
            });
        }

        // Auto-add the requesting user if we have their ID (from token/query)
        const userId = req.query.user_id || req.body.user_id;
        const userObjId = toObjectId(userId);
        if (userObjId) {
            await ChatMember.findOneAndUpdate(
                { chat_id: chat._id, user_id: userObjId },
                { chat_id: chat._id, user_id: userObjId, joined_at: new Date() },
                { upsert: true }
            );
        }

        const obj = chat.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get chat by ID
router.get('/chats/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Not found' });
        const obj = chat.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update group chat
router.put('/chats', async (req, res) => {
    const { id } = req.query;
    try {
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid ID' });
        const chat = await Chat.findByIdAndUpdate(id, req.body, { new: true });
        if (!chat) return res.status(404).json({ error: 'Not found' });
        const obj = chat.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.json(obj);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Leave group chat  
router.post('/chats/leave', async (req, res) => {
    try {
        const { chat_id } = req.query;
        const { user_id } = req.body;
        await ChatMember.findOneAndDelete({ chat_id, user_id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete a message — only the sender can delete their own message
router.delete('/messages', async (req, res) => {
    try {
        const { id, user_id } = req.query;
        if (!id) return res.status(400).json({ error: 'Message id is required' });

        const msg = await Message.findById(id);
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        // If user_id is provided, enforce ownership
        if (user_id && user_id !== 'undefined') {
            const userObjId = toObjectId(user_id);
            const senderStr = msg.sender_id ? msg.sender_id.toString() : null;
            const userStr = userObjId ? userObjId.toString() : null;
            if (senderStr && userStr && senderStr !== userStr) {
                return res.status(403).json({ error: 'You can only delete your own messages' });
            }
        }

        await msg.deleteOne();
        res.status(204).send();
    } catch (err) {
        console.error('DELETE /messages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Messages Routes (Custom) ---

// Get messages for a chat
router.get('/messages', async (req, res) => {
    try {
        const { chat_id } = req.query;
        let query = {};
        let sort = { created_at: -1 }; // Default to recent first

        if (chat_id && chat_id !== 'undefined' && chat_id !== 'all') {
            query.chat_id = toObjectId(chat_id);
            sort = { created_at: 1 }; // For specific chat, sort by time (old to new)
        }

        const msgs = await Message.find(query).sort(sort).limit(100);
        res.json(msgs.map(m => {
            const o = m.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        console.error('GET /messages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send a message (support content or file)
router.post('/messages', async (req, res) => {
    try {
        const { chat_id, sender_id, content, file_url, file_type, file_name } = req.body;
        console.log('Sending message to chat:', chat_id, 'sender:', sender_id);

        const chatObjId = toObjectId(chat_id);
        const senderObjId = toObjectId(sender_id);

        if (!chatObjId || !senderObjId) {
            return res.status(400).json({ error: 'Invalid IDs' });
        }

        // Ensure sender is a member (auto-recovery)
        await ChatMember.findOneAndUpdate(
            { chat_id: chatObjId, user_id: senderObjId },
            { $setOnInsert: { joined_at: new Date() } },
            { upsert: true }
        );

        const msg = await Message.create({
            chat_id: chatObjId,
            sender_id: senderObjId,
            content: content || '',
            file_url,
            file_type,
            file_name
        });

        // Update last_message on chat
        const lastMsgPreview = file_url ? `[File: ${file_name || 'Media'}]` : (content || '').substring(0, 100);
        await Chat.findByIdAndUpdate(chatObjId, {
            last_message: lastMsgPreview,
            last_message_at: new Date()
        });

        const obj = msg.toObject({ virtuals: true });
        obj.id = obj._id.toString();

        // ── Fire chat notifications for all receivers (non-blocking) ──
        (async () => {
            // Create notification non-blocking
            try {
                const Notification = require('../models/Notification');

                // Get sender profile for display name
                const sender = await Profile.findById(senderObjId).lean();
                const senderName = sender?.full_name || sender?.username || 'Someone';

                // Get chat info
                const chat = await Chat.findById(chatObjId).lean();
                const chatName = chat?.group_name || chat?.name || 'Chat';
                const isDirect = chat?.chat_type === 'direct';

                let receivers = [];

                if (isDirect) {
                    // For direct chats, receivers are the participant that is NOT the sender
                    const p1 = chat.participant_1 ? chat.participant_1.toString() : null;
                    const p2 = chat.participant_2 ? chat.participant_2.toString() : null;
                    const targetId = p1 === senderObjId.toString() ? p2 : p1;
                    if (targetId) {
                        receivers.push({ user_id: toObjectId(targetId) });
                    }
                } else {
                    // For group chats, get all members except sender
                    receivers = await ChatMember.find({
                        chat_id: chatObjId,
                        user_id: { $ne: senderObjId }
                    }).lean();
                }

                const notifTitle = isDirect
                    ? `New message from ${senderName}`
                    : `${senderName} in ${chatName}`;
                const notifMessage = file_url
                    ? `📎 ${file_name || 'Sent a file'}`
                    : (content || '').substring(0, 120);

                // Create individual notifications
                const notifDocs = receivers.map(m => {
                    const rId = toObjectId(m.user_id || m._id);
                    if (!rId) return null;
                    return {
                        title: notifTitle,
                        message: notifMessage,
                        type: 'chat',
                        target_role: 'none',
                        target_user: rId,
                        created_by: senderObjId,
                        meta: { chat_id: chatObjId.toString(), message_id: obj.id }
                    };
                }).filter(n => n !== null);

                if (notifDocs.length > 0) {
                    await Notification.insertMany(notifDocs);
                }
            } catch (notifErr) {
                console.error('Chat notification error:', notifErr.message);
            }
        })();

        res.status(201).json(obj);
    } catch (err) {
        console.error('POST /messages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark messages as read
router.post('/messages/read', async (req, res) => {
    try {
        const { chat_id, user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        const userObjId = toObjectId(user_id);

        if (chat_id === 'all') {
            // Clear ALL chat notifications for this user
            await Notification.updateMany(
                { target_user: userObjId, type: 'chat', is_read_by: { $ne: userObjId } },
                { $addToSet: { is_read_by: userObjId } }
            );
            return res.json({ success: true, message: 'All chat notifications cleared' });
        }

        if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
        const chatObjId = toObjectId(chat_id);

        await Message.updateMany(
            { chat_id: chatObjId, sender_id: { $ne: userObjId }, is_read: false },
            { $set: { is_read: true } }
        );

        // Also mark related chat notifications as read for this user
        // Match chat_id as both string and ObjectId to be safe
        await Notification.updateMany(
            {
                target_user: userObjId,
                type: 'chat',
                $or: [
                    { 'meta.chat_id': chat_id.toString() },
                    { 'meta.chat_id': chatObjId }
                ],
                is_read_by: { $ne: userObjId }
            },
            { $addToSet: { is_read_by: userObjId } }
        );

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get total unread chat messages count for a user
router.get('/messages/unread-count', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id || user_id === 'undefined') return res.json({ count: 0 });

        const userObjId = toObjectId(user_id);
        if (!userObjId) return res.json({ count: 0 });

        const count = await Notification.countDocuments({
            target_user: userObjId,
            type: 'chat',
            is_read_by: { $ne: userObjId }
        });

        res.json({ count });
    } catch (err) {
        console.error('Unread count error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Chat Members Routes ---
router.get('/chat_members', async (req, res) => {
    try {
        const { chat_id } = req.query;
        if (!chat_id) return res.json([]);

        const chat = await Chat.findById(chat_id);
        if (!chat) return res.json([]);

        let profiles = [];

        if (chat.chat_type === 'direct') {
            // Return BOTH participants for direct chat
            const p1 = chat.participant_1;
            const p2 = chat.participant_2;
            const ids = [p1, p2].map(id => toObjectId(id)).filter(Boolean);
            profiles = await Profile.find({ _id: { $in: ids } });
        } else if (chat.chat_type === 'group' && chat.group_name === 'Common Group') {
            // Return ALL active users for common group
            profiles = await Profile.find({ is_active: true });
        } else {
            // Return specific group members
            const members = await ChatMember.find({ chat_id }).populate('user_id');
            return res.json(members.map(m => {
                const o = m.toObject({ virtuals: true });
                o.id = o._id.toString();
                if (o.user_id && typeof o.user_id === 'object' && o.user_id._id) {
                    o.profiles = { ...o.user_id, id: o.user_id._id.toString() };
                    o.user_id = o.user_id._id.toString();
                }
                return o;
            }));
        }

        // Synthesize member objects for direct/common chats
        res.json(profiles.map(p => ({
            id: `synth_${p._id}`,
            chat_id: chat._id.toString(),
            user_id: p._id.toString(),
            profiles: { ...p.toObject(), id: p._id.toString() },
            is_admin: false,
            joined_at: p.created_at
        })));

    } catch (err) {
        console.error('GET /chat_members error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/chat_members', async (req, res) => {
    try {
        const body = { ...req.body };
        if (body.chat_id) body.chat_id = toObjectId(body.chat_id);
        if (body.user_id) body.user_id = toObjectId(body.user_id);
        // Upsert: avoid duplicate key errors
        const member = await ChatMember.findOneAndUpdate(
            { chat_id: body.chat_id, user_id: body.user_id },
            { $setOnInsert: body },
            { upsert: true, new: true }
        );
        const obj = member.toObject({ virtuals: true });
        obj.id = obj._id.toString();
        res.status(201).json(obj);
    } catch (err) {
        console.error('POST /chat_members error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/chat_members', async (req, res) => {
    try {
        const { chat_id, user_id } = req.query;
        await ChatMember.findOneAndDelete({
            chat_id: toObjectId(chat_id),
            user_id: toObjectId(user_id)
        });
        res.status(204).json(null);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Create User
router.post('/admin/create-user', async (req, res) => {
    try {
        const { username, password, role, full_name, department, designation_id, client_id, is_active, email, phone, shift_type, date_of_birth } = req.body;

        // Build user data with proper casting
        const userData = {
            username,
            password_hash: password,
            role: role || 'employee',
            full_name: full_name || null,
            email: email ? email.toLowerCase().trim() : null,
            phone: phone || null,
            department: department || null,
            designation_id: toObjectId(designation_id),
            client_id: toObjectId(client_id),
            is_active: is_active !== undefined ? is_active : true,
            shift_type: shift_type || 'full_day',
            date_of_birth: date_of_birth || null
        };

        const user = await Profile.create(userData);

        // Auto-add to common group
        const commonChat = await Chat.findOne({ group_name: 'Common Group', chat_type: 'group' });
        if (commonChat) {
            await ChatMember.findOneAndUpdate(
                { chat_id: commonChat._id, user_id: user._id },
                { chat_id: commonChat._id, user_id: user._id, joined_at: new Date() },
                { upsert: true }
            );
        }

        res.status(201).json({ success: true, user: { id: user._id, role: user.role } });
    } catch (err) {
        console.error('Admin create user error:', err);
        res.status(400).json({ success: false, error: err.message });
    }
});

// Admin: Change password
router.post('/admin/change-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        console.log(`Admin password reset attempt for userId: ${userId}`);

        if (!userId || !newPassword) {
            return res.status(400).json({ error: 'userId and newPassword are required' });
        }

        const user = await Profile.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Setting password_hash directly and calling save() will trigger the pre-save hook
        user.password_hash = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- AI Assistant Route ---
router.post('/ai-assistant', async (req, res) => {
    const logFile = path.join(__dirname, '../../ai_debug.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] AI Request received\n`);
    try {
        const { contents } = req.body;
        if (!contents || !Array.isArray(contents)) {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] Invalid contents format\n`);
            return res.status(400).json({ error: 'Invalid contents format' });
        }

        // Track AI Usage Performance Action
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                if (decoded && decoded.id) {
                    trackActivity(decoded.id, 'ai_usage_count');
                }
            } catch (e) { /* ignore tracking error */ }
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] API Key missing or default\n`);
            return res.status(400).json({
                error: 'AI API Key is missing.',
                details: 'Please add your free GEMINI_API_KEY to the backend .env file. You can get a free key from https://aistudio.google.com/'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Model initialized: gemini-1.5-flash\n`);

        // Gemini expects history to alternate: user, model, user, model...
        const history = [];
        for (let i = 0; i < contents.length - 1; i++) {
            const msg = contents[i];
            history.push({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: msg.parts
            });
        }

        const currentPrompt = contents[contents.length - 1].parts[0].text;
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] History length: ${history.length}, Current Prompt: ${currentPrompt.substring(0, 50)}\n`);

        const chat = model.startChat({
            history: history.length > 0 ? history : [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(': keep-alive\n\n');

        const result = await chat.sendMessageStream(currentPrompt);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (!chunkText) continue;

            const sseData = {
                candidates: [{ content: { parts: [{ text: chunkText }] } }]
            };
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        }
        res.end();
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Response finished successfully\n`);
    } catch (err) {
        console.error('AI Assistant Error:', err);
        // Log the full error object if possible
        const errDetails = err.response ? JSON.stringify(err.response, null, 2) : err.stack;
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ERROR: ${err.message}\nDETAILS/STACK: ${errDetails}\n`);

        if (!res.headersSent) {
            res.status(500).json({ error: 'AI Assistant failed', details: err.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    }
});

// --- Notifications ---
router.get('/notifications', async (req, res) => {
    try {
        const { user_id, role, limit = 20 } = req.query;
        if (!user_id || !role) return res.status(400).json({ error: 'user_id and role are required' });

        const currentUserId = toObjectId(user_id);
        const query = {
            $and: [
                { created_by: { $ne: currentUserId } }, // Sender never gets the notification
                {
                    $or: [
                        // Case 1: Warnings and Tasks (Strictly private to the assigned user)
                        {
                            type: { $in: ['warning', 'task'] },
                            target_user: currentUserId
                        },
                        // Case 2: System, Birthdays, etc. (Follows role-based and targeting logic)
                        {
                            type: { $nin: ['warning', 'task'] },
                            $or: [
                                { target_role: 'all' },
                                { target_role: role },
                                { target_user: currentUserId }
                            ]
                        }
                    ]
                }
            ]
        };

        // Admins can see everything except their own sent notifications
        if (role === 'admin') {
            query.$and.pop(); // Remove the restrictive visibility for admins
        }

        const notifications = await Notification.find(query)
            .sort({ created_at: -1 })
            .limit(parseInt(limit));

        res.json(notifications.map(n => {
            const o = n.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        console.error('Fetch notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.get('/notifications/all', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ created_at: -1 }).limit(100);
        res.json(notifications.map(n => {
            const o = n.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/notifications/:id', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/notifications', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.query.id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/notifications/read', async (req, res) => {
    try {
        const { user_id, notification_id } = req.body;
        if (!user_id || !notification_id) return res.status(400).json({ error: 'user_id and notification_id are required' });

        await Notification.findByIdAndUpdate(notification_id, {
            $addToSet: { is_read_by: toObjectId(user_id) }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

router.post('/notifications', async (req, res) => {
    try {
        const { title, message, target_role, target_user, type, created_by } = req.body;
        if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

        const notification = new Notification({
            title,
            message,
            target_role: target_role || (target_user ? 'none' : 'all'),
            target_user: toObjectId(target_user),
            type: type || 'system',
            created_by: toObjectId(created_by)
        });

        await notification.save();
        res.status(201).json(notification);
    } catch (err) {
        console.error('Create notification error:', err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// --- Birthday Notifications Trigger ---
router.post('/notifications/trigger-birthdays', async (req, res) => {
    try {
        const today = new Date();
        const month = today.getMonth();
        const day = today.getDate();

        // Find employees with birthday today
        const employees = await Profile.find({
            date_of_birth: { $ne: null },
            is_active: true
        });

        const bdaysToday = employees.filter(emp => {
            const dob = new Date(emp.date_of_birth);
            return dob.getMonth() === month && dob.getDate() === day;
        });

        let sentCount = 0;
        for (const emp of bdaysToday) {
            // Check if we already sent a birthday notification for this user TODAY
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const existing = await Notification.findOne({
                type: 'birthday',
                message: { $regex: emp.full_name || emp.username },
                created_at: { $gte: startOfDay }
            });

            if (!existing) {
                await Notification.create({
                    title: `✨ Happy Birthday, ${emp.full_name || emp.username}! 🎂`,
                    message: `Wishing ${emp.full_name || emp.username} a fantastic day filled with joy and success! Let's celebrate! 🎈`,
                    target_role: 'all',
                    type: 'birthday'
                });
                sentCount++;
            }
        }

        res.json({ success: true, birthdays_found: bdaysToday.length, notifications_sent: sentCount });
    } catch (err) {
        console.error('Trigger birthdays error:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- Task Time Logs ---

// GET active timer for a user
router.get('/task_time_logs/active', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.json(null);

        const activeLog = await TaskTimeLog.findOne({
            user_id: toObjectId(user_id),
            end_time: null
        }).populate('task_id', 'title');

        if (!activeLog) return res.json(null);

        const o = activeLog.toObject({ virtuals: true });
        o.id = o._id.toString();
        o.task_id = o.task_id?._id?.toString() || o.task_id?.toString();
        o.tasks = activeLog.task_id ? { title: activeLog.task_id.title } : null;
        res.json(o);
    } catch (err) {
        console.error('Get active timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET logs for a task or user
router.get('/task_time_logs', async (req, res) => {
    try {
        const { task_id, user_id } = req.query;
        const query = {};
        if (task_id) query.task_id = toObjectId(task_id);
        if (user_id) query.user_id = toObjectId(user_id);

        const logs = await TaskTimeLog.find(query).sort({ start_time: -1 });
        res.json(logs.map(log => {
            const o = log.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST start a timer
router.post('/task_time_logs', async (req, res) => {
    try {
        const { task_id, user_id } = req.body;

        // Stop any existing active timer for this user first
        await TaskTimeLog.updateMany(
            { user_id: toObjectId(user_id), end_time: null },
            { $set: { end_time: new Date() } }
        );

        const log = await TaskTimeLog.create({
            task_id: toObjectId(task_id),
            user_id: toObjectId(user_id),
            start_time: new Date(),
        });

        const o = log.toObject({ virtuals: true });
        o.id = o._id.toString();
        res.status(201).json(o);
    } catch (err) {
        console.error('Start timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST pause/stop a timer
router.post('/task_time_logs/pause', async (req, res) => {
    try {
        const { task_id, user_id } = req.body;

        const activeLog = await TaskTimeLog.findOne({
            task_id: toObjectId(task_id),
            user_id: toObjectId(user_id),
            end_time: null
        });

        if (!activeLog) return res.json({ message: 'No active timer found' });

        const now = new Date();
        const duration = Math.floor((now - activeLog.start_time) / 1000);
        activeLog.end_time = now;
        activeLog.duration = duration;
        await activeLog.save();

        const o = activeLog.toObject({ virtuals: true });
        o.id = o._id.toString();
        res.json(o);
    } catch (err) {
        console.error('Pause timer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Warning Routes ---

router.get('/warnings', async (req, res) => {
    try {
        const { user_id, role, all } = req.query;

        let query = {};
        if (all === 'true') {
            // Admin view - see everything
            query = {};
        } else if (user_id && role) {
            // Employee view - ONLY see specifically targeted warnings
            query = {
                user_id: toObjectId(user_id),
                is_active: true
            };
        }

        const warnings = await Warning.find(query)
            .sort({ created_at: -1 })
            .populate('user_id', 'full_name username') // targeted user
            .populate('created_by', 'full_name username'); // who sent it

        res.json(warnings.map(w => {
            const o = w.toObject({ virtuals: true });
            o.id = o._id.toString();
            return o;
        }));
    } catch (err) {
        console.error('Fetch warnings error:', err);
        res.status(500).json({ error: 'Failed to fetch warnings' });
    }
});

router.post('/warnings', async (req, res) => {
    try {
        const { title, message, severity, target_role, user_id, created_by, expires_at } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const warning = new Warning({
            title,
            message,
            severity: severity || 'medium',
            target_role: target_role || 'all',
            user_id: user_id ? toObjectId(user_id) : null,
            created_by: toObjectId(created_by),
            expires_at: expires_at || null
        });

        await warning.save();

        // Send notification to the assigned user
        if (user_id) {
            const Notification = require('../models/Notification');
            await Notification.create({
                title: `⚠️ New Warning: ${title}`,
                message: message,
                target_user: toObjectId(user_id),
                target_role: 'none',
                type: 'warning',
                created_by: toObjectId(created_by)
            });
        }

        res.status(201).json(warning);
    } catch (err) {
        console.error('Create warning error:', err);
        res.status(500).json({ error: 'Failed to create warning' });
    }
});

router.delete('/warnings/:id', async (req, res) => {
    try {
        await Warning.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Appreciations Routes ---
router.get('/appreciations', async (req, res) => {
    try {
        const { employee_id } = req.query;
        let query = {};
        if (employee_id) query.employee_id = toObjectId(employee_id);

        const appreciations = await Appreciation.find(query)
            .populate('employee_id', 'full_name username role avatar_url department')
            .populate('given_by', 'full_name username role avatar_url')
            .sort({ created_at: -1 });

        res.json(appreciations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/appreciations', async (req, res) => {
    try {
        const { employee_id, given_by, title, message, badge } = req.body;
        if (!employee_id || !given_by || !title || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const app = new Appreciation({
            employee_id: toObjectId(employee_id),
            given_by: toObjectId(given_by),
            title,
            message,
            badge: badge || 'Star Performer'
        });

        await app.save();

        // Send a notification to the appreciated employee!
        const Notification = require('../models/Notification');
        await Notification.create({
            title: `🏆 Appreciation: ${title}`,
            message: `You received an appreciation: "${message}"`,
            target_user: toObjectId(employee_id),
            target_role: 'none',
            type: 'system',
            created_by: toObjectId(given_by)
        });

        res.status(201).json(app);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/appreciations/:id', async (req, res) => {
    try {
        await Appreciation.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Salary Routes ---
router.get('/salaries', async (req, res) => {
    try {
        const { user_id, month, year, role } = req.query;
        let query = {};

        // If employee, restrict to their own records
        if (role === 'employee' && user_id) {
            query.user_id = toObjectId(user_id);
        } else if (user_id) {
            query.user_id = toObjectId(user_id);
        }

        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);

        const salaries = await Salary.find(query)
            .populate('user', 'full_name username role salary_per_month avatar_url department designation_id')
            .populate({
                path: 'user',
                populate: { path: 'designation', select: 'name' }
            })
            .sort({ year: -1, month: -1 });

        res.json(salaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/salaries', async (req, res) => {
    try {
        const { user_id, month, year, basic_salary, total_working_days, leave_days, hra, allowances, incentives, pf, other_deductions, bonus, late_entries, created_by } = req.body;

        const uid = toObjectId(user_id);
        if (!uid) return res.status(400).json({ error: 'Invalid User ID' });

        // Duplicate Check
        const existing = await Salary.findOne({ user_id: uid, month: Number(month), year: Number(year) });
        if (existing) {
            return res.status(400).json({ error: 'Salary already generated for this employee for this month.' });
        }

        // Calculation Engine
        const basic = Number(basic_salary) || 0;
        const workingDays = Number(total_working_days) || 26;
        const lDays = Number(leave_days) || 0;
        const lEntries = Number(late_entries) || 0;

        const perDay = basic / (workingDays || 26);
        const leaveDeduction = lDays * perDay;
        const latePenaltyDays = Math.floor(lEntries / 3) * 0.5;
        const latePenalty = latePenaltyDays * perDay;

        const gross = basic + (Number(hra) || 0) + (Number(allowances) || 0) + (Number(bonus) || 0) + (Number(incentives) || 0);
        const totalDed = leaveDeduction + latePenalty + (Number(pf) || 0) + (Number(other_deductions) || 0);
        const net = gross - totalDed;

        const salary = new Salary({
            ...req.body,
            user_id: uid,
            month: Number(month),
            year: Number(year),
            basic_salary: basic,
            leave_deductions: Math.round(leaveDeduction),
            late_penalty: Math.round(latePenalty),
            gross_salary: Math.round(gross),
            total_deductions: Math.round(totalDed),
            net_salary: Math.round(net),
            created_by: toObjectId(created_by)
        });

        await salary.save();
        res.status(201).json(salary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/salaries/:id', async (req, res) => {
    try {
        const current = await Salary.findById(req.params.id);
        if (!current) return res.status(404).json({ error: 'Record not found' });

        const { basic_salary, total_working_days, leave_days, late_entries, hra, allowances, bonus, incentives, pf, other_deductions } = req.body;

        const basic = basic_salary !== undefined ? Number(basic_salary) : current.basic_salary;
        const workingDays = total_working_days !== undefined ? Number(total_working_days) : current.total_working_days;
        const lDays = leave_days !== undefined ? Number(leave_days) : current.leave_days;
        const lEntries = late_entries !== undefined ? Number(late_entries) : current.late_entries;

        // Recalculate
        const perDay = basic / (workingDays || 1);
        const leaveDeduction = lDays * perDay;
        const latePenaltyDays = Math.floor(lEntries / 3) * 0.5;
        const latePenalty = latePenaltyDays * perDay;

        const gross = basic +
            (hra !== undefined ? Number(hra) : current.hra) +
            (allowances !== undefined ? Number(allowances) : current.allowances) +
            (bonus !== undefined ? Number(bonus) : current.bonus) +
            (incentives !== undefined ? Number(incentives) : current.incentives);

        const totalDed = leaveDeduction + latePenalty +
            (pf !== undefined ? Number(pf) : current.pf) +
            (other_deductions !== undefined ? Number(other_deductions) : current.other_deductions);

        const net = gross - totalDed;

        const updates = {
            ...req.body,
            basic_salary: basic,
            total_working_days: workingDays,
            leave_days: lDays,
            late_entries: lEntries,
            leave_deductions: Math.round(leaveDeduction),
            late_penalty: Math.round(latePenalty),
            gross_salary: Math.round(gross),
            total_deductions: Math.round(totalDed),
            net_salary: Math.round(net)
        };

        const salary = await Salary.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.json(salary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/salaries/:id', async (req, res) => {
    try {
        await Salary.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download Payslip (Similar to Invoice Download)
router.get('/salaries/download/:id', async (req, res) => {
    try {
        const salary = await Salary.findById(req.params.id)
            .populate('user_id')
            .populate({
                path: 'user_id',
                populate: { path: 'designation' }
            });

        if (!salary) return res.status(404).json({ error: 'Salary record not found' });

        const settings = await SystemSettings.findOne() || {};
        const logoUrl = settings.company_logo ? `https://eri.errorinfotech.in${settings.company_logo}` : 'https://eri.errorinfotech.in/logo.png';
        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const period = `${monthNames[salary.month]} ${salary.year}`;

        const data = {
            company_name: settings.company_name || 'Error Infotech',
            company_logo: logoUrl,
            company_address: settings.company_address || 'Surat, Gujarat, India',
            employee_name: salary.user_id?.full_name || salary.user_id?.username || 'Employee',
            employee_id: salary.user_id?.username || '-',
            designation: salary.user_id?.designation?.name || 'Staff',
            month_year: period,

            // Earnings
            basic: salary.basic_salary.toLocaleString('en-IN'),
            hra: (salary.hra || 0).toLocaleString('en-IN'),
            allowances: (salary.allowances || 0).toLocaleString('en-IN'),
            bonus: (salary.bonus || 0).toLocaleString('en-IN'),
            incentives: (salary.incentives || 0).toLocaleString('en-IN'),
            gross_total: salary.gross_salary.toLocaleString('en-IN'),

            // Deductions
            leave_ded_amount: (salary.leave_deductions || 0).toLocaleString('en-IN'),
            late_penalty_amount: (salary.late_penalty || 0).toLocaleString('en-IN'),
            pf: (salary.pf || 0).toLocaleString('en-IN'),
            other_deductions: (salary.other_deductions || 0).toLocaleString('en-IN'),
            total_ded_amount: salary.total_deductions.toLocaleString('en-IN'),

            net_total: salary.net_salary.toLocaleString('en-IN'),
            payment_date: salary.payment_date ? new Date(salary.payment_date).toLocaleDateString('en-GB') : '-',
            status: salary.status.toUpperCase()
        };

        const template = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Payslip - ${data.employee_name}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; color: #333; -webkit-print-color-adjust: exact; }
                .payslip-page { width: 210mm; min-height: 297mm; margin: auto; padding: 15mm; box-sizing: border-box; position: relative; }
                
                .header-logo { margin-bottom: 25px; text-align: left; }
                .header-logo img { height: 75px; width: auto; }
                
                .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; opacity: 0.04; font-weight: 800; z-index: 0; pointer-events: none; width: 100%; text-align: center; color: #000; text-transform: uppercase; }
                
                .main-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; position: relative; z-index: 1; }
                .main-table th, .main-table td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; text-align: left; }
                
                .bg-light { background-color: #f8fafc; }
                .font-bold { font-weight: 700; }
                .text-center { text-align: center !important; }
                .text-right { text-align: right !important; }
                
                .section-header { background: #f1f5f9; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; height: 35px; }
                
                .earnings-deductions-container { display: flex; width: 100%; border-left: 1.5px solid #000; border-right: 1.5px solid #000; border-bottom: 1.5px solid #000; }
                .half-table { width: 50%; border-collapse: collapse; }
                .half-table th, .half-table td { border: 1px solid #000; padding: 10px; font-size: 13px; }
                .half-table th { background: #f8fafc; text-align: center; font-weight: 700; }
                
                .summary-table { width: 100%; border-collapse: collapse; border-left: 1.5px solid #000; border-right: 1.5px solid #000; border-bottom: 1.5px solid #000; }
                .summary-table td { border: 1px solid #000; padding: 15px; font-size: 14px; }
                
                .net-salary-row { background: #475569; color: #fff; font-weight: 800; }
                .net-salary-row td { border-color: #475569; }

                .footer-notice { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="payslip-page" id="payslip-content">
                <div class="watermark">${data.company_name}</div>
                
                <div class="header-logo">
                    <img src="${data.company_logo}" alt="Logo">
                </div>

                <table class="main-table">
                    <tr>
                        <td class="font-bold bg-light" width="20%">Employee Name</td>
                        <td width="30%">${data.employee_name}</td>
                        <td class="font-bold bg-light" width="20%">Employee ID</td>
                        <td width="30%">${data.employee_id}</td>
                    </tr>
                    <tr>
                        <td class="font-bold bg-light">Designation</td>
                        <td>${data.designation}</td>
                        <td class="font-bold bg-light">Month & Year</td>
                        <td>${data.month_year}</td>
                    </tr>
                    <tr>
                        <td class="font-bold bg-light">Payment Method</td>
                        <td>Bank Transfer</td>
                        <td class="font-bold bg-light">Status</td>
                        <td class="font-bold" style="color: ${data.status === 'PAID' ? '#059669' : '#dc2626'}">${data.status}</td>
                    </tr>
                </table>

                <div style="height: 20px;"></div>

                <div style="display: flex; border: 1.5px solid #000; border-bottom: none;">
                    <div style="width: 50%; border-right: 1.5px solid #000; font-weight: 800; padding: 10px; background: #475569; color: #fff; text-align: center;">EARNINGS</div>
                    <div style="width: 50%; font-weight: 800; padding: 10px; background: #475569; color: #fff; text-align: center;">DEDUCTIONS</div>
                </div>

                <div style="display: flex;">
                    <!-- Earnings Column -->
                    <table class="half-table" style="border-left: 1.5px solid #000;">
                        <tr>
                            <td width="70%">Basic Salary</td>
                            <td width="30%" class="text-right">₹ ${data.basic}</td>
                        </tr>
                        <tr>
                            <td>HRA</td>
                            <td class="text-right">₹ ${data.hra}</td>
                        </tr>
                        <tr>
                            <td>Allowances</td>
                            <td class="text-right">₹ ${data.allowances}</td>
                        </tr>
                        <tr>
                            <td>Bonus</td>
                            <td class="text-right">₹ ${data.bonus}</td>
                        </tr>
                        <tr>
                            <td>Incentives</td>
                            <td class="text-right">₹ ${data.incentives}</td>
                        </tr>
                        <tr class="bg-light font-bold">
                            <td>Gross Earnings</td>
                            <td class="text-right">₹ ${data.gross_total}</td>
                        </tr>
                    </table>

                    <!-- Deductions Column -->
                    <table class="half-table" style="border-right: 1.5px solid #000; border-left: none;">
                        <tr>
                            <td width="70%">Leave Deduction (LWP)</td>
                            <td width="30%" class="text-right">₹ ${data.leave_ded_amount}</td>
                        </tr>
                        <tr>
                            <td>Late Penalty</td>
                            <td class="text-right">₹ ${data.late_penalty_amount}</td>
                        </tr>
                        <tr>
                            <td>Provident Fund (PF)</td>
                            <td class="text-right">₹ ${data.pf}</td>
                        </tr>
                        <tr>
                            <td>Professional Tax</td>
                            <td class="text-right">₹ 0.00</td>
                        </tr>
                        <tr>
                            <td>Other Deductions</td>
                            <td class="text-right">₹ ${data.other_deductions}</td>
                        </tr>
                        <tr class="bg-light font-bold">
                            <td>Total Deductions</td>
                            <td class="text-right">₹ ${data.total_ded_amount}</td>
                        </tr>
                    </table>
                </div>

                <table class="summary-table">
                    <tr class="net-salary-row">
                        <td width="70%" class="text-right">NET PAYABLE SALARY</td>
                        <td width="30%" class="text-right" style="font-size: 18px;">₹ ${data.net_total}</td>
                    </tr>
                </table>

                <div class="footer-notice">
                    <p>This is a computer-generated document and does not require a physical signature.</p>
                    <p>© ${new Date().getFullYear()} ${data.company_name} | All Rights Reserved</p>
                </div>
            </div>

            <script>
                window.onload = function() {
                    const element = document.getElementById('payslip-content');
                    const opt = {
                        margin: 0,
                        filename: 'Payslip_${data.employee_id}_${data.month_year.replace(" ", "_")}.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(element).save();
                };
            </script>
        </body>
        </html>`;

        res.setHeader('Content-Type', 'text/html');
        // Set content disposition to inline so browser can render and trigger the PDF script
        res.setHeader('Content-Disposition', 'inline; filename=payslip.html');
        res.send(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Cash Flow Routes ---
router.get('/cashflow', async (req, res) => {
    try {
        const { type, startDate, endDate, category } = req.query;
        let query = {};
        if (type) query.type = type;
        if (category) query.category = category;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const cashflow = await CashFlow.find(query)
            .populate('client_id', 'company_name')
            .populate('invoice_id', 'invoice_number')
            .populate('received_by', 'full_name username')
            .populate('approved_by', 'full_name username')
            .sort({ date: -1 });

        res.json(cashflow);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/cashflow/dashboard', async (req, res) => {
    try {
        const inflow = await CashFlow.aggregate([
            { $match: { type: 'inflow' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const outflow = await CashFlow.aggregate([
            { $match: { type: 'outflow' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            total_inflow: inflow[0]?.total || 0,
            total_outflow: outflow[0]?.total || 0,
            net_cash: (inflow[0]?.total || 0) - (outflow[0]?.total || 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/cashflow', async (req, res) => {
    try {
        const entry = new CashFlow({
            ...req.body,
            client_id: req.body.client_id ? toObjectId(req.body.client_id) : null,
            invoice_id: req.body.invoice_id ? toObjectId(req.body.invoice_id) : null,
            salary_id: req.body.salary_id ? toObjectId(req.body.salary_id) : null,
            received_by: req.body.received_by ? toObjectId(req.body.received_by) : null,
            approved_by: req.body.approved_by ? toObjectId(req.body.approved_by) : null,
            created_by: toObjectId(req.body.created_by)
        });
        await entry.save();
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/cashflow/:id', async (req, res) => {
    try {
        const entry = await CashFlow.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(entry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/cashflow/:id', async (req, res) => {
    try {
        await CashFlow.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Deadlines/Reminders API ---
router.get('/deadlines', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        const searchObjId = toObjectId(user_id);

        // 1. Get Tasks with deadlines
        const tasks = await Task.find({
            assigned_to: { $in: [user_id, searchObjId, user_id.toString()] },
            status: { $nin: ['completed', 'cancelled'] },
            deadline: { $ne: null }
        }).select('task_id title deadline status priority');

        // 2. Get Follow-Ups with deadlines or next_action_date
        const followups = await FollowUp.find({
            assigned_to: { $in: [user_id, searchObjId, user_id.toString()] },
            status: { $nin: ['completed'] },
            $or: [{ deadline: { $ne: null } }, { next_action_date: { $ne: null } }]
        }).select('followup_id title deadline next_action_date status task_type');

        // Map them to a unified format
        const unified = [];
        tasks.forEach(t => {
            unified.push({
                type: 'task',
                id: t._id.toString(),
                display_id: t.task_id,
                title: t.title,
                deadline: t.deadline,
                status: t.status,
                priority: t.priority
            });
        });

        followups.forEach(f => {
            if (f.deadline) {
                unified.push({
                    type: 'followup_deadline',
                    id: f._id.toString() + '_d',
                    original_id: f._id.toString(),
                    display_id: f.followup_id,
                    title: `[FollowUp] ${f.title}`,
                    deadline: f.deadline,
                    status: f.status
                });
            }
            if (f.next_action_date) {
                unified.push({
                    type: 'followup_reminder',
                    id: f._id.toString() + '_n',
                    original_id: f._id.toString(),
                    display_id: f.followup_id,
                    title: `[Reminder] ${f.title}`,
                    deadline: f.next_action_date,
                    status: f.status
                });
            }
        });

        // Filter out dates that are too far in the future? 
        // We'll let the frontend decide if it wants to show them, but here we return all pending.
        res.json(unified.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Performance Analytics API ---
// Trigger calculation for a month
router.post('/performance/calculate', async (req, res) => {
    try {
        const { month } = req.body; // e.g. "2026-03"
        if (!month) return res.status(400).json({ error: "Month required (YYYY-MM)" });

        const [yStr, mStr] = month.split('-');
        const year = parseInt(yStr);
        const m = parseInt(mStr) - 1; // 0-indexed

        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);

        let totalWorkingDays = 0;
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) totalWorkingDays++;
        }

        const employees = await Profile.find({ role: { $nin: ['admin', 'client'] }, is_active: true });

        for (const emp of employees) {
            // 1. Attendance Score
            const attendances = await Attendance.find({
                user_id: emp._id,
                date: { $regex: `^${month}` }
            });

            let presentDays = 0;
            let lateEntries = 0;
            let halfDays = 0;

            attendances.forEach(a => {
                if (a.status !== 'absent') presentDays++;
                if (a.is_late) lateEntries++;
                if (a.is_early_leave || a.user_id?.shift_type === 'half_day') halfDays++;
            });

            let attendanceRatio = totalWorkingDays > 0 ? presentDays / totalWorkingDays : 0;
            if (attendanceRatio > 1) attendanceRatio = 1;
            let attScore = (attendanceRatio * 20) - (lateEntries * 0.5);
            if (attScore < 0) attScore = 0;
            if (attScore > 20) attScore = 20;

            // 2. Task Completion Score
            const tasks = await Task.find({ assigned_to: { $in: [emp._id, emp._id.toString()] } });
            const matchedTasks = tasks.filter(t => {
                if (t.deadline) return new Date(t.deadline).toISOString().substring(0, 7) === month;
                if (t.created_at) return new Date(t.created_at).toISOString().substring(0, 7) === month;
                return false;
            });

            const totalTasks = matchedTasks.length;
            const completedTasks = matchedTasks.filter(t => t.status === 'completed').length;
            // Accurate Logic: If no tasks assigned, they don't get the "completion" marks. 
            // This prevents inactive users from getting higher scores than hard working ones.
            let taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 25 : 0;

            // 3. Task Quality Score (Wait for admin input)
            let existingPerf = await EmployeePerformance.findOne({ employee_id: emp._id, month });
            let adminRating = existingPerf ? existingPerf.admin_rating : 0;
            // Normalized quality score: if no tasks, quality is 0.
            let qualityScore = totalTasks > 0 ? (adminRating / 5) * 15 : 0;

            // 4. Activity Engagement Score
            const activities = await EmployeeActivity.find({ employee_id: emp._id, date: { $regex: `^${month}` } });
            const totalLogins = activities.reduce((acc, curr) => acc + curr.login_count, 0);
            const totalAi = activities.reduce((acc, curr) => acc + curr.ai_usage_count, 0);
            let actScore = ((Math.min(20, totalLogins) / 20) * 5) + ((Math.min(10, totalAi) / 10) * 5);

            // 5. Leave Management Score
            const leaves = await Leave.find({
                user_id: emp._id,
                start_date: { $gte: firstDay, $lte: lastDay }
            });
            const totalLeaves = leaves.length;
            const unplannedLeaves = leaves.filter(l => l.status !== 'approved').length;
            let leaveScore = Math.max(0, 10 - (unplannedLeaves * 2));

            // 6. Communication Score
            const messages = await Message.find({
                sender_id: emp._id,
                created_at: { $gte: firstDay, $lte: lastDay }
            });
            // Lowered threshold: 20 messages for full communication marks (10%)
            let commScore = (Math.min(20, messages.length) / 20) * 10;
            // If they have tasks but no messages, they lose score. If no tasks/msgs, they get 0.

            // 7. Follow-up Score (10%)
            const followups = await FollowUp.find({ assigned_to: { $in: [emp._id, emp._id.toString()] } });
            const matchedFollowups = followups.filter(f => {
                const fDate = f.deadline || f.created_at || f.updated_at;
                return fDate && new Date(fDate).toISOString().substring(0, 7) === month;
            });
            const totalFollowups = matchedFollowups.length;
            const completedFollowups = matchedFollowups.filter(f => f.status === 'completed').length;
            let followupScore = totalFollowups > 0 ? (completedFollowups / totalFollowups) * 10 : 0;

            // 8. Warning Penalty (-5 each)
            const warnings = await Warning.find({
                user_id: emp._id,
                created_at: { $gte: firstDay, $lte: lastDay }
            });
            let warningPenalty = warnings.length * 5;

            // 9. Appreciation Bonus (+2 each)
            const appreciations = await Appreciation.find({
                employee_id: emp._id,
                created_at: { $gte: firstDay, $lte: lastDay }
            });
            let appreciationBonus = appreciations.length * 2;

            const final_score = Math.round(
                attScore + taskScore + qualityScore + actScore + leaveScore + commScore + followupScore - warningPenalty + appreciationBonus
            );

            let grade = 'Needs Improvement';
            if (final_score >= 90) grade = 'Excellent';
            else if (final_score >= 75) grade = 'Good';
            else if (final_score >= 50) grade = 'Average';

            const metadata = {
                presentDays, totalWorkingDays, lateEntries,
                totalTasks, completedTasks,
                totalLogins, totalAi, totalLeaves, messagesCount: messages.length,
                totalFollowups, completedFollowups,
                warningsCount: warnings.length,
                appreciationsCount: appreciations.length
            };

            await EmployeePerformance.findOneAndUpdate(
                { employee_id: emp._id, month },
                {
                    attendance_score: attScore,
                    task_completion_score: taskScore,
                    task_quality_score: qualityScore,
                    activity_engagement_score: actScore,
                    leave_management_score: leaveScore,
                    communication_score: commScore,
                    followup_score: followupScore,
                    warning_penalty: warningPenalty,
                    appreciation_bonus: appreciationBonus,
                    final_score, grade, metadata
                },
                { upsert: true }
            );
        }
        res.json({ success: true, message: `Performance metrics calculated for ${month}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/performance', async (req, res) => {
    try {
        const { month, employee_id } = req.query;
        let query = {};
        if (month) query.month = month;
        if (employee_id) query.employee_id = toObjectId(employee_id);

        const records = await EmployeePerformance.find(query).populate('employee_id', 'full_name username role department email active_status profile_picture');
        res.json(records);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/performance/:id', async (req, res) => {
    try {
        let record = await EmployeePerformance.findById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Not found' });

        if (req.body.admin_rating !== undefined) {
            record.admin_rating = req.body.admin_rating;
            record.task_quality_score = (record.admin_rating / 5) * 15;
        }
        if (req.body.admin_feedback !== undefined) {
            record.admin_feedback = req.body.admin_feedback;
        }

        record.final_score = Math.round(
            record.attendance_score +
            record.task_completion_score +
            record.task_quality_score +
            record.activity_engagement_score +
            record.leave_management_score +
            record.communication_score +
            (record.followup_score || 0) -
            (record.warning_penalty || 0) +
            (record.appreciation_bonus || 0)
        );
        let grade = 'Needs Improvement';
        if (record.final_score >= 90) grade = 'Excellent';
        else if (record.final_score >= 75) grade = 'Good';
        else if (record.final_score >= 50) grade = 'Average';
        record.grade = grade;

        await record.save();
        record = await EmployeePerformance.findById(record._id).populate('employee_id');
        res.json(record);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
