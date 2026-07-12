const authorize = (allowedRoleIds = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. User context missing.' });
    }

    const { role_id } = req.user;

    // Fleet Manager (role_id = 1) has full access override for all routes
    if (role_id === 1) {
      return next();
    }

    // Check if user's role is in the allowed list
    if (allowedRoleIds.includes(role_id)) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden. You do not have permission to access this resource.' });
  };
};

module.exports = authorize;
