import { Link } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { formatPrice, primaryImage, type ProductWithImages } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

export function ProductCard({ product }: { product: ProductWithImages }) {
  const img = primaryImage(product);
  const { currency } = useCurrency();
  const onSale =
    product.compare_at_price != null &&
    Number(product.compare_at_price) > Number(product.price);
  const discount = onSale
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price!)) * 100)
    : 0;
  const { addItem, openCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: Number(product.price),
      currency: product.currency,
      image: img,
      maxStock: product.stock,
    });
    toast.success("Added to cart", { description: product.title });
    openCart();
  };

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group bg-white rounded-[20px] overflow-hidden border border-black/5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "block", textDecoration: "none" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")}
    >
      <div className="relative aspect-square bg-[#F4F4F4] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center opacity-20">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {product.is_featured && (
            <span className="bg-[#E8611A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-[0.04em]">
              Bestseller
            </span>
          )}
          {onSale && (
            <span className="bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Sold out
            </span>
          )}
        </div>

        <button
          className="absolute top-2.5 right-2.5 w-[30px] h-[30px] bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
          onClick={(e) => e.preventDefault()}
          aria-label="Save"
        >
          <Heart className="h-3.5 w-3.5 text-[#3A3A3A]" strokeWidth={1.8} />
        </button>

        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/60 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
          <button
            disabled={product.stock === 0}
            onClick={handleAdd}
            className="w-full bg-[#E8611A] hover:bg-[#C4511A] disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-full transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3.5">
        {(product.categories as { name?: string } | null)?.name && (
          <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#E8611A] mb-1">
            {(product.categories as { name: string }).name}
          </div>
        )}
        <h3
          className="text-[14px] font-semibold text-[#0D0D0D] leading-snug mb-1.5 line-clamp-2"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {product.title}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <span className="text-[11px] text-[#F59E0B]">★★★★★</span>
          <span className="text-[11px] text-[#6B6B6B]">4.8 (124)</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[16px] font-bold text-[#E8611A]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {formatPrice(product.price, product.currency, currency)}
          </span>
          {onSale && (
            <span className="text-[12px] text-[#C8C8C8] line-through">
              {formatPrice(product.compare_at_price!, product.currency, currency)}
            </span>
          )}
          <button
            disabled={product.stock === 0}
            onClick={handleAdd}
            className="w-7 h-7 bg-[#0D0D0D] hover:bg-[#E8611A] disabled:opacity-40 text-white rounded-full flex items-center justify-center ml-auto transition-colors"
            aria-label="Add to cart"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </Link>
  );
}
