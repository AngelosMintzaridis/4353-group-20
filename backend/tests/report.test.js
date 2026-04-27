const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Service = require('../src/models/Service');
const QueueEntry = require('../src/models/QueueEntry');
const Queue = require('../src/models/Queue');
const { connectMongoMemory, disconnectMongoMemory, clearDatabase } = require('./mongoTestDb');

let mongoServer;

beforeAll(async () => {
    mongoServer = await connectMongoMemory();
});

afterAll(async () => {
    await disconnectMongoMemory(mongoServer);
});

beforeEach(async () => {
    await clearDatabase();
});

describe('Report Export API', () => {

    describe('GET /api/reports/export', () => {

        it('returns 403 if x-user-role is not admin', async () => {
            const res = await request(app).get('/api/reports/export');
            expect(res.status).toBe(403);
        });

        it('returns CSV with correct headers when no data exists', async () => {
            const res = await request(app)
                .get('/api/reports/export')
                .set('x-user-role', 'admin');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('QueueSmart_Report');
            expect(res.headers['content-disposition']).toContain('.csv');

            // Should have header row even with no data
            const csv = res.text;
            expect(csv).toContain('User Name');
            expect(csv).toContain('User Email');
            expect(csv).toContain('Service');
            expect(csv).toContain('Status');
        });

        it('returns CSV containing queue entry data', async () => {
            // Seed a service
            const service = await Service.create({
                name: 'Test Service',
                description: 'Test desc',
                expectedDuration: 10,
                priorityLevel: 1,
                status: 'active'
            });

            // Seed a queue
            const queue = await Queue.create({
                serviceId: service._id,
                status: 'open'
            });

            // Seed queue entries
            await QueueEntry.create({
                serviceId: service._id,
                queueId: queue._id,
                userName: 'John Doe',
                userEmail: 'john@example.com',
                priority: 1,
                status: 'served',
                joinedAt: new Date()
            });

            await QueueEntry.create({
                serviceId: service._id,
                queueId: queue._id,
                userName: 'Jane Smith',
                userEmail: 'jane@example.com',
                priority: 2,
                status: 'waiting',
                joinedAt: new Date()
            });

            const res = await request(app)
                .get('/api/reports/export')
                .set('x-user-role', 'admin');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');

            const csv = res.text;
            // Verify data rows appear
            expect(csv).toContain('John Doe');
            expect(csv).toContain('john@example.com');
            expect(csv).toContain('Test Service');
            expect(csv).toContain('served');
            expect(csv).toContain('Jane Smith');
            expect(csv).toContain('jane@example.com');
            expect(csv).toContain('waiting');
        });

        it('shows "Unknown" for entries with deleted services', async () => {
            // Create an entry with a fake serviceId (service doesn't exist)
            const fakeServiceId = new mongoose.Types.ObjectId();

            await QueueEntry.create({
                serviceId: fakeServiceId,
                userName: 'Orphan User',
                userEmail: 'orphan@example.com',
                priority: 0,
                status: 'cancelled',
                joinedAt: new Date()
            });

            const res = await request(app)
                .get('/api/reports/export')
                .set('x-user-role', 'admin');

            expect(res.status).toBe(200);
            const csv = res.text;
            expect(csv).toContain('Orphan User');
            expect(csv).toContain('Unknown');
        });
    });
});
