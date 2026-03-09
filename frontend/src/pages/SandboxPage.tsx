import { useState } from "react";
import { Send, Bot, User, ArrowRight } from "lucide-react";
import { apiClient } from "../api/client";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../components/ui";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function SandboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!currentInput.trim()) return;

    const userMessage = currentInput;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setCurrentInput("");
    setLoading(true);

    try {
      const res = await apiClient.post("/sandbox/chat", {
        prompt: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        { role: "model", content: res.data.response },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Error: Failed to get response from the model.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (userPrompt: string, modelResponse: string) => {
    // Navigate to the analysis page, passing the prompt and response as state
    navigate("/analyze", {
      state: { prompt: userPrompt, response: modelResponse },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col h-[calc(100vh-4rem)]">
      <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-800">Live Chat Sandbox</h1>
        <p className="text-slate-500 mt-1">
          Interact directly with the Gemini model. If it generates a problematic
          response, instantly analyze it.
        </p>
      </header>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Bot size={48} className="mb-4 opacity-50" />
              <p>Send a message to start chatting with Gemini.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              // Find corresponding prompt for a model response to allow analysis
              const prevPrompt =
                !isUser && idx > 0 ? messages[idx - 1].content : "";

              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[80%] gap-3 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isUser
                          ? "bg-indigo-600 text-white"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div
                        className={`px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Analyze Button for Model Responses */}
                      {!isUser && !msg.content.startsWith("Error:") && (
                        <div className="self-end">
                          <button
                            onClick={() =>
                              handleAnalyze(prevPrompt, msg.content)
                            }
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                          >
                            Analyze Response <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 rounded-tl-none flex items-center gap-2">
                  <Spinner />
                  <span className="text-sm text-slate-500">
                    Gemini is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex gap-2 relative">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Gemini something..."
              className="flex-1 resize-none h-14 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 pr-12 text-sm text-slate-900 bg-white"
            />
            <button
              onClick={handleSend}
              disabled={loading || !currentInput.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line.
          </p>
        </div>
      </div>
    </div>
  );
}
