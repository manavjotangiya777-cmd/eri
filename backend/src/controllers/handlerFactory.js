// Generic controller factory for standard CRUD
const mongoose = require('mongoose');
const catchAsync = fn => (req, res, next) => {
    fn(req, res, next).catch(next);
};

const mapId = exports.mapId = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
    if (obj._id) obj.id = obj._id.toString();

    // Recursively handle common ID fields that might be ObjectIds
    const idFields = ['assigned_to', 'client_id', 'user_id', 'created_by', 'department_id', 'designation_id', 'chat_id', 'sender_id', 'task_id'];
    idFields.forEach(field => {
        if (!obj[field]) return;

        if (typeof obj[field] === 'object') {
            if (obj[field]._id) {
                obj[field] = obj[field]._id.toString();
            } else if (mongoose.Types.ObjectId.isValid(obj[field].toString())) {
                obj[field] = obj[field].toString();
            }
        }
    });

    return obj;
};

exports.getAll = (Model, populateOptions) => catchAsync(async (req, res) => {
    // 1) Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Map 'id' to '_id' for MongoDB filtering
    if (queryObj.id) {
        queryObj._id = queryObj.id;
        delete queryObj.id;
    }

    // Auto-cast strings to ObjectId for fields likely to be foreign keys
    Object.keys(queryObj).forEach(key => {
        const val = queryObj[key];
        if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
            // If key ends with _id or is a known foreign key field
            if (key.endsWith('_id') || ['assigned_to', 'created_by', 'user_id', 'participant_1', 'participant_2', 'sender_id', 'chat_id'].includes(key)) {
                // Use $in to match both ObjectId AND String representation, 
                // because Mixed types might store either.
                queryObj[key] = { $in: [val, new mongoose.Types.ObjectId(val)] };
            }
        }
    });

    // 2) Execution
    let query = Model.find(queryObj);

    // 3) Sorting
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-created_at');
    }

    // 4) Field Limiting
    if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
    }

    // 5) Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    if (populateOptions) query = query.populate(populateOptions);

    const data = await query;
    const mappedData = data.map(mapId);

    // If specifically queried for 1 ID via params/filter, check if we should return object
    if (req.query.id && mappedData.length > 0) {
        return res.status(200).json(mappedData[0]);
    }

    res.status(200).json(mappedData);
});

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res) => {
    const id = req.params.id || req.query.id;
    let query = Model.findById(id);
    if (populateOptions) query = query.populate(populateOptions);

    const data = await query;
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(mapId(data));
});

exports.createOne = (Model) => catchAsync(async (req, res) => {
    const data = await Model.create(req.body);
    res.status(201).json(mapId(data));
});

exports.updateOne = (Model) => catchAsync(async (req, res) => {
    const id = req.params.id || req.query.id;
    const data = await Model.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
    });
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(mapId(data));
});

exports.deleteOne = (Model) => catchAsync(async (req, res) => {
    const id = req.params.id || req.query.id;
    const data = await Model.findByIdAndDelete(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.status(204).json(null);
});
