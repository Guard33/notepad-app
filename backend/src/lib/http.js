import mongoose from "mongoose";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Validate input with a zod schema; bad input becomes a 400 with the first
// problem spelled out, e.g. "responses: Too small: expected array to have >=2 items".
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw new HttpError(400, `${where}${issue.message}`);
  }
  return result.data;
}

export function isId(value) {
  return mongoose.isValidObjectId(value);
}

// Anything created during a demo session expires with the demo account.
export function demoExpiry(req) {
  return req.demoExpiresAt ? { expiresAt: req.demoExpiresAt } : {};
}
