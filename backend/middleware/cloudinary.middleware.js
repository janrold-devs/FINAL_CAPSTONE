import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../lib/cloudinary.js';

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kkopitea/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return uniqueName;
    }
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// Helper function to delete image from Cloudinary
export const deleteCloudinaryImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `kkopitea/products/${filename.split('.')[0]}`;
    
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting Cloudinary image:', error);
  }
};

// Helper function to extract public_id from Cloudinary URL
export const getCloudinaryPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;
  
  try {
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    const pathParts = urlParts.slice(uploadIndex + 2);
    const publicId = pathParts.join('/').split('.')[0];
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};