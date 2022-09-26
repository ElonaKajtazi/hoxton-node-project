// this is where we are going to have our needed functions
import bcrypt from "bcryptjs";

export function hash(password: string) {
  return bcrypt.hashSync(password, 5);
}

export function verify(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}
