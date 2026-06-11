/**
 * Standardised API response helper.
 * Always returns { success, message, data, meta } shape.
 */
class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created', data = null) {
    return this.success(res, 201, message, data);
  }

  static paginated(res, message, data, page, limit, total, extraMeta = {}) {
    return this.success(res, 200, message, data, {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
      ...extraMeta,
    });
  }
}

module.exports = ApiResponse;
