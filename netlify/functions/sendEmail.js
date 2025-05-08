// File: netlify/functions/sendEmail.mjs

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  try {
    const { email, subject, html } = JSON.parse(event.body || '{}');

    const { error } = await resend.emails.send({
      from: "TMECHS Monitor <team@tmechsmonitor.org>",
      to: email,
      subject,
      html
    });

    if (error) {
      console.error("Send error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully." }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad Request" }),
    };
  }
}