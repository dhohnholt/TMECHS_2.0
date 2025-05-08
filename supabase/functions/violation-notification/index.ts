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

    const { violationId } = await req.json();

    // Get the violation details with student and teacher info
    const { data: violation, error: violationError } = await supabase
      .from("violations")
      .select(
        `
        *,
        students (
          name,
          email,
          parent_email,
          parent_access_code,
          parent_verified
        ),
        teachers (
          name,
          email
        )
      `,
      )
      .eq("id", violationId)
      .single();

    if (violationError) throw violationError;

    // Send notification emails to both student and parent
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [violation.students.email, violation.students.parent_email],
        cc: [violation.teachers.email],
        subject: "Detention Notice - TMECHS",
        html: `
          <h2>Detention Notice</h2>
          <p>Dear ${violation.students.name} and Parent/Guardian,</p>
          <p>This email is to inform you that ${violation.students.name} has been assigned detention for the following violation:</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p><strong>Violation:</strong> ${violation.violation_type}</p>
            <p><strong>Date Assigned:</strong> ${new Date(violation.assigned_date).toLocaleDateString()}</p>
            <p><strong>Detention Date:</strong> ${new Date(violation.detention_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> 3:45 PM</p>
            <p><strong>Location:</strong> Room 204</p>
            <p><strong>Assigned By:</strong> ${violation.teachers.name}</p>
          </div>
          ${
            !violation.students.parent_verified
              ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #2e7d32;">Parent Portal Access</h3>
              <p>To access the parent portal and view your student's complete behavior record, use this access code:</p>
              <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 10px; background: #f1f8e9; border-radius: 4px;">
                ${violation.students.parent_access_code}
              </p>
              <p>Visit <a href="${Deno.env.get("VITE_APP_URL")}/parent-portal">the parent portal</a> and enter this code to get started.</p>
            </div>
          `
              : ""
          }
          <p><strong>Important Information:</strong></p>
          <ul>
            <li>Please arrive promptly at 3:45 PM</li>
            <li>Bring study materials or reading material</li>
            <li>Electronic devices must be turned off and put away</li>
            <li>Failure to attend may result in additional disciplinary action</li>
            <li>Parents must make arrangements for transportation after detention</li>
          </ul>
          <p>If you have any questions or concerns, please contact ${violation.teachers.name} at ${violation.teachers.email} or visit the main office.</p>
          <p>Thank you for your cooperation.</p>
          <hr>
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated message from the TMECHS Behavior Monitoring System. 
            Please do not reply to this email.
          </p>
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
