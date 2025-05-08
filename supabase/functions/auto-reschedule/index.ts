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

    // Get the violation details
    const { data: violation, error: violationError } = await supabase
      .from("violations")
      .select(
        `
        *,
        students (
          name,
          email
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

    // Find the next available detention slot
    const { data: slots, error: slotsError } = await supabase
      .from("detention_slots")
      .select("*")
      .gt("date", new Date().toISOString())
      .lt("current_count", "capacity")
      .order("date")
      .limit(1);

    if (slotsError) throw slotsError;

    if (!slots || slots.length === 0) {
      throw new Error("No available detention slots found");
    }

    const nextSlot = slots[0];

    // Update the violation with the new detention date
    const { error: updateError } = await supabase
      .from("violations")
      .update({
        detention_date: nextSlot.date,
        status: "reassigned",
      })
      .eq("id", violationId);

    if (updateError) throw updateError;

    // Increment the current count for the detention slot
    const { error: slotError } = await supabase
      .from("detention_slots")
      .update({
        current_count: nextSlot.current_count + 1,
      })
      .eq("id", nextSlot.id);

    if (slotError) throw slotError;

    // Send notification emails
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TMECHS Monitor <notifications@tmechs.edu>",
        to: [violation.students.email, violation.teachers.email],
        subject: "Detention Rescheduled",
        html: `
          <h2>Detention Rescheduled Notice</h2>
          <p>Dear ${violation.students.name},</p>
          <p>Due to your absence from detention, you have been rescheduled for:</p>
          <p><strong>Date:</strong> ${new Date(nextSlot.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> 3:45 PM</p>
          <p><strong>Location:</strong> Room 204</p>
          <p>Please ensure you attend this session. Multiple absences may result in additional disciplinary action.</p>
          <p>Original Violation: ${violation.violation_type}</p>
          <p>If you have any questions, please contact your teacher.</p>
        `,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        newDate: nextSlot.date,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
