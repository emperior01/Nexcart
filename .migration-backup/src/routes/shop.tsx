import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as string) ?? "",
    q: (search.q as string) ?? "",
    sort: (search.sort as string) ?? "newest",
    page: parseInt(String(search.page ?? "1"), 10),
  }),
  component: ShopPage,
});

const PAGE_SIZE = 12;

function ShopPage() {
  const { category, q, sort, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState(q);

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
      if (category) query = query.eq("categories.slug", category);

      if (sort === "price_asc") query = query.order("price", { ascending: true });
      else if (sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { products: (data ?? []) as ProductWithImages[], total: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  function applySearch() {
    navigate({ search: (prev) => ({ ...prev, q: search, page: 1 }) });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div
          className="border-b border-border/50 py-10"
          style={{ background: "var(--gradient-hero-bg)" }}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-black text-white sm:text-4xl">Shop</h1>
            <p className="mt-1 text-white/50">
              {data?.total ?? "…"} products available
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Filters bar */}
          <div className="mb-7 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex flex-1 min-w-[200px] items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={applySearch} size="sm" className="text-white" style={{ background: "var(--gradient-brand)" }}>
                Search
              </Button>
            </div>

            {/* Category filter */}
            <Select
              value={category}
              onChange={(e) => navigate({ search: (prev) => ({ ...prev, category: e.target.value, page: 1 }) })}
              className="w-44"
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </Select>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <Select
                value={sort}
                onChange={(e) => navigate({ search: (prev) => ({ ...prev, sort: e.target.value, page: 1 }) })}
                className="w-36"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </Select>
            </div>

            {/* Active filters */}
            {(category || q) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSearch(""); navigate({ search: { page: 1, sort } }); }}
                className="gap-1 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : (data?.products ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-16 text-center">
              <p className="font-semibold text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data!.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
