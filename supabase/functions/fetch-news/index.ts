import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Free RSS feeds from various sources
const RSS_FEEDS = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', defaultCategory: 'tech' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', defaultCategory: 'sports' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', defaultCategory: 'politics' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', defaultCategory: 'business' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', defaultCategory: 'tech' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', defaultCategory: 'sports' },
];

interface Article {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

async function fetchRSSFeed(feedUrl: string): Promise<Article[]> {
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      console.error(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    
    if (!doc) return [];
    
    const items = doc.querySelectorAll('item');
    const articles: Article[] = [];
    
    // Get source from channel title
    const channelTitle = doc.querySelector('channel > title')?.textContent || 'Unknown';
    
    items.forEach((item: any) => {
      const title = item.querySelector('title')?.textContent;
      const description = item.querySelector('description')?.textContent;
      const link = item.querySelector('link')?.textContent;
      const pubDate = item.querySelector('pubDate')?.textContent;
      
      if (title && link) {
        articles.push({
          title: title.trim(),
          description: description?.trim().replace(/<[^>]*>/g, '') || title.trim(),
          link: link.trim(),
          pubDate: pubDate || new Date().toISOString(),
          source: channelTitle,
        });
      }
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching news from RSS feeds...');
    
    // Fetch all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      const articles = await fetchRSSFeed(feed.url);
      return articles.map(article => ({ ...article, defaultCategory: feed.defaultCategory }));
    });
    
    const allFeedResults = await Promise.all(feedPromises);
    const allArticles = allFeedResults.flat();
    
    console.log(`Fetched ${allArticles.length} articles from RSS feeds`);
    
    if (allArticles.length === 0) {
      return new Response(
        JSON.stringify({ articles: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process articles with AI (take first 15 to avoid rate limits)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const articlesToProcess = allArticles.slice(0, 15);
    
    const processedArticles = await Promise.all(
      articlesToProcess.map(async (article) => {
        try {
          const prompt = `Analyze this news article and provide:
1. A concise 2-sentence summary
2. Category (choose one: tech, sports, politics, business, entertainment)

Article Title: ${article.title}
Description: ${article.description}

Respond in JSON format:
{
  "summary": "your summary here",
  "category": "category name"
}`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are a news analyst. Always respond with valid JSON only, no markdown formatting.' },
                { role: 'user', content: prompt }
              ],
            }),
          });

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              throw new Error('Rate limit exceeded');
            }
            if (aiResponse.status === 402) {
              throw new Error('Payment required');
            }
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices[0].message.content;
          
          // Parse AI response
          let parsed;
          try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
            parsed = JSON.parse(jsonStr);
          } catch {
            // Fallback if parsing fails
            parsed = {
              summary: article.description,
              category: article.defaultCategory
            };
          }

          return {
            title: article.title,
            summary: parsed.summary || article.description,
            category: parsed.category || article.defaultCategory,
            source: article.source,
            url: article.link,
            publishedAt: article.pubDate,
          };
        } catch (error) {
          console.error('Error processing article:', error);
          // Return article with minimal processing on error
          return {
            title: article.title,
            summary: article.description,
            category: article.defaultCategory,
            source: article.source,
            url: article.link,
            publishedAt: article.pubDate,
          };
        }
      })
    );

    console.log(`Successfully processed ${processedArticles.length} articles`);

    return new Response(
      JSON.stringify({ articles: processedArticles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-news function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        articles: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
