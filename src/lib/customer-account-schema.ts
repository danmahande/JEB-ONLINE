import { z } from "zod";
import { MINIMUM_CUSTOMER_PASSWORD_LENGTH } from "@/lib/admin-password";

export const customerAccountRegistrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    password: z.string().min(MINIMUM_CUSTOMER_PASSWORD_LENGTH).max(1024),
  })
  .strict();
