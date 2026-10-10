import { Router, Request, Response } from 'express';
import { generatePoem } from '../services/llm';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  let { errorText, poetryType } = req.body as {
    errorText?: string;
    poetryType?: string;
  };

  if (!errorText || typeof errorText !== 'string' || errorText.trim() === '') {
    res.status(400).json({ error: '先给我一个 bug 吧' });
    return;
  }

  // Backend truncation safety net (frontend should truncate first, but we guard here too)
  if (errorText.length > 5000) {
    errorText = errorText.slice(0, 2000) + '\n...[已截断]...\n' + errorText.slice(-1000);
  }

  const type = (poetryType && typeof poetryType === 'string')
    ? poetryType
    : '七言绝句';

  const result = await generatePoem(errorText.trim(), type);

  if (result.fallback) {
    res.json({ ...result, message: '诗人今天罢工了' });
    return;
  }

  res.json(result);
});

export default router;
