import React, { useCallback } from "react";
import { addToast, Button } from "@heroui/react";
import { FiDownload } from "react-icons/fi";
import { Icon } from "@iconify/react";
import { requiredFields } from "./types";
import { downloadSampleCSV } from "../utils/fileHandlers";

interface UploadStepProps {
  csvFile: File | null;
  onFileChange: (file: File) => void;
}
const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const UploadStep: React.FC<UploadStepProps> = ({ csvFile, onFileChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    // Validate file type
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const isValidType = validExtensions.some(ext => file.name.endsWith(ext));
    
    if (!isValidType) {
      addToast({
        title: "Invalid file type",
        description: "Please upload a CSV, XLS, or XLSX file",
        color: "danger"
      });
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      addToast({
        title: "File too large",
        description: "Please upload a file smaller than 15MB",
        color: "danger"
      });
      alert("File too large. Please upload a file smaller than 15MB.");
      return false;
    }

    onFileChange(file);
    return true;
  }
  return false;
}, [onFileChange]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
      // Validate file size (15MB limit)
   if (file.size > MAX_FILE_SIZE) {
    addToast({
      title: "File too large",
      description: "Please upload a file smaller than 15MB",
      color: "danger"
    });
     alert("File too large. Please upload a file smaller than 15MB.");
    return false; 
  }
    if (file) {
      onFileChange(file);
    }
  }, [onFileChange]);

  return (
    <div className="flex gap-8">
      {/* Left side - Upload area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center w-full"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <Icon icon="material-symbols:cloud-upload" className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-lg font-medium text-gray-700">
              Click to upload or drag & drop the file
            </span>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
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
            </span>
          </div>
        )}

        <div className="mt-4 text-gray-600 w-full">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Supported formats: CSV, XLS, XLSX | Max file size: 20MB
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
  );
};