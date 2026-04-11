import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

export const getAllProblems = async (req, res) => {
  try {
    const userId = req.user.id;
    const allProblems = await prisma.problem.findMany({
      where: { createdById: userId },
    });

    console.log("🔥 ~ allProblems: ", allProblems);

    return res.status(200).json({ problems: allProblems });
  } catch (error) {
    console.error("🔥 ~ error: ", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getProblemById = async (problemID) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemID },
    });
    console.log("🔥 ~ problem: ", problem);
    return problem;
  } catch (error) {
    throw Error("Unable to find this problem");
  }
};

export const getLatestUnsolvedProblemByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    let problem = await prisma.problem.findFirst({
      where: {
        createdById: userId,
        isSolved: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!problem) {
      problem = await prisma.problem.findFirst({
        where: {
          createdById: userId,
          isSolved: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!problem) {
        return res.status(404).json({ message: "No unsolved or solved problem found for this user." });
      }
    }

    return res.status(200).json({ problem });
  } catch (error) {
    console.error("Error fetching latest unsolved problem:", error);
    return res.status(500).json({ message: "Failed to fetch latest unsolved problem." });
  }
};

export const getLatest3Problems = async (req, res) => {
  try {
    const userId = req.user.id;
    const problems = await prisma.problem.findMany({
      where: { createdById: userId },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    });

    return res.status(200).json({ problems });
  } catch (error) {
    console.error("Error fetching latest 3 problems:", error);
    return res.status(500).json({ message: "Failed to fetch problems" });
  }
};

export const deleteProblem = async (req, res) => {
  try {
    const { id: problemID } = req.body;
    const userId = req.user.id;

    const problem = await prisma.problem.delete({
      where: {
        id: problemID,
        createdById: userId,
      },
    });

    if (!problem) {
      return res.status(400).json({ isSuccess: false, error: "Problem is not found." });
    }

    console.log("🔥 ~ problem: ", problem);

    return res.status(200).json({ isSuccess: true, message: "Problem is deleted succeffully" });
  } catch (error) {
    console.log("🔥 ~ error: ", error);
    return res.status(400).json({ isSuccess: false, message: ` Getting Error while Deleting : ${error.message}` });
  }
};
