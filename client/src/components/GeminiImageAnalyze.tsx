// import { useState } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "@/config/firebase";

// const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// export default function GeminiImageAnalyze() {
//   const [image, setImage] = useState<File | null>(null);
//   const [result, setResult] = useState("");
//   const [loading, setLoading] = useState(false);

//   // Convert image → base64
//   const fileToBase64 = (file: File) =>
//     new Promise<string>((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = () =>
//         resolve(reader.result?.toString().split(",")[1] || "");
//       reader.onerror = reject;
//       reader.readAsDataURL(file);
//     });

//   const handleSubmit = async () => {
//     if (!image) {
//       alert("Upload an image first");
//       return;
//     }

//     setLoading(true);
//     setResult("");

//     try {
//       const base64Image = await fileToBase64(image);

//       const model = genAI.getGenerativeModel({
//         model: "gemini-2.5-flash",
//       });

//       const prompt = `
// You are an AI esports tournament analyst for a competitive PUBG Mobile event.

// Analyze the provided match scoreboard image and extract accurate, structured tournament data suitable for a production esports platform.

// Tasks:
// 1. Identify team rankings strictly based on placement shown in the scoreboard.
// 2. For each team, extract:
//    - Team rank
//    - Player names (preserve clan tags, symbols, and special characters exactly as shown)
//    - Individual player kill counts
// 3. Sort players within each team by individual kill count in descending order.
//    - If two players have the same kill count, preserve their original visual order.
// 4. Calculate total team kills as the sum of individual player kills.
// 5. Sort all teams in the final results array by totalKills in descending order.
//    - If two teams have the same totalKills, preserve their original placement order.
// 6. Explicitly include players with zero kills using the value 0.
// 7. Do not infer, auto-correct, normalize, or assume any missing data.

// Output Requirements:
// - Respond ONLY with raw, valid JSON
// - DO NOT wrap the response in \`\`\`json, \`\`\`, or any code block
// - No explanations, markdown, or additional text
// - Use consistent numeric data types
// - Ensure deterministic ordering
// - Maintain esports-grade accuracy suitable for leaderboards, analytics dashboards, and tournament APIs

// Expected JSON structure:
// {
//   "match": "PUBG Mobile",
//   "type": "Squad",
//   "results": [
//     {
//       "rank": 1,
//       "team": "Team 1",
//       "players": [
//         { "name": "PlayerWithMostKills", "kills": 0 }
//       ],
//       "totalKills": 0
//     }
//   ]
// }
// `;

//       const response = await model.generateContent([
//         prompt,
//         {
//           inlineData: {
//             data: base64Image,
//             mimeType: image.type,
//           },
//         },
//       ]);

//       setResult(response.response.text());
//     } catch (err) {
//       console.error(err);
//       setResult("Error generating response");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <input
//         type="file"
//         accept="image/*"
//         onChange={(e) => setImage(e.target.files?.[0] || null)}
//       />

//       <button
//         onClick={handleSubmit}
//         disabled={loading}
//         className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
//       >
//         {loading ? "Analyzing..." : "Submit"}
//       </button>

//       {result && (
//         <div className="mt-4 max-h-64 overflow-auto rounded border p-3 text-sm whitespace-pre-wrap">
//           {result}
//         </div>
//       )}
//     </div>
//   );
// }

// *************************************************************

import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

type GeminiImageAnalyzeProps = {
  tournamentId: string | null;
};

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function GeminiImageAnalyze({
  tournamentId,
}: GeminiImageAnalyzeProps) {
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Convert image → base64
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(reader.result?.toString().split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const prompt = `
You are an AI esports tournament analyst for a competitive PUBG Mobile event.

Analyze the provided match scoreboard image and extract accurate, structured tournament data suitable for a production esports platform.

Tasks:
1. Identify team rankings strictly based on placement shown in the scoreboard.
2. For each team, extract:
   - Team rank
   - Player names (preserve clan tags, symbols, and special characters exactly as shown)
   - Individual player kill counts
3. Sort players within each team by individual kill count in descending order.
   - If two players have the same kill count, preserve their original visual order.
4. Calculate total team kills as the sum of individual player kills.
5. Sort all teams in the final results array by totalKills in descending order.
   - If two teams have the same totalKills, preserve their original placement order.
6. Explicitly include players with zero kills using the value 0.
7. Do not infer, auto-correct, normalize, or assume any missing data.

Output Requirements:
- Respond ONLY with raw, valid JSON
- DO NOT wrap the response in any code block
- No explanations or extra text

Expected JSON structure:
{
  "match": "PUBG Mobile",
  "type": "Squad",
  "results": [
    {
      "rank": 1,
      "team": "Team 1",
      "players": [
        { "name": "PlayerWithMostKills", "kills": 0 }
      ],
      "totalKills": 0
    }
  ]
}
`;

  const handleSubmit = async () => {
    if (!image) {
      alert("Upload an image first");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const base64Image = await fileToBase64(image);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const response = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: image.type,
          },
        },
      ]);

      // 1️⃣ Gemini → string
      const rawText = response.response.text();

      // 2️⃣ string → JS object
      const parsedData = JSON.parse(rawText);

      // 3️⃣ Safety check
      if (!Array.isArray(parsedData.results)) {
        throw new Error("Invalid Gemini response: results must be an array");
      }

      // 4️⃣ Build Firestore document (EXPLICIT STRUCTURE)
      const firestoreDoc = {
        tournamentId,
        matchId: "match_01", // later from UI
        createdAt: serverTimestamp(),
        results: parsedData.results,
      };

      // 5️⃣ Save to Firestore
      await addDoc(collection(db, "tournament_results"), firestoreDoc);

      // 6️⃣ Show saved JSON in UI
      setResult(JSON.stringify(firestoreDoc, null, 2));
    } catch (error) {
      console.error(error);
      setResult("Error analyzing image or saving result");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Submit"}
      </button>

      {result && (
        <div className="mt-4 max-h-64 overflow-auto rounded border p-3 text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
