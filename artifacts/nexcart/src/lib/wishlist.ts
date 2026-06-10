import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
}

interface LocalWishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  toggle: (item: WishlistItem) => void;
  hasItem: (productId: string) => boolean;
  clear: () => void;
  count: number;
}

export const useLocalWishlist = create<LocalWishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      get count() {
        return get().items.length;
      },

      addItem(item) {
        set((state) => {
          if (state.items.some((i) => i.productId === item.productId)) return state;
          return { items: [...state.items, item] };
        });
      },

      removeItem(productId) {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },

      toggle(item) {
        const { hasItem, addItem, removeItem } = get();
        if (hasItem(item.productId)) removeItem(item.productId);
        else addItem(item);
      },

      hasItem(productId) {
        return get().items.some((i) => i.productId === productId);
      },

      clear() {
        set({ items: [] });
      },
    }),
    { name: "nexcart-wishlist" }
  )
);
