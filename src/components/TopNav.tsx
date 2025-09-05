import { Settings } from "lucide-react";

import { Button } from "./ui/button";

import { useUIStore } from "@/store/useUIStore";

export default function TopNav() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openSettings = useUIStore((s) => s.openSettings);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg">
      <div className="grid grid-cols-3 items-center h-14 w-full">
        {/* Left: burger button */}
        <div className="flex justify-start items-center pl-2">
          <Button onClick={toggleSidebar} aria-label="Toggle sidebar" className="p-2">
            ☰
          </Button>
        </div>
        {/* Center: title */}
        <div className="flex justify-center items-center">
          <h1>Yield Tracker</h1>
        </div>
        {/* Right: settings */}
        <div className="flex justify-end items-center pr-2">
          <Button onClick={openSettings} aria-label="Open settings" className="p-2">
            <Settings className="h-4 w-4" />
            <span className="ml-2">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
