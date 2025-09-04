import { Settings } from "lucide-react";

import { Button } from "./ui/button";

import { useUIStore } from "@/store/useUIStore";

export default function TopNav() {
    const toggleSidebar = useUIStore(s => s.toggleSidebar);
    const openSettings = useUIStore(s => s.openSettings);
    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-bg">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Button onClick={toggleSidebar} aria-label="Toggle sidebar" className="px-2 py-1">
                        ☰
                    </Button>
                    <span className="text-sm text-text-muted">Yield Tracker</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={openSettings} aria-label="Open settings">
                        <Settings className="h-4 w-4" />
                        <span className="ml-2">Settings</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
