/**
 * Translates between the OpenAI-compatible chat-completion shape the
 * Flutter client speaks (messages / tools / tool_calls — kept exactly as
 * it always was, so switching providers never touched the client's
 * conversation history or its tool-calling loop) and Google's native
 * Gemini generateContent API, which uses a different shape for turns
 * (contents / parts), function declarations, and function results.
 */

/** OpenAI JSON-schema `type` values -> Gemini's Schema.Type enum (uppercase). */
function upperSchemaTypes(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(upperSchemaTypes);

  const out = { ...schema };
  if (typeof out.type === 'string') out.type = out.type.toUpperCase();
  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([key, value]) => [key, upperSchemaTypes(value)])
    );
  }
  if (out.items) out.items = upperSchemaTypes(out.items);
  return out;
}

/** OpenAI `tools` array -> Gemini `tools` (one functionDeclarations block). */
function toGeminiTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: upperSchemaTypes(t.function.parameters),
      })),
    },
  ];
}

/**
 * OpenAI `messages` -> Gemini's `{ systemInstruction, contents }`.
 *
 * Gemini has no tool_call_id concept — a function result is matched back
 * to its call by function *name*, not an id. The id -> name mapping is
 * rebuilt by scanning the conversation in order: each assistant turn's
 * tool_calls sets the mapping, and the tool-result message(s) immediately
 * following it (before the next assistant turn can reuse the same id)
 * consume that mapping — so processing strictly in array order, as the
 * client always sends the full history, keeps this correct even when ids
 * like "call_0" repeat across separate rounds of the same conversation.
 */
function toGeminiPayload(messages) {
  let systemInstruction;
  const contents = [];
  const callIdToName = new Map();

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: m.content }] };
      continue;
    }

    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content ?? '' }] });
      continue;
    }

    if (m.role === 'assistant') {
      if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        const parts = m.tool_calls.map((tc) => {
          callIdToName.set(tc.id, tc.function.name);
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch (_) {
            // Leave args empty rather than fail the whole turn over one bad call.
          }
          const part = { functionCall: { name: tc.function.name, args, id: tc.id } };
          // Required when echoing a function call back into history — this
          // model generation rejects a functionCall part with no
          // thoughtSignature (confirmed live, 2026-09). fromGeminiResponse
          // stashes the one Gemini issued onto the same tool_call object so
          // it round-trips through the client's stored history untouched.
          if (tc.thoughtSignature) part.thoughtSignature = tc.thoughtSignature;
          return part;
        });
        contents.push({ role: 'model', parts });
      } else {
        contents.push({ role: 'model', parts: [{ text: m.content ?? '' }] });
      }
      continue;
    }

    if (m.role === 'tool') {
      const name = callIdToName.get(m.tool_call_id) || 'unknown_function';
      let responsePayload;
      try {
        responsePayload = JSON.parse(m.content);
      } catch (_) {
        responsePayload = { result: m.content };
      }
      // Confirmed live against the API (2026-09): this model generation
      // rejects role "function" for a function result ("Role 'function' is
      // not supported... valid role: SYSTEM, SYSTEM_1, USER, ASSISTANT,
      // DEVELOPER, CONTEXT, USER_CONTEXT, MODEL, USER") — a functionResponse
      // part goes on a "user" turn instead.
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name, response: responsePayload } }],
      });
    }
  }

  return { systemInstruction, contents };
}

/** Gemini's response -> the OpenAI-shaped { choices: [...] } the client expects. */
function fromGeminiResponse(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    // No candidate (e.g. a safety block) — the client already handles an
    // empty choices list with a graceful "could not generate a response".
    return { choices: [] };
  }

  const parts = candidate.content?.parts || [];
  const functionCallParts = parts.filter((p) => p.functionCall);

  if (functionCallParts.length > 0) {
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: functionCallParts.map((p, i) => ({
              id: p.functionCall.id || `call_${i}`,
              type: 'function',
              function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args || {}),
              },
              // Not an OpenAI field — carried along so toGeminiPayload can
              // re-attach it if this call ever gets echoed back in history.
              ...(p.thoughtSignature && { thoughtSignature: p.thoughtSignature }),
            })),
          },
        },
      ],
    };
  }

  const text = parts.map((p) => p.text || '').join('');
  return { choices: [{ message: { role: 'assistant', content: text } }] };
}

module.exports = { toGeminiTools, toGeminiPayload, fromGeminiResponse };
