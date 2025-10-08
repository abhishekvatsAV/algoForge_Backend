import { getUser } from "../service/auth.js";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const checkAuth = async (req, res, next) => {
  // bearer token (jwt token) will be present in the header of the request
  const authHeader = req.header("Authorization");
  req.user = null;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(400).json({ message: "Login First!!" });
  }

  const token = authHeader.split(" ")[1];
  const user = getUser(token);

  if (!user || !user.id) {
    return res.status(400).json({ message: "Invalid Token." });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: Number(user.id) },
  });

  if (!dbUser) {
    return res.status(403).json({ message: "User Doesn't Exist." });
  }

  req.user = dbUser; // attaching user for next api's
  next();
};
