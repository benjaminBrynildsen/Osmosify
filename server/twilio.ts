import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export async function sendVerificationCode(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  try {
    console.log(`[Twilio] Attempting to send SMS to ${phoneNumber}`);
    
    const client = getClient();
    
    if (!twilioPhoneNumber) {
      console.error("[Twilio] TWILIO_PHONE_NUMBER not configured");
      throw new Error("Twilio phone number not configured");
    }

    console.log(`[Twilio] Sending from ${twilioPhoneNumber} to ${phoneNumber}`);
    
    const message = await client.messages.create({
      body: `Your Osmosify verification code is: ${code}. It expires in 10 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`[Twilio] SMS sent successfully, SID: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error("[Twilio] Failed to send SMS:", error?.message || error);
    console.error("[Twilio] Error code:", error?.code);
    console.error("[Twilio] More info:", error?.moreInfo);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
