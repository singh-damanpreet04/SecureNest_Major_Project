import express from 'express';
import axios from 'axios';
import protectRoute from '../middleware/protectRoute.js';

const router = express.Router();

const API_URL = process.env.FAKECHECK_API_URL || 'http://localhost:8000';
const API_KEY = process.env.FAKECHECK_API_KEY;

// Middleware to handle auth errors gracefully
const optionalAuth = async (req, res, next) => {
  try {
    await protectRoute(req, res, next);
  } catch (error) {
    console.log('Auth failed, proceeding without user:', error.message);
    next();
  }
};

router.post('/', optionalAuth, async (req, res) => {
  try {
    console.log('FakeCheck request received:', { 
      url: req.body?.url, 
      text: req.body?.text?.substring(0, 50), 
      scope: req.body?.scope,
      country: req.body?.country 
    });
    const { url, text, scope, country, state } = req.body || {};
    
    // Only require country for national scope
    if (scope === 'national' && !country) {
      return res.status(400).json({ message: 'Country is required for national scope' });
    }
    
    console.log('Calling Python API at:', `${API_URL}/predict`);
    const response = await axios.post(
      `${API_URL}/predict`,
      { url, text, scope, country, state },
      { 
        headers: { 'X-Internal-API-Key': API_KEY },
        timeout: 60000 // 60 second timeout (first request loads model)
      }
    );
    console.log('Python API response received:', response.data.verdict);
    return res.status(200).json(response.data);
  } catch (err) {
    console.error('FakeCheck error:', err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({ 
      message: err.response?.data?.detail || err.response?.data?.message || err.message 
    });
  }
});

router.get('/sources', optionalAuth, async (_, res) => {
  try {
    const response = await axios.get(`${API_URL}/sources`, { 
      headers: { 'X-Internal-API-Key': API_KEY },
      timeout: 10000
    });
    return res.json(response.data);
  } catch (err) {
    console.error('Sources error:', err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({ message: err.response?.data || err.message });
  }
});

export default router;
