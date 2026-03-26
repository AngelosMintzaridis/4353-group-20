const { queues, services, queueArrivalSeq, history } = require('../data/memoryData');
const {
    recordQueueJoined,
    syncNearFrontForService,
    clearNearFrontForUserOnService
} = require('../services/notificationTriggers');

/**
 * Higher priority value is served first; ties use earlier joinedAt, then arrivalOrder.
 */
function sortQueueEntries(serviceIdKey) {
    const list = queues[serviceIdKey];
    if (!list || list.length === 0) return;

    list.sort((a, b) => {
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        if (pb !== pa) return pb - pa;
        const ta = new Date(a.joinedAt).getTime();
        const tb = new Date(b.joinedAt).getTime();
        if (ta !== tb) return ta - tb;
        return (a.arrivalOrder ?? 0) - (b.arrivalOrder ?? 0);
    });
}

function normalizeServiceId(raw) {
    if (raw === undefined || raw === null) return null;
    return String(raw);
}

/** Rule-based wait (assignment): position x expected duration (minutes per slot ahead). */
function estimateWaitMinutes(position, expectedDuration) {
    const dur = Number(expectedDuration);
    const pos = Number(position);
    if (!Number.isFinite(dur) || !Number.isFinite(pos) || dur < 0 || pos < 1) {
        return 0;
    }
    return Math.round(pos * dur);
}

exports.requireAdmin = (req, res, next) => {
    const role = req.headers['x-user-role'] || req.query.role;
    if (!role || String(role).toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Administrator access required' });
    }
    next();
};

// GET /api/queues/admin/:serviceId - view current queue (ordered)
exports.getAdminQueue = (req, res) => {
    const serviceIdKey = normalizeServiceId(req.params.serviceId);
    const service = services.find(s => String(s.id) === serviceIdKey);

    if (!service) {
        return res.status(404).json({ message: 'Service not found' });
    }

    if (!queues[serviceIdKey]) {
        queues[serviceIdKey] = [];
    }

    sortQueueEntries(serviceIdKey);

    const queue = queues[serviceIdKey].map((entry, index) => {
        const position = index + 1;
        return {
            position,
            userName: entry.userName,
            userEmail: entry.userEmail,
            joinedAt: entry.joinedAt,
            priority: entry.priority ?? 0,
            arrivalOrder: entry.arrivalOrder,
            estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
        };
    });

    console.log(`[ADMIN] View queue for service ${service.name} (${queue.length} waiting)`);

    res.json({
        service,
        queue,
        count: queue.length
    });
};

// POST /api/queues/admin/:serviceId/serve-next - remove next person in order, and add to history
exports.serveNext = (req, res) => {
    const serviceIdKey = normalizeServiceId(req.params.serviceId);
    const service = services.find(s => String(s.id) === serviceIdKey);

    if (!service) {
        return res.status(404).json({ message: 'Service not found' });
    }

    if (!queues[serviceIdKey] || queues[serviceIdKey].length === 0) {
        return res.status(400).json({ message: 'Queue is empty' });
    }

    // sort and remove person at the front
    sortQueueEntries(serviceIdKey);
    const served = queues[serviceIdKey].shift();

    // history logic
    const historyEntry = {
        userEmail: served.userEmail,
        userName: served.userName,
        serviceName: service.name,
        joinedAt: served.joinedAt,
        completedAt: new Date().toISOString(),
        status: 'Served'
    };

    // push to history array 
    history.push(historyEntry);
    console.log(`[HISTORY] User ${served.userEmail} was officially Served.`);

    console.log(`[ADMIN] Served next: ${served.userEmail} for service ${service.name}`);
    console.log(`[INFO] Remaining in queue: ${queues[serviceIdKey].length}`);

    syncNearFrontForService(serviceIdKey);

    res.json({
        message: 'Next user served',
        served: {
            userName: served.userName,
            userEmail: served.userEmail,
            joinedAt: served.joinedAt,
            priority: served.priority ?? 0
        },
        remaining: queues[serviceIdKey].length
    });
};

