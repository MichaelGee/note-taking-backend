// Import express
require('dotenv').config();
require('./jobs/reminders');
const express = require('express');




// Setup app and port
const PORT = 8080;
const app = express();

// Add middleware that parses incoming JSON bodies (app.use)
app.use(express.json());


/*********** All routes ************/

app.use('/auth', require('./routes/auth'))
app.use('/notes', require('./routes/notes'))
app.use('/reminders', require('./routes/reminders'))
app.use('/me', require('./routes/user'))

/*************************/

//Add logger to see all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

//Add a health check route
app.get('/health-check', (req, res) => {
    res.json({ status: 200, message: 'All systems are good' });
});

// Add port listener
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
