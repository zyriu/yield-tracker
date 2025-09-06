import { Clipboard } from "lucide-react";

interface CopyIconProps {
  /** The value to copy to the clipboard */
  value: string;
  /** Additional class names for styling */
  className?: string;
}

/**
 * A clipboard icon that copies a string to the clipboard when clicked.
 * Example:
 *   <CopyIcon value={walletAddress} className="text-neutral-500 hover:text-neutral-300" />
 */
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
