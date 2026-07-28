import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { supabase } from "../config/supabase";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, password_hash, role, is_active")
    .eq("email", String(email).toLowerCase().trim())
    .maybeSingle();

  if (error) throw new ApiError(500, "Failed to look up user.", error.message);
  if (!user) throw new ApiError(401, "Invalid email or password.");
  if (!user.is_active) throw new ApiError(403, "This account has been deactivated.");

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new ApiError(401, "Invalid email or password.");

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    user: payload,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ success: true, user: req.user });
});
