import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

serve(async (req) => {
  // CORS handling for browser calls (if called directly)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload = await req.json();
    
    // When called via Database Webhook, the inserted row is under 'record'
    const record = payload.record || payload; 

    const { visitor_name, visitor_email, visitor_phone, visit_date, time_slot, guest_count, farm_name, admin_email } = record;

    // 1. Email to Visitor
    const visitorEmailBody = {
      sender: { name: "SAGANA Fruit Farms", email: "sagana077@gmail.com" }, // Replace with your verified Brevo sender email
      to: [{ email: visitor_email, name: visitor_name }],
      subject: `Reservation Request: ${farm_name || 'Farm Visit'}`,
      htmlContent: `
        <h2>Mabuhay, ${visitor_name}!</h2>
        <p>Thank you for submitting your reservation request.</p>
        <ul>
          <li><strong>Visit Date:</strong> ${visit_date}</li>
          <li><strong>Time Slot:</strong> ${time_slot}</li>
          <li><strong>Guests:</strong> ${guest_count}</li>
          <li><strong>Mobile:</strong> ${visitor_phone}</li>
        </ul>
        <p>Here is your digital ticket QR code for check-in at the farm entrance:</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SAGANA-TICKET-${record.id}" alt="Digital Ticket QR Code" />
        <p><strong>Reservation Reference ID:</strong> ${record.id}</p>
        <p>The farm administration will reach out to confirm your booking.</p>
      `
    };

    // 2. Email to Farm Admin
    const adminEmailBody = {
      sender: { name: "SAGANA System", email: "sagana077@gmail.com" },
      to: [{ email: admin_email || "admin@example.com", name: "Farm Admin" }],
      subject: `[NEW RESERVATION] ${visitor_name} requested a visit`,
      htmlContent: `
        <h2>New Visit Reservation</h2>
        <p>A new visitor has booked a slot:</p>
        <ul>
          <li><strong>Name:</strong> ${visitor_name}</li>
          <li><strong>Email:</strong> ${visitor_email}</li>
          <li><strong>Phone:</strong> ${visitor_phone}</li>
          <li><strong>Date:</strong> ${visit_date}</li>
          <li><strong>Time Slot:</strong> ${time_slot}</li>
          <li><strong>Guests:</strong> ${guest_count}</li>
        </ul>
      `
    };

    // Send to Visitor via Brevo
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY || "",
        "content-type": "application/json"
      },
      body: JSON.stringify(visitorEmailBody)
    });

    // Send to Farm Admin via Brevo
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY || "",
        "content-type": "application/json"
      },
      body: JSON.stringify(adminEmailBody)
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});