/**
 * Proxies chat-completion requests to Google's Gemini API directly so the
 * API key never ships inside the client app. The client still speaks the
 * OpenAI-compatible shape it always has (messages / tools / tool_calls) —
 * geminiTranslator converts to and from Gemini's native request/response
 * shape here, so switching off OpenRouter never touched the Flutter side's
 * conversation history or tool-calling loop.
 */
const { checkAndRecord } = require('../services/aiRateLimiter');
const { toGeminiTools, toGeminiPayload, fromGeminiResponse } = require('../services/geminiTranslator');

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-3.6-flash';

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

    // The client still sends OpenRouter-style "google/gemini-2.5-flash" —
    // Gemini's own API wants just the bare model id.
    const modelId = (model || DEFAULT_MODEL).replace(/^google\//, '');
    const { systemInstruction, contents } = toGeminiPayload(messages);
    const geminiTools = toGeminiTools(tools);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        ...(systemInstruction && { systemInstruction }),
        contents,
        ...(geminiTools && { tools: geminiTools }),
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: max_tokens ?? 2048,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    return res.status(200).json(fromGeminiResponse(data));
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
