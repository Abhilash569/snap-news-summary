import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching news from NewsAPI...');
    
    // Using NewsAPI free tier - top headlines
    const newsResponse = await fetch(
      'https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=4d8e8e4c8b8a4e9f8c3a7b2d6e1f4a9c'
    );
    
    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status}`);
    }
    
    const newsData = await newsResponse.json();
    console.log(`Fetched ${newsData.articles?.length || 0} articles`);
    
    if (!newsData.articles || newsData.articles.length === 0) {
      return new Response(
        JSON.stringify({ articles: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process articles with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const processedArticles = await Promise.all(
      newsData.articles.slice(0, 15).map(async (article: NewsArticle) => {
        try {
          const prompt = `Analyze this news article and provide:
1. A concise 2-sentence summary
2. Category (choose one: tech, sports, politics, business, entertainment)

Article Title: ${article.title}
Description: ${article.description || 'No description'}

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
                { role: 'system', content: 'You are a news analyst that provides concise summaries and accurate categorization.' },
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
              summary: article.description || article.title,
              category: 'business'
            };
          }

          return {
            title: article.title,
            summary: parsed.summary || article.description || article.title,
            category: parsed.category || 'business',
            source: article.source.name,
            url: article.url,
            publishedAt: article.publishedAt,
          };
        } catch (error) {
          console.error('Error processing article:', error);
          // Return article with minimal processing on error
          return {
            title: article.title,
            summary: article.description || article.title,
            category: 'business',
            source: article.source.name,
            url: article.url,
            publishedAt: article.publishedAt,
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
