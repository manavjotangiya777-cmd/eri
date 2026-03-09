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
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Request Logging Middleware
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
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

        // Use schema defaults if settings doc doesn't exist
        const startTime = shiftType === 'half_day'
            ? (settings?.half_day_start_time || '09:00')
            : (settings?.work_start_time || '09:00');
        const threshold = shiftType === 'half_day'
            ? (settings?.half_day_late_threshold ?? 15)
            : (settings?.late_threshold_minutes ?? 15);

        if (!startTime) return { is_late: false, late_minutes: 0 };

        const [h, m] = startTime.split(':').map(Number);
        const workStart = new Date(now);
        workStart.setHours(h, m, 0, 0);
        const lateLimit = new Date(workStart.getTime() + threshold * 60000);

        if (now > lateLimit) {
            return {
                is_late: true,
                late_minutes: Math.floor((now.getTime() - workStart.getTime()) / 60000)
            };
        }
        return { is_late: false, late_minutes: 0 };
    };

    try {
        const { user_id } = req.body;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

        // ── Overtime Calculation ──────────────────────────────────────
        try {
            const settings = await SystemSettings.findOne();
            const user = await Profile.findById(user_id);
            const shiftType = user?.shift_type || 'full_day';
            const overtimeEnabled = settings?.overtime_enabled !== false; // defaults true

            if (overtimeEnabled) {
                const thresholdHours = shiftType === 'half_day'
                    ? (settings?.half_day_overtime_threshold_hours ?? 4)
                    : (settings?.overtime_threshold_hours ?? 8);
                const thresholdSeconds = thresholdHours * 3600;
                const overtime = Math.max(0, record.totals.workSeconds - thresholdSeconds);
                record.totals.overtimeSeconds = overtime;
            } else {
                record.totals.overtimeSeconds = 0;
            }
        } catch (e) {
            record.totals.overtimeSeconds = 0; // silently skip if settings unavailable
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
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
        record.totals.workSeconds = record.totals.totalClockSeconds - record.totals.totalBreakSeconds;

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
        const today = new Date().toISOString().split('T')[0];
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
                            const [h, m] = shiftEnd.split(':').map(Number);
                            const now = new Date();
                            const endTime = new Date();
                            endTime.setHours(h, m, 0, 0);

                            if (now < endTime) {
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
            myTasks = await Task.countDocuments({ assigned_to: user_id });
            pendingTasks = await Task.countDocuments({ assigned_to: user_id, status: { $ne: 'completed' } });
            completedTasks = await Task.countDocuments({ assigned_to: user_id, status: 'completed' });
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
            message: `${user?.full_name || 'An employee'} has applied for ${leave.leave_type} from ${new Date(leave.start_date).toLocaleDateString()}.`,
            target_role: 'hr',
            type: 'leave'
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

router.put('/tasks', handleTaskUpdate);
router.patch('/tasks', handleTaskUpdate);
router.put('/tasks/:id', handleTaskUpdate);
router.patch('/tasks/:id', handleTaskUpdate);

// --- Standard CRUD Routes --- 
defineStandardRoutes('/profiles', Profile, 'designation client');
defineStandardRoutes('/clients', Client);
defineStandardRoutes('/tasks', Task);
defineStandardRoutes('/attendance', Attendance, 'user_id');
defineStandardRoutes('/leaves', Leave);
defineStandardRoutes('/departments', Department);
defineStandardRoutes('/designations', Designation, 'departments');
defineStandardRoutes('/holidays', Holiday);
defineStandardRoutes('/followups', FollowUp);

// ─── Warning Routes ───────────────────────────────────────────────
router.get('/warnings/my', async (req, res) => {
    try {
        const { role } = req.query;
        const query = {
            is_active: true,
            $or: [
                { target_role: 'all' },
                { target_role: role }
            ]
        };
        const warnings = await Warning.find(query).sort({ created_at: -1 });
        res.json(warnings.map(w => { const o = w.toObject({ virtuals: true }); o.id = o._id.toString(); return o; }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/warnings', async (req, res) => {
    try {
        const warnings = await Warning.find().sort({ created_at: -1 });
        res.json(warnings.map(w => { const o = w.toObject({ virtuals: true }); o.id = o._id.toString(); return o; }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/warnings', async (req, res) => {
    try {
        const w = await Warning.create(req.body);
        const o = w.toObject({ virtuals: true }); o.id = o._id.toString();
        res.status(201).json(o);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/warnings', async (req, res) => {
    const { id } = req.query;
    try {
        const w = await Warning.findByIdAndUpdate(id, req.body, { new: true });
        if (!w) return res.status(404).json({ error: 'Not found' });
        const o = w.toObject({ virtuals: true }); o.id = o._id.toString();
        res.json(o);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/warnings', async (req, res) => {
    const { id } = req.query;
    try {
        await Warning.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});
// ─────────────────────────────────────────────────────────────────

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
        const settings = await SystemSettings.findOne() || {};

        let template = settings.invoice_template;
        if (!template) {
            // Default Fallback Template
            template = `<!DOCTYPE html><html><head><style>body { font-family: sans-serif; margin: 0; padding: 20px; color: #333; } .invoice-container { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 40px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); } .header { display: flex; justify-content: space-between; margin-bottom: 40px; } .company-info h2 { margin: 0; color: #2563eb; } .company-info p { margin: 2px 0; color: #666; font-size: 14px; } .invoice-details { text-align: right; } .invoice-details h1 { margin: 0; color: #333; font-size: 32px; } .invoice-details p { margin: 5px 0; font-weight: bold; } .billing-info { display: flex; justify-content: space-between; margin-bottom: 40px; } .billing-info div { width: 45%; } .billing-info h3 { border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; margin-bottom: 40px; } table th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #eee; } table td { padding: 12px; border-bottom: 1px solid #eee; } .total-section { text-align: right; margin-top: 20px; } .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 10px; } .total-row.grand-total { font-size: 20px; font-weight: bold; color: #2563eb; margin-top: 10px; border-top: 2px solid #eee; padding-top: 10px; } .footer { margin-top: 60px; text-align: center; color: #999; font-size: 12px; }</style></head><body><div class="invoice-container"><div class="header"><div class="company-info"><h2>{{company_name}}</h2><p>{{company_address}}</p><p>Email: {{company_email}}</p><p>Phone: {{company_phone}}</p></div><div class="invoice-details"><h1>INVOICE</h1><p>#{{invoice_number}}</p><p>Date: {{invoice_date}}</p><p>Due Date: {{due_date}}</p></div></div><div class="billing-info"><div><h3>Bill To</h3><p><strong>{{client_company}}</strong></p><p>{{client_contact}}</p><p>{{client_email}}</p><p>{{client_address}}</p></div><div style="text-align: right;"><h3>Payment Status</h3><p style="text-transform: uppercase; color: {{status_color}};"><strong>{{status}}</strong></p></div></div><table><thead><tr><th>Description</th><th style="text-align: right;">Amount</th></tr></thead><tbody><tr><td>Services Rendered / Milestone Payment</td><td style="text-align: right;">₹{{amount}}</td></tr></tbody></table><div class="total-section"><div class="total-row"><span>Subtotal:</span><span>₹{{amount}}</span></div><div class="total-row grand-total"><span>Total:</span><span>₹{{amount}}</span></div></div><div class="footer"><p>Thank you for your business!</p><p>Generated by {{company_name}} Management System</p></div></div></body></html>`;
        }

        const data = {
            company_name: settings.company_name || 'error Infotech',
            company_email: settings.company_email || '',
            company_phone: settings.company_phone || '',
            company_address: settings.company_address || '',
            invoice_number: invoice.invoice_number,
            invoice_date: new Date(invoice.created_at).toLocaleDateString(),
            due_date: invoice.due_date || 'N/A',
            client_company: client ? client.company_name : 'N/A',
            client_contact: client ? client.contact_person : 'N/A',
            client_email: client ? client.email : 'N/A',
            client_address: client ? client.address : 'N/A',
            amount: invoice.amount.toLocaleString(),
            status: invoice.status,
            status_color: invoice.status === 'paid' ? '#059669' : '#d97706'
        };

        let html = template;
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, data[key]);
        });

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoice_number}.html`);
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

        const query = {
            $or: [
                { target_role: 'all' },
                { target_role: role },
                { target_user: toObjectId(user_id) }
            ]
        };

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
            // Employee view - see global, role-based, or specifically targeted warnings
            query = {
                $or: [
                    { target_role: 'all' },
                    { target_role: role },
                    { user_id: toObjectId(user_id) }
                ],
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

module.exports = router;
