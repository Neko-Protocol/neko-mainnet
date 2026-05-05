import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CarItem {
  id: string;
  symbol: string;
  paymentToken: string;
  paymentAmount: string;
  estimatedReceive: string;
}

interface CarState {
  items: CarItem[];
  addItem: (item: Omit<CarItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCar: () => void;
}

export const useCarStore = create<CarState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
          ],
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearCar: () => set({ items: [] }),
    }),
    { name: "neko_car" }
  )
);
