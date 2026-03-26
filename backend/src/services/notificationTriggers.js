const {
    notifications,
    nearServeNotified,
    queues,
    services
} = require('../data/memoryData');

const CLOSE_TO_SERVE_N = 3;

let nextNotificationId = 1;

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

/**
 * In-memory notification (no email/SMS). Newest first when listed.
 */
function pushNotification({ userEmail, type, message, serviceId, serviceName, meta }) {
    const row = {
        id: nextNotificationId++,
        userEmail: String(userEmail).toLowerCase(),
        type,
        message,
        serviceId: serviceId != null ? Number(serviceId) : null,
        serviceName: serviceName || null,
        read: false,
        createdAt: new Date().toISOString(),
        meta: meta || null
    };
    notifications.unshift(row);
    console.log(`[NOTIFY] ${type} -> ${row.userEmail}: ${message}`);
    return row;
}

/**
 * Top N (N=3): users in positions 1..3 get a one-time "close to serve" ping per visit to that band.
 */
function syncNearFrontForService(serviceIdKey) {
    const service = services.find(s => String(s.id) === serviceIdKey);
    if (!service) return;

    sortQueueEntries(serviceIdKey);
    const list = queues[serviceIdKey] || [];
    const currentTopKeys = new Set();

    for (let i = 0; i < Math.min(CLOSE_TO_SERVE_N, list.length); i++) {
        const position = i + 1;
        const entry = list[i];
        const key = `${entry.userEmail.toLowerCase()}|${serviceIdKey}`;
        currentTopKeys.add(key);

        if (!nearServeNotified.has(key)) {
            nearServeNotified.add(key);
            pushNotification({
                userEmail: entry.userEmail,
                type: 'close_to_serve',
                message: `You are in the front spots for "${service.name}" (position ${position} of ${list.length}).`,
                serviceId: service.id,
                serviceName: service.name,
                meta: { position, queueLength: list.length, rule: `position <= ${CLOSE_TO_SERVE_N}` }
            });
        }
    }

    for (const key of [...nearServeNotified]) {
        if (key.endsWith(`|${serviceIdKey}`) && !currentTopKeys.has(key)) {
            nearServeNotified.delete(key);
        }
    }
}

function recordQueueJoined(userEmail, service, position, queueLength) {
    pushNotification({
        userEmail,
        type: 'queue_joined',
        message: `You joined "${service.name}" (position ${position} of ${queueLength}).`,
        serviceId: service.id,
        serviceName: service.name,
        meta: { position, queueLength }
    });
}

function clearNearFrontForUserOnService(userEmail, serviceIdKey) {
    const key = `${String(userEmail).toLowerCase()}|${serviceIdKey}`;
    nearServeNotified.delete(key);
}

module.exports = {
    CLOSE_TO_SERVE_N,
    pushNotification,
    syncNearFrontForService,
    recordQueueJoined,
    clearNearFrontForUserOnService
};
