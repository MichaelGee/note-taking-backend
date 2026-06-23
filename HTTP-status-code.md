# HTTP status codes — backend reference

A practical guide to every status code you'll actually use. Not an exhaustive list of all 70+ codes — just the ones that matter in day-to-day backend work, with clear rules for when to use each one.

---

## How to think about status codes

Every HTTP response has three parts: a status code, headers, and a body. The status code is a contract — it tells the client what happened before they even look at the body. A well-designed API uses codes consistently so clients can handle responses predictably without parsing the body first.

Status codes are grouped by their first digit:

| Range | Category     | Meaning                 |
| ----- | ------------ | ----------------------- |
| 2xx   | Success      | The request worked      |
| 3xx   | Redirect     | Go somewhere else       |
| 4xx   | Client error | You did something wrong |
| 5xx   | Server error | We did something wrong  |

---

## 2xx — Success

### 200 OK

The most generic success code. Use it when a request succeeded and you're returning data.

```js
// GET requests that return data
app.get('/notes', async (req, res) => {
  const notes = await prisma.note.findMany()
  res.status(200).json(notes)  // returning existing data
})

// PUT/PATCH requests that update and return the updated record
app.put('/notes/:id', async (req, res) => {
  const note = await prisma.note.update({ ... })
  res.status(200).json(note)  // updated record
})
```

**Rule:** Default to 200 for any successful GET, PUT, or PATCH. When in doubt, 200 is usually right.

---

### 201 Created

Use this specifically when a new resource was created. The difference from 200 is intentional — it tells the client "something new now exists."

```js
// POST requests that create something new
app.post('/notes', async (req, res) => {
  const note = await prisma.note.create({ data: { ... } })
  res.status(201).json(note)  // a new note was created
})

app.post('/auth/register', async (req, res) => {
  const user = await prisma.user.create({ data: { ... } })
  res.status(201).json(user)  // a new user was created
})
```

**Rule:** Always use 201 for POST requests that create a resource. Never use 200 for creation — it loses information.

**The difference between 200 and 201:**

- `200` — something happened successfully, here is data
- `201` — something new was created, here it is

---

### 204 No Content

Success, but nothing to return. The operation worked and there is intentionally no response body.

```js
// DELETE requests
app.delete('/notes/:id', async (req, res) => {
  await prisma.note.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send(); // deleted — nothing to return
});

// Some PATCH/PUT operations where you don't return the updated record
app.patch('/notes/:id/read', async (req, res) => {
  await prisma.note.update({ where: { id }, data: { read: true } });
  res.status(204).send(); // marked as read — client doesn't need the record back
});
```

**Rule:** Use 204 for DELETE, and for updates where the client doesn't need the response body. Never send a body with 204 — clients will ignore it.

---

### 202 Accepted

The request was received and will be processed, but not yet. Used for async operations that run in the background.

```js
// Triggering a background job
app.post('/exports', async (req, res) => {
  await queue.add('export', { userId: req.userId });
  res
    .status(202)
    .json({ message: 'export queued, you will receive an email when ready' });
});
```

**Rule:** Use 202 when you've queued work but haven't done it yet. Less common but important for background jobs and async processing.

---

## 3xx — Redirects

### 301 Moved Permanently

The resource has permanently moved to a new URL. Browsers and clients cache this forever.

```js
// Old API version redirecting to new
app.get('/api/v1/notes', (req, res) => {
  res.redirect(301, '/api/v2/notes');
});
```

**Rule:** Use when a URL has permanently changed and you want clients to update their bookmarks/references.

---

### 302 Found (Temporary Redirect)

The resource is temporarily at a different URL. Clients should keep using the original URL next time.

```js
// Redirect after login
app.post('/auth/login', async (req, res) => {
  // ... verify credentials
  res.redirect(302, '/dashboard');
});
```

**Rule:** Use for temporary redirects — after form submissions, after login. Less common in pure JSON APIs where you'd just return a token.

---

### 304 Not Modified

The resource hasn't changed since the client last fetched it. Used with caching headers — tells the client to use their cached version.

```js
app.get('/notes/:id', async (req, res) => {
  const note = await prisma.note.findUnique({ where: { id } });
  const etag = generateEtag(note);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send(); // client already has latest version
  }

  res.setHeader('ETag', etag);
  res.status(200).json(note);
});
```