// POST /api/queues/join
exports.joinQueue = (req, res) => {
    const { serviceId, userName, userEmail } = req.body;

    if (!serviceId || !userName || !userEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const service = services.find(s => s.id === parseInt(serviceId, 10));
    if (!service) {
        return res.status(404).json({ message: 'Service not found' });
    }

    const serviceIdKey = normalizeServiceId(serviceId);

    if (!queues[serviceIdKey]) {
        queues[serviceIdKey] = [];
    }

    const alreadyIn = queues[serviceIdKey].some(u => u.userEmail === userEmail);
    if (alreadyIn) {
        return res.status(400).json({ message: 'You are already in this queue' });
    }

    let priority = service.priorityLevel;
    if (req.body.priority !== undefined && req.body.priority !== '') {
        const p = parseInt(req.body.priority, 10);
        if (!Number.isNaN(p)) {
            priority = p;
        }
    }

    if (!queueArrivalSeq[serviceIdKey]) {
        queueArrivalSeq[serviceIdKey] = 1;
    }
    const arrivalOrder = queueArrivalSeq[serviceIdKey];
    queueArrivalSeq[serviceIdKey] += 1;

    const queueEntry = {
        userName,
        userEmail,
        joinedAt: new Date().toISOString(),
        priority,
        arrivalOrder
    };

    queues[serviceIdKey].push(queueEntry);
    sortQueueEntries(serviceIdKey);

    const position = queues[serviceIdKey].findIndex(u => u.userEmail === userEmail) + 1;

    console.log(`[QUEUE] User ${userName} (${userEmail}) is joining queue for ${service.name}`);
    console.log(`[INFO] Current queue length for ${service.name}: ${queues[serviceIdKey].length}`);

    recordQueueJoined(userEmail, service, position, queues[serviceIdKey].length);
    syncNearFrontForService(serviceIdKey);

    res.status(201).json({
        message: 'Joined queue successfully',
        position,
        priority,
        estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
    });
};

// POST /api/queues/leave
exports.leaveQueue = (req, res) => {
    const { serviceId, userEmail } = req.body;

    if (serviceId === undefined || serviceId === null || !userEmail) {
        return res.status(400).json({ message: 'serviceId and userEmail are required' });
    }

    const serviceIdKey = normalizeServiceId(serviceId);

    if (!queues[serviceIdKey]) {
        return res.status(404).json({ message: 'Queue not found' });
    }

    // find user data before removing (for history feature) 
    const userToRecord = queues[serviceIdKey].find(u => u.userEmail === userEmail);

    if (userToRecord) {
        // create history entry 
        const service = services.find(s => normalizeServiceId(s.id) === serviceIdKey);
        
        const historyEntry = {
            userEmail: userToRecord.userEmail,
            userName: userToRecord.userName,
            serviceName: service ? service.name : 'Unknown Service',
            joinedAt: userToRecord.joinedAt,
            completedAt: new Date().toISOString(),
            status: 'Left Queue'
        };

        //push to history array 
        history.push(historyEntry);
        console.log(`[HISTORY] Recorded session for ${userEmail}`);

        //removal logic
        queues[serviceIdKey] = queues[serviceIdKey].filter(u => u.userEmail !== userEmail);

        console.log(`[QUEUE] User ${userEmail} successfully removed from service ${serviceIdKey}`);
        clearNearFrontForUserOnService(userEmail, serviceIdKey);
        syncNearFrontForService(serviceIdKey);

        return res.json({ message: 'Left queue successfully' });
    }

    return res.status(404).json({ message: 'User was not found in this queue' });
};

//get user history
exports.getUserHistory = (req, res) => {
    const { email } = req.params;
    
    if (!email) {
        return res.status(400).json({ message: 'Email parameter is required' });
    }

    const userHistory = history.filter(h => h.userEmail.toLowerCase() === email.toLowerCase());
    
    res.json(userHistory);
};

// GET /api/queues/status?email=user@example.com
exports.getUserStatus = (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    let status = {
        inQueue: false,
        position: -1,
        service: null,
        estimatedWaitMinutes: null
    };

    for (const serviceIdKey of Object.keys(queues)) {
        sortQueueEntries(serviceIdKey);
        const index = queues[serviceIdKey].findIndex(u => u.userEmail === email);

        if (index !== -1) {
            const service = services.find(s => String(s.id) === serviceIdKey);
            if (!service) {
                break;
            }
            const position = index + 1;
            status = {
                inQueue: true,
                position,
                service,
                estimatedWaitMinutes: estimateWaitMinutes(position, service.expectedDuration)
            };
            break;
        }
    }

    res.json(status);
};
