import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// This function will be triggered by a cron job every morning at 6 AM
Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Get today's detention slots and their teachers
    const today = new Date().toISOString().split("T")[0];
    const { data: slots, error: slotsError } = await supabase
      .from("detention_slots")
      .select(
        `
        teacher_id,
        teachers (
          name,
          email
        )
      `,
      )
      .eq("date", today);

    if (slotsError) {
      throw slotsError;
    }

    // Send reminder emails to all teachers with duty today
    for (const slot of slots) {
      const teacher = slot.teachers;
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
