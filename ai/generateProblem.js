import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function main() {
  // Define the strict format and persona in the System Instruction
  const systemInstruction = `You are a strict CodeChef platform problem generator. Your sole task is to create one single DSA problem and output the result ONLY in the following JSON format. You must not include any other text, markdown fences (like \`\`\`json), or conversational fillers.

The JSON structure must be:
{
  "title": "String",
  "problemStatement": "String",
  "example_tc_input": "String",
  "example_tc_output": "String",
  "hidden_input": "String",
  "expected_output": "String",
  "difficultyLevel": "String", // Must be "Easy", "Medium", or "Hard"
  "tags": "String[]"
}
`;

  // Define the specific constraints for the problem in the User Content
  const userContent = `
    Generate one DSA problem with the following constraints:
    1. The 'example_tc_input' must contain 2 test cases (T=2 as the first line).
    2. The 'hidden_input' must contain 3 to 5 test cases (T=3 to 5 as the first line).
    3. Ensure the 'hidden_input' and 'expected_output' provide a robust set of test cases.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userContent,
    config: {
      systemInstruction: systemInstruction, // Apply the system instruction here
      thinkingConfig: {
        thinkingBudget: 0, // Disables thinking
      },
    },
  });

  let jsonString = response.text.trim();

  // The System Instruction should eliminate markdown fences, but this check remains a good safeguard.
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.substring(7);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.substring(0, jsonString.length - 3);
  }

  jsonString = jsonString.trim();

  try {
    let problem = JSON.parse(jsonString);

    // console.log("🔥 ~ generateProblem.js:54 ~ problem: ", problem);
    return problem;
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    console.error("String that failed to parse:\n", jsonString);
    // You might throw an error here or return a standard error object
    return null;
  }
}
