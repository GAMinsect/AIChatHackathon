import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'))

// Store conversation history (in-memory, keyed by session or just global)
const conversations = new Map(); // sessionId -> messages[]

// Multer config for file uploads (store in memory or disk)
const upload = multer({ storage: multer.memoryStorage() });

// OpenRouter client
const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Helper to get or create conversation history
function getHistory(sessionId = 'default') {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  return conversations.get(sessionId);
}

// Save user message and AI response to history
function addToHistory(sessionId, userMessage, aiResponse) {
  const history = getHistory(sessionId);
  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: aiResponse });
}

// Chat endpoint
app.post('/api/chat', upload.single('file'), async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  
  let fullMessage = message;

  // If a file was uploaded along with the message, read its contents
  if (req.file) {
    const fileText = req.file.buffer.toString('utf-8');
    fullMessage = `${message}\n\n[Attached File: ${req.file.originalname}]\n\`\`\`\n${fileText}\n\`\`\``;
  }

  const history = getHistory(sessionId);
  let messages = [...history, { role: 'user', content: fullMessage }];

  try {
    const completion = await client.chat.send({
      chatRequest: {
        model: 'recursive/flint-v1.0:free',
        messages,
      },
    });

    const aiResponse = completion.choices[0].message.content;
    
    // Save the original clean user message to history (or fullMessage if you want context)
    addToHistory(sessionId, message, aiResponse);

    res.json({ response: aiResponse, history: getHistory(sessionId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI request failed' });
  } 
});

// Get history endpoint
app.get('/api/history', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  res.json({ history: getHistory(sessionId) });
});

// Clear history endpoint
app.post('/api/reset', (req, res) => {
  const sessionId = req.body.sessionId || 'default';
  conversations.delete(sessionId);
  res.json({ success: true });
});

// File upload endpoint (optional – you can also handle directly in chat if needed)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  // For now, just return file info. You can read content based on mimetype.
  // For text files, you could read with fs or buffer.
  // For images, you might pass base64 to the AI.
  // We'll just return the file name and size for now.
  res.json({
    file: {
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 