import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
      Think yourself as a codechef platform problem generator like i want you to create dsa problems and only give me output in json format and the fields will be like this 
      {
        title             String   @db.VarChar(255)
        problemStatement  String
        example_tc_input  String
        example_tc_output String
        hidden_input      String
        expected_output   String
        tags              String[]
      }

      also keep in mind like you have to create 2 example test cases so for that example_tc_input should be like first line will be 2 for 2 testcases these will be shown to the user and then you need to give 3 to 5 hidden input and expected output for those rest of the fields are self explanortory so do give output in json with these fields only no extra field and no name changes of the fields.
    `,
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // Disables thinking
      },
    },
  });
  console.log(response.text);

  let jsonString = response.text.trim();

  // 1. Check for and remove markdown fences (```json ... ```)
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.substring(7); // Remove '```json'
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.substring(0, jsonString.length - 3); // Remove '```'
  }

  // 2. Trim again to remove any extra whitespace/newlines
  jsonString = jsonString.trim();

  try {
    let problem = JSON.parse(jsonString);
    console.log("Problem Data : ", problem);
    return problem;
    // console.log(response.text); // Optional: See original response
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    console.error("String that failed to parse:\n", jsonString);
    return null;
  }
}
