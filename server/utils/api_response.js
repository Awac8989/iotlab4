const sendSuccess = (res, message, data = {}, status = 200) => {
  return res.status(status).json({
    error: false,
    message,
    data,
  });
};

const sendError = (res, message, data = {}, status = 400) => {
  return res.status(status).json({
    error: true,
    message,
    data,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
