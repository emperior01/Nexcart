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
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  count: number;
  total: number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      get total() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      addItem(incoming) {
        set((state) => {
          const existing = state.items.find((i) => i.productId === incoming.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === incoming.productId
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...incoming, quantity: 1 }] };
        });
      },

      removeItem(productId) {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },

      updateQty(productId, quantity) {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i
          ),
        }));
      },

      clearCart() {
        set({ items: [] });
      },

      openCart() {
        set({ isOpen: true });
      },

      closeCart() {
        set({ isOpen: false });
      },
    }),
    { name: "nexcart-cart" }
  )
);
