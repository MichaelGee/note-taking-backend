# Backend learning roadmap — notes & reminders app

A 4-week hands-on plan to take you from frontend developer to shipping a real backend. Built around a personal notes and reminders app — something you'll actually use, with real problems that teach real concepts.

**Stack:** Node.js · Express · PostgreSQL · Prisma · JWT · Multer · node-cron

---

## Before you start

### Install these once

```bash
node --version        # need v18 or higher
npm --version         # comes with node
psql --version        # PostgreSQL — install from postgresql.org
```

### Project setup (do this now)

```bash
mkdir memorypal && cd memorypal
npm init -y
npm install express
npm install --save-dev nodemon
```

Add to `package.json`:

```json
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}
```

### The mindset going in

- Build one thing at a time. Get it working before moving on.
- Test every route in Postman or Thunder Client before writing the next one.
- Read error messages carefully — the backend tells you exactly what's wrong.
- Don't skip week 1 to get to the "interesting" stuff. Week 1 is the foundation everything else sits on.

---

## Week 1 — Server, routing & your first API

**Goal:** Get data flowing over HTTP. By end of week 1 you can create, read, update, and delete notes using Postman. No database yet, no auth yet — just a working API.

### Why this matters

The entire job of a backend is to receive a request and send a response. Everything else — databases, auth, file uploads — is just detail on top of that. Understanding request/response deeply makes everything else click faster.

---

### Task 1 — Your first Express server

Create `index.js`:

```js
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware — parse incoming JSON bodies
app.use(express.json());

// A simple logger so you can see every request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next(); // always call next() or the request hangs
});

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MemoryPal API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Run it:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the JSON response. That's your first backend route working.

**What just happened:**

- `express()` creates the app
- `app.use(express.json())` tells Express to parse JSON request bodies automatically
- The logger middleware runs on every request before your routes
- `next()` passes the request down the chain — forgetting it is a common bug

---

### Task 2 — In-memory notes store

Before adding a database, store notes in a plain JS array. This isolates the routing logic from the database logic so you can learn one thing at a time.

```js
// In-memory store — resets every time the server restarts (for now)
let notes = [];
let nextId = 1;
```

---

### Task 3 — CRUD routes for notes

Add these routes to `index.js` after your middleware:

```js
// GET /notes — return all notes
app.get('/notes', (req, res) => {
  res.json(notes);
});

// POST /notes — create a new note
app.post('/notes', (req, res) => {
  const { title, content } = req.body;

  // Basic validation
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const note = {
    id: nextId++,
    title,
    content,
    createdAt: new Date().toISOString(),
  };

  notes.push(note);
  res.status(201).json(note);
});

// GET /notes/:id — return a single note
app.get('/notes/:id', (req, res) => {
  const note = notes.find((n) => n.id === parseInt(req.params.id));

  if (!note) {
    return res.status(404).json({ error: 'note not found' });
  }

  res.json(note);
});

// PUT /notes/:id — update a note
app.put('/notes/:id', (req, res) => {
  const index = notes.findIndex((n) => n.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'note not found' });
  }

  // Spread the old note, merge with updates
  notes[index] = {
    ...notes[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  res.json(notes[index]);
});

