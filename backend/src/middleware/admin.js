import User from "../models/User.js";
import { HttpError } from "../lib/http.js";

// Role is read from the database on every request (not trusted from the
// token), so removing someone's admin access takes effect immediately.
//
// Demo visitors may *look* at the admin area so they can see what it does,
// but every write is refused for them.
export async function adminRead(req, _res, next) {
  const user = await User.findById(req.userId).select("role isDemo").lean();
  if (!user) throw new HttpError(401, "Not authenticated");
  if (user.role !== "admin" && !user.isDemo) throw new HttpError(403, "Admins only");
  req.user = user;
  next();
}

export function adminWrite(req, _res, next) {
  if (req.user?.role !== "admin") {
    throw new HttpError(403, "The demo admin is read-only. Changes are switched off so the shop stays tidy for the next visitor.");
  }
  next();
}
