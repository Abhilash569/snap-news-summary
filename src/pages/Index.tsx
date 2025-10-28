import { useState, useEffect } from "react";
import { NewsCard } from "@/components/NewsCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { NewsHeader } from "@/components/NewsHeader";
import Chatbot from "@/components/Chatbot";
import summarizeText from "@/lib/summarize";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewsArticle {
  title: string;
  summary: string;
  category?: string;
  source: {
    id?: string;
    name: string;
  } | string;
  url: string;
  publishedAt: string;
  image?: string | null;
}
const getSourceCategory = (sourceName?: string): string | undefined => {
  if (!sourceName) return undefined;
  const name = sourceName.toLowerCase();
  if (name.includes('tech') || name.includes('gadget') || name.includes('digital')) return 'technology';
  if (name.includes('sport') || name.includes('athletic') || name.includes('game')) return 'sports';
  if (name.includes('business') || name.includes('finance') || name.includes('market')) return 'business';
  if (name.includes('entertainment') || name.includes('movie') || name.includes('hollywood')) return 'entertainment';
  return undefined;
};

interface TopicGroup {
  topic: string;
  articles: NewsArticle[];
}

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"headlines" | "topics">("headlines");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const { toast } = useToast();

  const sortArticles = (articles: NewsArticle[]) => {
    return [...articles].sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  };

  const groupArticlesByTopic = (articles: NewsArticle[]) => {
    const groups: { [key: string]: NewsArticle[] } = {};
    
    articles.forEach(article => {
      const text = `${article.title} ${article.summary}`.toLowerCase();
      let foundTopic = false;
      
      // Define common topics and their keywords
      const topicKeywords = {
        'Politics': ['politics', 'government', 'election', 'trump', 'biden', 'congress', 'senate'],
        'Technology': ['tech', 'ai', 'software', 'apple', 'google', 'microsoft', 'android', 'iphone'],
        'Business': ['business', 'economy', 'market', 'stock', 'company', 'startup', 'investment'],
        'Sports': ['sports', 'game', 'player', 'team', 'football', 'basketball', 'baseball'],
        'Entertainment': ['movie', 'film', 'celebrity', 'actor', 'music', 'hollywood', 'star'],
        'Science': ['science', 'research', 'study', 'discovery', 'space', 'climate'],
        'Health': ['health', 'medical', 'disease', 'treatment', 'doctor', 'patient', 'medicine']
      };

      // Check each topic's keywords
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          groups[topic] = groups[topic] || [];
          groups[topic].push(article);
          foundTopic = true;
          break;
        }
      }

      // If no specific topic found, add to Other
      if (!foundTopic) {
        groups['Other'] = groups['Other'] || [];
        groups['Other'].push(article);
      }
    });

    // Convert to array of topic groups and sort by article count
    return Object.entries(groups)
      .map(([topic, articles]) => ({ topic, articles }))
      .sort((a, b) => b.articles.length - a.articles.length);
  };

  const fetchNews = async () => {
    console.log("Starting news fetch...");
    setIsLoading(true);
    setError(null);
    try {
      // Try the Supabase edge function first (if configured)
      let data: any = null;
      try {
        console.log("Invoking Supabase fetch-news function...");
        const res = await supabase.functions.invoke('fetch-news');
        console.log("Supabase response:", res);
        
        if (res && res.data) {
          console.log("Got data from Supabase:", res.data);
          data = res.data;
        }
        if (res && res.error) {
          const err = res.error;
          console.error("Supabase error:", err);
          if (err.message?.includes('429')) {
            toast({
              title: "Rate Limit Reached",
              description: "Please wait a moment before refreshing again.",
              variant: "destructive",
            });
          } else if (err.message?.includes('402')) {
            toast({
              title: "Payment Required",
              description: "Please add credits to your workspace to continue.",
              variant: "destructive",
            });
          } else {
            // log and continue to fallback
            console.warn('Supabase function error:', err);
          }
        }
      } catch (supErr) {
        // invocation failed (e.g. missing env or network) - log and fall back
        console.error('Supabase invocation failed:', supErr);
        console.log("Falling back to local news.json...");
      }

      // If supabase didn't return articles, try a local fallback (public/news.json)
      if (!data?.articles) {
        console.log("No articles from Supabase, trying local fallback...");
        try {
          const fallbackResp = await fetch('/news.json');
          console.log("Fallback response status:", fallbackResp.status);
          
          if (fallbackResp.ok) {
            const fallbackJson = await fallbackResp.json();
            console.log("Fallback JSON:", fallbackJson);
            
              if (fallbackJson?.articles) {
              // Process and deduplicate articles
              const seen = new Set<string>();
              const processedArticles = fallbackJson.articles
                .map(processArticle)
                .filter(article => {
                  const key = `${article.title}-${article.url}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
              
              console.log("Setting processed articles from fallback, count:", processedArticles.length);
              console.log("Categories:", [...new Set(processedArticles.map(a => a.category))]);
              setArticles(processedArticles);
              return;
            }
            // if the JSON is a top-level array, treat it as articles
            if (Array.isArray(fallbackJson)) {
              console.log("Setting articles from fallback (array)");
              setArticles(fallbackJson as any);
              return;
            }
          }
        } catch (fbErr) {
          console.error('Fallback fetch /news.json failed:', fbErr);
          // Set some dummy data for testing
          console.log("Setting dummy data for testing");
          setArticles([{
            title: "Test Article",
            summary: "This is a test article to verify rendering.",
            category: "tech",
            source: "Test Source",
            url: "https://example.com",
            publishedAt: new Date().toISOString()
          }]);
        }
      } else {
        console.log("Setting articles from Supabase data");
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setError("Failed to fetch news. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const processArticle = (article: any) => {
    const raw = article.description || article.content || "";
    const summary = summarizeText(raw, 2, 300);

    return {
      title: article.title,
      summary,
      fullText: raw,
      category: article.category?.toLowerCase() || 
               getSourceCategory(article.source?.name) || 
               'general',
      source: article.source,
      url: article.url,
      publishedAt: article.publishedAt,
      image: article.urlToImage || article.image || null,
    };
  };

  const getArticleCategory = (article: NewsArticle) => {
    return article.category?.toLowerCase() || 'general';
  };

  const filteredArticles = selectedCategory === "all" 
    ? articles 
    : articles.filter(article => getArticleCategory(article) === selectedCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-10 w-1/4 mx-auto mb-4" />
          <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-full mx-auto mb-2" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Articles</h2>
          <p className="text-lg text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchNews}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm shadow-sm hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NewsHeader onRefresh={fetchNews} isLoading={isLoading} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted p-4 rounded-lg">
  <div className="space-y-1">
    <h3 className="font-medium">View Mode</h3>
    <p className="text-sm text-muted-foreground">
      Choose how you want to browse the news
    </p>
  </div>

  <div className="flex-1" />

  <div className="flex items-center gap-3">
    <button
      onClick={() => setChatOpen(true)}
      className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm shadow-sm hover:bg-blue-700 transition"
    >
      Ask (Chat)
    </button>

    <Select value={viewMode} onValueChange={(value: "headlines" | "topics") => setViewMode(value)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select view mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="headlines">
          <div className="flex items-center gap-2">
            <span>Headlines</span>
            <span className="text-xs text-muted-foreground">(chronological order)</span>
          </div>
        </SelectItem>
        <SelectItem value="topics">
          <div className="flex items-center gap-2">
            <span>Topics</span>
            <span className="text-xs text-muted-foreground">(grouped by subject)</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
          <div className="transition-all duration-300 ease-in-out hover:shadow-md rounded-lg">
            <CategoryTabs 
              selectedCategory={selectedCategory} 
              onCategoryChange={setSelectedCategory}
            />
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewMode === "headlines" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-300 ease-in-out">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))
              ) : filteredArticles.length > 0 ? (
                sortArticles(filteredArticles).map((article, index) => (
                  <NewsCard key={index} {...article} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No articles found in this category.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-8 w-1/4" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="space-y-4">
                          <Skeleton className="h-48 w-full rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : filteredArticles.length > 0 ? (
                groupArticlesByTopic(sortArticles(filteredArticles)).map((group, index) => {
                  const topicImage = group.articles.find(a => a.image)?.image || null;
                  return (
                    <div key={index} className="space-y-4 p-4 bg-background/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      {topicImage ? (
                        <img src={topicImage} alt={group.topic} className="w-full h-56 object-cover rounded-lg shadow-sm mb-4 hover:opacity-90 transition-opacity" />
                      ) : null}
                      <h2 className="text-2xl font-bold tracking-tight">{group.topic}</h2>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {group.articles.map((article, articleIndex) => (
                          <NewsCard key={articleIndex} {...article} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No articles found in this category.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
  {/* Chatbot */}
  <Chatbot articles={articles} />

   
    </div>
  );
};

export default Index;
