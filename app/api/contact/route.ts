import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Portfolio Contact <onboarding@resend.dev>",
      to: ["nayankatiyara03@gmail.com"],
      replyTo: email,
      subject: `New message from ${name} via portfolio`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0A; color: #ffffff; padding: 32px; border-radius: 12px;">
          <h2 style="color: #FF6B35; margin: 0 0 24px;">New Portfolio Message</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #A0A0A0; width: 80px;">From:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #A0A0A0;">Email:</td>
              <td style="padding: 8px 0; color: #ffffff;">
                <a href="mailto:${email}" style="color: #FF6B35;">${email}</a>
              </td>
            </tr>
          </table>
          <hr style="border: 1px solid #2A2A2A; margin: 20px 0;" />
          <h3 style="color: #A0A0A0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">Message</h3>
          <p style="color: #ffffff; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
          <hr style="border: 1px solid #2A2A2A; margin: 20px 0;" />
          <p style="color: #606060; font-size: 12px; margin: 0;">Sent via nayankatiyara.in portfolio</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 }
    );
  }
}
