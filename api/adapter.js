<<<<<<< HEAD
// Vercel's root entrypoint loads the Express application compiled by the build.
module.exports = require('../backend/dist/app').default;
=======
const { default: app } = require('../backend/dist/app');

module.exports = app;
module.exports.config = {
  maxDuration: 30,
};
>>>>>>> 38383959780a839f5a5a877cfd7f471018847d6e
