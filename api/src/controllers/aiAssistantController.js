/**
 * Proxies chat-completion requests to OpenRouter so the API key never ships
 * inside the client app. The client still owns the conversation history,
 * system prompt, tool definitions, and the tool-calling loop — this is only
 * the one network hop that needs a secret, moved server-side.
 */
const { checkAndRecord } = require('../services/aiRateLimiter');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

async function chat(req, res, next) {
  try {
    if (!API_KEY) {
      return res.status(503).json({ error: 'The AI assistant is not configured on this server.' });
    }

    const { allowed, retryAfterMs } = checkAndRecord(req.user._id);
    if (!allowed) {
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000).toString());
      return res.status(429).json({ error: 'Too many AI assistant requests — please try again later.' });
    }

    const { model, messages, tools, temperature, max_tokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://hisabi.app',
        'X-Title': 'Hisabi App',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        tools,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
