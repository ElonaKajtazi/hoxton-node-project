// this is where we are going to have our needed functions
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export function hash(password: string) {
  return bcrypt.hashSync(password, 6);
}

export function verify(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(id: number) {
 return jwt.sign({ id }, process.env.SECRET!);
}
