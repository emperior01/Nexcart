export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          currency: string;
          stock: number;
          is_active: boolean;
          is_featured: boolean;
          category_id: string | null;
          seller_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["product_images"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "admin" | "customer";
        };
        Insert: Omit<Database["public"]["Tables"]["user_roles"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
          total: number;
          currency: string;
          paystack_ref: string | null;
          shipping_address: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          currency: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          preferred_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: { key: string; value: Json; updated_at?: string };
        Update: Partial<{ key: string; value: Json; updated_at: string }>;
      };
      sellers: {
        Row: {
          id: string;
          user_id: string;
          store_name: string;
          store_description: string | null;
          store_logo: string | null;
          store_banner: string | null;
          phone: string | null;
          address: string | null;
          verification_status: "pending" | "verified" | "rejected" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sellers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sellers"]["Insert"]>;
      };
      withdrawals: {
        Row: {
          id: string;
          seller_id: string;
          amount: number;
          bank_name: string;
          account_name: string;
          account_number: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["withdrawals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["withdrawals"]["Insert"]>;
      };
      seller_notifications: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["seller_notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["seller_notifications"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          seller_id: string | null;
          rating: number;
          comment: string | null;
          seller_reply: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
