export const requireAdminOrModerator = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ message: 'Authentication required' });
    }
    if (req.user.role === 'admin' || req.user.role === 'moderator') {
        return next();
    }
    return res.status(403).json({ message: 'Admin or moderator access required' });
};
