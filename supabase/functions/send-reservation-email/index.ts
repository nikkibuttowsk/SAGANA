import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY environment secret is not set.");
    }

    // Generate dynamic QR code URL based on reservation ID / idempotency key
    const reservationRef = record.idempotency_key || record.id;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`SAGANA-TICKET:${reservationRef}`)}`;

    // Send Email via Brevo REST API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "SAGANA Fruit Farms", email: "sagana077@gmail.com" },
        to: [{ email: record.visitor_email, name: record.visitor_name }],
        subject: `Your Digital Ticket & Confirmation - SAGANA Farm Visit`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
            <h2 style="color: #2e7d32; margin-top: 0;">Reservation Confirmed! 🌿</h2>
            <p>Hi <strong>${record.visitor_name}</strong>,</p>
            <p>Your visit has been successfully booked. Please present this email or your QR code upon arrival at the farm entry gate.</p>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: top; padding-right: 15px;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Visit Details</h3>
                  <p style="margin: 4px 0;"><strong>Date:</strong> ${record.visit_date}</p>
                  <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${record.time_slot}</p>
                  <p style="margin: 4px 0;"><strong>Guests:</strong> ${record.guest_count}</p>
                  <p style="margin: 4px 0; color: #666; font-size: 0.85em;">Ref ID: ${String(reservationRef).slice(0, 8).toUpperCase()}</p>
                </td>
                <td style="text-align: center; vertical-align: middle; width: 180px;">
                  <img src="${qrCodeUrl}" alt="Digital Ticket QR Code" width="160" height="160" style="display: block; margin: 0 auto; border: 1px solid #dddddd; padding: 6px; border-radius: 6px;" />
                  <span style="font-size: 11px; color: #888888; display: block; margin-top: 4px;">Entry Check-in QR</span>
                </td>
              </tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
            <p style="font-size: 13px; color: #777777; margin-bottom: 0;">Thank you for supporting local agritourism with SAGANA!</p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});