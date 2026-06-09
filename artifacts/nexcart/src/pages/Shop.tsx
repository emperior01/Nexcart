import { Link, useSearch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { ProductCard } from "@/components/nexcart/ProductCard";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithImages } from "@/lib/products";

const PAGE_SIZE = 12;

function useSearchParams() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  return {
    category: params.get("category") ?? "",
    q: params.get("q") ?? "",
    sort: params.get("sort") ?? "newest",
    page: parseInt(params.get("page") ?? "1", 10),
  };
}

export default function ShopPage() {
  const [, navigate] = useLocation();
  const { category, q, sort, page } = useSearchParams();
  const [search, setSearch] = useState(q);
  const [filterOpen, setFilterOpen] = useState(false);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    navigate("/shop?" + params.toString());
  }

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").order("sort_order");
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", "shop", { category, q, sort, page }],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)", { count: "exact" })
        .eq("is_active", true);

      if (q) query = query.ilike("title", `%${q}%`);
      if (category) {
        const catData = await supabase.from("categories").select("id").eq("slug", category).single();
        if (catData.data) query = query.eq("category_id", catData.data.id);
      }

      if (sort === "price_asc") query = query.order("price", { ascending: true });
      else if (sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: rows, error, count } = await query;
      if (error) throw error;
      return { rows: (rows ?? []) as ProductWithImages[], total: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-[#0D0D0D]" style={{ letterSpacing: "-0.02em" }}>Shop</h1>
          <span className="text-sm text-[#6B6B6B]">{data?.total ?? 0} products</span>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setParam("q", search); }}
              placeholder="Search products…"
              className="pl-9 pr-8 rounded-xl border-[#EFEFEF]"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0D0D0D]"
                onClick={() => { setSearch(""); setParam("q", ""); }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={category}
            onChange={(e) => setParam("category", e.target.value)}
            className="w-40 rounded-xl border-[#EFEFEF]"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </Select>

          <Select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="w-36 rounded-xl border-[#EFEFEF]"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low–High</option>
            <option value="price_desc">Price: High–Low</option>
          </Select>

          {(category || q) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-[#E8611A]"
              onClick={() => { setSearch(""); navigate("/shop"); }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />)}
          </div>
        ) : (data?.rows ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-[#E8611A]" />
            </div>
            <h3 className="font-extrabold text-lg text-[#0D0D0D] mb-1">No products found</h3>
            <p className="text-sm text-[#6B6B6B]">Try adjusting your filters or search terms.</p>
            <Button
              className="mt-5 text-white rounded-full px-6"
              style={{ background: "#E8611A" }}
              onClick={() => { setSearch(""); navigate("/shop"); }}
            >
              View all products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data!.rows.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="rounded-xl"
            >
              Previous
            </Button>
            <span className="text-sm text-[#6B6B6B] px-3">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
              className="rounded-xl"
            >
              Next
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
