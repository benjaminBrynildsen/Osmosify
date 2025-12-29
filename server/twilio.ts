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
    const client = getClient();
    
    if (!twilioPhoneNumber) {
      throw new Error("Twilio phone number not configured");
    }

    await client.messages.create({
      body: `Your Osmosify verification code is: ${code}. It expires in 10 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
