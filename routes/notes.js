const router = require("express").Router()
const authenticate = require("../middleware/authenticate")
const prisma = require('../prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

//Configure where files go and how they are named
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `voice-${new Date.now()}-${req.userId}${ext}`
        cb(null, filename)
    }
})

const upload = multer({
    storage,
    limits: {fileSize: 10 * 1024 * 1024}, //10mb max 
    fileFilter: (req, file, cb)=>{
        const allowed = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/webm']
        if(allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only audio files allowed'));
    }
})

// Create uploads directory
if(!fs.existsSync('uploads')) fs.mkdirSync('uploads')


//GET /notes - return all notes
router.get('/', authenticate, async (req, res) => {
    try {
        const notes = await prisma.note.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//POST /notes - create a new note
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content, type = 'text' } = req.body;
        if (!title || !content) {
        }
        const note = await prisma.note.create({
            data: {
                userId: req.userId,
                title,
                content,
                type,
            },
        });
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /notes/:id — return a single note
router.get('/:id', authenticate, async (req, res) => {
    try {
        const note = await prisma.note.findUnique({
            where: {
                id: parseInt(req.params.id),
            },
        });

        if (!note || !note.userId !== req.userId) return res.status(404).json({ message: 'Note not found' });
        res.status(200).json(note);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /notes/:id — update a note
router.put('/:id', authenticate, async (req, res) => {
    try {
        const note = await prisma.note.update({
            where: {
                id: parseInt(req.params.id),
                data: req.body
            }
        })
        res.json(note)
    } catch (error) {
        if (err.status === 'P2025') return res.status(404).json({ error: "Note not found" })
        res.status(500).json({ error: error.message });
    }
});

// DELETE /notes/:id — delete a note
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await prisma.note.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        res.status(204).json({ status: 204, massage: 'Deletion successful' });
    } catch (error) {
        if (err.status === 'P2025') return res.status(400).json({ error: "Note not found" })
        res.status(500).json({ error: error.message });
    }
});

// POST /notes/voice

module.exports = router