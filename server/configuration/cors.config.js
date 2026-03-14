const whitelist = ["http://localhost:3000", "http://localhost:3001", "https://smarti-board.netlify.app"];
const cors_options = {
  origin: function (origin, callback) {
    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin || "");
    if (!origin || whitelist.indexOf(origin) !== -1 || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

module.exports = cors_options;
