import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/axios';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const response = await api.get(`/users/${decoded.id}`);
      setUser(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load user profile', {
        position: "top-right",
        autoClose: 3000,
      });
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      if (passwordData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const token = localStorage.getItem('token');
      const decoded = JSON.parse(atob(token.split('.')[1]));
      
      await api.put(`/users/${decoded.id}`, {
        password: passwordData.newPassword
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password changed successfully!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleCancel = () => {
    if (activeTab === 'password') {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-500 mt-2">Manage your account preferences and security</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                  activeTab === 'profile'
                    ? 'text-[#E89271] bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Profile Details
                {activeTab === 'profile' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E89271]"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 px-6 py-4 font-medium transition-all relative ${
                  activeTab === 'password'
                    ? 'text-[#E89271] bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Change Password
                {activeTab === 'password' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E89271]"></div>
                )}
              </button>
            </div>

            {/* Content */}
            {/* Profile Tab - Updated to read-only display */}
            {activeTab === 'profile' && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                    <p className="text-sm text-gray-500 mt-1">View your account details</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">First Name</div>
                          <div className="flex-1 text-gray-900">{user?.firstName || 'N/A'}</div>
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">Last Name</div>
                          <div className="flex-1 text-gray-900">{user?.lastName || 'N/A'}</div>
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0 w-32 font-medium text-gray-600">Email</div>
                          <div className="flex-1 text-gray-900">{user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Removed action buttons since profile is not editable */}
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#E89271]/10 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#E89271]" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                    </div>
                    <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
                  </div>
                  
                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.currentPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-all"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('currentPassword')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.currentPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.newPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-all"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('newPassword')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.newPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E89271] focus:border-transparent transition-all"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirmPassword')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Password requirements:</span>
                        <br />
                        • At least 8 characters long
                        <br />
                        • Include numbers and special characters
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="px-6 py-2.5 bg-[#E89271] text-white font-medium rounded-lg hover:bg-[#ed9e7f] transition-colors shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;