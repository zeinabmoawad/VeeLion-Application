const HttpError = require('../utils/httpError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  let message = error.message;
  if (statusCode >= 500) {
    message = 'Internal server error';
  } else if (error.type === 'entity.parse.failed') {
    // Don't echo JSON parser internals (e.g. "Unexpected token } in JSON at position 12").
    message = 'Request body is not valid JSON.';
  }

  const response = {
    error: {
      message,
    },
  };

  if (error instanceof HttpError && error.details) {
    response.error.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
