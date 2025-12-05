// filepath: functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Genkit from "genkit";

admin.initializeApp();
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// ----------------------
// Feature Extraction
// ----------------------
function extractFeatures(transactions: number[]) {
  if (transactions.length === 0) {
    return {
      total: 0,
      average: 0,
      frequency: 0,
      max_transaction: 0,
      std_transaction: 0,
    };
  }

  const total = transactions.reduce((sum, t) => sum + t, 0);
  const average = total / transactions.length;
  const frequency = transactions.length;
  const max_transaction = Math.max(...transactions);
  const variance =
    transactions.reduce((sum, t) => sum + (t - average) ** 2, 0) /
    transactions.length;
  const std_transaction = Math.sqrt(variance);

  return {
    total,
    average,
    frequency,
    max_transaction,
    std_transaction,
  };
}

// Cached Genkit client
let genkitClient: any = null;

async function loadModel() {
  if (!genkitClient) {
    genkitClient = (Genkit as any)({
      model: {
        provider: "google",
        name: "gemini-1.5-flash",
      },
    });
  }

  return genkitClient;
}


// ----------------------
// Firebase Function: Predict loan limit
// ----------------------
export const predictLoan = functions.https.onRequest(async (req, res) => {
  try {
    // Allow CORS
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      res.status(400).send({
        error: "Transactions must be an array of numbers.",
      });
      return;
    }

    // Extract features
    const features = extractFeatures(transactions);

    // Load AI model
    const mdl = await loadModel();

    // Predict
    const prediction = await mdl.predict(features);

    res.status(200).send({
      features,
      loanLimit: prediction.loanLimit,
      riskCategory: prediction.riskCategory,
    });
  } catch (error: any) {
    console.error("Prediction error:", error);
    res.status(500).send({ error: error.message });
  }
});
