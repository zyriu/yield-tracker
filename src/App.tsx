import { BrowserRouter, Routes, Route } from "react-router-dom";
import SettingsDrawer from "@/components/SettingsDrawer";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { Toasts } from "@/components/ui/toast";
import Dashboard from "@/routes/Dashboard";
import Yield from "@/routes/Yield";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-dvh w-dvw flex-col">
        <TopNav />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/yield" element={<Yield />} />
            </Routes>
          </main>
        </div>
        <SettingsDrawer />
        <Toasts />
      </div>
    </BrowserRouter>
  );
}
