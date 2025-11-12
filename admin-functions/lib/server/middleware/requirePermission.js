export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(403).json({ message: 'Authentication required' });
            return;
        }
        // Admins always allowed
        if (req.user.role === 'admin') {
            return next();
        }
        // Moderators: check for permissions (from custom claims or user doc fields)
        const perms = req.user.permissions || [];
        if (req.user.role === 'moderator' && perms.includes(permission)) {
            return next();
        }
        res.status(403).json({ message: 'Insufficient permissions' });
    };
};
