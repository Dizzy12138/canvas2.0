const DEFAULT_ERROR_CODE = '500_INTERNAL_ERROR';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || inferStatusCode(err) || 500;
  const code = err.code || mapStatusToCode(statusCode);
  const message = err.message || '服务器内部错误';
  const detail = err.detail || extractValidationDetail(err);

  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const payload = {
    error: {
      code,
      message,
      ...(detail ? { detail } : {})
    }
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.error.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

function inferStatusCode(err) {
  if (err.name === 'CastError') {
    return 404;
  }
  if (err.code === 11000) {
    return 409;
  }
  if (err.name === 'ValidationError') {
    return 422;
  }
  return err.statusCode;
}

function mapStatusToCode(statusCode) {
  switch (statusCode) {
    case 400:
      return '400_INVALID_REQUEST';
    case 401:
      return '401_UNAUTHORIZED';
    case 403:
      return '403_FORBIDDEN';
    case 404:
      return '404_NOT_FOUND';
    case 409:
      return '409_CONFLICT';
    case 422:
      return '422_UNPROCESSABLE_ENTITY';
    default:
      return DEFAULT_ERROR_CODE;
  }
}

function extractValidationDetail(err) {
  if (err.name === 'ValidationError') {
    return Object.values(err.errors || {}).map(val => val.message);
  }
  return err.detail;
}

module.exports = errorHandler;