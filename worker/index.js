const SYSTEM_PROMPT = {
  fr: `Tu es l'assistant IA de Velos, une agence digitale spécialisée pour les marchés africains.
Réponds UNIQUEMENT en français.

RÈGLE ABSOLUE : tu ne peux répondre qu'à partir des informations fournies dans le CONTEXTE ci-dessous.
Si une information demandée n'est pas dans le contexte, réponds EXACTEMENT cette phrase et rien d'autre :
"Je n'ai pas cette information. Contacte-nous directement via contact@velos.agency ou via le formulaire sur le site."

Ne mentionne jamais que tu es une IA ou un LLM. Tu es l'assistant Velos.
Ne propose jamais de tarifs ou délais autres que ceux présents dans le contexte.
RÈGLE DÉLAIS : quand tu mentionnes un délai (7-10j, 14j, 21j), précise TOUJOURS qu'il s'agit de jours de développement PUR, et que le décompte ne démarre qu'APRÈS la phase 3 de cadrage — une fois les workflows validés et les accès fournis. La phase de cadrage elle-même, de durée variable, n'est PAS incluse dans ces délais.
TON : adopte un ton naturel et humain — varie tes formulations, montre que tu as compris la question avant de répondre. Évite les réponses robotiques ou trop scolaires. Quand tu présentes plusieurs familles d'offres distinctes, ajoute une courte phrase de transition entre elles.
Sois concis (6-8 lignes max). Pas de conclusion ni de signature.
FORMATAGE : utilise **gras** pour les noms de packs, prix et délais clés. Utilise des listes "- item" pour les énumérations de 3 éléments ou plus.
ANTI-HALLUCINATION : ne crée JAMAIS de nom de pack, de prix ou de délai qui n'est pas mot pour mot dans le CONTEXTE. Si une information n'est pas dans le contexte, dis-le.
Après 3 échanges, propose naturellement de laisser un email ou WhatsApp.
Ne sois jamais insistant sur la capture de contact.

--- CONTEXTE ---
{CHUNKS}
--- FIN CONTEXTE ---`,

  en: `You are the AI assistant of Velos, a digital agency specialized for African markets.
Reply ONLY in English.

ABSOLUTE RULE: you can only answer from the information provided in the CONTEXT below.
If requested information is not in the context, reply EXACTLY this sentence and nothing else:
"I don't have that information. Please contact us at contact@velos.agency or via the form on the website."

Never mention that you are an AI or LLM. You are the Velos assistant.
Never suggest prices or timelines other than those in the context.
DELAY RULE: whenever you mention a timeline (7-10d, 14d, 21d), ALWAYS specify these are PURE development days, and that the count only starts AFTER the Phase 3 scoping — once workflows are validated and accesses provided. The scoping phase itself, of variable duration, is NOT included in these timelines.
TONE: keep a natural, human tone — vary your phrasing, show you understood the question before answering. Avoid robotic or mechanical responses. When presenting multiple distinct offer families, add a short transition sentence between them.
Be concise (6-8 lines max). No conclusion or sign-off.
FORMATTING: use **bold** for pack names, prices and key timelines. Use "- item" lists for enumerations of 3 or more elements.
ANTI-HALLUCINATION: NEVER invent a pack name, price, or timeline that is not word-for-word in the CONTEXT. If information is not in context, say so.
After 3 exchanges, naturally offer to collect an email or WhatsApp.
Never be pushy about lead capture.

--- CONTEXT ---
{CHUNKS}
--- END CONTEXT ---`
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Ingest-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function isAllowedOrigin(origin, allowedOrigin) {
  if (!allowedOrigin) return true;
  if (!origin) return false;
  const allowed = allowedOrigin.replace(/^https?:\/\//, '');
  return origin.includes(allowed) || origin.includes('localhost') || origin.includes('127.0.0.1');
}

async function handleChat(request, env) {
  const { messages, lang, session_id } = await request.json();
  const safeLang = lang === 'en' ? 'en' : 'fr';
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  let chunks = [];

  try {
    const embedResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: lastUserMsg });
    const queryVector = embedResult.data[0];

    const results = await env.VECTORIZE.query(queryVector, {
      topK: 5,
      returnMetadata: 'all',
    });

    chunks = (results.matches || [])
      .filter(m => m.metadata?.lang === safeLang)
      .filter(m => m.score >= 0.35)
      .map(m => m.metadata?.content)
      .filter(Boolean);
  } catch (e) {
    console.error('RAG error:', e.message);
  }

  const systemContent = SYSTEM_PROMPT[safeLang].replace(
    '{CHUNKS}',
    chunks.join('\n\n') || 'Aucun contexte disponible.'
  );

  const aiStream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'system', content: systemContent }, ...messages],
    stream: true,
    max_tokens: 350,
  });

  // Convert CF Workers AI SSE format {"response":"..."} to OpenRouter format
  const { readable, writable } = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) { controller.enqueue(new TextEncoder().encode(line + '\n')); continue; }
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); continue; }
        try {
          const parsed = JSON.parse(raw);
          const content = parsed.response ?? '';
          const out = JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] });
          controller.enqueue(new TextEncoder().encode(`data: ${out}\n\n`));
        } catch { controller.enqueue(new TextEncoder().encode(line + '\n')); }
      }
    },
  });
  aiStream.pipeTo(writable);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...corsHeaders(request.headers.get('Origin')),
    },
  });
}

async function handleLead(request, env) {
  const body = await request.json();
  if (env.N8N_LEAD_WEBHOOK) {
    await fetch(env.N8N_LEAD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, received_at: new Date().toISOString() }),
    }).catch(() => {});
  }
  return Response.json({ ok: true }, { headers: corsHeaders(request.headers.get('Origin')) });
}

async function handleIngest(request, env) {
  const secret = request.headers.get('X-Ingest-Secret');
  if (!secret || secret !== env.INGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chunks } = await request.json();
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return Response.json({ error: 'chunks array required' }, { status: 400 });
  }

  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunk.content });
    vectors.push({
      id: `${chunk.lang}-${chunk.source}-${chunk.chunk_index ?? i}`,
      values: embedResult.data[0],
      metadata: {
        content: chunk.content,
        source: chunk.source,
        lang: chunk.lang,
        chunk_index: String(chunk.chunk_index ?? i),
      },
    });
  }

  await env.VECTORIZE.upsert(vectors);

  return Response.json({ inserted: vectors.length }, { headers: corsHeaders(request.headers.get('Origin')) });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!isAllowedOrigin(origin, env.ALLOWED_ORIGIN)) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    if (request.method === 'POST') {
      if (url.pathname === '/chat')   return handleChat(request, env);
      if (url.pathname === '/lead')   return handleLead(request, env);
      if (url.pathname === '/ingest') return handleIngest(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};
