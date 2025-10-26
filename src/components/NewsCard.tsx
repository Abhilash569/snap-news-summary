import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink } from "lucide-react";

interface NewsCardProps {
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  publishedAt: string;
}

const categoryColors: Record<string, string> = {
  tech: "bg-tech text-white",
  sports: "bg-sports text-white",
  politics: "bg-politics text-white",
  business: "bg-business text-white",
  entertainment: "bg-entertainment text-white",
};

export const NewsCard = ({ title, summary, category, source, url, publishedAt }: NewsCardProps) => {
  const categoryColor = categoryColors[category.toLowerCase()] || "bg-muted";
  
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Badge className={`${categoryColor} capitalize`}>
              {category}
            </Badge>
            <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>
        </div>
        
        <p className="text-muted-foreground leading-relaxed line-clamp-3">
          {summary}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">{source}</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline transition-all"
          >
            Read More
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  );
};
