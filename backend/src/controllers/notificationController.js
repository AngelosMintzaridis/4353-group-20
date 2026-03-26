const { notifications } = require('../data/memoryData');

// GET /api/notifications?email=user@example.com
exports.listForUser = (req, res) => {
    const email = req.query.email;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'email query parameter is required' });
    }

    const normalized = email.trim().toLowerCase();
    const items = notifications.filter((n) => n.userEmail === normalized);

    res.json({
        notifications: items,
        unreadCount: items.filter((n) => !n.read).length
    });
};

// PATCH /api/notifications/:id/read?email=user@example.com
exports.markRead = (req, res) => {
    const id = parseInt(req.params.id, 10);
    const email = req.query.email;

    if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid notification id' });
    }
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'email query parameter is required' });
    }

    const normalized = email.trim().toLowerCase();
    const row = notifications.find((n) => n.id === id && n.userEmail === normalized);

    if (!row) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    row.read = true;
    res.json({ message: 'Marked as read', notification: row });
};
