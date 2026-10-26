import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { rateLimitMiddleware } from './middleware/rateLimit';
import poemRouter from './routes/poem';

const app = express();

// Trust proxy headers (needed for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimitMiddleware);

app.use('/api/poem', poemRouter);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback: all non-API routes return index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.listen(PORT, () => {
  console.log(`Bug Poet backend listening on http://localhost:${PORT}`);
});
