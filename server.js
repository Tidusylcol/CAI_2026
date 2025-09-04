// server.js
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Historique pour le téléchargement
let history = [];

/** ---------- Retry + backoff sur l’agent ---------- */
async function callAgentWithRetry(payload, tries = 3) {
  let delay = 800; // ms
  for (let i = 0; i < tries; i++) {
    const r = await fetch('https://api.mistral.ai/v1/agents/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (r.ok) return r;

    const txt = await r.text().catch(() => '');
    const isCapacity =
      r.status === 429 ||
      r.status === 503 ||
      txt.includes('service_tier_capacity_exceeded') ||
      txt.includes('"code":"3505"');

    if (!isCapacity || i === tries - 1) {
      // pas retentable OU dernière tentative
      const err = new Error(txt || r.statusText);
      err.status = r.status;
      throw err;
    }
    // backoff exponentiel
    await new Promise(res => setTimeout(res, delay));
    delay *= 2;
  }
}

/** ---------- Fallback vers modèle direct (sans agent) ---------- */
async function fallbackDirectModel(userMessage) {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-small',
      max_tokens: 50,
      messages: [
        {
          role: 'system',
          content:
            "Tu es un étudiant en école de commerce (EDHEC Business School) en Master 1. Tu réponds dans la langue du message. Ton ton est informel, direct, naturel. Thème: problématiques éthiques liées à l’usage de l’IA (pas seulement genIA). Réponses très courtes (1–2 phrases), sans définitions ni style scolaire. Ne pose pas de question sauf si on t’en pose. Ne dis jamais que tu es une IA. Tu es dans la même salle que l’autre étudiant, en cours d’éthique de l’IA."
        },
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || "Je n'ai pas compris.";
}

/** ---------- Endpoint principal ---------- */
app.post('/api/chat', async (req, res) => {
  const userMessage = (req.body?.message || '').toString().trim();
  if (!userMessage) return res.json({ reply: "Dis-moi quelque chose ;)" });

  history.push({ sender: 'user', text: userMessage });

  const payload = {
    agent_id: 'ag:851e2688:20250725:untitled-agent:6273da2e',
    messages: [{ role: 'user', content: userMessage }],
    max_tokens: 50
    // ⚠️ pas de temperature quand on utilise un agent
  };

  try {
    // 1) on tente l’agent avec retry/backoff
    const r = await callAgentWithRetry(payload, 3);
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Je n'ai pas compris.";
    history.push({ sender: 'bot', text: reply });
    return res.json({ reply });
  } catch (err) {
    console.warn('Agent indisponible, fallback vers modèle direct.', err.message || err);
    // 2) fallback vers modèle direct (system prompt) si capacité saturée
    try {
      const reply = await fallbackDirectModel(userMessage);
      history.push({ sender: 'bot', text: reply });
      return res.json({ reply });
    } catch (e2) {
      console.error('Fallback échoué:', e2.message || e2);
      return res.status(503).json({
        reply: "Le service est saturé en ce moment. Réessaie dans quelques instants."
      });
    }
  }
});

/** ---------- Téléchargement de la conversation ---------- */
app.get('/api/download', (req, res) => {
  let content = "Conversation (Étudiant EDHEC)\n\n";
  history.forEach(msg => {
    content += (msg.sender === 'user' ? "Vous: " : "Étudiant: ") + msg.text + "\n";
  });
  res.setHeader('Content-Disposition', 'attachment; filename=conversation.txt');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
