import React from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExportButtons = ({ data = [], fileName = "Report", columns = [] }) => {
  if (!Array.isArray(data) || data.length === 0) return null;

  // 🔹 Define fields to exclude globally
  const excludedKeys = ["_id", "createdAt", "updatedAt", "__v"];

  // 🧠 Helper: get nested object value safely (e.g. ingredient.name)
  const getNestedValue = (obj, keyPath) => {
    if (!obj || !keyPath) return "";
    return keyPath.split(".").reduce((acc, k) => {
      if (acc && typeof acc === "object") {
        return acc[k];
      }
      return acc;
    }, obj);
  };

  // 🧠 Auto-detect columns if not passed
  const effectiveColumns =
    columns.length > 0
      ? columns
      : Object.keys(data[0])
          .filter((key) => !excludedKeys.includes(key))
          .map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
          }));

  // 🧠 Transform data (auto-detect nested values)
  const transformedData = data.map((item) => {
    const flattened = {};
    effectiveColumns.forEach(({ key }) => {
      const value = getNestedValue(item, key);
      if (typeof value === "object" && value !== null) {
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = value ?? "—";
      }
    });
    return flattened;
  });

  const headers = effectiveColumns.map((col) => col.label);
  const rows = transformedData.map((item) =>
    effectiveColumns.map((col) => item[col.key])
  );

  // ✅ Export to Excel
  const handleExportExcel = () => {
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // ✅ Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(fileName, 14, 15);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 20,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: 20 },
      });

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Check console for details.");
    }
  };

  // ✅ Print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const tableHTML = `
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { @page { size: A4; margin: 20mm; } }
          </style>
        </head>
        <body>
          <h2>${fileName}</h2>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) =>
                    `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(tableHTML);
    printWindow.document.close();
  };

  return (
    <div className="flex gap-3 mb-4">
      <button
        onClick={handleExportExcel}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
      >
        <FileSpreadsheet size={18} />
        Excel
      </button>

      <button
        onClick={handleExportPDF}
        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
      >
        <FileText size={18} />
        PDF
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        <Printer size={18} />
        Print
      </button>
    </div>
  );
};

export default ExportButtons;
