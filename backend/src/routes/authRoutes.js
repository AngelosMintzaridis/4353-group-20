const express = require('express');
const router = express.Router();

// mock login route
router.post('/login', (req, res) => {
    res.json({ message: 'login endpoint reached' });
});

// mock register route
router.post('/register', (req, res) => {
    res.json({ message: 'registration endpoint reached' });
});

module.exports = router;