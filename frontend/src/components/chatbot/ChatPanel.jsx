import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Zap } from "lucide-react";

import { sendChatMessage } from "../../api/client";

export default function ChatPanel({ tenant, open, setOpen }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        text: `Hi, I'm Cortex Copilot for ${tenant.name}. Ask me about your bill, Power Factor, THD, or any abnormalities.`,
        cites: [],
      },
    ]);
  }, [tenant]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    
    // Add temporary typing indicator
    setMessages((m) => [...m, { role: "assistant", text: "", typing: true }]);

    try {
      const response = await sendChatMessage(tenant.id, text);
      setMessages((m) => {
        // Remove typing indicator and add final response
        const clean = m.filter((msg) => !msg.typing);
        return [
          ...clean,
          {
            role: "assistant",
            text: response.text,
            cites: response.cites || [],
          },
        ];
      });
    } catch (err) {
      console.error(err);
      setMessages((m) => {
        const clean = m.filter((msg) => !msg.typing);
        return [
          ...clean,
          {
            role: "assistant",
            text: "Sorry, I encountered an error communicating with the Cortex Backend. Please make sure the backend is running.",
            cites: [],
          },
        ];
      });
    }
  }

  const suggestions = ["Why is my bill higher?", "What caused my PF to drop?", "Any abnormalities?"];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
        aria-label="Open Cortex Copilot chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-40 w-[340px] max-w-[90vw] h-[440px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center">
              <Zap size={14} className="text-gray-900" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Cortex Copilot</div>
              <div className="text-[10px] text-gray-300 mt-0.5">{tenant.name} · grounded to your data</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-gray-900 text-white rounded-br-sm"
                      : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {m.typing ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    m.text
                  )}
                  {m.cites?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.cites.map((c, j) => (
                        <span key={j} className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="px-3 pt-2 flex gap-1 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 text-gray-600"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-100 flex items-center gap-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about your energy data…"
              className="flex-1 text-xs px-3 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <button
              onClick={() => send(input)}
              className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}