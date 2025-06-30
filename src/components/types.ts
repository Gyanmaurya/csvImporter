import { z } from "zod";

export type UploadStepType = "upload" | "map" | "validation";

export type ValidationResult = {
  validRows: Record<string, string>[];
  invalidRows: {row: Record<string, string>, errors: string[], originalIndex: number}[];
  duplicates: {field: string, value: string, rows: number[]}[];
};

export type CSVRow = Record<string, string>;

export const requiredFields = [
  { name: "phonenumber", required: "✓" },
  { name: "email", required: "✓" },
  { name: "var1", required: "" },
  { name: "var2", required: "" },
  { name: "var3", required: "" },
] as const;

export const createCsvRowSchemaType = (headers: string[]) => {
  const hasEmailColumn = headers.includes("email");
  
  return z.object({
    phonenumber: z.string()
      .min(1, "Phone number is required")
      .regex(/^(\+91|91)?[6-9]\d{9}$/, {
        message: "Must be a valid Indian phone number (10 digits with 91 or +91 country code)"
      })
      .transform(val => {
        if (val.startsWith('91') && val.length === 12) return `+${val}`;
        if (!val.startsWith('+') && val.length === 10) return `+91${val}`;
        return val;
      }),
    email: hasEmailColumn 
      ? z.string()
          .min(1, "Email is required when email column exists")
          .email("Invalid email format - must contain @ symbol")
          .transform(val => val.toLowerCase().trim())
      : z.string().optional().transform(val => val?.toLowerCase().trim()),
    var1: z.string()
      .min(1, "Message is required")
      .max(160, "Message exceeds 160 character limit"),
    var2: z.string().optional(),
    var3: z.string().optional(),
  });
};