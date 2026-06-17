import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, X, Package, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Textarea, Label, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  seller_id: string | null;
  rating: number;
  comment: string | null;
  seller_reply: string | null;
  created_at: string;
  product_title?: string;
  reviewer_name?: string;
};

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{
          width: size, height: size,
          color: i < rating ? "#F59E0B" : "#E5E7EB",
          fill: i < rating ? "#F59E0B" : "none",
        }} />
      ))}
    </div>
  );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, width: 8, textAlign: "right" as const }}>{rating}</span>
      <Star style={{ width: 10, height: 10, color: "#F59E0B", fill: "#F59E0B", flexShrink: 0 }} />
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F3F4F6", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: "#F59E0B", width: `${pct}%`, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 11, color: "#9CA3AF", width: 20, textAlign: "right" as const }}>{count}</span>
    </div>
  );
}

export default function SellerReviews() {
  const { seller } = useSeller();
  const qc = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["seller-reviews", seller?.id],
    enabled: !!seller?.id,
    queryFn: async (): Promise<ReviewRow[]> => {
      if (!seller?.id) return [];
      const productRes = await supabase.from("products").select("id,title").eq("seller_id", seller.id);
      const productIds = (productRes.data ?? []).map((p: { id: string }) => p.id);
      const productTitles = new Map((productRes.data ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));
      if (productIds.length === 0) return [];
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .in("product_id", productIds)
        .order("created_at", { ascending: false });
      return ((data ?? []) as ReviewRow[]).map((r) => ({
        ...r,
        product_title: productTitles.get(r.product_id) ?? "Product",
      }));
    },
  });

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) { toast.error("Enter a reply first."); return; }
    setSaving(true);
    try {
      const { error } = await (supabase.from("reviews") as any).update({ seller_reply: replyText.trim() }).eq("id", reviewId);
      if (error) throw error;
      toast.success("Reply posted!");
      setReplyingTo(null);
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["seller-reviews", seller?.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setSaving(false);
    }
  }

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: (reviews ?? []).filter(rev => rev.rating === r).length,
  }));
  const repliedCount = (reviews ?? []).filter(r => r.seller_reply).length;

  return (
    <div style={{ padding: "16px", maxWidth: 720, margin: "0 auto", boxSizing: "border-box" as const }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
          Reviews
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          {(reviews?.length ?? 0)} review{(reviews?.length ?? 0) !== 1 ? "s" : ""}
          {(reviews?.length ?? 0) > 0 && (
            <span> · Avg <span style={{ fontWeight: 800, color: "#F59E0B" }}>{avgRating.toFixed(1)} ★</span>
              {" · "}<span style={{ fontWeight: 700, color: "#059669" }}>{repliedCount} replied</span>
            </span>
          )}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 130, borderRadius: 16, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (reviews ?? []).length === 0 && (
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 20,
          padding: "52px 24px", textAlign: "center" as const,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Star style={{ width: 30, height: 30, color: "#F59E0B", fill: "#FEF3C7" }} />
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D", marginBottom: 8 }}>
            No reviews yet
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, maxWidth: 290, margin: "0 auto 20px" }}>
            Customer reviews will appear here once shoppers leave feedback on your products.
          </p>
          <Link
            to="/seller/products"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(232,97,26,0.08)", border: "1px solid rgba(232,97,26,0.2)",
              color: "#E8611A", padding: "9px 18px", borderRadius: 9,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}
          >
            <Package style={{ width: 13, height: 13 }} />
            Manage Products
            <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      )}

      {/* Summary card + review list */}
      {!isLoading && (reviews ?? []).length > 0 && (
        <>
          {/* Rating summary */}
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
            padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 16,
            display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" as const,
          }}>
            <div style={{ textAlign: "center" as const, flexShrink: 0 }}>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 42, fontWeight: 900, color: "#0D0D0D", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </p>
              <Stars rating={Math.round(avgRating)} size={14} />
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{reviews!.length} reviews</p>
            </div>
            <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              {ratingDist.map(({ rating, count }) => (
                <RatingBar key={rating} rating={rating} count={count} total={reviews!.length} />
              ))}
            </div>
          </div>

          {/* Individual reviews */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {reviews!.map((review) => (
              <div key={review.id} style={{
                background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
                padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                {/* Review header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#E8611A", marginBottom: 4 }}>
                      {review.product_title}
                    </p>
                    <Stars rating={review.rating} />
                  </div>
                  <p style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0, whiteSpace: "nowrap" as const }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Comment */}
                {review.comment && (
                  <div style={{
                    background: "#F9FAFB", borderRadius: 10, padding: "10px 12px",
                    marginBottom: 12, borderLeft: "3px solid #E5E7EB",
                  }}>
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>
                      "{review.comment}"
                    </p>
                  </div>
                )}

                {/* Seller reply or reply UI */}
                {review.seller_reply ? (
                  <div style={{
                    background: "rgba(232,97,26,0.04)", border: "1px solid rgba(232,97,26,0.15)",
                    borderRadius: 10, padding: "10px 12px",
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: "#E8611A", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 5 }}>
                      Your Reply
                    </p>
                    <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{review.seller_reply}</p>
                  </div>
                ) : (
                  <div>
                    {replyingTo === review.id ? (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        <Label>Your Reply</Label>
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a helpful, professional reply…"
                          rows={3}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button
                            size="sm" disabled={saving}
                            className="text-white"
                            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                            onClick={() => submitReply(review.id)}
                          >
                            {saving ? "Posting…" : "Post Reply"}
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          >
                            <X style={{ width: 12, height: 12 }} /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 700, color: "#6B7280",
                          background: "#F3F4F6", border: "1px solid #E5E7EB",
                          borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <MessageSquare style={{ width: 12, height: 12 }} />
                        Reply to review
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
