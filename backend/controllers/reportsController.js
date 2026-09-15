const authMiddleware = require('../middleware/authMiddleware');
const { 
  getDashboardData, 
  getDepartmentProgressReport, 
  getArtistWorkloadReport, 
  getOverdueTasksReport,
  getAnalyticsReport
} = require('../services/reportsService');

const secured = (handler) => authMiddleware(['dashboard.view', 'reports.view', 'Production Head', 'Department Supervisor', 'Lead', 'Artist', 'Super Admin', 'Admin'], handler);

async function getExecutiveDashboard(req, res) {
  try {
    const { projectId, dateRange, startDate, endDate } = req.query || {};
    const data = await getDashboardData({ projectId, dateRange, startDate, endDate });
    return res.json(data);
  } catch (error) {
    console.error('[getExecutiveDashboard] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch executive dashboard overview data',
      error: error.message
    });
  }
}

async function getDepartmentProgress(req, res) {
  try {
    const { projectId, dateRange, startDate, endDate } = req.query || {};
    const data = await getDepartmentProgressReport({ projectId, dateRange, startDate, endDate });
    return res.json(data);
  } catch (error) {
    console.error('[getDepartmentProgress] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch department progress report',
      error: error.message
    });
  }
}

async function getArtistWorkload(req, res) {
  try {
    const { departmentId, searchQuery } = req.query || {};
    const data = await getArtistWorkloadReport({ departmentId, searchQuery });
    return res.json(data);
  } catch (error) {
    console.error('[getArtistWorkload] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch artist workload report',
      error: error.message
    });
  }
}

async function getOverdueTasks(req, res) {
  try {
    const { projectId, stageId } = req.query || {};
    const data = await getOverdueTasksReport({ projectId, stageId });
    return res.json(data);
  } catch (error) {
    console.error('[getOverdueTasks] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue tasks report',
      error: error.message
    });
  }
}

async function getAnalytics(req, res) {
  try {
    const { projectId, stageId, artistId, dateRange, startDate, endDate } = req.query || {};

    if (stageId && stageId !== 'all' && isNaN(parseInt(stageId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid stageId parameter. Must be an integer or "all".' });
    }
    if (artistId && artistId !== 'all' && isNaN(parseInt(artistId, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid artistId parameter. Must be an integer or "all".' });
    }

    const data = await getAnalyticsReport({ projectId, stageId, artistId, dateRange, startDate, endDate });
    return res.json(data);
  } catch (error) {
    console.error('[getAnalytics] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch studio analytics data',
      error: error.message
    });
  }
}

module.exports = {
  getExecutiveDashboard: secured(getExecutiveDashboard),
  getDepartmentProgress: secured(getDepartmentProgress),
  getArtistWorkload: secured(getArtistWorkload),
  getOverdueTasks: secured(getOverdueTasks),
  getAnalytics: secured(getAnalytics)
};