// DELETE /notes/:id — delete a note
app.delete('/notes/:id', (req, res) => {
  const index = notes.findIndex((n) => n.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'note not found' });
  }

  notes.splice(index, 1);
  res.status(204).send(); // 204 = success with no body
});
```

**Key concepts here:**

- `req.body` — the JSON you sent in the request body (requires `express.json()` middleware)
- `req.params.id` — the `:id` part of the URL, always a string (so parse it with `parseInt`)
- Status codes matter: `200` ok, `201` created, `204` deleted, `400` bad request, `404` not found
- Return early with guard clauses — don't nest the happy path inside an `if`

---

### Task 4 — Test every route

Install Thunder Client (VS Code extension) or Postman. Test this sequence:

```
POST /notes        body: { "title": "First note", "content": "Hello backend" }
GET  /notes        should return array with one note
GET  /notes/1      should return just that note
PUT  /notes/1      body: { "title": "Updated title" }
DELETE /notes/1    should return 204
GET  /notes        should return empty array
```

If any of these fail, read the error carefully before fixing it. The error message is the lesson.

---

### Week 1 checkpoint

By end of week 1 your `index.js` is about 80 lines and fully working. You understand:

- How Express routing works
- What middleware is and why `next()` matters
- HTTP status codes and when to use them
- How to read `req.body` and `req.params`

---

## Week 2 — Database: store notes & reminders for real

**Goal:** Replace the in-memory array with PostgreSQL. Add a reminders model. Notes persist across server restarts.

### Why this matters

In-memory storage is fine for learning routing. But the moment the server restarts, everything is gone. A database is how real apps keep data alive. This week is the biggest conceptual leap — but Prisma makes it much more approachable than raw SQL.

---

### Task 1 — Install and set up Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

This creates a `prisma/` folder with `schema.prisma` and a `.env` file.

Update `.env`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/memorypal"
```

Create the database in PostgreSQL:

```bash
psql -U postgres
CREATE DATABASE memorypal;
\q
```

---

### Task 2 — Design your schema

Open `prisma/schema.prisma` and replace the contents:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int        @id @default(autoincrement())
  email     String     @unique
  password  String
  notes     Note[]
  reminders Reminder[]
  createdAt DateTime   @default(now())
}

