/**
 * Proxies the app's AI assistant chat to OpenRouter so the API key never
 * ships inside the client app. The client speaks the OpenAI-compatible shape
 * (messages / tools / tool_calls), which OpenRouter accepts as is, so this is a
 * thin pass-through plus the things only the server can enforce:
 *
 *  - The model is chosen HERE. Whatever `model` a client sends is ignored —
 *    otherwise anyone with a login could point our key at an expensive model.
 *  - Thinking is off by default (it triples latency and output cost for no
 *    accuracy gain on this app's short tool-routing turns). The user can switch
 *    it on in the chat (`deep_thinking: true`) for questions that need more care;
 *    such a request is allowed more output and counts as 3 against the hourly
 *    limit.
 *  - Requests only go to hosts that do not collect prompts (`data_collection:
 *    deny`), since chats can contain prayer and fasting habits.
 *  - Upstream failures are logged here and reported to the app as generic
 *    errors, so provider details and key/credit problems never reach users.
 */
const { checkAndRecord } = require('../services/aiRateLimiter');

const API_KEY = process.env.OPENROUTER_API_KEY;
// Overridable by env for the server owner only — never by the client.
const MODEL = process.env.AI_MODEL || 'qwen/qwen3.7-flash';
const MAX_OUTPUT_TOKENS = 2048;
// Thinking tokens come out of max_tokens too, so deep requests get more room.
const MAX_OUTPUT_TOKENS_DEEP = 4096;
const DEEP_THINKING_COST = 3;
const TIMEOUT_MS = 60000;

// Keep only the fields the OpenAI format defines. Older app sessions echo extra
// fields back in tool calls (e.g. `thoughtSignature` from the retired Gemini
// proxy), which other providers can reject.
function cleanMessages(messages) {
  return messages.map((m) => {
    const out = { role: m.role, content: m.content ?? null };
    if (m.name) out.name = m.name;
    if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
    if (Array.isArray(m.tool_calls)) {
      out.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.function?.name, arguments: tc.function?.arguments ?? '{}' },
      }));
    }
    return out;
  });
}

async function chat(req, res, next) {
  try {
    if (!API_KEY) {
      return res.status(503).json({ error: 'The AI assistant is not configured on this server.' });
    }

    // Only a literal `true` turns it on; anything else is the normal fast mode.
    const deep = req.body?.deep_thinking === true;

    const { allowed, retryAfterMs } = checkAndRecord(req.user._id, deep ? DEEP_THINKING_COST : 1);
    if (!allowed) {
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000).toString());
      return res.status(429).json({ error: 'Too many AI assistant requests — please try again later.' });
    }

    const { messages, tools, temperature, max_tokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const body = {
      model: MODEL,
      messages: cleanMessages(messages),
      temperature: Number.isFinite(temperature) ? Math.min(Math.max(temperature, 0), 1.5) : 0.7,
      // Deep mode gets a fixed, larger allowance (the app always asks for 2048,
      // which would leave thinking no room); normal mode honours a smaller ask.
      max_tokens: deep
        ? MAX_OUTPUT_TOKENS_DEEP
        : Math.min(Number.isFinite(max_tokens) && max_tokens > 0 ? max_tokens : MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
      reasoning: { enabled: deep },
      provider: { data_collection: 'deny' },
    };
    if (Array.isArray(tools) && tools.length > 0) body.tools = tools;

    let response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          'X-Title': 'Hisaabi',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error('[ai-assistant] upstream request failed:', err.name, err.message);
      return res.status(err.name === 'TimeoutError' ? 504 : 502).json({ error: 'The AI assistant is not available right now. Please try again.' });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // 401/402/403 here mean OUR key or credit is the problem, 429 is the
      // provider being busy: none of it is the user's doing, so it is never
      // passed on as a 4xx (the app reads 429 as "you hit your own limit").
      console.error('[ai-assistant] upstream error:', response.status, data?.error?.message || '');
      return res.status(503).json({ error: 'The AI assistant is not available right now. Please try again.' });
    }
    return res.status(200).json({ choices: data.choices || [] });
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
