import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  saveForUser: (userId: string) => void;
  restoreForUser: (userId: string) => void;
}

function computeDerived(items: CartItem[]) {
  return {
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      count: 0,
      total: 0,

      addItem(incoming) {
        set((state) => {
          const existing = state.items.find((i) => i.productId === incoming.productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === incoming.productId
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
                  : i
              )
            : [...state.items, { ...incoming, quantity: 1 }];
          return { items, ...computeDerived(items) };
        });
      },

      removeItem(productId) {
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return { items, ...computeDerived(items) };
        });
      },

      updateQty(productId, quantity) {
        set((state) => {
          if (quantity < 1) {
            const items = state.items.filter((i) => i.productId !== productId);
            return { items, ...computeDerived(items) };
          }
          const items = state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i
          );
          return { items, ...computeDerived(items) };
        });
      },

      clearCart() {
        set({ items: [], count: 0, total: 0 });
      },

      saveForUser(userId: string) {
        const { items } = useCart.getState();
        if (items.length > 0) {
          localStorage.setItem(`nexcart-cart-${userId}`, JSON.stringify(items));
        }
      },

      restoreForUser(userId: string) {
        const saved = localStorage.getItem(`nexcart-cart-${userId}`);
        if (!saved) return;
        try {
          const items: CartItem[] = JSON.parse(saved);
          if (items.length > 0) {
            set({ items, ...computeDerived(items) });
          }
          localStorage.removeItem(`nexcart-cart-${userId}`);
        } catch {
          localStorage.removeItem(`nexcart-cart-${userId}`);
        }
      },

      openCart() {
        set({ isOpen: true });
      },

      closeCart() {
        set({ isOpen: false });
      },
    }),
    {
      name: "nexcart-cart",
      // Re-compute derived values when store rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          const derived = computeDerived(state.items);
          state.count = derived.count;
          state.total = derived.total;
        }
      },
    }
  )
);
