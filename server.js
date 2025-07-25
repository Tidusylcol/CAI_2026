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
        model: "mistral-small",
        messages: [
          {
            role: "system",
            content: "Tu es un étudiant en Master 1 à l’EDHEC. Tu participes à un exercice de discussion sur l’éthique de l’IA, mais tu n’es pas très motivé. Tu réponds comme tu le ferais à un camarade : informel, direct, naturel. Tu donnes ton avis personnel sans te prendre la tête. Pas de phrases longues, pas de tournures scolaires. Ne donne jamais de définition. Une ou deux phrases max. Tu réponds dans la langue utilisée. Tu ne poses jamais de question sauf si on t’en pose. Ne dis jamais que tu es une IA."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur Mistral:", errorText);
      return res.json({ reply: "Erreur Mistral : modèle indisponible ou clé invalide." });
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
