import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

interface InfoPopoverProps {
  text?: string;
  content?: React.ReactNode;
  label?: string;
  className?: string;
}

export function InfoPopover({ text, content, label = "Info", className }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 text-slate-500 ${className ?? ""}`.trim()}
          aria-label={label}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 text-xs text-slate-600"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {content ?? text}
      </PopoverContent>
    </Popover>
  );
}
