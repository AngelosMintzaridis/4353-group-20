const { createObjectCsvStringifier } = require('csv-writer');
const QueueEntry = require('../models/QueueEntry');
const Service = require('../models/Service');

/**
 * GET /api/reports/export
 * Generates a CSV report of all queue history and streams it as a download.
 * Admin-only (enforced by middleware on the route).
 */
exports.exportReport = async (req, res) => {
    try {
        // Pull every queue entry (waiting, served, cancelled) from MongoDB
        const entries = await QueueEntry.find()
            .populate('serviceId')
            .sort({ joinedAt: -1 });

        // Build CSV rows
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'userName',    title: 'User Name' },
                { id: 'userEmail',   title: 'User Email' },
                { id: 'serviceName', title: 'Service' },
                { id: 'priority',    title: 'Priority' },
                { id: 'status',      title: 'Status' },
                { id: 'joinedAt',    title: 'Joined At' },
                { id: 'updatedAt',   title: 'Last Updated' }
            ]
        });

        const records = entries.map(e => ({
            userName:    e.userName,
            userEmail:   e.userEmail,
            serviceName: e.serviceId ? e.serviceId.name : 'Unknown',
            priority:    e.priority ?? 0,
            status:      e.status,
            joinedAt:    e.joinedAt ? new Date(e.joinedAt).toLocaleString() : '',
            updatedAt:   e.updatedAt ? new Date(e.updatedAt).toLocaleString() : ''
        }));

        const csvContent =
            csvStringifier.getHeaderString() +
            csvStringifier.stringifyRecords(records);

        // Stream as a file download
        const filename = `QueueSmart_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);

        console.log(`[REPORT] CSV exported — ${records.length} records`);
    } catch (error) {
        console.error('[REPORT ERROR]', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
};
