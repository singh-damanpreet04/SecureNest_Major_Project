import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuthStore } from "../store/useAuthStore";

const AI_USER = {
  _id: "secure-ai-bot",
  username: "Secure AI",
  avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712036.png" // Example AI avatar
};

const AIChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const authUser = useAuthStore((state) => state.authUser);

  // Load chat history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (!authUser?._id) return;
      try {
        const res = await fetch(`http://localhost:5003/api/ai/history?userId=${authUser?._id}`, {
          credentials: "include",
        });
        const data = await res.json();
        // Convert backend format to frontend format
        const historyMsgs = (data.messages || []).map((msg) => ({
          text: msg.content,
          senderId: msg.role === "assistant" ? AI_USER._id : "user-local",
          createdAt: msg.timestamp,
        }));
        setMessages(historyMsgs);
      } catch (e) {
        // ignore errors silently
      }
    };
    fetchHistory();
  }, [authUser?._id]);

  const handleSend = async (e) => {
    e.preventDefault();
    const userMessage = {
      text: input,
      senderId: "user-local",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Use EventSource-like streaming via fetch and ReadableStream
      // Prepare full conversation history for context
      // Only send the last 4 messages for context
      const recentMessages = messages.slice(-4);
      const historyForAI = recentMessages.map((msg) => ({
        role: msg.senderId === AI_USER._id ? "assistant" : "user",
        content: msg.text,
      }));
      const response = await fetch("http://localhost:5003/api/ai/message", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text, userId: authUser?._id, history: historyForAI }),
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      let aiText = "";
      let decoder = new TextDecoder();
      setMessages((prev) => [
        ...prev,
        { text: "", senderId: AI_USER._id, createdAt: new Date().toISOString() },
      ]);
      let done = false;
      let buffer = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value);
          // Split buffer into words, but keep last incomplete word in buffer
          let words = buffer.split(/(\s+)/g);
          // If the last chunk is not whitespace, keep it in buffer for next round
          let lastIsPartial = words.length && !/\s+/.test(words[words.length - 1]);
          let toShow = lastIsPartial ? words.slice(0, -1) : words;
          for (let w of toShow) {
            aiText += w;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: aiText,
              };
              return updated;
            });

          }
          buffer = lastIsPartial ? words[words.length - 1] : "";
        }
      }
      // Show any remaining buffer
      if (buffer) {
        aiText += buffer;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: aiText,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I couldn't process your request.",
          senderId: AI_USER._id,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 min-h-screen min-w-screen w-screen h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 overflow-hidden p-0 m-0">
      <div className="h-16 w-full flex-shrink-0 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-xl border-b border-white/10 z-10 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5" />
        <Navbar />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-2 py-4">
        <div className="w-full max-w-2xl h-[70vh] bg-[#0f172a]/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-12">Start chatting with Secure AI!</div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex mb-2 ${msg.senderId === AI_USER._id ? "justify-start" : "justify-end"}`}>
                {msg.senderId === AI_USER._id && (
                  <img src={AI_USER.avatar} alt="AI" className="w-8 h-8 rounded-full mr-2" />
                )}
                <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl relative ${msg.senderId === AI_USER._id ? "bg-indigo-900 text-indigo-100" : "bg-blue-800 text-blue-100"}`}>
                  <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
                  <div className="text-xs mt-1 text-right text-gray-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.senderId !== AI_USER._id && (
                  <div className="w-8 h-8 rounded-full ml-2 bg-blue-500/10 flex items-center justify-center text-blue-300 font-bold">U</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-2">
                <img src={AI_USER.avatar} alt="AI" className="w-8 h-8 rounded-full mr-2" />
                <div className="max-w-xs md:max-w-md px-4 py-2 rounded-2xl bg-indigo-900 text-indigo-100 animate-pulse">Secure AI is typing...</div>
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="flex items-center border-t border-gray-700 px-3 py-2 bg-gray-900 z-10">
            <input
              type="text"
              className="flex-1 bg-transparent outline-none border-none text-white placeholder:text-gray-400 px-4 py-2 rounded-lg"
              placeholder="Ask Secure AI anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="ml-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
