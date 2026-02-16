import React from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExportButtons = ({
  data = [],
  fileName = "Report",
  columns = [],
  filteredData = [],
}) => {
  // Use filteredData if provided, otherwise use data
  const displayData =
    filteredData && filteredData.length > 0 ? filteredData : data;

  if (!Array.isArray(displayData) || displayData.length === 0) return null;

  // 🔹 Define fields to exclude globally
  const excludedKeys = ["_id", "createdAt", "updatedAt", "__v"];

  // 🧠 Helper: get nested object value safely (e.g. ingredient.name)
  const getNestedValue = (obj, keyPath) => {
    if (!obj || !keyPath) return "";
    return keyPath.split(".").reduce((acc, k) => {
      if (acc && typeof acc === "object") {
        return acc[k] !== undefined ? acc[k] : "";
      }
      return acc;
    }, obj);
  };

  // 🧠 Helper: Convert ISO date string to formatted date
  const formatISODate = (dateString) => {
    if (!dateString) return "—";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // 🧠 Helper: Format ingredient objects to readable string
  const formatIngredient = (ingredientObj) => {
    if (!ingredientObj) return "—";
    if (typeof ingredientObj === "string") return ingredientObj;
    if (Array.isArray(ingredientObj)) {
      return ingredientObj
        .map((ing) => formatIngredient(ing))
        .filter((ing) => ing !== "—")
        .join(", ");
    }
    if (!ingredientObj || typeof ingredientObj !== "object") {
      return "—";
    }
    if (
      ingredientObj.ingredient === null &&
      (ingredientObj.quantity || ingredientObj.unit)
    ) {
      const qty = ingredientObj.quantity || "";
      const unit = ingredientObj.unit || "";
      return `Unknown Ingredient (${qty}${unit})`;
    }
    if (
      ingredientObj.ingredient &&
      typeof ingredientObj.ingredient === "object"
    ) {
      const ing = ingredientObj.ingredient;
      if (ing && ing.name) {
        const qty = ingredientObj.quantity || "";
        const unit = ingredientObj.unit || ing.unit || "";
        return `${ing.name} (${qty}${unit})`;
      } else {
        const qty = ingredientObj.quantity || "";
        const unit = ingredientObj.unit || "";
        return `Unknown Ingredient (${qty}${unit})`;
      }
    }
    if (ingredientObj.name) {
      const qty = ingredientObj.quantity || "";
      const unit = ingredientObj.unit || "";
      return `${ingredientObj.name} (${qty}${unit})`;
    }
    if (ingredientObj.quantity || ingredientObj.unit) {
      const qty = ingredientObj.quantity || "";
      const unit = ingredientObj.unit || "";
      return `Ingredient (${qty}${unit})`;
    }
    return "—";
  };

  // 🧠 Helper: Format person in charge name from user object
  const formatPersonInCharge = (spoilage) => {
    if (!spoilage) return "—";

    // Check if it has recordedBy with nested user info
    if (spoilage.recordedBy && typeof spoilage.recordedBy === 'object') {
      const user = spoilage.recordedBy;
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      } else if (user.name) {
        return user.name;
      } else if (user.firstName) {
        return user.firstName;
      } else if (user.email) {
        return user.email.split('@')[0];
      }
    }

    // Check if it has createdBy field
    if (spoilage.createdBy && typeof spoilage.createdBy === 'object') {
      const user = spoilage.createdBy;
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      } else if (user.name) {
        return user.name;
      } else if (user.firstName) {
        return user.firstName;
      }
    }

    // Check if it has personInCharge field
    if (spoilage.personInCharge) {
      if (typeof spoilage.personInCharge === 'object') {
        const person = spoilage.personInCharge;
        if (person.firstName && person.lastName) {
          return `${person.firstName} ${person.lastName}`;
        } else if (person.name) {
          return person.name;
        }
      } else {
        return spoilage.personInCharge;
      }
    }

    return "—";
  };

  // 🧠 Helper: Clean any value for display
  const cleanValue = (value, item = null, columnKey = null) => {
    // Special handling for person in charge in spoilage
    if (columnKey === 'recordedBy' || columnKey === 'createdBy' || columnKey === 'personInCharge' ||
      (item && (columnKey === 'recordedBy' || columnKey === 'createdBy' || columnKey === 'personInCharge'))) {
      if (item) {
        return formatPersonInCharge(item);
      }
      return formatPersonInCharge(value);
    }

    if (value === null || value === undefined || value === "") return "—";

    if (
      typeof value === "string" &&
      ((value.includes("T") && (value.endsWith("Z") || value.includes(":"))) ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))
    ) {
      return formatISODate(value);
    }

    if (Array.isArray(value)) {
      const formattedArray = value
        .map((item) => formatIngredient(item))
        .filter((item) => item !== "—");
      return formattedArray.length > 0 ? formattedArray.join(", ") : "—";
    }

    if (
      value &&
      typeof value === "object" &&
      (value.ingredient !== undefined ||
        value.quantity !== undefined ||
        value.name !== undefined)
    ) {
      return formatIngredient(value);
    }

    if (typeof value === "object" && value !== null) {
      if (value.name) {
        return value.name;
      } else if (value.firstName && value.lastName) {
        return `${value.firstName} ${value.lastName}`;
      } else if (value.firstName) {
        return value.firstName;
      } else if (value.toString && value.toString() !== "[object Object]") {
        return value.toString();
      } else {
        return "—";
      }
    }

    return value ?? "—";
  };

  // 🧠 Helper: Get formatted value for a column
  const getFormattedValue = (item, col) => {
    const value = getNestedValue(item, col.key);

    // Use custom format function if provided
    if (typeof col.format === "function") {
      try {
        return col.format(value, item);
      } catch (err) {
        console.error(`Format error for column ${col.key}:`, err);
        return cleanValue(value, item, col.key);
      }
    }

    return cleanValue(value, item, col.key);
  };

  // 🧠 Helper: Format price with ₱ sign
  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") return "—";
    if (typeof price === "string" && price.includes("₱")) return price;
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return "—";
    return `₱${numPrice.toFixed(2)}`;
  };

  // 🧠 Helper: Format category
  const formatCategory = (category) => {
    if (!category) return "—";

    const predefinedCategories = [
      "iced latte", "bubble tea", "fruit tea", "amerikano",
      "non caffeine", "frappe", "choco Series", "hot drink", "shiro Series"
    ];

    const isPredefined = predefinedCategories.some(
      (predefined) => predefined.toLowerCase() === category.toLowerCase()
    );

    if (isPredefined) {
      return category
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // 🧠 Auto-detect columns if not passed
  const effectiveColumns = () => {
    if (columns.length > 0) {
      return columns;
    }

    const firstItem = displayData[0];
    if (!firstItem) return [];

    // Get all keys from the object including nested ones we want to display
    const keys = [];

    // Add standard fields
    Object.keys(firstItem).forEach((key) => {
      if (!excludedKeys.includes(key)) {
        keys.push(key);
      }
    });

    // Special handling for spoilage data
    if (fileName.toLowerCase().includes('spoilage')) {
      // Ensure person in charge fields are included
      if (firstItem.recordedBy && !keys.includes('recordedBy')) {
        keys.push('recordedBy');
      }
      if (firstItem.createdBy && !keys.includes('createdBy')) {
        keys.push('createdBy');
      }
      if (firstItem.personInCharge && !keys.includes('personInCharge')) {
        keys.push('personInCharge');
      }
    }

    return keys.map((key) => {
      let label = key.charAt(0).toUpperCase() + key.slice(1);

      // Better label formatting for person in charge
      if (key === 'recordedBy' || key === 'createdBy' || key === 'personInCharge') {
        label = 'Person In Charge';
      } else if (key === 'spoiledQuantity') {
        label = 'Spoiled Qty';
      } else if (key === 'spoiledUnit') {
        label = 'Unit';
      } else if (key === 'spoilageReason') {
        label = 'Reason';
      } else if (key === 'spoilageDate') {
        label = 'Date';
      }

      return { key, label };
    });
  };

  const getEffectiveColumns = effectiveColumns();

  // 🧠 Transform data for Excel
  const transformedDataExcel = displayData.map((item) => {
    const flattened = {};
    getEffectiveColumns.forEach(({ key }) => {
      const value = getNestedValue(item, key);
      flattened[key] = cleanValue(value, item, key);
    });
    return flattened;
  });

  // 🧠 Transform data for PDF
  const transformedDataPDF = [];

  displayData.forEach((item) => {
    // Check if it's a product with multiple sizes
    if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 1) {
      item.sizes.forEach((sizeObj, index) => {
        const flattened = {};
        getEffectiveColumns.forEach(({ key }) => {
          if (key === 'productName') {
            flattened[key] = index === 0 ? (item.productName || "—") : "";
          }
          else if (key === 'size') {
            flattened[key] = sizeObj.size ? `${sizeObj.size} oz` : "—";
          }
          else if (key === 'price') {
            flattened[key] = sizeObj.price ? formatPrice(sizeObj.price) : "—";
          }
          else if (key === 'category') {
            flattened[key] = index === 0 ? formatCategory(item.category) : "";
          }
          else if (key === 'ingredients.length') {
            flattened[key] = index === 0 ? (item.ingredients?.length || 0) : "";
          }
          else {
            if (index === 0) {
              const value = getNestedValue(item, key);
              flattened[key] = cleanValue(value, item, key);
            } else {
              flattened[key] = "";
            }
          }
        });
        transformedDataPDF.push(flattened);
      });
    } else {
      // Single size product or non-product data (like spoilage)
      const flattened = {};
      getEffectiveColumns.forEach(({ key }) => {
        if (key === 'size') {
          if (item.sizes && item.sizes.length === 1) {
            flattened[key] = item.sizes[0].size ? `${item.sizes[0].size} oz` : "—";
          } else {
            flattened[key] = item.size ? `${item.size} oz` : "—";
          }
        }
        else if (key === 'price') {
          if (item.sizes && item.sizes.length === 1) {
            flattened[key] = item.sizes[0].price ? formatPrice(item.sizes[0].price) : "—";
          } else {
            flattened[key] = item.price ? formatPrice(item.price) : "—";
          }
        }
        else if (key === 'category') {
          flattened[key] = formatCategory(item.category);
        }
        else {
          const value = getNestedValue(item, key);
          flattened[key] = cleanValue(value, item, key);
        }
      });
      transformedDataPDF.push(flattened);
    }
  });

  const headers = getEffectiveColumns.map((col) => col.label);
  const rowsExcel = transformedDataExcel.map((item) =>
    getEffectiveColumns.map((col) => item[col.key])
  );

  const rowsPDF = transformedDataPDF.map((item) =>
    getEffectiveColumns.map((col) => item[col.key])
  );

  // Format current date
  const formatCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Determine if filtering is active (displayData is different from origin data)
  // or if filteredData prop was provided and contains a subset
  const isFiltered = filteredData && filteredData.length > 0 && filteredData.length !== data.length;

  // 🧠 Determine the dynamic title/filename based on active category filters
  const getDynamicTitle = () => {
    // Only apply if filtered and we have data
    if (isFiltered && filteredData.length > 0) {
      const categories = new Set();
      filteredData.forEach((item) => {
        // Try various common paths for category
        const cat =
          item.category ||
          (item.ingredient && item.ingredient.category) ||
          (item.ingredients && item.ingredients[0]?.ingredient?.category) ||
          getNestedValue(item, "category");
        if (cat) categories.add(cat);
      });

      // If exactly one category is present across all filtered items,
      // use it as the filename/title
      if (categories.size === 1) {
        return formatCategory([...categories][0]);
      }
    }
    return fileName;
  };

  const dynamicFileName = getDynamicTitle();

  // ✅ Export to PDF
  const handleExportPDF = () => {
    try {

      // Filter out category column if a filter is applied
      let pdfColumns = getEffectiveColumns;
      if (isFiltered) {
        pdfColumns = getEffectiveColumns.filter(col => col.key.toLowerCase() !== 'category');
      }

      const pdfHeaders = pdfColumns.map((col) => col.label);

      // Transform data for the selected columns
      const pdfRows = [];
      const currentDisplayData = isFiltered ? filteredData : data;

      currentDisplayData.forEach((item) => {
        // Check if it's a product with multiple sizes
        if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 1) {
          item.sizes.forEach((sizeObj, index) => {
            const flattened = {};
            pdfColumns.forEach((col) => {
              const { key } = col;
              if (key === "productName") {
                flattened[key] = index === 0 ? item.productName || "—" : "";
              } else if (key === "size") {
                flattened[key] = sizeObj.size ? `${sizeObj.size} oz` : "—";
              } else if (key === "price") {
                flattened[key] = sizeObj.price
                  ? formatPrice(sizeObj.price)
                  : "—";
              } else if (key === "category") {
                flattened[key] =
                  index === 0 ? formatCategory(item.category) : "";
              } else if (key === "ingredients.length") {
                flattened[key] =
                  index === 0 ? item.ingredients?.length || 0 : "";
              } else {
                if (index === 0) {
                  flattened[key] = getFormattedValue(item, col);
                } else {
                  flattened[key] = "";
                }
              }
            });
            pdfRows.push(pdfColumns.map((col) => flattened[col.key]));
          });
        } else {
          // Single size product or non-product data
          const row = pdfColumns.map((col) => getFormattedValue(item, col));
          pdfRows.push(row);
        }
      });

      const doc = new jsPDF();

      // 🎨 Add header with logo
      doc.setFillColor(250, 250, 250);
      doc.rect(0, 0, 210, 40, "F");

      doc.setFillColor(255, 140, 0);
      doc.circle(25, 20, 12, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("KKOPI.TEA", 25, 22, { align: "center" });

      doc.setTextColor(255, 140, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("KKOPI.Tea", 45, 22);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("- Congressional ave Dasmariñas Cavite", 45, 27);

      doc.setDrawColor(255, 140, 0);
      doc.line(14, 35, 196, 35);

      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "bold");
      doc.text(dynamicFileName, 14, 45);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${formatCurrentDate()}`, 14, 50);

      // 🎨 Table with orange styling
      autoTable(doc, {
        head: [pdfHeaders],
        body: pdfRows,
        startY: 55,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: "helvetica",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 140, 0],
          textColor: 255,
          fontStyle: "bold",
          lineWidth: 0.1,
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [255, 248, 225],
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
        doc.setDrawColor(255, 140, 0);
        doc.line(
          14,
          doc.internal.pageSize.getHeight() - 20,
          196,
          doc.internal.pageSize.getHeight() - 20
        );
        doc.text(
          `KKOPI.Tea - ${dynamicFileName} - Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 15,
          { align: "center" }
        );
        doc.text(
          "Confidential Business Document",
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`${dynamicFileName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  // ✅ Print function
  const handlePrint = () => {
    try {

      // Filter out category column if a filter is applied
      let printColumns = getEffectiveColumns;
      if (isFiltered) {
        printColumns = getEffectiveColumns.filter(col => col.key.toLowerCase() !== 'category');
      }

      const printHeaders = printColumns.map((col) => col.label);

      // Transform data for the selected columns
      const printRows = [];
      const currentDisplayData = isFiltered ? filteredData : data;

      currentDisplayData.forEach((item) => {
        // Special multi-size handling (same as handleExportPDF)
        if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 1) {
          item.sizes.forEach((sizeObj, index) => {
            const flattened = {};
            printColumns.forEach((col) => {
              const { key } = col;
              if (key === "productName") {
                flattened[key] = index === 0 ? item.productName || "—" : "";
              } else if (key === "size") {
                flattened[key] = sizeObj.size ? `${sizeObj.size} oz` : "—";
              } else if (key === "price") {
                flattened[key] = sizeObj.price
                  ? formatPrice(sizeObj.price)
                  : "—";
              } else if (key === "category") {
                flattened[key] =
                  index === 0 ? formatCategory(item.category) : "";
              } else if (key === "ingredients.length") {
                flattened[key] =
                  index === 0 ? item.ingredients?.length || 0 : "";
              } else {
                if (index === 0) {
                  flattened[key] = getFormattedValue(item, col);
                } else {
                  flattened[key] = "";
                }
              }
            });
            printRows.push(printColumns.map((col) => flattened[col.key]));
          });
        } else {
          // Single size product or non-product data
          const row = printColumns.map((col) => getFormattedValue(item, col));
          printRows.push(row);
        }
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up blocked! Please allow pop-ups for this site to use the print feature.");
        return;
      }
      const tableHTML = `
    <html>
      <head>
        <title>${dynamicFileName} - KKOPI.Tea</title>
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
              <h2 class="report-title">${dynamicFileName}</h2>
              <p class="report-date">Generated on ${formatCurrentDate()}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>${printHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${printRows
          .map(
            (r) => `
                  <tr>
                    ${r.map((v) => `<td>${v}</td>`).join("")}
                  </tr>
                `
          )
          .join("")}
            </tbody>
          </table>
          
          <div class="print-footer">
            <strong>KKOPI.Tea</strong> - ${dynamicFileName} Report • Total Records: ${printRows.length
        } • Confidential Business Document
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
    } catch (err) {
      console.error("Print error:", err);
    }
  };

  // ✅ Export to Excel
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transformedDataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${dynamicFileName}.xlsx`);
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