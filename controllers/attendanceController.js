const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const Student = require('../models/Student');

// @desc    Get attendance by date
// @route   GET /api/attendance/by-date
// @access  Private
exports.getAttendanceByDate = async (req, res) => {
    try {
        const { date, branch, subject } = req.query;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        let lectureQuery = {
            date: { $gte: startOfDay, $lte: endOfDay }
        };

        if (branch) lectureQuery.branch = branch;
        if (subject) lectureQuery['subject.code'] = subject;

        const lectures = await Lecture.find(lectureQuery)
            .populate('branch')
            .populate({
                path: 'teacher',
                populate: { path: 'user', select: 'name' }
            });

        const attendanceData = await Promise.all(
            lectures.map(async (lecture) => {
                const attendance = await Attendance.find({ lecture: lecture._id })
                    .populate({
                        path: 'student',
                        populate: [
                            { path: 'user', select: 'name email' },
                            { path: 'branch', select: 'code name' }
                        ]
                    });

                return {
                    lecture,
                    attendance
                };
            })
        );

        res.json({ success: true, data: attendanceData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export attendance data
// @route   GET /api/attendance/export
// @access  Private/Teacher/Admin
exports.exportAttendance = async (req, res) => {
    try {
        const { branch, subject, startDate, endDate, format = 'json' } = req.query;

        let lectureQuery = {};
        if (branch) lectureQuery.branch = branch;
        if (subject) lectureQuery['subject.code'] = subject;
        if (startDate && endDate) {
            lectureQuery.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const lectures = await Lecture.find(lectureQuery)
            .populate('branch')
            .populate({
                path: 'teacher',
                populate: { path: 'user', select: 'name' }
            })
            .sort({ date: 1 });

        const exportData = await Promise.all(
            lectures.map(async (lecture) => {
                const attendance = await Attendance.find({ lecture: lecture._id })
                    .populate({
                        path: 'student',
                        populate: { path: 'user', select: 'name' }
                    });

                return {
                    date: lecture.date,
                    subject: lecture.subject,
                    branch: lecture.branch.code,
                    teacher: lecture.teacher.user.name,
                    time: `${lecture.startTime} - ${lecture.endTime}`,
                    attendance: attendance.map(a => ({
                        rollNumber: a.student.rollNumber,
                        name: a.student.user.name,
                        status: a.status,
                        markedAt: a.markedAt
                    }))
                };
            })
        );

        if (format === 'csv') {
            // Convert to CSV format
            let csvContent = 'Date,Subject,Branch,Teacher,Roll Number,Name,Status,Marked At\n';
            
            exportData.forEach(lecture => {
                lecture.attendance.forEach(att => {
                    csvContent += `${lecture.date.toISOString().split('T')[0]},${lecture.subject.name},${lecture.branch},${lecture.teacher},${att.rollNumber},${att.name},${att.status},${att.markedAt}\n`;
                });
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
            return res.send(csvContent);
        }

        res.json({ success: true, data: exportData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};