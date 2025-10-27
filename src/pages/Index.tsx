import { useState, useEffect } from "react";
import { NewsCard } from "@/components/NewsCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { NewsHeader } from "@/components/NewsHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewsArticle {
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  publishedAt: string;
}

const Index = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"headlines" | "topics">("headlines");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news');
      
      if (error) {
        if (error.message?.includes('429')) {
          toast({
            title: "Rate Limit Reached",
            description: "Please wait a moment before refreshing again.",
            variant: "destructive",
          });
        } else if (error.message?.includes('402')) {
          toast({
            title: "Payment Required",
            description: "Please add credits to your workspace to continue.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      if (data?.articles) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to fetch news. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredArticles = selectedCategory === "all" 
    ? articles 
    : articles.filter(article => article.category.toLowerCase() === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <NewsHeader onRefresh={fetchNews} isLoading={isLoading} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">View by:</label>
            <Select value={viewMode} onValueChange={(value: "headlines" | "topics") => setViewMode(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="headlines">Headlines</SelectItem>
                <SelectItem value="topics">Topics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <CategoryTabs 
            selectedCategory={selectedCategory} 
            onCategoryChange={setSelectedCategory}
          />
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              filteredArticles.map((article, index) => (
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
        </div>
      </main>
    </div>
  );
};

export default Index;
