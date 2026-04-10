import {
  getAllProblems,
  getLatest3Problems,
  deleteProblem,
  getLatestUnsolvedProblemByUser,
  getProblemById,
} from "../controllers/problem.js";
import express from "express";
const router = express.Router();

router.get("/allproblems", getAllProblems);
router.get("/getlatestproblem", getLatestUnsolvedProblemByUser);
router.get("/getlatest3", getLatest3Problems);
router.delete("/deleteproblem", deleteProblem);

export default router;