model Note {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  type      String   @default("text") // "text" or "voice"
  audioPath String?  // path to audio file if voice note
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Reminder {
  id          Int      @id @default(autoincrement())
  text        String
  scheduledAt DateTime
  sent        Boolean  @default(false)
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
}
```

Run the migration to create the tables:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**What just happened:**

- `migrate dev` creates the actual tables in PostgreSQL
- `generate` creates the Prisma client you import in your code
- Relations: a User has many Notes and many Reminders
- `@default(now())` auto-fills timestamps
- `@updatedAt` auto-updates whenever a record changes

---

### Task 3 — Replace array with database queries

Create `prisma/client.js` (a shared Prisma instance):

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

Update your notes routes in `index.js`:

```js
const prisma = require('./prisma/client');

// GET /notes
app.get('/notes', async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /notes
app.post('/notes', async (req, res) => {
  const { title, content, type = 'text' } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  try {
    const note = await prisma.note.create({
      data: { title, content, type, userId: 1 }, // hardcode userId for now, auth comes in week 3
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /notes/:id
app.get('/notes/:id', async (req, res) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!note) return res.status(404).json({ error: 'note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /notes/:id
app.put('/notes/:id', async (req, res) => {
  try {
    const note = await prisma.note.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(note);
  } catch (err) {
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'note not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /notes/:id
app.delete('/notes/:id', async (req, res) => {
  try {
    await prisma.note.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'note not found' });
    res.status(500).json({ error: err.message });
  }
});
```

**What's different:**

- Every route is now `async` because database calls take time
- `try/catch` wraps every query — databases can fail and you need to handle it
- Prisma error code `P2025` means "record not found" — handle it as a 404
- `findMany`, `findUnique`, `create`, `update`, `delete` — these are the five methods you'll use 90% of the time

---

### Task 4 — Reminders routes

```js
// POST /reminders
app.post('/reminders', async (req, res) => {
  const { text, scheduledAt } = req.body;

  if (!text || !scheduledAt) {
    return res.status(400).json({ error: 'text and scheduledAt are required' });
  }

  try {
    const reminder = await prisma.reminder.create({
      data: { text, scheduledAt: new Date(scheduledAt), userId: 1 },
    });
    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reminders
app.get('/reminders', async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reminders/upcoming — due in the next 24 hours
app.get('/reminders/upcoming', async (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        scheduledAt: { gte: now, lte: tomorrow },
        sent: false,
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### Week 2 checkpoint

Notes and reminders now live in a real database. Restart your server — the data is still there. You understand:

- How Prisma schema maps to database tables
- The five core Prisma methods
- How to handle async errors with try/catch
- How to filter queries with `where` clauses

---

## Week 3 — Auth & voice notes

**Goal:** Add user accounts. Protect routes so users only see their own notes. Accept voice note uploads.

### Why this matters

Auth is the thing that makes an app a real product. And handling file uploads is a skill that unlocks a huge category of features — avatars, documents, audio, video. Both are things you'll use in every serious project going forward.

---

### Task 1 — User registration

```bash
npm install bcryptjs jsonwebtoken
```

Add a `.env` entry:

```env
JWT_SECRET=your_long_random_secret_string_here
```

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // Hash the password — never store plain text passwords
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    // Don't return the password in the response
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ error: 'email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'invalid credentials' });

    // Sign a JWT token — expires in 7 days
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**What's happening:**

- `bcrypt.hash(password, 10)` — the `10` is the salt rounds. Higher = slower but safer. 10 is the standard.
- `P2002` is Prisma's unique constraint violation — fires when the email already exists
- The JWT contains `{ userId }` and is signed with your secret. Anyone with the token can prove who they are.
- Always return the same error for wrong email OR wrong password — never tell the caller which one is wrong

---

### Task 2 — Auth middleware

```js
// Middleware to protect routes
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  // Guard clause — no token = not authenticated
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'no token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId; // attach userId to the request
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid or expired token' });
  }
};
```

Apply it to all protected routes:

```js
app.get('/notes',     authenticate, async (req, res) => { ... })
app.post('/notes',    authenticate, async (req, res) => { ... })
app.get('/notes/:id', authenticate, async (req, res) => { ... })
// etc.
```

---

### Task 3 — Scope notes to the logged-in user

Update every query to use `req.userId`:

```js
// Only return this user's notes
const notes = await prisma.note.findMany({
  where: { userId: req.userId },
  orderBy: { createdAt: 'desc' },
});

// Only create notes for this user
const note = await prisma.note.create({
  data: { title, content, type, userId: req.userId },
});

// Only allow updating/deleting your own notes
const note = await prisma.note.findUnique({
  where: { id: parseInt(req.params.id) },
});
if (!note || note.userId !== req.userId) {
  return res.status(404).json({ error: 'note not found' });
}
```

**Security note:** When checking ownership, always return 404 (not 403). Returning 403 tells an attacker that the resource exists — 404 reveals nothing.

---

### Task 4 — Voice note upload

```bash
npm install multer
```

```js
const multer = require('multer');
const path = require('path');

// Configure where files go and how they're named
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `voice-${Date.now()}-${req.userId}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('only audio files allowed'));
  },
});

// Create uploads directory
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// POST /notes/voice
app.post(
  '/notes/voice',
  authenticate,
  upload.single('audio'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'audio file required' });
    }

    try {
      const note = await prisma.note.create({
        data: {
          title: req.body.title || 'Voice note',
          content: req.body.content || '',
          type: 'voice',
          audioPath: req.file.path,
          userId: req.userId,
        },
      });
      res.status(201).json(note);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
```

---

### Task 5 (stretch) — Transcribe voice notes with Whisper

```bash
npm install openai form-data
```

```js
const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeAudio(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
  });
  return transcription.text;
}
```

Call `transcribeAudio(req.file.path)` after upload and store the result as the note `content`. Voice notes are now searchable text.

---

### Week 3 checkpoint

Users can register, log in, and get a JWT token. All note and reminder routes are protected. Each user only sees their own data. Voice notes upload to disk. You understand:

- How bcrypt password hashing works
- How JWT tokens are signed and verified
- How to write auth middleware
- How to scope database queries to a user
- How multer handles file uploads

---

## Week 4 — Reminders, polish & ship it

**Goal:** Make reminders actually fire on schedule. Clean up the API. Deploy to a real URL.

---

### Task 1 — Scheduled reminder job

```bash
npm install node-cron nodemailer
```

```js
const cron = require('node-cron');
const mailer = require('nodemailer');

const transporter = mailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use an app password, not your real password
  },
});

// Run every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const inOneMin = new Date(now.getTime() + 60 * 1000);

  try {
    // Find reminders due in the next minute that haven't been sent
    const due = await prisma.reminder.findMany({
      where: {
        scheduledAt: { gte: now, lte: inOneMin },
        sent: false,
      },
      include: { user: true }, // join the user so we have their email
    });

    for (const reminder of due) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: reminder.user.email,
        subject: 'MemoryPal reminder',
        text: reminder.text,
      });

      // Mark as sent so it doesn't fire again
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      });

      console.log(`Reminder sent to ${reminder.user.email}: ${reminder.text}`);
    }
  } catch (err) {
    console.error('Reminder job error:', err.message);
  }
});
```

Add to `.env`:

```env
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

