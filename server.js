// server.js
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Fichiers statiques (public/index.html, public/script.js, public/style.css, etc.)
app.use(express.static('public'));
app.use(express.json());

// Historique pour téléchargement
let history = [];

app.post('/api/chat', async (req, res) => {
  const userMessage = (req.body?.message || '').toString().trim();
  if (!userMessage) return res.json({ reply: "Dis-moi quelque chose ;)" });

  history.push({ sender: 'user', text: userMessage });

  try {
    const r = await fetch('https://api.mistral.ai/v1/agents/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: 'ag:851e2688:20250725:untitled-agent:6273da2e',
        messages: [
          { role: 'user', content: userMessage }
        ],
        max_tokens: 50   // ✅ autorisé
        // ❌ PAS de temperature ici !
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('Erreur Mistral (agent):', txt);
      return res.status(502).json({ reply: "Oups, souci côté agent. Réessaie." });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "Je n'ai pas compris.";
    history.push({ sender: 'bot', text: reply });

    res.json({ reply });
  } catch (err) {
    console.error('Erreur Mistral (agent):', err);
    res.status(500).json({ reply: "Erreur réseau/serveur avec Mistral." });
  }
});

// Endpoint pour télécharger la conversation
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
