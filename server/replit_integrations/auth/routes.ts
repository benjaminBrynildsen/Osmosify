import type { Express, Request, RequestHandler } from "express";
import { authStorage } from "./storage";
import { sendVerificationCode, generateVerificationCode } from "../../twilio";
import { isAuthenticated } from "./replitAuth";
import type { User } from "@shared/models/auth";

// Utility to get current user ID from request (supports both auth methods)
export async function getCurrentUserId(req: Request): Promise<string | null> {
  const sessionReq = req as any;
  
  // Check phone auth session first
  if (sessionReq.session?.userId) {
    return sessionReq.session.userId;
  }
  
  // Fall back to Replit auth
  if (sessionReq.user?.claims?.sub) {
    return sessionReq.user.claims.sub;
  }
  
  return null;
}

// Utility to get current user from request
export async function getCurrentUser(req: Request): Promise<User | null> {
  const userId = await getCurrentUserId(req);
  if (!userId) return null;
  
  const user = await authStorage.getUser(userId);
  return user || null;
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user - supports both Replit auth and phone auth
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Check for phone auth session first
      if (req.session?.userId) {
        const user = await authStorage.getUser(req.session.userId);
        if (user) {
          return res.json(user);
        }
      }
      
      // Fall back to Replit auth - use isAuthenticated logic for token refresh
      if (req.user?.claims?.sub) {
        const user = await authStorage.getUser(req.user.claims.sub);
        if (user) {
          return res.json(user);
        }
      }
      
      return res.status(401).json({ message: "Not authenticated" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Send verification code to phone number
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber || typeof phoneNumber !== "string") {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Normalize phone number (ensure it has country code)
      const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber}`;

      // Generate and save verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await authStorage.saveVerificationCode(normalizedPhone, code, expiresAt);

      // Send SMS
      const sent = await sendVerificationCode(normalizedPhone, code);
      
      if (!sent) {
        return res.status(500).json({ message: "Failed to send verification code" });
      }

      // Check if user already exists (for UI to know if name is needed)
      const existingUser = await authStorage.getUserByPhone(normalizedPhone);

      res.json({ 
        success: true, 
        isNewUser: !existingUser,
        message: "Verification code sent" 
      });
    } catch (error) {
      console.error("Error sending verification code:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify code and create/login user
  app.post("/api/auth/verify-code", async (req: any, res) => {
    try {
      const { phoneNumber, code, firstName } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }

      // Normalize phone number
      const normalizedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber}`;

      // Verify code
      const validCode = await authStorage.getVerificationCode(normalizedPhone, code);
      
      if (!validCode) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Delete used code
      await authStorage.deleteVerificationCodes(normalizedPhone);

      // Create or get user
      const user = await authStorage.createOrUpdateUserByPhone(normalizedPhone, firstName);

      // Set phone auth session (separate from Passport session)
      req.session.userId = user.id;
      req.session.authMethod = "phone";

      res.json({ 
        success: true, 
        user,
        needsOnboarding: !user.role 
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Phone logout - clears phone auth session only
  app.post("/api/auth/phone-logout", (req: any, res) => {
    // Clear phone auth data from session without destroying the whole session
    if (req.session) {
      delete req.session.userId;
      delete req.session.authMethod;
    }
    res.json({ success: true });
  });
}

// Middleware to ensure user is authenticated (phone OR Replit auth)
// This does NOT mutate req.user for phone auth - use getCurrentUserId helper instead
export const ensureAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check phone auth session first (doesn't require token refresh)
  if (req.session?.userId && req.session?.authMethod === "phone") {
    const user = await authStorage.getUser(req.session.userId);
    if (user) {
      // Store phone user context separately (don't touch req.user)
      req.phoneUserId = user.id;
      return next();
    }
  }
  
  // Fall back to Replit auth with token refresh handling
  return isAuthenticated(req, res, next);
};
