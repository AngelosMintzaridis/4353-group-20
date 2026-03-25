const { users } = require('../data/memoryData');

exports.register = (req, res) => {
    const { name, email, password, role } = req.body;

    // this log prints in ur backend termnal
    console.log('--- NEW REGISTRATION ATTEMPT ---');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log('--------------------------------');

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({ message: 'Name must be a string between 2 and 50 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 100) {
        return res.status(400).json({ message: 'A valid email is required (max 100 characters)' });
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 50) {
        return res.status(400).json({ message: 'Password must be a string between 6 and 50 characters' });
    }

    if (!role || (role.toLowerCase() !== 'user' && role.toLowerCase() !== 'administrator')) {
        return res.status(400).json({ message: 'Role must be either "User" or "Administrator"' });
    }

    const newUser = { name, email, password, role };
    users.push(newUser);

    res.status(201).json({ message: 'User registered in memory', user: newUser });
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    console.log('--- USER LOGIN ATTEMPT ---');
    console.log(`Email: ${email || '(missing)'}`);
    console.log('--------------------------');

    if (!email || !password) {
        console.warn('Login failed: missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Email and password must be valid strings' });
    }

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        console.warn(`Login failed: invalid credentials for ${email}`);
        return res.status(401).json({ message: 'invalid email or password' });
    }

    console.log('--- USER LOGGED IN ---');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log('----------------------');

    res.json({
        message: 'login successful',
        user: { name: user.name, email: user.email, role: user.role }
    });
};