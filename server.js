const WebSocket = require('ws');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://hariharan98704:LecKPWQPSqzetLu6@cluster1.lf4un.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Chat message schema & model
const chatMessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Start WebSocket server
const wss = new WebSocket.Server({ port: 5050 });
console.log('🚀 WebSocket server started on ws://localhost:5050');

// Broadcast helper
function broadcast(message, exceptWs = null) {
  wss.clients.forEach(client => {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle new connections
wss.on('connection', async (ws) => {
  console.log('👤 New client connected');

  // Send recent chat history (optional)
  const history = await ChatMessage.find().sort({ timestamp: 1 }).limit(50);
  history.forEach(msg => {
    ws.send(`[${msg.sender}] ${msg.message}`);
  });

  // Welcome message
  ws.send('✅ Connected to chat server');

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const text = data.toString();
      const [sender, ...rest] = text.split(':');
      const message = rest.join(':').trim();

      if (!sender || !message) {
        console.warn('⚠️ Invalid message format:', text);
        return;
      }

      const chat = new ChatMessage({
        sender: sender.trim(),
        message: message
      });
      await chat.save();

      const formatted = `[${sender.trim()}] ${message}`;
      broadcast(formatted); // send to all clients
    } catch (err) {
      console.error('❌ Failed to handle message:', err);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });
});
