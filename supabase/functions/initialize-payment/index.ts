const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, amount, currency } = await req.json() as {
      email: string;
      amount: number;
      currency: string;
    };

    if (!email || !amount || !currency) {
      console.error("[initialize-payment] Missing fields:", { email: !!email, amount, currency });
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, amount, currency" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      console.error("[initialize-payment] Invalid amount:", amount);
      return new Response(
        JSON.stringify({ error: "Amount must be a positive integer in kobo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      console.error("[initialize-payment] PAYSTACK_SECRET_KEY not set");
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }
    if (paystackSecret.startsWith("pk_")) {
      console.error("[initialize-payment] PUBLIC key set as secret — use sk_live_ or sk_test_");
      throw new Error("Server misconfigured: public key used instead of secret key");
    }

    const ref = `NXC-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const baseUrl = Deno.env.get("NEXCART_BASE_URL") ?? "https://nexcart.vercel.app";
    const callbackUrl = `${baseUrl}/checkout`;

    const payload = { email, amount, currency, reference: ref, callback_url: callbackUrl };

    console.log("[initialize-payment] Calling Paystack:", { email, amount, currency, reference: ref, callback_url: callbackUrl });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const paystackData = await paystackRes.json() as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; access_code: string; reference: string };
    };

    console.log("[initialize-payment] Paystack response:", {
      status: paystackData.status,
      message: paystackData.message,
      hasData: !!paystackData.data,
      httpStatus: paystackRes.status,
    });

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      console.error("[initialize-payment] Init failed:", paystackData);
      return new Response(
        JSON.stringify({ error: "Paystack initialization failed", detail: paystackData.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[initialize-payment] Internal error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
