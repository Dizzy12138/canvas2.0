function sendError(res, statusCode, code, message, detail) {
    return res.status(statusCode).json({
      error: { code, message, detail },
    });
  }
  
  module.exports = { sendError };
