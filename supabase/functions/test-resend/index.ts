import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Test the API key with a simple validation request
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Invalid API key");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Resend API key is valid and configured correctly",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid Resend API key" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
