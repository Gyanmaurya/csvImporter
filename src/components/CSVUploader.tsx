import React, { useState, useRef } from "react";
import { addToast, Button, Progress } from "@heroui/react";
import { FiChevronRight, FiChevronLeft, FiCheck } from "react-icons/fi";
import { UploadStep } from "./UploadStep";
import { MappingStep } from "./MappingStep";
import { ValidationStep } from "./ValidationStep";
import { parseFile } from "../utils/fileHandlers";
import {  UploadStepType, ValidationResult } from "./types";
import { validateRowsInChunks } from "../utils/validators";


const CSVUploader = () => {
  const [step, setStep] = useState<UploadStepType>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);

  const handleFileChange = async (file: File) => {
    try {
      setCsvFile(file);
      const { headers, data } = await parseFile(file);
      setHeaders(headers);
      setColumnOrder(headers);
      setPreviewData(data);
    } catch (error) {
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse file",
        color: "danger"
      })

    }
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
      addToast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "An error occurred during validation",
        color: "danger"
      })
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
      addToast({
        title: "Submission Successful",
        description: `Successfully submitted ${validationResult.validRows.length} valid records`, 
        color:'success'
      })
    }
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
          <UploadStep 
            csvFile={csvFile} 
            onFileChange={handleFileChange} 
          />
        )}

        {step === "map" && headers.length > 0 && (
          <MappingStep 
            headers={headers}
            columnOrder={columnOrder}
            previewData={previewData}
            onColumnOrderChange={setColumnOrder}
          />
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

export default CSVUploader;