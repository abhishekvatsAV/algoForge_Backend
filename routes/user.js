import { handleUserLogin, handleUserSignUp } from "../controllers/user.js";

import express from 'express';
const router = express.Router();

router.post("/signup", handleUserSignUp);
router.post("/login", handleUserLogin);

export default router;
