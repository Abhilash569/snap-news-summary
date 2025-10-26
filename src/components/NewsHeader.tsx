import { Button } from "@/components/ui/button";
import { RefreshCw, Newspaper } from "lucide-react";

interface NewsHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const NewsHeader = ({ onRefresh, isLoading }: NewsHeaderProps) => {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Newspaper className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Daily News Hub
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered summaries & categorization
              </p>
            </div>
          </div>
          
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh News'}
          </Button>
        </div>
      </div>
    </header>
  );
};
