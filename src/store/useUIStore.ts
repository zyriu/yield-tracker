import { create } from "zustand";
import { persist } from "zustand/middleware";

type GroupMode = "protocol" | "wallet";

type UIState = {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  theme: "dark" | "light";
  groupMode: GroupMode;
  excludedPositions: string[];
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleTheme: () => void;
  setGroupMode: (m: GroupMode) => void;
  togglePositionExcluded: (id: string) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      settingsOpen: false,
      theme: "dark",
      groupMode: "protocol",
      excludedPositions: [],
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        document.documentElement.classList.toggle("dark", next === "dark");
        set({ theme: next });
      },
      setGroupMode: (m) => set({ groupMode: m }),
      togglePositionExcluded: (id: string) => {
        const current = get().excludedPositions;
        const exists = current.includes(id);
        const next = exists ? current.filter((x) => x !== id) : [...current, id];
        set({ excludedPositions: next });
      },
    }),
    { name: "ui" }
  )
);
