import React from "react";
import { Select, SelectItem } from "@heroui/react";

interface MappingStepProps {
  headers: string[];
  columnOrder: string[];
  previewData: Record<string, string>[];
  onColumnOrderChange: (newOrder: string[]) => void;
}

export const MappingStep: React.FC<MappingStepProps> = ({
  headers,
  columnOrder,
  previewData,
  onColumnOrderChange
}) => {
  return (
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
                  onColumnOrderChange(newOrder);
                }}
                className="w-full"
              >
                {headers.map((h) => (
                  <SelectItem key={h} >
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
  );
};