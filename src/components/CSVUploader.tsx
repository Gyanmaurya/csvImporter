import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Button, Switch, Select, SelectItem, Chip, Progress } from "@heroui/react";
import { FiUpload, FiCheck, FiChevronRight, FiChevronLeft, FiDownload } from "react-icons/fi";
import { Icon } from "@iconify/react";
import { z } from "zod";

// ========== VALIDATION UTILS ==========
export const createCsvRowSchema = (headers: string[]) => {
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

const normalizePhone = (phone: string): string | null => {
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
): Promise<{
  validRows: Record<string, string>[];
  invalidRows: {row: Record<string, string>, errors: string[], originalIndex: number}[];
  duplicates: {field: string, value: string, rows: number[]}[];
}> => {
  return new Promise((resolve) => {
    const validRows: Record<string, string>[] = [];
    const invalidRows: {row: Record<string, string>, errors: string[], originalIndex: number}[] = [];
    const duplicates: {field: string, value: string, rows: number[]}[] = [];
    
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

// ========== COMPONENTS ==========
type UploadStep = "upload" | "map" | "validation";

const CSVUploader = () => {
  const [step, setStep] = useState<UploadStep>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{
    validRows: Record<string, string>[];
    invalidRows: {row: Record<string, string>, errors: string[], originalIndex: number}[];
    duplicates: {field: string, value: string, rows: number[]}[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const requiredFields = [
    { name: "phonenumber", required: "✓" },
    { name: "email", required: "✓" },
    { name: "var1", required: "" },
    { name: "var2", required: "" },
    { name: "var3", required: "" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const newHeaders = Object.keys(results.data[0] as object);
          setHeaders(newHeaders);
          setColumnOrder(newHeaders);
           setPreviewData(results.data as Record<string, string>[]);
        }
      },
    });
  };

  const handleStartValidation = async () => {
    if (!csvFile) return;
    
    setIsValidating(true);
    setValidationProgress(0);
    
    try {
      const result = await validateRowsInChunks(
        csvFile,
        columnOrder.length ? columnOrder : headers,
        50000,
        (progress) => setValidationProgress(progress)
      );
      setValidationResult(result);
      setStep("validation");
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const nextStep = () => {
    if (step === "upload") setStep("map");
    else if (step === "map") setStep("validation");
  };

  const prevStep = () => {
    if (step === "validation") setStep("map");
    else if (step === "map") setStep("upload");
  };

  const handleSubmit = () => {
    if (validationResult) {
      console.log("Submitting valid data:", validationResult.validRows);
      // Here you would typically send the data to your API
      alert(`Successfully submitted ${validationResult.validRows.length} valid records`);
    }
  };

  const downloadSampleCSV = () => {
    const headers = ["phonenumber", "email", "var1", "var2", "var3"];
    const sampleData = [
      ["+919876543210", "example@domain.com", "Sample message 1", "Sample message 2", "Optional 2"],
      ["+911234567890", "test@test.com", "Sample message 2", "", ""]
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + sampleData.map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10"></div>
        
        {["upload", "map", "validation"].map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center 
              ${step === s ? "bg-blue-600 text-white" : 
                (i < ["upload", "map", "validation"].indexOf(step) ? 
                  "bg-green-500 text-white" : "bg-gray-200 text-gray-600")}`}>
              {i < ["upload", "map", "validation"].indexOf(step) ? (
                <FiCheck size={20} />
              ) : (
                i + 1
              )}
            </div>
            <span className={`mt-2 text-sm font-medium ${step === s ? "text-blue-600" : "text-gray-600"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 min-h-[500px]">
        {step === "upload" && (
          <div className="flex gap-8">
            {/* Left side - Upload area */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center w-full">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Icon icon="material-symbols:cloud-upload" className="w-12 h-12 text-gray-400 mb-4" />
                  <span className="text-lg font-medium text-gray-700">
                    Click to upload or drag & drop the file
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    {csvFile ? csvFile.name : "No Files Selected"}
                  </p>
                </label>
              </div>

              {csvFile && (
                <div className="mt-6 bg-blue-50 text-blue-800 px-4 py-2 rounded-md text-sm">
                  <span className="flex items-center gap-2">
                    <Icon icon="fluent:people-48-filled" width="1.3em" />
                    File ready for validation ({csvFile.size > 1024 * 1024 
                      ? `${(csvFile.size / (1024 * 1024)).toFixed(2)} MB` 
                      : `${Math.round(csvFile.size / 1024)} KB`})
                      {/* Total Audience: {csvFile.length} records */}
                  </span>
                </div>
              )}

              <div className="mt-4 text-gray-600 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Supported formats: CSV | Max file size: 5MB
                  </span>
                  <button 
                    onClick={downloadSampleCSV}
                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                  >
                    <FiDownload size={16} />
                    Download sample file
                  </button>
                </div>
              </div>
            </div>

            {/* Right side - Field requirements */}
            <div className="flex-1">
              <div className="border p-4 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Name</th>
                      <th className="text-left pb-2">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requiredFields.map((field) => (
                      <tr key={field.name} className="border-b">
                        <td className="py-2">{field.name}</td>
                        <td className="py-2">{field.required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === "map" && headers.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6">Map Columns</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="font-medium">Your File Column</div>
              <div className="font-medium">Your Sample Data</div>
              <div className="font-medium">Destination Column</div>
              
              {headers.map((header, index) => (
                <React.Fragment key={header}>
                  <div className="p-2 bg-gray-50 rounded">{header}</div>
                  <div className="p-2 border rounded">
                    {previewData[0]?.[header] || "-"}
                  </div>
                  <div className="p-2">
                    <Select
                      selectedKeys={[columnOrder[index] || ""]}
                      onChange={(e) => {
                        const newOrder = [...columnOrder];
                        newOrder[index] = e.target.value;
                        setColumnOrder(newOrder);
                      }}
                      className="w-full"
                    >
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="border rounded-lg overflow-hidden mt-8">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {columnOrder.map((header, idx) => (
                        <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {columnOrder.map((col, colIdx) => (
                          <td key={colIdx} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {row[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === "validation" && isValidating && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Validating Your File</h2>
            <Progress 
              value={validationProgress} 
              className="max-w-md mx-auto my-6"
            />
            <p className="text-gray-600">
              Processing your file... {validationProgress}% complete
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Large files may take several minutes to validate
            </p>
          </div>
        )}

        {step === "validation" && validationResult && !isValidating && (
          <ValidationStep 
            data={validationResult.invalidRows}
            validDataCount={validationResult.validRows.length}
            headers={columnOrder.length ? columnOrder : headers}
            showErrorsOnly={showErrorsOnly}
            setShowErrorsOnly={setShowErrorsOnly}
            duplicates={validationResult.duplicates}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="light"
          color="secondary"
          onPress={prevStep}
          isDisabled={step === "upload"}
          startContent={<FiChevronLeft />}
        >
          Back
        </Button>
        
        {step === "map" ? (
          <Button
            color="primary"
            onPress={handleStartValidation}
            endContent={<FiChevronRight />}
            isLoading={isValidating}
          >
            {isValidating ? "Validating..." : "Validate Data"}
          </Button>
        ) : step === "validation" ? (
          <Button
            color="success"
            onPress={handleSubmit}
            endContent={<FiCheck />}
            isDisabled={!validationResult || validationResult.validRows.length === 0}
          >
            Submit {validationResult?.validRows.length} Valid Records
          </Button>
        ) : (
          <Button
            color="primary"
            onPress={nextStep}
            isDisabled={step === "upload" && !csvFile}
            endContent={<FiChevronRight />}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

const ValidationStep = ({ 
  data, 
  validDataCount,
  headers,
  showErrorsOnly,
  setShowErrorsOnly,
  duplicates
}: { 
  data: {row: Record<string, string>, errors: string[], originalIndex: number}[],
  validDataCount: number,
  headers: string[],
  showErrorsOnly: boolean,
  setShowErrorsOnly: (value: boolean) => void,
  duplicates: {field: string, value: string, rows: number[]}[]
}) => {
  const displayData = showErrorsOnly ? data : [
    ...data,
    ...Array(validDataCount).fill({
      row: {},
      errors: [],
      originalIndex: -1
    })
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Data Validation</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch 
              isSelected={showErrorsOnly}
              onValueChange={setShowErrorsOnly}
            />
            <span className="text-sm text-gray-600">Show errors only</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="bg-green-50 text-green-800 px-4 py-2 rounded-md text-sm font-medium">
          <span className="font-bold">{validDataCount}</span> Valid Rows
        </div>
        <div className="bg-red-50 text-red-800 px-4 py-2 rounded-md text-sm font-medium">
          <span className="font-bold">{data.length}</span> Errors Found
        </div>
        {duplicates.length > 0 && (
          <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium">
            <span className="font-bold">{duplicates.length}</span> Duplicates
          </div>
        )}
      </div>

      {duplicates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Duplicate Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicates.map((dup, i) => (
              <div key={i} className="border rounded p-3 bg-yellow-50">
                <div className="font-medium">{dup.field}: {dup.value}</div>
                <div className="text-sm">Found in rows: {dup.rows.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                {headers.map((header, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className={row.errors.length ? "bg-red-50" : "bg-green-50"}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-500">
                    {row.originalIndex > 0 ? row.originalIndex : "Valid row"}
                  </td>
                  {headers.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.row[col] || "-"}
                    </td>
                  ))}
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {row.errors.length > 0 ? (
                      <ul className="text-red-600 text-xs space-y-1">
                        {row.errors.map((err, i) => (
                          <li key={i} className="flex items-start">
                            <span className="mr-1">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-green-600 text-xs">✓ Valid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;