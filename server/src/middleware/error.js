/** Throwable API error with an HTTP status. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (req, res) =>
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    error: err.code || (status >= 500 ? 'server_error' : 'request_error'),
    message: status >= 500 ? 'Something went wrong.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
