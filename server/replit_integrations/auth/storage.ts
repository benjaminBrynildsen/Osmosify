import { users, verificationCodes, type User, type UpsertUser, type VerificationCode } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and, gt } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createOrUpdateUserByPhone(phoneNumber: string, firstName?: string): Promise<User>;
  createOrUpdateUserByEmail(email: string): Promise<User>;
  saveVerificationCode(phoneNumber: string, code: string, expiresAt: Date): Promise<void>;
  getVerificationCode(phoneNumber: string, code: string): Promise<VerificationCode | undefined>;
  deleteVerificationCodes(phoneNumber: string): Promise<void>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createOrUpdateUserByPhone(phoneNumber: string, firstName?: string): Promise<User> {
    const existingUser = await this.getUserByPhone(phoneNumber);
    
    if (existingUser) {
      if (firstName && !existingUser.firstName) {
        const [updated] = await db
          .update(users)
          .set({ firstName, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updated;
      }
      return existingUser;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        phoneNumber,
        firstName,
      })
      .returning();
    return newUser;
  }

  async createOrUpdateUserByEmail(email: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.getUserByEmail(normalizedEmail);
    
    if (existingUser) {
      return existingUser;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
      })
      .returning();
    return newUser;
  }

  async saveVerificationCode(phoneNumber: string, code: string, expiresAt: Date): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, phoneNumber));
    await db.insert(verificationCodes).values({
      phoneNumber,
      code,
      expiresAt,
    });
  }

  async getVerificationCode(phoneNumber: string, code: string): Promise<VerificationCode | undefined> {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phoneNumber, phoneNumber),
          eq(verificationCodes.code, code),
          gt(verificationCodes.expiresAt, new Date())
        )
      );
    return result;
  }

  async deleteVerificationCodes(phoneNumber: string): Promise<void> {
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, phoneNumber));
  }
}

export const authStorage = new AuthStorage();
