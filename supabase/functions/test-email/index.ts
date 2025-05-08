import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // First verify we have the API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Make the request to Resend using a verified domain
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", // Using Resend's default verified domain
        to: "dhohnholt@gmail.com",
        subject: "Test Email from TMECHS Monitor",
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from the TMECHS Monitor system.</p>
          <p>If you're receiving this, the Resend API integration is working correctly!</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Note: This email is sent from a test domain. In production, emails will be sent from tmechs.edu once the domain is verified.
          </p>
        `,
      }),
    });

    // Get the full response data for better error handling
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to send email: ${response.status} - ${JSON.stringify(responseData)}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test email sent successfully",
        id: responseData.id,
        details: responseData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Email error:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
