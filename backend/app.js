require('dotenv').config();
const cors = require('cors');

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
// const cors = require('cors');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.set('trust proxy', true);

app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

const authRoute = require('./Routes/auth.js');
const mongoRoute = require('./Routes/mongo.js');
const aiRoute = require('./Routes/ai.js');
const userRoute = require('./Routes/users.js');
const callRoute = require('./Routes/calls.js');
app.use('/api/auth', authRoute);
app.use('/api/data', requireAuth, mongoRoute);
app.use('/api/ai', requireAuth, aiRoute);
app.use('/api/users', requireAuth, userRoute);
app.use('/api/calls', requireAuth, callRoute);

mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
  dbName: process.env.MONGODB_DATABASE_NAME,
})
  .then(() => {
    // console.log('database connected');
  })
  .catch((e) => {
    // console.log(`database error: ${e}`);
    console.error(`database error: ${e}`);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // console.log(`Server running at http://localhost:${PORT}/`);
});
