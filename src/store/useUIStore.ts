import { create } from "zustand";
import { persist } from "zustand/middleware";

type GroupMode = "protocol" | "wallet";

type UIState = {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  theme: "dark" | "light";
  groupMode: GroupMode;
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleTheme: () => void;
  setGroupMode: (m: GroupMode) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      settingsOpen: false,
      theme: "dark",
      groupMode: "protocol",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        document.documentElement.classList.toggle("dark", next === "dark");
        set({ theme: next });
      },
      setGroupMode: (m) => set({ groupMode: m })
    }),
    { name: "ui" }
  )
);
