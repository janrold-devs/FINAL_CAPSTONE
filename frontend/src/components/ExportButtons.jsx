import React from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExportButtons = ({ data = [], fileName = "Report", columns = [], filteredData = [] }) => {
  // Use filteredData if provided, otherwise use data
  const displayData = filteredData && filteredData.length > 0 ? filteredData : data;
  
  if (!Array.isArray(displayData) || displayData.length === 0) return null;

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

  // 🧠 Helper: Convert ISO date string to formatted date
  const formatISODate = (dateString) => {
    if (!dateString) return "—";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid date
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // 🧠 Helper: Format ingredient objects to readable string
  const formatIngredient = (ingredientObj) => {
    if (!ingredientObj) return "—";
    
    // If it's already a string, return as is
    if (typeof ingredientObj === 'string') return ingredientObj;
    
    // If it's an array of ingredients
    if (Array.isArray(ingredientObj)) {
      return ingredientObj.map(ing => formatIngredient(ing)).filter(ing => ing !== "—").join(', ');
    }
    
    // Handle null or invalid ingredient objects
    if (!ingredientObj || typeof ingredientObj !== 'object') {
      return "—";
    }
    
    // If ingredient is null but has quantity and unit
    if (ingredientObj.ingredient === null && (ingredientObj.quantity || ingredientObj.unit)) {
      const qty = ingredientObj.quantity || '';
      const unit = ingredientObj.unit || '';
      return `Unknown Ingredient (${qty}${unit})`;
    }
    
    // If it's a single ingredient object with nested structure
    if (ingredientObj.ingredient && typeof ingredientObj.ingredient === 'object') {
      const ing = ingredientObj.ingredient;
      // Check if the nested ingredient object has valid data
      if (ing && ing.name) {
        const qty = ingredientObj.quantity || '';
        const unit = ingredientObj.unit || ing.unit || '';
        return `${ing.name} (${qty}${unit})`;
      } else {
        // If nested ingredient is invalid, use quantity and unit from main object
        const qty = ingredientObj.quantity || '';
        const unit = ingredientObj.unit || '';
        return `Unknown Ingredient (${qty}${unit})`;
      }
    }
    
    // If it's a direct ingredient object with name
    if (ingredientObj.name) {
      const qty = ingredientObj.quantity || '';
      const unit = ingredientObj.unit || '';
      return `${ingredientObj.name} (${qty}${unit})`;
    }
    
    // If it has quantity and unit but no name
    if (ingredientObj.quantity || ingredientObj.unit) {
      const qty = ingredientObj.quantity || '';
      const unit = ingredientObj.unit || '';
      return `Ingredient (${qty}${unit})`;
    }
    
    // If we can't format it, return dash
    return "—";
  };

  // 🧠 Helper: Clean any value for display
  const cleanValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    
    // Check if value is an ISO date string
    if (typeof value === 'string' && 
        (value.includes('T') && (value.endsWith('Z') || value.includes(':')) || 
         /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
      return formatISODate(value);
    }
    
    // Check if value is an array (like ingredients array)
    if (Array.isArray(value)) {
      const formattedArray = value.map(item => formatIngredient(item)).filter(item => item !== "—");
      return formattedArray.length > 0 ? formattedArray.join(', ') : "—";
    }
    
    // Check if value is an ingredient object
    if (value && typeof value === 'object' && (value.ingredient !== undefined || value.quantity !== undefined || value.name !== undefined)) {
      return formatIngredient(value);
    }
    
    // Handle other objects
    if (typeof value === "object" && value !== null) {
      // For other objects, try to create a readable string
      if (value.name) {
        return value.name;
      } else if (value.toString && value.toString() !== '[object Object]') {
        return value.toString();
      } else {
        return "—";
      }
    } 
    
    // Handle Date objects
    if (value instanceof Date) {
      return formatISODate(value.toISOString());
    }
    
    // Handle strings, numbers, booleans
    return value ?? "—";
  };

  // 🧠 Auto-detect columns if not passed
  const effectiveColumns =
    columns.length > 0
      ? columns
      : Object.keys(displayData[0])
          .filter((key) => !excludedKeys.includes(key))
          .map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
          }));

  // 🧠 Transform data (handle all data types properly)
  const transformedData = displayData.map((item) => {
    const flattened = {};
    effectiveColumns.forEach(({ key }) => {
      const value = getNestedValue(item, key);
      flattened[key] = cleanValue(value);
    });
    return flattened;
  });

  const headers = effectiveColumns.map((col) => col.label);
  const rows = transformedData.map((item) =>
    effectiveColumns.map((col) => item[col.key])
  );

  // Format current date for display (Dec 6, 2025 format)
  const formatCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // ✅ Enhanced Export to PDF with Centered KKOPI.TEA only
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // 🎨 Add header with logo
      doc.setFillColor(250, 250, 250); // Light gray background
      doc.rect(0, 0, 210, 40, 'F');
      
      // Create a circular background - ORANGE color
      doc.setFillColor(255, 140, 0); // Orange color
      doc.circle(25, 20, 12, 'F');
      
      // Add "KKOPI.TEA" text centered in the circle - Single line only
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8); // Larger font for single line
      doc.setFont("helvetica", "bold");
      doc.text("KKOPI.TEA", 25, 22, { align: 'center' });
      
      // Add company name next to logo - Orange color
      doc.setTextColor(255, 140, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("KKOPI.Tea", 45, 22);
      
      // Add address
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("- Congressional ave Dasmariñas Cavite", 45, 27);
      
      // Separator line - Orange color
      doc.setDrawColor(255, 140, 0);
      doc.line(14, 35, 196, 35);
      
      // Report title and date
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "bold");
      doc.text(fileName, 14, 45);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${formatCurrentDate()}`, 14, 50);
      
      // 🎨 Table with orange styling
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 55,
        theme: 'grid',
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: { 
          fillColor: [255, 140, 0], // Orange color matching logo
          textColor: 255,
          fontStyle: 'bold',
          lineWidth: 0.1,
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225], // Light orange for alternate rows
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        margin: { top: 55 },
      });

      // 🎨 Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Footer line - Orange color
        doc.setDrawColor(255, 140, 0);
        doc.line(14, doc.internal.pageSize.getHeight() - 20, 196, doc.internal.pageSize.getHeight() - 20);
        
        // Footer text
        doc.text(
          `KKOPI.Tea - ${fileName} - Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 15,
          { align: 'center' }
        );
        
        // Confidential notice
        doc.text(
          'Confidential Business Document',
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  // ✅ Print function with both KKOPI.TEA and Japanese text - uses filtered data
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const tableHTML = `
    <html>
      <head>
        <title>${fileName} - KKOPI.Tea</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          body { 
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0;
            padding: 0;
            color: #333;
            background: white;
            font-size: 14px;
          }
          
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 25px;
          }
          
          .print-header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ff8c00;
          }
          
          .logo-circle {
            width: 65px;
            height: 65px;
            background: #ff8c00 !important;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            color: white !important;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
            text-align: center;
            line-height: 1.1;
            padding: 8px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .logo-line1 {
            font-size: 8px;
            font-weight: 700;
            margin-bottom: 2px;
          }
          
          .logo-line2 {
            font-size: 9px;
            font-weight: 600;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #ff8c00 !important;
            margin: 0;
            line-height: 1.2;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .company-address {
            font-size: 12px;
            color: #666;
            margin: 2px 0 0 0;
            font-weight: 400;
          }
          
          .report-info {
            text-align: right;
          }
          
          .report-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0 0 5px 0;
          }
          
          .report-date {
            font-size: 11px;
            color: #666;
            margin: 0;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            font-size: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          thead {
            background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            border: none;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: inherit !important;
            color: inherit !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          td {
            padding: 10px 15px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
          }
          
          tbody tr:nth-child(even) {
            background-color: #fffaf0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 2px solid #ff8c00 !important;
            padding-top: 15px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            
            body {
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .print-container {
              padding: 0;
            }
            
            table {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <div class="logo-circle">
              <div class="logo-line1">KKOPI.TEA</div>
              <div class="logo-line2">一杯の</div>
            </div>
            <div class="company-info">
              <h1 class="company-name">KKOPI.Tea</h1>
              <p class="company-address">- Congressional ave Dasmariñas Cavite</p>
            </div>
            <div class="report-info">
              <h2 class="report-title">${fileName}</h2>
              <p class="report-date">Generated on ${formatCurrentDate()}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r, index) => `
                  <tr>
                    ${r.map((v) => `<td>${v}</td>`).join("")}
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="print-footer">
            <strong>KKOPI.Tea</strong> - ${fileName} Report • Total Records: ${rows.length} • Confidential Business Document
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                if (!window.closed) {
                  window.close();
                }
              }, 500);
            }, 500);
          };
        </script>
      </body>
    </html>
    `;
    printWindow.document.write(tableHTML);
    printWindow.document.close();
  };

  // ✅ Export to Excel with proper data formatting - uses filtered data
  const handleExportExcel = () => {
    // Use the same transformed data for consistency
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
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