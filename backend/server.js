const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({success: true, message: 'SM Rolling FX Backend Running'});
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/permissions', require('./routes/permissionRoutes'));
app.use('/api/projects', (req,res,next)=>{const router = require('./routes/projectRoutes');return router(req,res,next);});
app.use('/api/departments', require('./routes/departmentsRoutes'));
app.use('/api/teams', require('./routes/teamsRoutes'));
app.use('/api/artists', require('./routes/artistRoutes'));
app.use('/api/clients', require('./routes/clientsRoutes'));
app.use('/api/assets', require('./routes/assetsRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/shots', require('./routes/shotsRoutes'));
app.use('/api/tasks', require('./routes/tasksRoutes'));
app.use('/api/import', require('./routes/importBidSheetRoutes'));
app.use('/api/simple-import', require('./routes/simpleImportRoutes'));
app.use('/api/import-review', require('./routes/importReviewRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leavesRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/sequences', require('./routes/sequencesRoutes'));
app.use('/api/assignments', require('./routes/assignmentsRoutes'));
// const authRoutes = require("./modules/auth");
// const userRoutes = require("./modules/master/user/user.routes");
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
const PORT = process.env.PORT || 5000;

// Log all registered routes
app.listen(PORT, () => {
  console.log('Server running on ' + PORT);
  console.log('\n=== Registered Routes ===');
  app._router?.stack?.forEach((middleware) => {
    if (middleware.route) {
      console.log(middleware.route.methods.alls ? '' : Object.keys(middleware.route.methods).join(',').toUpperCase(), middleware.route.path);
    } else if (middleware.name === 'router' && middleware.handle?.stack) {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(Object.keys(handler.route.methods).join(',').toUpperCase(), handler.route.path);
        }
      });
    }
  });
  console.log('=========================\n');
});