**Rule:** Used in caching strategies. You won't need this on day one but you'll encounter it when optimising performance.

---

## 4xx — Client errors

These mean the client did something wrong. The important principle: **be specific**. Using 400 for everything is lazy and makes APIs hard to consume. Pick the most precise code.

---

### 400 Bad Request

The request is malformed or invalid. The client sent something the server can't process — missing fields, wrong data types, failed validation.

```js
app.post('/notes', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  if (title.length > 200) {
    return res
      .status(400)
      .json({ error: 'title must be 200 characters or less' });
  }
});
```

**Rule:** Use for validation failures, missing required fields, wrong data types, malformed JSON. The most common 4xx you'll write.

---

### 401 Unauthorized

The request requires authentication and none was provided, or the credentials are invalid. Despite the name, this is really about **authentication** (who are you?), not authorisation (are you allowed?).

```js
// No token provided
app.get('/notes', (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'authentication required' });
  }
});

// Invalid or expired token
app.get('/notes', (req, res) => {
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
});

// Wrong password at login
app.post('/auth/login', async (req, res) => {
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
});
```

**Rule:** Use when the client is not authenticated. This tells the client: "log in and try again."

---

### 403 Forbidden

The client is authenticated but not allowed to do this. This is about **authorisation** (are you allowed?), not authentication (who are you?).

```js
// Authenticated, but trying to access admin routes
app.delete('/admin/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin access required' });
  }
});

// Authenticated, but trying to access another user's private resource
app.get('/users/:id/private-data', authenticate, async (req, res) => {
  if (req.userId !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'access denied' });
  }
});
```

**The difference between 401 and 403:**

- `401` — we don't know who you are. Log in.
- `403` — we know who you are. You're not allowed.

