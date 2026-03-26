const { services } = require('../data/memoryData');

// Unique ID counter for services
let serviceIdCounter = 1;

exports.createService = (req, res) => {
    const { name, description, expectedDuration, priorityLevel } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Valid service name is required' });
    }
    if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: 'Valid description is required' });
    }
    if (typeof expectedDuration !== 'number' || expectedDuration <= 0) {
        return res.status(400).json({ message: 'Expected duration must be a positive number (minutes)' });
    }
    if (typeof priorityLevel !== 'number' || priorityLevel < 0) {
        return res.status(400).json({ message: 'Priority level must be a non-negative number' });
    }

    const newService = {
        id: serviceIdCounter++,
        name,
        description,
        expectedDuration,
        priorityLevel,
        createdAt: new Date()
    };

    services.push(newService);
    
    // Initialize the queue for this service implicitly or explicitly (will be handled by queue logic when needed, but good to have)
    
    res.status(201).json({ message: 'Service created successfully', service: newService });
};

exports.getServices = (req, res) => {
    res.json(services);
};


//service update logic
exports.updateService = (req, res) => {
    const serviceId = parseInt(req.params.id);
    const { name, description, expectedDuration, priorityLevel } = req.body;

    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
        return res.status(404).json({ message: 'Service not found' });
    }

    //update fields if provided in req
    if (name) services[serviceIndex].name = name;
    if (description) services[serviceIndex].description = description;
    if (expectedDuration) services[serviceIndex].expectedDuration = expectedDuration;
    if (priorityLevel !== undefined) services[serviceIndex].priorityLevel = priorityLevel;

    res.json({ message: 'Service updated successfully', service: services[serviceIndex] });
};

exports.deleteService = (req, res) => {
    const serviceId = parseInt(req.params.id);
    const serviceIndex = services.findIndex(s => s.id === serviceId);

    if (serviceIndex === -1) {
        return res.status(404).json({ message: 'Service not found' });
    }

    services.splice(serviceIndex, 1);
    res.json({ message: 'Service deleted successfully' });
};