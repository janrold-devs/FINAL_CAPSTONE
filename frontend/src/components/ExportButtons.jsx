import React from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExportButtons = ({ data = [], fileName = "Report" }) => {
  if (!data || data.length === 0) return null;

  // 🧠 Format rows exactly how they appear on the table
  const formattedData = data.map((item) => ({
    Name: item.name,
    Quantity: item.quantity,
    Unit: item.unit,
    "Stock Status":
      item.quantity === 0
        ? "No Stock"
        : item.quantity <= item.alert
        ? "Low Stock"
        : "In Stock",
    "Alert Level": item.alert,
    Expiration: item.expiration
      ? new Date(item.expiration).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—",
    Remarks: item.remarks || "—",
  }));

  // ✅ Export to Excel
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // ✅ Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(14);
      doc.text(fileName, 14, 15);

      // Prepare table data
      const tableColumn = Object.keys(formattedData[0]);
      const tableRows = formattedData.map((item) => Object.values(item));

      // Generate table using autoTable
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: 20,
          lineColor: 0,
          lineWidth: 0.1,
        },
      });

      // Save the PDF
      doc.save(`${fileName}.pdf`);
      
      console.log("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please check the console for details.");
    }
  };

  // ✅ Print (direct to printer dialog)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const tableHTML = `
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
            }
            h2 {
              text-align: center;
              margin-bottom: 20px;
              font-size: 24px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              font-size: 14px;
            }
            th, td {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <h2>${fileName}</h2>
          <table>
            <thead>
              <tr>${Object.keys(formattedData[0])
                .map((key) => `<th>${key}</th>`)
                .join("")}</tr>
            </thead>
            <tbody>
              ${formattedData
                .map(
                  (row) =>
                    `<tr>${Object.values(row)
                      .map((val) => `<td>${val}</td>`)
                      .join("")}</tr>`
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
      {/* Excel Export Button */}
      <button
        onClick={handleExportExcel}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
      >
        <FileSpreadsheet size={18} />
        Excel
      </button>

      {/* PDF Export Button */}
      <button
        onClick={handleExportPDF}
        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
      >
        <FileText size={18} />
        PDF
      </button>

      {/* Print Button */}
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