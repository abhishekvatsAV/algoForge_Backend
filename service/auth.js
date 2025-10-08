import jwt from "jsonwebtoken";
const secret = "secretPass@3";

export const setUser = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
  };

  // below statement will return token
  return jwt.sign(payload, secret, { expiresIn: "3d" });
};

export const getUser = (token) => {
  if (!token) return null;

  try {
    // this will return the payload attach with this token
    // i.e {id, email}
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};
