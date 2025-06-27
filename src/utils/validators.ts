import { z } from "zod";

export const createCsvRowSchema = (headers: string[]) => {
  // Check if email column exists in the CSV
  const hasEmailColumn = headers.includes("email");
  
  return z.object({
    phonenumber: z.string()
      .min(1, "Phone number is required")
      .regex(/^(\+91|91)?[6-9]\d{9}$/, {
        message: "Must be a valid Indian phone number (10 digits with 91 or +91 country code)"
      })
      .transform(val => {
        // Normalize to +91 format
        if (val.startsWith('91') && val.length === 12) {
          return `+${val}`;
        }
        if (!val.startsWith('+') && val.length === 10) {
          return `+91${val}`;
        }
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

export type CsvRow = ReturnType<typeof createCsvRowSchema>;

// Updated validation function
export const validateRows = (rows: Record<string, string>[], headers: string[]): {row: Record<string, string>, errors: string[]}[] => {
  const schema = createCsvRowSchema(headers);
  
  // Track phone numbers and emails for duplicates
  const phoneNumberMap = new Map<string, number[]>();
  const emailMap = new Map<string, number[]>();
  
  // First pass to collect all phone numbers and emails
  rows.forEach((row, index) => {
    const phone = row.phonenumber?.trim();
    if (phone) {
      // Normalize phone number for duplicate checking
      let normalizedPhone = phone;
      if (phone.startsWith('91') && phone.length === 12) {
        normalizedPhone = `+${phone}`;
      } else if (!phone.startsWith('+') && phone.length === 10) {
        normalizedPhone = `+91${phone}`;
      }
      
      if (!phoneNumberMap.has(normalizedPhone)) {
        phoneNumberMap.set(normalizedPhone, []);
      }
      phoneNumberMap.get(normalizedPhone)?.push(index);
    }
    
    if (headers.includes("email")) {
      const email = row.email?.trim().toLowerCase();
      if (email) {
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)?.push(index);
      }
    }
  });

  // Second pass to validate each row
  return rows.map((row, index) => {
    const errors: string[] = [];
    const normalizedRow: Record<string, string> = {};

    // Normalize data
    for (const key in row) {
      normalizedRow[key] = row[key]?.toString().trim() || "";
    }

    // Check for completely empty row
    if (Object.values(normalizedRow).every(val => val === "")) {
      return { row, errors: ["Empty row - please remove"] };
    }

    // Basic schema validation
    try {
      schema.parse(normalizedRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => err.message));
      } else {
        errors.push("Validation error");
      }
    }

    // Check for duplicate phone numbers (using normalized format)
    const phone = normalizedRow.phonenumber;
    if (phone) {
      let normalizedPhone = phone;
      if (phone.startsWith('91') && phone.length === 12) {
        normalizedPhone = `+${phone}`;
      } else if (!phone.startsWith('+') && phone.length === 10) {
        normalizedPhone = `+91${phone}`;
      }
      
      if (phoneNumberMap.get(normalizedPhone)?.length > 1) {
        errors.push("Duplicate phone number found");
      }
    }

    // Check for duplicate emails only if email column exists
    if (headers.includes("email")) {
      const email = normalizedRow.email?.toLowerCase();
      if (email && emailMap.get(email)?.length > 1) {
        errors.push("Duplicate email found");
      }
    }

    return { row: normalizedRow, errors };
  });
};

// Single row validation (when needed)
export const validateRow = (row: Record<string, string>, headers: string[]): string[] => {
  return validateRows([row], headers)[0].errors;
};

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));

  const size = (sizeInBytes / Math.pow(k, i)).toFixed(2);
  return `${size} ${units[i]}`;
}