### Task 2 — Input validation with Zod

```bash
npm install zod
```

```js
const { z } = require('zod');

const noteSchema = z.object({
  title: z.string().min(1, 'title is required').max(200),
  content: z.string().min(1, 'content is required'),
  type: z.enum(['text', 'voice']).optional(),
});

const reminderSchema = z.object({
  text: z.string().min(1, 'text is required'),
  scheduledAt: z.string().datetime('must be a valid ISO datetime'),
});

// Use in routes
app.post('/notes', authenticate, async (req, res) => {
  const result = noteSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }

  const { title, content, type = 'text' } = result.data;
  // ... rest of route
});
```

---

### Task 3 — Search endpoint

```js
// GET /notes?q=keyword
app.get('/notes', authenticate, async (req, res) => {
  const { q } = req.query;

  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: req.userId,
        ...(q && {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Now `GET /notes?q=meeting` returns only notes containing "meeting".

---

### Task 4 — Organise into routes files

Before deploying, split the monolith into separate files:

```
memorypal/
├── index.js              ← server setup only
├── prisma/
│   ├── schema.prisma
│   └── client.js
├── middleware/
│   └── authenticate.js
├── routes/
│   ├── auth.js
│   ├── notes.js
│   └── reminders.js
└── uploads/
```

`routes/notes.js`:

```js
const router = require('express').Router()
const prisma = require('../prisma/client')
const authenticate = require('../middleware/authenticate')

router.get('/', authenticate, async (req, res) => { ... })
router.post('/', authenticate, async (req, res) => { ... })
// etc.

module.exports = router
```

`index.js`:

```js
const express = require('express');
const app = express();

app.use(express.json());
app.use('/auth', require('./routes/auth'));
app.use('/notes', require('./routes/notes'));
app.use('/reminders', require('./routes/reminders'));

app.listen(3000, () => console.log('Running on port 3000'));
```

---

### Task 5 — Deploy to Railway

1. Push your project to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Add a PostgreSQL plugin from the Railway dashboard
5. Set all environment variables from your `.env` in Railway's variables panel
6. Railway auto-detects Node.js and runs `npm start`

Your API is now live at a real URL.

Run your migrations on the production database:

```bash
DATABASE_URL=your_railway_db_url npx prisma migrate deploy
```

---

### Task 6 — Connect your frontend

Build a minimal React frontend that talks to your API. You already know React — this part should feel easy. The key endpoints you need:

```
POST /auth/register    → register a new user
POST /auth/login       → get a JWT token, store it in memory (not localStorage)
GET  /notes            → fetch all notes (send token in Authorization header)
POST /notes            → create a text note
POST /notes/voice      → upload an audio file
POST /reminders        → create a reminder with a future datetime
GET  /reminders/upcoming → show what's coming up
```

Sending the token with every request:

```js
const token = '...'; // store this after login

fetch('/notes', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## Full project structure at the end

```
memorypal/
├── index.js
├── package.json
├── .env
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── client.js
├── middleware/
│   └── authenticate.js
├── routes/
│   ├── auth.js
│   ├── notes.js
│   └── reminders.js
└── uploads/
```

---

## What you've built

By the end of week 4 you have a backend that:

- Accepts text and voice notes over HTTP
- Stores everything in a real PostgreSQL database
- Fires email reminders on a schedule
- Has user accounts with secure auth
- Is deployed and accessible from anywhere

More importantly, you understand: routing, middleware, databases, relationships, auth, file uploads, scheduled jobs, validation, and deployment. That's the full backend surface area. Every project from here is a variation on these same concepts.
