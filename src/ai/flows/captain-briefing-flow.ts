
'use server';
/**
 * @fileOverview An AI flow that calls an external webhook to get a captain's pre-trip briefing.
 *
 * - getCaptainBriefing - A function that calls the n8n webhook.
 * - CaptainBriefingInput - The input type for the function.
 * - CaptainBriefingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the flow
const CaptainBriefingInputSchema = z.object({
  lat: z.number().describe("The latitude of the pickup location."),
  long: z.number().describe("The longitude of the pickup location."),
  destination: z.string().describe("The name of the destination."),
});
export type CaptainBriefingInput = z.infer<typeof CaptainBriefingInputSchema>;

// Define the expected output schema from the webhook, which is an object with a single "output" string.
const CaptainBriefingOutputSchema = z.object({
  output: z.string().describe("The full text output from the AI agent."),
});
export type CaptainBriefingOutput = z.infer<typeof CaptainBriefingOutputSchema>;

// Define the Genkit flow
const captainBriefingFlow = ai.defineFlow(
  {
    name: 'captainBriefingFlow',
    inputSchema: CaptainBriefingInputSchema,
    outputSchema: CaptainBriefingOutputSchema,
  },
  async (input) => {
    const webhookUrl = 'https://zackoshy.app.n8n.cloud/webhook/captainfeedback';
    const username = 'zack';
    const password = 'edwin123';

    // The webhook expects an array with a single object
    const payload = [
        {
            lat: input.lat,
            long: input.long,
            destination: input.destination,
        }
    ];

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Webhook error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`The AI agent returned an error: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Add robust validation for the response from the n8n webhook.
      if (!Array.isArray(responseData) || responseData.length === 0) {
          console.error("Webhook response is not a valid array or is empty:", responseData);
          throw new Error("The AI agent returned an empty or invalid response format.");
      }

      const result = responseData[0];
      
      // Validate the result against our Zod schema
      const parsed = CaptainBriefingOutputSchema.safeParse(result);

      if (parsed.success) {
          return parsed.data;
      } else {
          console.error("Zod validation failed:", parsed.error.flatten());
          throw new Error("The AI agent's response did not match the expected format.");
      }

    } catch (error) {
      console.error('Error calling captain briefing webhook:', error);
      // Check if it's a known error type, otherwise throw a generic message
      if (error instanceof z.ZodError || (error instanceof Error && error.message.startsWith('The AI agent'))) {
          throw error;
      }
      throw new Error('An internal error occurred while contacting the AI agent.');
    }
  }
);

// Export a wrapper function to be called from the UI
export async function getCaptainBriefing(input: CaptainBriefingInput): Promise<CaptainBriefingOutput> {
  return captainBriefingFlow(input);
}
