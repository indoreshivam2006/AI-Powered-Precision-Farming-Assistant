import React from "react";

export function MarkdownRenderer({ text }: { text: string }) {
  if (!text || typeof text !== "string") return null;

  const renderTextParts = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|__.*?__|`.*?`)/g);
    return parts.map((part, index) => {
      if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
        const content = part.slice(2, -2);
        return (
          <strong key={index} className="font-semibold text-foreground">
            {content}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        const content = part.slice(1, -1);
        return (
          <code key={index} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
            {content}
          </code>
        );
      }
      return part;
    });
  };

  const lines = text.replace(/\r/g, "").split("\n");
  
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        // Match bullet items: * Item, - Item, • Item
        const bulletMatch = line.match(/^(\s*)([\*\-\u2022])\s+(.*)$/);
        if (bulletMatch) {
          const indent = bulletMatch[1].length;
          const content = bulletMatch[3];
          return (
            <div key={index} className="flex gap-2 my-0.5" style={{ paddingLeft: `${indent * 8 + 12}px` }}>
              <span className="text-primary select-none">•</span>
              <span className="flex-1 text-sm">{renderTextParts(content)}</span>
            </div>
          );
        }

        // Match numbered items: 1. Item
        const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numberMatch) {
          const indent = numberMatch[1].length;
          const num = numberMatch[2];
          const content = numberMatch[3];
          return (
            <div key={index} className="flex gap-2 my-0.5" style={{ paddingLeft: `${indent * 8 + 12}px` }}>
              <span className="text-primary font-semibold select-none">{num}.</span>
              <span className="flex-1 text-sm">{renderTextParts(content)}</span>
            </div>
          );
        }

        // Standard line
        return (
          <p key={index} className={line.trim() === "" ? "h-2" : "min-h-[1.25rem] my-0.5 text-sm"}>
            {renderTextParts(line)}
          </p>
        );
      })}
    </div>
  );
}
