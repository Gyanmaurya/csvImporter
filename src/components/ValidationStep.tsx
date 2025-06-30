import React from "react";
import { Chip, Progress, Switch } from "@heroui/react";
import { ValidationResult } from "./types";

interface ValidationStepProps {
  data: ValidationResult['invalidRows'];
  validDataCount: number;
  headers: string[];
  showErrorsOnly: boolean;
  setShowErrorsOnly: (value: boolean) => void;
  duplicates: ValidationResult['duplicates'];
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ 
  data, 
  validDataCount,
  headers,
  showErrorsOnly,
  setShowErrorsOnly,
  duplicates
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
        <Chip color="success" variant="dot">
          {validDataCount} Valid Rows
        </Chip>
        <Chip color="danger" variant="dot">
          {data.length} Errors Found
        </Chip>
        {duplicates.length > 0 && (
          <Chip color="warning" variant="dot">
            {duplicates.length} Duplicates
          </Chip>
        )}
      </div>

      {/* {duplicates.length > 0 && (
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
      )} */}

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