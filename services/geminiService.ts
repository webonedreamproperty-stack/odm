const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export const generateReward = async (): Promise<{ code: string; message: string }> => {
  try {
    if (!apiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY");
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a creative reward for a loyalty card. Include a discount code and a congratulatory message.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: {
              type: Type.STRING,
              description: 'A creative, random 8-character alphanumeric discount code.',
            },
            message: {
              type: Type.STRING,
              description: 'A short, funny, cookie-themed congratulatory one-liner.',
            },
          },
          required: ["code", "message"],
        },
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating reward:", error);
    return {
      code: "COOKIE30",
      message: "You're one smart cookie! Enjoy your discount."
    };
  }
};
