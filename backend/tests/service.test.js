const request = require('supertest');
const app = require('../server');
const { services } = require('../src/data/memoryData');

describe('Service Management API Tests', () => {
    let createdServiceId;

    beforeAll(() => {
        services.length = 0;
    });

    describe('POST /api/services', () => {
        it('should create a new service successfully', async () => {
            const res = await request(app)
                .post('/api/services')
                .send({
                    name: 'General Consultation',
                    description: 'Basic 15 min consultation',
                    expectedDuration: 15,
                    priorityLevel: 1
                });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toEqual('General Consultation');
            createdServiceId = res.body.id;
        });

        it('should fail if priorityLevel is missing', async () => {
             const res = await request(app)
                .post('/api/services')
                .send({
                    name: 'Bad Service',
                    description: 'desc',
                    expectedDuration: 15
                });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toMatch(/Priority/i);
        });
    });

    describe('GET /api/services', () => {
        it('should return a list of services', async () => {
            const res = await request(app).get('/api/services');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('PUT /api/services/:id', () => {
        it('should update an existing service', async () => {
            const res = await request(app)
                .put(`/api/services/${createdServiceId}`)
                .send({
                    expectedDuration: 20
                });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.service.expectedDuration).toEqual(20);
        });

        it('should return 404 for a non-existent service', async () => {
            const res = await request(app)
                .put('/api/services/999')
                .send({
                    name: 'Ghost Service'
                });
            
            expect(res.statusCode).toEqual(404);
        });
    });
});
