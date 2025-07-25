const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const timerDisplay = document.getElementById('timer');

let chatEnded = false;
let timerSeconds = 300;

function startTimer() {
  const interval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(interval);
      endChat();
      return;
    }
    timerSeconds--;
    const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const sec = String(timerSeconds % 60).padStart(2, '0');
    timerDisplay.textContent = `${min}:${sec}`;
  }, 1000);
}

function endChat() {
  chatEnded = true;
  userInput.disabled = true;
  chatForm.querySelector('button').disabled = true;
  addMessage('bot', "Fin de la session. Merci !");
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (chatEnded) return;

  const message = userInput.value.trim();
  if (!message) return;

  addMessage('user', message);
  userInput.value = '';

  const thinkingMsg = addMessage('bot', '...');
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const data = await response.json();
  thinkingMsg.textContent = "IA: " + data.reply;
});

function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = 'message ' + sender;
  msg.textContent = (sender === 'user' ? "Vous: " : "IA: ") + text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

startTimer();
