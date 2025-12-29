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

// Rate limiting map for verification codes (phone -> { count, lastAttempt })
const verificationAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(phoneNumber: string): { allowed: boolean; message?: string } {
  const now = new Date();
  const attempts = verificationAttempts.get(phoneNumber);
  
  if (!attempts) {
    verificationAttempts.set(phoneNumber, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  const timeSinceFirst = now.getTime() - attempts.lastAttempt.getTime();
  
  if (timeSinceFirst > ATTEMPT_WINDOW_MS) {
    verificationAttempts.set(phoneNumber, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    const waitTime = Math.ceil((ATTEMPT_WINDOW_MS - timeSinceFirst) / 60000);
    return { allowed: false, message: `Too many attempts. Please try again in ${waitTime} minutes.` };
  }
  
  attempts.count++;
  return { allowed: true };
}

// Internal function to get user from session/Replit auth (for /api/auth/user route)
async function handleGetAuthUser(req: any, res: any): Promise<void> {
  try {
    // Check for phone auth session first (doesn't need token refresh)
    if (req.session?.userId && req.session?.authMethod === "phone") {
      const user = await authStorage.getUser(req.session.userId);
      if (user) {
        return res.json(user);
      }
      // Session exists but user not found - clear stale session
      delete req.session.userId;
      delete req.session.authMethod;
    }
    
    // Check for Replit auth (token was already refreshed by isAuthenticated)
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
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user - supports both Replit auth and phone auth
  // Always runs isAuthenticated first to handle Replit token refresh
  app.get("/api/auth/user", (req: any, res, next) => {
    // Check phone auth first (no token refresh needed)
    if (req.session?.userId && req.session?.authMethod === "phone") {
      return handleGetAuthUser(req, res);
    }
    
    // For Replit auth or unknown, run isAuthenticated to handle token refresh
    // If it fails (401), we still try to handle as unauthenticated gracefully
    isAuthenticated(req, res, () => {
      handleGetAuthUser(req, res);
    });
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

      // Check rate limit
      const rateCheck = checkRateLimit(normalizedPhone);
      if (!rateCheck.allowed) {
        return res.status(429).json({ message: rateCheck.message });
      }

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
// For phone auth: stores userId in req.phoneUserId without touching req.user
// For Replit auth: uses isAuthenticated which handles token refresh
export const ensureAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check phone auth session first (doesn't require token refresh)
  if (req.session?.userId && req.session?.authMethod === "phone") {
    const user = await authStorage.getUser(req.session.userId);
    if (user) {
      // Store phone user context separately (don't touch req.user)
      // Also set a unified field that works for both auth types
      req.phoneUserId = user.id;
      req.authenticatedUserId = user.id;
      return next();
    }
    // Clear stale session data
    delete req.session.userId;
    delete req.session.authMethod;
  }
  
  // For Replit auth, use the full middleware chain for token refresh
  // After it passes, set the unified authenticatedUserId field
  return isAuthenticated(req, res, () => {
    if (req.user?.claims?.sub) {
      req.authenticatedUserId = req.user.claims.sub;
    }
    next();
  });
};
