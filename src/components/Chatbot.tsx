import { useState, useEffect, useRef } from "react";

interface NewsArticle {
  title: string;
  summary: string;
  category?: string;
  source: { id?: string; name: string } | string;
  url: string;
  publishedAt: string;
  image?: string | null;
}

interface ChatbotProps {
  articles: NewsArticle[];
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Chatbot = ({ articles, externalOpen, onOpenChange }: ChatbotProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen === undefined ? internalOpen : externalOpen;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; text: string }>>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const searchArticles = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);

    const scored = articles
      .map((a) => {
        const text = `${a.title} ${a.summary} ${typeof a.source === "string" ? a.source : a.source.name}`.toLowerCase();
        let score = 0;
        tokens.forEach((t) => {
          if (text.includes(t)) score += 1;
        });
        return { article: a, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored.map((s) => s.article);
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);

    const results = searchArticles(text);

    if (results.length === 0) {
      const reply = `I couldn't find articles matching "${text}". Try different keywords or ask about a topic (e.g. "technology", "sports").`;
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    } else {
      const lines = results.map(
        (r) =>
          `• ${r.title} (${new Date(r.publishedAt).toLocaleDateString()})\n  ${r.summary?.slice(0, 140)}...\n  ${r.url}`
      );
      const reply = `I found ${results.length} articles related to "${text}":\n\n${lines.join("\n\n")}`;
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    }

    setInput("");
  };

  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  return (
    <div>
      {/* Floating button (kept as a fallback) */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Open chat"
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:shadow-2xl transition-all ring-2 ring-white/10"
        >
          Chat
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-[9999] w-[360px] max-h-[70vh] bg-card rounded-lg shadow-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold">News Assistant</div>
              <div className="text-xs text-muted-foreground">Ask about topics or search articles</div>
            </div>
            <div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="p-4 space-y-3 overflow-auto flex-1">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Hi — ask me about a topic or paste keywords to search recent articles.
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted p-3"
                  } rounded-lg max-w-[80%] whitespace-pre-wrap`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a topic or search keywords..."
                className="flex-1 px-3 py-2 rounded-md border bg-transparent outline-none"
              />
              <button type="submit" className="bg-primary px-4 py-2 rounded-md text-primary-foreground">
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;