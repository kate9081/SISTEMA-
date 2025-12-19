import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, onSearch, placeholder = "Buscar..." }: SearchInputProps) {
  return (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
          onKeyDown={(e) => e.key === 'Enter' && onSearch && onSearch()}
        />
      </div>
      <Button type="button" onClick={onSearch}>Buscar</Button>
      {value && (
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => {
            onChange("");
            // Optional: trigger search on clear or just clear input
          }}
          title="Limpiar"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}