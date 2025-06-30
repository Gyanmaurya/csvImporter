import { addToast } from "@heroui/react";
import Papa from "papaparse";


export const parseFile = (file: File, previewRows: number = 5): Promise<{headers: string[], data: Record<string, string>[]}> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: previewRows,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          resolve({
            headers: Object.keys(results.data[0] as object),
            data: results.data as Record<string, string>[]
          });
        } else {
          reject(new Error("No data found in file"));
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const downloadSampleCSV = () => {
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