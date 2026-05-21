// server/src/controllers/redirect.controller.js
import Redirect from "../models/redirectModel.js";

// GET /api/cms/redirects
export const getAll = async (req, res) => {
  try {
    const { search, active } = req.query;
    const query = {};
    if (active === 'true')  query.isActive = true;
    if (active === 'false') query.isActive = false;
    if (search) query.source = { $regex: search, $options: 'i' };

    const redirects = await Redirect.find(query).sort({ createdAt: -1 }).lean();
    res.json({ redirects, total: redirects.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/cms/redirects
export const create = async (req, res) => {
  try {
    const { source, destination, statusCode } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ message: 'Source and destination required' });
    }

    // Check for duplicate source
    const exists = await Redirect.findOne({ source });
    if (exists) {
      return res.status(400).json({ message: `A redirect from "${source}" already exists` });
    }

    const redirect = await Redirect.create({
      source, destination,
      statusCode: statusCode || 301,
      createdBy: req.cmsUser?.email || 'cms',
    });
    res.status(201).json(redirect);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cms/redirects/:id
export const update = async (req, res) => {
  try {
    const { source, destination, statusCode, isActive } = req.body;
    const redirect = await Redirect.findByIdAndUpdate(
      req.params.id,
      { $set: { source, destination, statusCode, isActive } },
      { new: true }
    );
    if (!redirect) return res.status(404).json({ message: 'Redirect not found' });
    res.json(redirect);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/cms/redirects/:id
export const remove = async (req, res) => {
  try {
    await Redirect.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cms/redirects/check?url=/some-path
// Called by website middleware to check if URL needs redirecting
export const check = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.json({ redirect: null });

    const redirect = await Redirect.findOne({ source: url, isActive: true });
    if (!redirect) return res.json({ redirect: null });

    // Increment hit count (fire and forget)
    Redirect.findByIdAndUpdate(redirect._id, { $inc: { hits: 1 } }).exec();

    res.json({
      redirect: {
        destination: redirect.destination,
        statusCode:  redirect.statusCode,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};