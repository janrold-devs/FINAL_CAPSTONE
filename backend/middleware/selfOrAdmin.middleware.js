export const selfOrAdmin = (req, res, next) => {
  try {
    // Allow if user is updating their own profile
    if (req.user._id.toString() === req.params.id) {
      return next();
    }
    
    // Allow if user is admin
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Otherwise forbidden
    return res.status(403).json({ 
      message: "Forbidden: You can only update your own profile" 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};