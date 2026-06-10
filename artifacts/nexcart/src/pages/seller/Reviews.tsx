import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, X } from "lucide-react";
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

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{ width: 13, height: 13, color: i < rating ? "#F59E0B" : "#E5E7EB", fill: i < rating ? "#F59E0B" : "none" }} />
      ))}
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

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {reviews?.length ?? 0} reviews
            {(reviews?.length ?? 0) > 0 && (
              <span> · Avg <span className="font-bold text-yellow-500">{avgRating.toFixed(1)} ★</span></span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (reviews ?? []).length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-16 text-center shadow-sm">
            <Star style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 12px" }} />
            <p className="text-muted-foreground font-medium">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">Reviews from customers will appear here.</p>
          </div>
        ) : (
          reviews!.map((review) => (
            <div key={review.id} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">{review.product_title}</p>
                  <Stars rating={review.rating} />
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>

              {review.comment && (
                <p className="text-sm text-foreground leading-relaxed">"{review.comment}"</p>
              )}

              {review.seller_reply ? (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                  <p className="text-xs font-bold text-orange-700 mb-1">Your reply</p>
                  <p className="text-sm text-orange-900">{review.seller_reply}</p>
                </div>
              ) : (
                <div>
                  {replyingTo === review.id ? (
                    <div className="space-y-2">
                      <Label>Your Reply</Label>
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a helpful reply to this customer…"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={saving} className="text-white" style={{ background: "#E8611A" }} onClick={() => submitReply(review.id)}>
                          {saving ? "Posting…" : "Post Reply"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm" variant="outline" className="gap-1.5 text-xs"
                      onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Reply
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
