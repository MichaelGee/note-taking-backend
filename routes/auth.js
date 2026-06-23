const router = require("express").Router();
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



// Auth endpoints
// POST /auth/register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password is required" })
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashed,
            }
        })
        const { password: _, ...rest } = user;
        res.status(201).json(rest)
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: "Email already exist" });
        res.status(500).json({ error: error.message });
    }
})

// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' })

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

        // Sign a JWT token — expires in 7 days
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        })

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

module.exports = router;