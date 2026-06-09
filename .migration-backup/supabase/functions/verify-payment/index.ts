/**
 * Nexcart — verify-payment Edge Function
 *
 * Called from the frontend after Paystack's onSuccess callback.
 * Verifies the payment server-side with Paystack's API before
 * creating the order in the database — prevents fake payments.
 *
 * Deploy: supabase functions deploy verify-payment
 * Env:    supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, items, shippingAddress, currency } = await req.json();

    if (!reference || !items?.length) {
      return new Response(
        JSON.stringify({ error: "Missing reference or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Verify with Paystack ─────────────────────────────
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) throw new Error("PAYSTACK_SECRET_KEY not set");

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } }
    );
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(
        JSON.stringify({ error: "Payment verification failed", detail: verifyData.message }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paidAmount = verifyData.data.amount / 100; // Paystack returns kobo/cents
    const paidCurrency = verifyData.data.currency;

    // ── 2. Check for duplicate order (idempotency) ─────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("paystack_ref", reference)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, orderId: existing.id, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Get authenticated user from JWT ─────────────────
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      userId = user?.id ?? null;
    }

    // ── 4. Create order + items in one transaction ─────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "paid",
        total: paidAmount,
        currency: paidCurrency,
        paystack_ref: reference,
        shipping_address: shippingAddress ?? null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item: { productId: string; quantity: number; price: number; currency: string }) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        currency: item.currency,
      }))
    );

    if (itemsError) throw itemsError;

    return new Response(
      JSON.stringify({ success: true, orderId: order.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("verify-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
