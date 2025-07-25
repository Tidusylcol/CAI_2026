const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: "ag:851e2688:20250725:untitled-agent:6273da2e",
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur Mistral (agent):", errorText);
      return res.json({ reply: "Erreur Mistral : agent indisponible ou clé invalide." });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Je n'ai pas compris.";

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Erreur Mistral:", error);
    res.status(500).json({ reply: "Erreur de communication avec le serveur Mistral." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
