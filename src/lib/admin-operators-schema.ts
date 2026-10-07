import { z } from "zod";

/**
 * Validation for the /admin/operators workflow (Round 27).
 * Operators are the bus cargo tariffs checkout quotes freight from —
 * the money fields are tightened harder than ordinary text so a typo
 * cannot quote $0/kg freight or a negative minimum charge.
 */

const regionCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,4}$/, "Region must be a 2-4 letter code (UG, KE, TZ, RW, CD)");

const money = (label: string, min: number) =>
  z
    .number()
    .finite(`${label} must be a number`)
    .min(min, `${label} cannot be below ${min}`)
    .max(100_000, `${label} is too large`);

export const operatorCreateSchema = z
  .object({
    regionCode,
    name: z.string().trim().min(2).max(80),
    cargoRatePerKg: money("Cargo rate per kg", 0.01),
    minCharge: money("Minimum charge", 0),
    transitDaysMin: z
      .number()
      .int("Transit days must be whole days")
      .min(1, "Transit cannot be under one day")
      .max(90, "Transit window is too long"),
    transitDaysMax: z
      .number()
      .int("Transit days must be whole days")
      .min(1, "Transit cannot be under one day")
      .max(90, "Transit window is too long"),
    bookingNote: z.string().trim().min(5).max(300),
    sortOrder: z.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.transitDaysMax >= v.transitDaysMin, {
    message: "Transit maximum must be at least the minimum",
    path: ["transitDaysMax"],
  });

export const operatorUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    cargoRatePerKg: money("Cargo rate per kg", 0.01).optional(),
    minCharge: money("Minimum charge", 0).optional(),
    transitDaysMin: z
      .number()
      .int("Transit days must be whole days")
      .min(1, "Transit cannot be under one day")
      .max(90, "Transit window is too long")
      .optional(),
    transitDaysMax: z
      .number()
      .int("Transit days must be whole days")
      .min(1, "Transit cannot be under one day")
      .max(90, "Transit window is too long")
      .optional(),
    bookingNote: z.string().trim().min(5).max(300).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: "Provide at least one field to update",
    path: ["isActive"],
  })
  .refine((v) => {
    // Cross-field window check only when both ends arrive together; when a
    // single end is patched the route re-validates against the stored row.
    if (v.transitDaysMin !== undefined && v.transitDaysMax !== undefined) {
      return v.transitDaysMax >= v.transitDaysMin;
    }
    return true;
  }, {
    message: "Transit maximum must be at least the minimum",
    path: ["transitDaysMax"],
  });

export type OperatorCreateInput = z.infer<typeof operatorCreateSchema>;
export type OperatorUpdateInput = z.infer<typeof operatorUpdateSchema>;
