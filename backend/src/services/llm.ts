import OpenAI from 'openai';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  '你是一位见过无数 bug 的古典诗人，要用诗意表达技术错误，但必须让懂技术的人一眼看出你在说哪类 bug。' +
  '只输出 JSON：{ "title": "...", "poem": ["句1","句2",...], "note": "..." }，' +
  '严格遵守所选诗体的句数、字数要求，意象与报错类型相关。';

// ─── Format constraints ───────────────────────────────────────────────────────

const FORMAT_CONSTRAINTS: Record<string, string> = {
  '七言绝句': '恰好4句，每句7个汉字（不含标点）',
  '五言绝句': '恰好4句，每句5个汉字（不含标点）',
  '俳句': '恰好3行，字数依次约为5/7/5',
  '宋词（小令）': '选一词牌，遵守词牌格律',
  '现代诗': '4到8行，自由格律',
};

// ─── Fallback poems ───────────────────────────────────────────────────────────

interface PoemResult {
  title: string;
  poem: string[];
  note: string;
  isFreeForm?: boolean;
  fallback?: boolean;
}

const FALLBACK_POEMS: Record<string, PoemResult> = {
  '七言绝句': {
    title: '空指针叹',
    poem: [
      '虚无之处指针悬',
      '万里寻址不得还',
      '堆栈层层皆是梦',
      '一声Null天地宽',
    ],
    note: '空指针异常，对象未初始化即被调用',
  },
  '五言绝句': {
    title: '段错误吟',
    poem: [
      '越界访内存',
      '段错误骤生',
      '进程无言死',
      '只留核心倾',
    ],
    note: '段错误，程序访问了不属于它的内存地址',
  },
  '俳句': {
    title: '超时句',
    poem: [
      '请求已发出',
      '服务器无声无息等',
      '连接已超时',
    ],
    note: '网络请求超时，服务端未在规定时间内响应',
  },
  '宋词（小令）': {
    title: '内存溢出·如梦令',
    poem: [
      '堆满无处容身',
      '日夜分配不停',
      '忽报OutOfMemory',
      '崩溃，崩溃',
      '进程此刻已倾',
    ],
    note: '内存溢出，JVM堆空间耗尽',
  },
  '现代诗': {
    title: '404',
    poem: [
      '你寻找的页面',
      '已经不在这里了',
      '也许它从未存在',
      '就像那段注释掉的代码',
      '只留下一个断链',
      '在日志里静静发光',
    ],
    note: '404错误，请求的资源不存在',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function countCJK(s: string): number {
  const matches = s.match(/[\u4e00-\u9fff]/g);
  return matches ? matches.length : 0;
}

export function validatePoem(poem: string[], type: string): string | null {
  switch (type) {
    case '七言绝句':
      if (poem.length !== 4) {
        return `七言绝句需要恰好4句，当前有${poem.length}句`;
      }
      for (let i = 0; i < poem.length; i++) {
        const count = countCJK(poem[i]);
        if (count !== 7) {
          return `七言绝句第${i + 1}句应为7个汉字，当前有${count}个`;
        }
      }
      return null;

    case '五言绝句':
      if (poem.length !== 4) {
        return `五言绝句需要恰好4句，当前有${poem.length}句`;
      }
      for (let i = 0; i < poem.length; i++) {
        const count = countCJK(poem[i]);
        if (count !== 5) {
          return `五言绝句第${i + 1}句应为5个汉字，当前有${count}个`;
        }
      }
      return null;

    case '俳句':
      if (poem.length !== 3) {
        return `俳句需要恰好3行，当前有${poem.length}行`;
      }
      return null;

    default:
      // 宋词（小令）和现代诗不做严格校验
      return null;
  }
}

// ─── LLM caller ───────────────────────────────────────────────────────────────

async function callLLM(userPrompt: string): Promise<PoemResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });

  const modelName = process.env.MODEL_NAME || 'gpt-4o-mini';

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM request timed out after 10s')), 10_000)
  );

  const callPromise = client.chat.completions.create({
    model: modelName,
    temperature: 0.9,
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const response = await Promise.race([callPromise, timeoutPromise]);

  const raw = response.choices[0]?.message?.content ?? '';

  // Strip optional ```json fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  const parsed = JSON.parse(cleaned) as PoemResult;
  return parsed;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generatePoem(
  errorText: string,
  poetryType: string
): Promise<PoemResult & { isFreeForm: boolean; fallback?: boolean }> {
  const constraint = FORMAT_CONSTRAINTS[poetryType] ?? '自由格律';

  const buildInitialPrompt = () =>
    `请将以下报错信息改写为一首${poetryType}。格式要求：${constraint}。\n报错内容：\n${errorText}`;

  const buildRetryPrompt = (reason: string) =>
    `上一次生成不合格，原因：${reason}。请重新生成，严格遵守${poetryType}格式：${constraint}。报错内容：${errorText}。只输出JSON`;

  let lastResult: PoemResult | null = null;
  let isFreeForm = false;
  const MAX_RETRIES = 2;

  try {
    // Initial attempt
    let prompt = buildInitialPrompt();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const result = await callLLM(prompt);
      const validationError = validatePoem(result.poem, poetryType);

      if (validationError === null) {
        return { ...result, isFreeForm: false };
      }

      lastResult = result;

      if (attempt < MAX_RETRIES) {
        prompt = buildRetryPrompt(validationError);
      }
    }

    // All retries exhausted — return best result with freeForm flag
    isFreeForm = true;
    return { ...(lastResult as PoemResult), isFreeForm };
  } catch {
    // LLM error or timeout — return fallback poem
    const fallback = FALLBACK_POEMS[poetryType] ?? FALLBACK_POEMS['七言绝句'];
    return { ...fallback, isFreeForm: false, fallback: true };
  }
}
