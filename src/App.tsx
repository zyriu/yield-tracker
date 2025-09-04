import SettingsDrawer from "@/components/SettingsDrawer";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { Toasts } from "@/components/ui/toast";
import Dashboard from "@/routes/Dashboard";

export default function App() {
    return (
        <div className="flex h-dvh w-dvw flex-col">
            <TopNav />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    <Dashboard />
                </main>
            </div>
            <SettingsDrawer />
            <Toasts />
        </div>
    );
}
