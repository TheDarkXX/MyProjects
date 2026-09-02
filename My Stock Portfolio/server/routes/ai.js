import { Hono } from 'hono';
import { authMiddleware } from './auth.js';

const aiRoutes = new Hono();
aiRoutes.use('*', authMiddleware);

aiRoutes.post('/', async (c) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return c.json({ error: 'Gemini API Key missing' }, 500);

  try {
    const { prompt } = await c.req.json();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini error');
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return c.json({ text: responseText });
  } catch (error) {
    console.error('AI Error:', error);
    return c.json({ error: 'Failed to process AI request' }, 500);
  }
});

export { aiRoutes };
