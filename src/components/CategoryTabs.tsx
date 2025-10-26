import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories = [
  { id: "all", label: "All News" },
  { id: "tech", label: "Tech" },
  { id: "sports", label: "Sports" },
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "entertainment", label: "Entertainment" },
];

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryTabs = ({ selectedCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <Tabs value={selectedCategory} onValueChange={onCategoryChange}>
      <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2">
        {categories.map((category) => (
          <TabsTrigger
            key={category.id}
            value={category.id}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
