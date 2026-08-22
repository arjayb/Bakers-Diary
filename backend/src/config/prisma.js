const { PrismaClient } = require('@prisma/client');

// Single shared client instance — avoids exhausting DB connections in dev
// with hot-reload creating a new client per file change.
const prisma = global.__bakersDiaryPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__bakersDiaryPrisma = prisma;

module.exports = prisma;
