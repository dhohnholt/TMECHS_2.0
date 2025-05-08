import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { type, teacherId } = await req.json();

    // Get teacher details
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("name, email")
      .eq("id", teacherId)
      .single();

    if (teacherError) throw teacherError;

    // Send notification email
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: teacher.email,
        subject:
          type === "approval"
            ? "TMECHS Monitor Account Approved"
            : "TMECHS Monitor Account Status Update",
        html:
          type === "approval"
            ? `
            <h2>Account Approved</h2>
            <p>Dear ${teacher.name},</p>
            <p>Your TMECHS Monitor account has been approved. You now have access to:</p>
            <ul>
              <li>Assign detentions to students</li>
              <li>Sign up for detention monitoring duty</li>
              <li>View and manage student records</li>
              <li>Access behavior analytics</li>
            </ul>
            <p>You can now log in and start using all features of the system.</p>
            <p>Thank you for your patience during the approval process.</p>
          `
            : `
            <h2>Account Status Update</h2>
            <p>Dear ${teacher.name},</p>
            <p>Your TMECHS Monitor account access has been temporarily suspended.</p>
            <p>Please contact the administration for more information.</p>
            <p>If you believe this is an error, please reach out to the system administrator.</p>
          `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
