const request = require('supertest');
const app = require('../server'); // Import the Express app

describe('Authentication API Tests', () => {

    describe('POST /api/auth/register', () => {
        it('should successfully register a new user with valid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'johndoe@example.com',
                    password: 'password123',
                    role: 'User'
                });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered in memory');
            expect(res.body.user.name).toEqual('John Doe');
        });

        it('should fail if email is an invalid format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Jane Doe',
                    email: 'invalid-email',
                    password: 'password123',
                    role: 'User'
                });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/valid email is required/);
        });

        it('should fail if password is too short', async () => {
             const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Jane Doe',
                    email: 'janedoe@example.com',
                    password: '123', // Too short
                    role: 'User'
                });
            
            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should successfully login with correct credentials', async () => {
            // Wait for the first test to register John Doe, then log him in
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'johndoe@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'login successful');
            expect(res.body.user.email).toEqual('johndoe@example.com');
        });

        it('should fail to login with an unknown email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unknown@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toEqual(401);
        });
    });
});
