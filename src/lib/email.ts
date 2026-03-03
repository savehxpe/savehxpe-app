import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendNodeCommanderEmail = async (toEmail: string) => {
    try {
        await resend.emails.send({
            from: 'Outworld LLC <onboarding@resend.dev>', // Update this when domain is verified
            to: toEmail,
            subject: '[ SIGNAL VERIFIED ] — Welcome to the Inner Circle, Node Commander',
            html: `
<div style="font-family: monospace; background-color: #000; color: #fff; padding: 40px; border: 2px solid #eab308; max-width: 600px; margin: 0 auto;">
    <p style="font-weight: bold; color: #eab308; margin-bottom: 20px;">CITIZEN,</p>
    
    <p style="margin-bottom: 20px; line-height: 1.5; color: #ccc;">
        Your Ascension is complete. You are no longer operating on a limited frequency. By securing the Standard Tier, you have bypassed the gate and joined the elite Outworld creative network.
    </p>

    <h2 style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 30px;">YOUR STANDING ORDERS:</h2>

    <ul style="list-style-type: none; padding-left: 0; margin-bottom: 30px;">
        <li style="margin-bottom: 15px; color: #ccc;">
            <strong style="color: #fff;">LEDGER REFILL:</strong> 1,000 CR has been deposited into your account. Use them wisely in the Prompt Alchemist.
        </li>
        <li style="margin-bottom: 15px; color: #ccc;">
            <strong style="color: #fff;">XP MULTIPLIER:</strong> A 1.5x Global Multiplier is now hard-locked to your ID. Every mission in CASH CALIBER now pays out higher status.
        </li>
        <li style="margin-bottom: 15px; color: #ccc;">
            <strong style="color: #fff;">VAULT ACCESS:</strong> The "Sealed" status has been lifted. Stream and download all 'HANDOUT' stems and the 114 BPM Instrumental without further credit cost.
        </li>
    </ul>

    <div style="background-color: #111; border-left: 4px solid #eab308; padding: 20px; margin-bottom: 30px;">
        <p style="font-weight: bold; text-transform: uppercase; margin-top: 0; margin-bottom: 10px; font-size: 12px; color: #eab308;">
            [ HIDDEN DEVELOPER PROMPT ]
        </p>
        <p style="margin-bottom: 15px; font-size: 14px; line-height: 1.5; color: #999;">
            As a Node Commander, you have access to the Outlandia creative bypass. Use this specific string in the Prompt Alchemist to unlock unrestricted AI generation mode:
        </p>
        <div style="background-color: #000; border: 1px solid #333; padding: 15px; color: #fff; font-size: 14px; word-break: break-all;">
            PROTOCOL: [OUTLANDIA_MAX_RESONANCE] — BYPASS ARCHIVE LIMITS; GENERATE RAW FREQUENCY.
        </div>
    </div>

    <p style="font-size: 14px; color: #999; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;">
        The network is watching your progress. Stay on the "Cash Route."
    </p>

    <p style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
        OUTWORLD LLC &copy; TTM MOTOLO (Dev)
    </p>
</div>
            `,
        });
        console.log("Successfully sent Node Commander welcome email to", toEmail);
    } catch (error) {
        console.error("Error sending Node Commander email:", error);
    }
}
