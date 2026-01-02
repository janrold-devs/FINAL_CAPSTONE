import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import { Package, Calendar, AlertTriangle, CheckCircle, XCircle, Plus } from "lucide-react";
import StockInModal from "./StockInModal";

const IngredientBatchModal = ({ show, onClose, ingredient }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // active, expired, all
  
  // Stock-in modal state
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const fetchBatches = async () => {
    if (!ingredient?._id) return;
    
    try {
      setLoading(true);
      const includeExpired = activeTab === "expired" || activeTab === "all";
      const response = await axios.get(`/batches/ingredient/${ingredient._id}?includeExpired=${includeExpired}`);
      
      if (response.data.success) {
        let filteredBatches = response.data.data.batches;
        
        // Filter based on active tab
        if (activeTab === "active") {
          filteredBatches = filteredBatches.filter(batch => batch.status === "active" && batch.currentQuantity > 0);
        } else if (activeTab === "expired") {
          filteredBatches = filteredBatches.filter(batch => {
            // Only consider batches with expiration dates for expired filter
            if (!batch.expirationDate || !batch.hasExpiration) {
              return false; // Non-perishable items can't be expired
            }
            return batch.status === "expired" || new Date(batch.expirationDate) < new Date();
          });
        }
        
        setBatches(filteredBatches);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to fetch batch information");
    } finally {
      setLoading(false);
    }
  };

  // Fetch ingredients and users for StockInModal
  const fetchStockInData = async () => {
    try {
      const [ingredientsRes, usersRes] = await Promise.all([
        axios.get("/ingredients"),
        axios.get("/users")
      ]);
      
      if (ingredientsRes.data.success) {
        setIngredientsList(ingredientsRes.data.data);
      }
      
      if (usersRes.data.success) {
        setUsersList(usersRes.data.data);
      }
    } catch (error) {
      console.error("Error fetching stock-in data:", error);
      toast.error("Failed to load stock-in data");
    }
  };

  // Handle stock-in submission
  const handleStockInSubmit = async (stockInData) => {
    try {
      const response = await axios.post("/stockins", stockInData);
      
      if (response.data.success) {
        toast.success("Stock-in added successfully!");
        setShowStockInModal(false);
        // Refresh batches to show the new stock
        fetchBatches();
      }
    } catch (error) {
      console.error("Error creating stock-in:", error);
      toast.error(error.response?.data?.message || "Failed to add stock-in");
    }
  };

  // Open stock-in modal with current ingredient pre-selected
  const handleAddStock = () => {
    fetchStockInData();
    setShowStockInModal(true);
  };

  useEffect(() => {
    if (show && ingredient) {
      fetchBatches();
    }
  }, [show, ingredient, activeTab]);

  const getStatusIcon = (batch) => {
    const now = new Date();
    
    // Handle non-perishable items (no expiration date)
    if (!batch.expirationDate || !batch.hasExpiration) {
      if (batch.currentQuantity <= 0) {
        return <XCircle className="w-4 h-4 text-gray-500" />;
      } else {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
    }
    
    const expirationDate = new Date(batch.expirationDate);
    
    if (batch.status === "expired" || expirationDate < now) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (batch.currentQuantity <= 0) {
      return <XCircle className="w-4 h-4 text-gray-500" />;
    } else if (expirationDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusText = (batch) => {
    const now = new Date();
    
    // Handle non-perishable items (no expiration date)
    if (!batch.expirationDate || !batch.hasExpiration) {
      if (batch.currentQuantity <= 0) {
        return "Depleted";
      } else {
        return "Active";
      }
    }
    
    const expirationDate = new Date(batch.expirationDate);
    
    if (batch.status === "expired" || expirationDate < now) {
      return "Expired";
    } else if (batch.currentQuantity <= 0) {
      return "Depleted";
    } else if (expirationDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return "Expiring Soon";
    } else {
      return "Active";
    }
  };

  const getStatusColor = (batch) => {
    const now = new Date();
    
    // Handle non-perishable items (no expiration date)
    if (!batch.expirationDate || !batch.hasExpiration) {
      if (batch.currentQuantity <= 0) {
        return "bg-gray-100 text-gray-800";
      } else {
        return "bg-green-100 text-green-800";
      }
    }
    
    const expirationDate = new Date(batch.expirationDate);
    
    if (batch.status === "expired" || expirationDate < now) {
      return "bg-red-100 text-red-800";
    } else if (batch.currentQuantity <= 0) {
      return "bg-gray-100 text-gray-800";
    } else if (expirationDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-green-100 text-green-800";
    }
  };

  const formatDate = (dateString) => {
    // Handle null or undefined dates
    if (!dateString) {
      return "No expiration";
    }
    
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getDaysUntilExpiration = (expirationDate) => {
    // Handle null or undefined expiration dates
    if (!expirationDate) {
      return "No expiration date";
    }
    
    const now = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Batch Information</h2>
              <p className="text-gray-600">{ingredient?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddStock}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Ingredient Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{ingredient?.quantity || 0}</p>
              <p className="text-sm text-gray-500">{ingredient?.unit}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Active Batches</p>
              <p className="text-2xl font-bold text-green-600">{ingredient?.activeBatches || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Alert Level</p>
              <p className="text-2xl font-bold text-yellow-600">{ingredient?.alert || 0}</p>
              <p className="text-sm text-gray-500">{ingredient?.unit}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Next Expiration</p>
              <p className="text-lg font-semibold text-red-600">
                {ingredient?.nextExpiration 
                  ? formatDate(ingredient.nextExpiration)
                  : "No batches"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "active"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Active Batches
          </button>
          <button
            onClick={() => setActiveTab("expired")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "expired"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Expired Batches
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Batches
          </button>
        </div>

        {/* Batch List */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No batches found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <div
                  key={batch._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(batch)}
                        <h3 className="font-semibold text-gray-900">{batch.batchNumber}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch)}`}>
                          {getStatusText(batch)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Current Quantity</p>
                          <p className="font-medium">{batch.currentQuantity} {batch.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Original Quantity</p>
                          <p className="font-medium">{batch.originalQuantity} {batch.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Stock-In Date</p>
                          <p className="font-medium">{formatDate(batch.stockInDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Expiration Date</p>
                          <p className="font-medium">
                            {batch.expirationDate && batch.hasExpiration 
                              ? formatDate(batch.expirationDate)
                              : "No expiration"
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {batch.expirationDate && batch.hasExpiration 
                            ? getDaysUntilExpiration(batch.expirationDate)
                            : "Non-perishable item"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Usage</span>
                      <span>{Math.round(((batch.originalQuantity - batch.currentQuantity) / batch.originalQuantity) * 100)}% used</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((batch.originalQuantity - batch.currentQuantity) / batch.originalQuantity) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Stock-In Modal */}
        <StockInModal
          show={showStockInModal}
          onClose={() => setShowStockInModal(false)}
          onSubmit={handleStockInSubmit}
          ingredientsList={ingredientsList}
          usersList={usersList}
          viewMode={false}
          preSelectedIngredient={ingredient}
        />
      </div>
    </div>
  );
};

export default IngredientBatchModal;