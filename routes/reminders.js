const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const prisma = require('../prisma/client');

// Reminder endpoints
router.get('/', authenticate, async (req, res) => {
    try {
        const reminders = await prisma.reminder.findMany({
            orderBy: { scheduledAt: 'asc' }
        })
        res.status(200).json(reminders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticate, async (req, res) => {
    const { text, scheduledAt } = req.body
    if (!text || !scheduledAt) return res.status(400).json({ error: 'text and scheduledAt is required' })
    try {
        const reminder = await prisma.reminder.create({
            data: { text, scheduledAt: new Date().toISOString(), userId: 1 }
        })
        res.status(201).json({ reminder })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

// GET /reminders/upcoming — due in the next 24 hours
router.get('/', authenticate, async (req, res) => {
    const now = new Date().toISOString()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
        const reminders = await prisma.reminder.findMany({
            where: { gte: now, lte: tomorrow },
            orderBy: { scheduledAt: 'asc' }
        })
        res.status(200).json(reminders)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

module.exports = router;