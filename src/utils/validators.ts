import Papa from "papaparse";
import { ValidationResult } from "../components/types";
import { createCsvRowSchema } from "../components/types";
import { z } from "zod";

export const normalizePhone = (phone: string): string | null => {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (!cleaned.startsWith('+') && cleaned.length === 10) return `+91${cleaned}`;
  return cleaned;
};

export const validateRowsInChunks = async (
  file: File,
  headers: string[],
  chunkSize: number = 30000,
  progressCallback?: (progress: number) => void
): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const validRows: Record<string, string>[] = [];
    const invalidRows: ValidationResult['invalidRows'] = [];
    const duplicates: ValidationResult['duplicates'] = [];
    
    const phoneNumberMap = new Map<string, number[]>();
    const emailMap = new Map<string, number[]>();
    
    let processedRows = 0;
    let totalRows = 0;
    
    // First pass to count rows
    Papa.parse(file, {
      preview: 1,
      complete: (results) => {
        totalRows = results.data.length;
        processChunk(0);
      }
    });
    
    const processChunk = (start: number) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: chunkSize,
        chunk: (results, parser) => {
          const chunkData = results.data as Record<string, string>[];
          
          chunkData.forEach((row, indexInChunk) => {
            const originalIndex = start + indexInChunk;
            const errors: string[] = [];
            const rowDuplicates: {field: string, value: string, rows: number[]}[] = [];
            
            // Schema validation
            try {
              createCsvRowSchema(headers).parse(row);
            } catch (error) {
              if (error instanceof z.ZodError) {
                errors.push(...error.errors.map(err => err.message));
              }
            }
            
            // Phone number duplicate check
            if (row.phonenumber) {
              const phone = normalizePhone(row.phonenumber);
              if (phone) {
                if (!phoneNumberMap.has(phone)) {
                  phoneNumberMap.set(phone, []);
                }
                const existingRows = phoneNumberMap.get(phone)!;
                existingRows.push(originalIndex + 1); // 1-based row numbers
                
                if (existingRows.length > 1) {
                  rowDuplicates.push({
                    field: 'phonenumber',
                    value: phone,
                    rows: [...existingRows]
                  });
                  errors.push(`Duplicate phone number (also in rows: ${existingRows.slice(0, -1).join(', ')})`);
                }
              }
            }
            
            // Email duplicate check
            if (headers.includes("email") && row.email) {
              const email = row.email.toLowerCase().trim();
              if (email) {
                if (!emailMap.has(email)) {
                  emailMap.set(email, []);
                }
                const existingRows = emailMap.get(email)!;
                existingRows.push(originalIndex + 1); // 1-based row numbers
                
                if (existingRows.length > 1) {
                  rowDuplicates.push({
                    field: 'email',
                    value: email,
                    rows: [...existingRows]
                  });
                  errors.push(`Duplicate email (also in rows: ${existingRows.slice(0, -1).join(', ')})`);
                }
              }
            }
            
            if (errors.length > 0) {
              invalidRows.push({
                row,
                errors,
                originalIndex: originalIndex + 1
              });
              if (rowDuplicates.length) {
                duplicates.push(...rowDuplicates);
              }
            } else {
              validRows.push(row);
            }
          });
          
          processedRows += chunkData.length;
          const progress = Math.round((processedRows / totalRows) * 100);
          progressCallback?.(progress);
          
          if (processedRows < totalRows) {
            parser.pause();
            setTimeout(() => {
              processChunk(processedRows);
              parser.resume();
            }, 0);
          } else {
            resolve({ validRows, invalidRows, duplicates });
          }
        }
      });
    };
  });
};

const createCsvRowSchema = (headers: string[]) => {
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