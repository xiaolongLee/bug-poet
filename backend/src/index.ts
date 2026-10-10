import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import poemRouter from './routes/poem';

const app = express();

// Trust proxy headers (needed for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimitMiddleware);

app.use('/api/poem', poemRouter);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.listen(PORT, () => {
  console.log(`Bug Poet backend listening on http://localhost:${PORT}`);
});
