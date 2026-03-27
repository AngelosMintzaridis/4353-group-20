const request = require('supertest');
const app = require('../server');
const { services, queues, history, queueArrivalSeq, notifications, nearServeNotified } = require('../src/data/memoryData');

describe('Queue Management API', () => {
    // Reset all shared in-memory data before each test
    beforeEach(() => {
        Object.keys(queues).forEach(k => delete queues[k]);
        Object.keys(queueArrivalSeq).forEach(k => delete queueArrivalSeq[k]);
        history.length = 0;
        services.length = 0;
        notifications.length = 0;
        nearServeNotified.clear();

        // Add a mock service
        services.push({
            id: 1,
            name: 'Test Service',
            expectedDuration: 10,
            priorityLevel: 1
        });
    });

    // --- User: Join Queue ---
    it('should allow a user to join the queue', async () => {
        const response = await request(app)
            .post('/api/queues/join')
            .send({
                serviceId: '1',
                userName: 'John Doe',
                userEmail: 'john@example.com'
            });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Joined queue successfully');
        expect(queues['1'].length).toBe(1);
        expect(queues['1'][0].userName).toBe('John Doe');
    });

    // --- Wait-Time Estimation ---
    it('should calculate estimated wait time (position * duration)', async () => {
        // Seed one person already in queue
        queues['1'] = [];
        queues['1'].push({
            userName: 'Alice',
            userEmail: 'alice@example.com',
            joinedAt: new Date().toISOString(),
            priority: 1,
            arrivalOrder: 1
        });

        // Second person joins
        const response = await request(app)
            .post('/api/queues/join')
            .send({
                serviceId: '1',
                userName: 'Bob',
                userEmail: 'bob@example.com'
            });

        expect(response.status).toBe(201);
        // Position 2 * 10 min duration = 20 mins
        expect(response.body.estimatedWaitMinutes).toBe(20);
    });

    // --- User: Leave Queue ---
    it('should allow a user to leave the queue', async () => {
        queues['1'] = [];
        queues['1'].push({
            userName: 'John Doe',
            userEmail: 'john@example.com',
            joinedAt: new Date().toISOString()
        });

        const response = await request(app)
            .post('/api/queues/leave')
            .send({
                serviceId: '1',
                userEmail: 'john@example.com'
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Left queue successfully');
        expect(queues['1'].length).toBe(0);

        // History module: verify the leave was recorded
        expect(history.length).toBe(1);
        expect(history[0].status).toBe('Left Queue');
    });

    // --- Admin: View Current Queue ---
    it('should allow an admin to view the current queue', async () => {
        queues['1'] = [];
        queues['1'].push({
            userName: 'John Doe',
            userEmail: 'john@example.com',
            joinedAt: new Date().toISOString()
        });

        const response = await request(app)
            .get('/api/queues/admin/1')
            .set('x-user-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.queue.length).toBe(1);
        expect(response.body.queue[0].userName).toBe('John Doe');
        expect(response.body.queue[0].position).toBe(1);
    });

    // --- Admin: Serve Next User ---
    it('should allow an admin to serve the next user', async () => {
        queues['1'] = [];
        queues['1'].push({
            userName: 'John Doe',
            userEmail: 'john@example.com',
            joinedAt: new Date().toISOString()
        });

        const response = await request(app)
            .post('/api/queues/admin/1/serve-next')
            .set('x-user-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Next user served');
        expect(response.body.served.userName).toBe('John Doe');

        // Queue should now be empty
        expect(queues['1'].length).toBe(0);

        // History module: verify served was recorded
        expect(history.length).toBe(1);
        expect(history[0].status).toBe('Served');
    });

    // --- Role-based Access Control ---
    it('should deny admin actions to regular users', async () => {
        const response = await request(app)
            .get('/api/queues/admin/1')
            .set('x-user-role', 'user');

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Administrator access required');
    });
});
