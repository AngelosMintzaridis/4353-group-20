//array store user objects 
const users = [];

//array store services
/**
 * Stores active queues for each service.
 * Format: { 
 * "serviceId": [ { userName: '...', userEmail: '...', joinedAt: '...' }, ... ] 
 * }
 */
const services = [];

//object will store  services and their queues
const queues = {};

// per-service monotonic counter for stable arrival tie-breaks after sort
const queueArrivalSeq = {};

// in-app notifications (no email/SMS); newest stored at front when unshifted in triggers
const notifications = [];

// keys "email|serviceId" — already notified while in top-N band (dedupe)
const nearServeNotified = new Set();

module.exports = {
    users,
    services,
    queues,
    queueArrivalSeq,
    notifications,
    nearServeNotified
};