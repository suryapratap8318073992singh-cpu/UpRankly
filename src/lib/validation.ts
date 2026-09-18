import { z } from "zod";

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Register validation schema
 */
export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  businessName: z.string().min(2, "Business name is required"),
  businessDescription: z.string().optional(),
  websiteUrl: z.string().url("Invalid website URL"),
});

/**
 * Admin login validation schema
 */
export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