**Important nuance:** For resource ownership checks (user trying to access another user's note), many APIs return 404 instead of 403. This is deliberate — returning 403 tells the attacker the resource exists. Returning 404 reveals nothing.

```js
// Safer pattern for ownership checks
const note = await prisma.note.findUnique({ where: { id } });
if (!note || note.userId !== req.userId) {
  return res.status(404).json({ error: 'note not found' }); // not 403
}
```

---

### 404 Not Found

The resource doesn't exist. Either it never existed or it was deleted.

```js
app.get('/notes/:id', async (req, res) => {
  const note = await prisma.note.findUnique({
    where: { id: parseInt(req.params.id) },
  });

  if (!note) {
    return res.status(404).json({ error: 'note not found' });
  }

  res.json(note);
});
```

**Rule:** Use when a specific resource can't be found. Also use for routes that don't exist — Express does this automatically for undefined routes.

---

### 405 Method Not Allowed

The route exists but not for that HTTP method.

```js
// If someone sends DELETE to a read-only endpoint
app.all('/health', (req, res, next) => {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: 'only GET is allowed on this endpoint' });
  }
  next();
});
```

**Rule:** Rare in practice — Express automatically handles this when you define routes with specific methods. Useful when you want to be explicit.

---

### 409 Conflict

The request conflicts with the current state of the server. Most commonly: trying to create something that already exists.

```js
app.post('/auth/register', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: { email, password } });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(409).json({ error: 'email already in use' });
    }
  }
});

// Trying to publish something already published
app.post('/notes/:id/publish', async (req, res) => {
  const note = await prisma.note.findUnique({ where: { id } });
  if (note.published) {
    return res.status(409).json({ error: 'note is already published' });
  }
});
```

**Rule:** Use when the operation can't be completed because of a conflict with existing data. Duplicate email, duplicate username, conflicting state.

---

### 410 Gone

Like 404, but the resource existed and was deliberately removed. Tells clients to stop asking.

```js
app.get('/api/v1/notes', (req, res) => {
  res.status(410).json({ error: 'API v1 has been retired. Use /api/v2/notes' });
});
```

**Rule:** Use when deprecating old API versions or permanently deleted resources you want to communicate about.

---

### 422 Unprocessable Entity

The request is well-formed (valid JSON, correct content type) but the data fails business logic validation. Some teams use 400 for everything — others use 422 specifically for semantic validation failures.

```js
app.post('/reminders', async (req, res) => {
  const { scheduledAt } = req.body;

  // Valid datetime format, but in the past — that's a logic error, not a format error
  if (new Date(scheduledAt) < new Date()) {
    return res.status(422).json({ error: 'scheduledAt must be in the future' });
  }
});
```

**Rule:** Use when the data format is correct but the content fails business rules. The line between 400 and 422 is blurry — many teams just use 400 for both. Pick one and be consistent.

---

### 429 Too Many Requests

The client has sent too many requests in a given time window. Used for rate limiting.

```js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  handler: (req, res) => {
    res
      .status(429)
      .json({ error: 'too many requests, try again in 15 minutes' });
  },
});

app.use(limiter);
```

**Rule:** Use when implementing rate limiting. Always include a `Retry-After` header telling the client when they can try again.

---

## 5xx — Server errors

These mean something went wrong on your end. The client did nothing wrong. Never send a 5xx for something the client caused.

---

### 500 Internal Server Error

Something unexpected broke on the server. The catch-all for unhandled errors.

```js
app.get('/notes', async (req, res) => {
  try {
    const notes = await prisma.note.findMany();
    res.json(notes);
  } catch (err) {
    console.error(err); // log the real error server-side
    res.status(500).json({ error: 'something went wrong' }); // generic message to client
  }
});
```

**Rule:** Use as the fallback in catch blocks. Never expose the real error message to the client in production — log it server-side and send a generic message. The real error is for your logs, not the client.

---

### 502 Bad Gateway

Your server received an invalid response from an upstream service it was talking to.

```js
app.post('/notes/voice', async (req, res) => {
  try {
    const transcript = await openai.audio.transcriptions.create({ ... })
    res.json(transcript)
  } catch (err) {
    if (err.status === 500 || err.status === 503) {
      return res.status(502).json({ error: 'transcription service unavailable' })
    }
  }
})
```

**Rule:** Use when your server is a middleman calling another service (OpenAI, Stripe, etc.) and that service fails.

---

### 503 Service Unavailable

Your server is temporarily unable to handle requests — overloaded, deploying, or in maintenance.

```js
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res
      .status(503)
      .json({ error: 'service temporarily unavailable for maintenance' });
  }
  next();
});
```

**Rule:** Use during planned downtime or when the server is genuinely overwhelmed. Include a `Retry-After` header.

---

### 504 Gateway Timeout

Your server was waiting for an upstream service and it timed out.

```js
app.get('/report', async (req, res) => {
  try {
    const data = await externalService.generateReport({ timeout: 30000 });
    res.json(data);
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'report generation timed out' });
    }
  }
});
```

**Rule:** Use when a downstream call times out. Distinct from 503 — the server is fine, an upstream dependency isn't responding.

---

## Quick reference

| Code | Name                  | Use when                                         |
| ---- | --------------------- | ------------------------------------------------ |
| 200  | OK                    | GET succeeded, PUT/PATCH succeeded               |
| 201  | Created               | POST created a new resource                      |
| 204  | No Content            | DELETE succeeded, or update with no return value |
| 202  | Accepted              | Request queued for async processing              |
| 301  | Moved Permanently     | URL permanently changed                          |
| 302  | Found                 | Temporary redirect                               |
| 304  | Not Modified          | Client cache is still valid                      |
| 400  | Bad Request           | Validation failed, missing fields, bad format    |
| 401  | Unauthorized          | Not authenticated — no token or bad credentials  |
| 403  | Forbidden             | Authenticated but not allowed                    |
| 404  | Not Found             | Resource doesn't exist                           |
| 409  | Conflict              | Duplicate resource, conflicting state            |
| 410  | Gone                  | Resource permanently removed                     |
| 422  | Unprocessable Entity  | Valid format, failed business logic              |
| 429  | Too Many Requests     | Rate limit exceeded                              |
| 500  | Internal Server Error | Unexpected server crash                          |
| 502  | Bad Gateway           | Upstream service returned an error               |
| 503  | Service Unavailable   | Server temporarily down                          |
| 504  | Gateway Timeout       | Upstream service timed out                       |

---

## The three rules to remember

**1. Be specific with 4xx codes.**
Using 400 for everything works but it's lazy. A client that gets 401 knows to re-authenticate. A client that gets 409 knows the resource already exists. Specificity makes your API self-documenting.

**2. Never expose server errors to the client.**
Log the real error, return a generic 500 message. Stack traces and database errors in API responses are a security risk.

**3. The 401 vs 403 distinction matters.**
401 = not logged in. 403 = logged in but not allowed. Getting these backwards confuses clients. And for ownership checks, 404 is often safer than 403.
