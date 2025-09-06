import { Clipboard } from "lucide-react";

interface CopyIconProps {
  value: string;
  className?: string;
}

export const CopyIcon = ({ value, className }: CopyIconProps) => {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className={className}
      aria-label="Copy to clipboard"
    >
      <Clipboard className="w-3 h-3" />
    </button>
  );
};
