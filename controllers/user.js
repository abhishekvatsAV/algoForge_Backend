import bcrypt from "bcrypt";
import { setUser } from "../service/auth.js";
import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

export const handleUserSignUp = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (user) {
    return res.status(400).json({ message: "Email Already Exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const newUser = await prisma.user.create({
    data: {
      email: email,
      passwordHash: hash,
    },
  });

  const token = setUser(newUser);
  return res.status(200).json({
    message: "User has been created succeffully",
    user: newUser,
    token: token,
  });
};

export const handleUserLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email: email },
  });
  if (!user) {
    return res.status(400).json({
      message: "User does not exists or email or password are not correct",
    });
  }

  const match = await bcrypt.compare(password, user.passwordHash);

  if (!match) {
    return res.status(400).json({
      message: "User does not exists or email or password are not correct",
    });
  }

  const token = setUser(user);

  req.token = token;

  return res.status(200).json({ user, token });
};
