require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const recipeRoutes = require('./src/routes/recipeRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const journalRoutes = require('./src/routes/journalRoutes');
const conversionRoutes = require('./src/routes/conversionRoutes');
const groceryRoutes = require('./src/routes/groceryRoutes');
const mediaRoutes = require('./src/routes/mediaRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ success: true, message: "Baker's Diary API is running" }));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/conversions', conversionRoutes);
app.use('/api/groceries', groceryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Baker's Diary API listening on port ${PORT}`));

module.exports = app;
