const express = require('express');
const router = express.Router();
const { 
  getExecutiveDashboard, 
  getDepartmentProgress, 
  getArtistWorkload, 
  getOverdueTasks,
  getAnalytics,
  getEmployeePerformance
} = require('../controllers/reportsController');

router.get('/dashboard', getExecutiveDashboard);
router.get('/department-progress', getDepartmentProgress);
router.get('/artist-workload', getArtistWorkload);
router.get('/overdue-tasks', getOverdueTasks);
router.get('/analytics', getAnalytics);
router.get('/employee-performance/:artistId', getEmployeePerformance);

module.exports = router;
