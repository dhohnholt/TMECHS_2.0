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

    const { type, teacherId, dates } = await req.json();

    // Get teacher details
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("name, email")
      .eq("id", teacherId)
      .single();

    if (teacherError || !teacher) {
      throw new Error("Teacher not found");
    }

    if (type === "signup") {
      // Send signup confirmation email
      const formattedDates = dates
        .map((date: string) =>
          new Date(date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        )
        .join("\n");

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TMECHS Monitor <notifications@tmechs.edu>",
          to: teacher.email,
          subject: "Thank You for Signing Up as Detention Monitor",
          html: `
            <h2>Thank you for signing up as a detention monitor, ${teacher.name}!</h2>
            <p>You have been scheduled for the following dates:</p>
            <ul>
              ${dates
                .map(
                  (date: string) => `
                <li>${new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}</li>
              `,
                )
                .join("")}
            </ul>
            <p>Please arrive at Room 204 by 3:45 PM on your scheduled dates.</p>
            <p>You will receive a reminder email on the morning of each scheduled date.</p>
            <p>Thank you for your commitment to maintaining our school's standards!</p>
          `,
        }),
      });
    } else if (type === "reminder") {
      // Send morning reminder email
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TMECHS Monitor <notifications@tmechs.edu>",
          to: teacher.email,
          subject: "Detention Monitor Duty Reminder",
          html: `
            <h2>Detention Monitor Duty Reminder</h2>
            <p>Hello ${teacher.name},</p>
            <p>This is a reminder that you are scheduled for detention monitor duty today.</p>
            <p><strong>Location:</strong> Room 204</p>
            <p><strong>Time:</strong> 3:45 PM</p>
            <p>Please arrive on time to ensure proper supervision of students.</p>
            <p>Thank you for your service!</p>
          `,
        }),
      });
    }

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
