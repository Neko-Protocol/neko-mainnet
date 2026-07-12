import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  symbol: string;
  paymentToken: string;
  paymentAmount: string;
  estimatedReceive: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
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
      clearCart: () => set({ items: [] }),
    }),
    { name: "neko_cart" }
  )
);
