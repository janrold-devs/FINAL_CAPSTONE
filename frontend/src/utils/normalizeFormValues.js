import normalizeFormValues from "../../utils/normalizeFormValues";

// When receiving edit/view data or when pre-filling form from API:
useEffect(() => {
  if (editingProduct) {
    const normalized = normalizeFormValues(editingProduct, {
      uppercaseFields: ["productName", "customCategory", "batchNumber"],
      unitFields: ["unit"],
    });
    setForm((prev) => ({ ...prev, ...normalized }));
  }
}, [editingProduct]);