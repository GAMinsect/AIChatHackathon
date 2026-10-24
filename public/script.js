const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const fileBtn = document.getElementById('file-btn');
const fileInput = document.getElementById('file-input');

let sessionId = 'default';

// Load history on start
async function loadHistory() {
    try {
        const res = await fetch(`/api/history?sessionId=${sessionId}`);
        
        // Check if the response is successful (status 200-299)
        if (!res.ok) {
        console.warn(`Server returned error status: ${res.status}`);
        return;
        }

        // Check if the response is actually JSON before parsing
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
        console.warn('Server did not return JSON (likely hit an HTML 404 or error page).');
        return;
        }

        const data = await res.json();
        
        // Ensure data.history exists before looping
        if (data && Array.isArray(data.history)) {
        data.history.forEach(msg => addMessageToUI(msg.role, msg.content));
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  const file = fileInput.files[0];
  
  if (!text && !file) return;

  // Display user message in UI (show file name if attached)
  let displayText = text;
  if (file) {
    displayText += ` 📎 [File: ${file.name}]`;
  }
  addMessageToUI('user', displayText);

  messageInput.value = '';
  
  // Build FormData to send both text and file together
  const formData = new FormData();
  formData.append('message', text || 'Please analyze this file.');
  formData.append('sessionId', sessionId);
  if (file) {
    formData.append('file', file);
  }

  // Clear file input selection
  fileInput.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData, // Fetch automatically sets the correct multipart headers for FormData
    });
    
    const data = await res.json();
    addMessageToUI('assistant', data.response);
  } catch (err) {
    console.error('Chat request failed', err);
  }
}

// Add message to UI
function addMessageToUI(role, content) {
  const div = document.createElement('div');
  div.classList.add('message', role);
  
  // Use marked.parse() to convert Markdown to HTML safely
  div.innerHTML = marked.parse(content);
  
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
fileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) {
    // Optionally auto-send or just store file
  }
});

// Init
loadHistory();