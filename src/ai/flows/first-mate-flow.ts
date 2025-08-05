
'use server';
/**
 * @fileOverview An AI First Mate to assist boat captains.
 *
 * - getFirstMateBriefing - A function that provides a pre-trip briefing.
 * - FirstMateInput - The input type for the briefing function.
 * - FirstMateOutput - The return type for the briefing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import clientPromise from '@/lib/mongodb';


// Input Schema
export const FirstMateInputSchema = z.object({
  pickup: z.string().describe('The name of the pickup location.'),
  destination: z.string().describe('The name of the destination location.'),
});
export type FirstMateInput = z.infer<typeof FirstMateInputSchema>;

// Output Schema
const CoordinatesSchema = z.object({
    lat: z.number().describe("Latitude of the location."),
    lng: z.number().describe("Longitude of the location.")
});

const RouteSchema = z.object({
    pickup: CoordinatesSchema,
    destination: CoordinatesSchema
});

const WeatherSchema = z.object({
    wind: z.string().describe("Wind conditions, e.g., '10 knots from SW'."),
    waves: z.string().describe("Wave conditions, e.g., '1-2 foot swells'."),
    visibility: z.string().describe("Visibility, e.g., 'Clear, 10+ nautical miles'.")
});

export const FirstMateOutputSchema = z.object({
  route: RouteSchema.describe("The latitude and longitude for the trip's start and end points."),
  weather: WeatherSchema.describe("A realistic marine weather forecast for the area."),
  advice: z.string().describe("Concise, helpful navigation advice for the captain based on the route and weather. Mention any potential hazards or points of interest.")
});
export type FirstMateOutput = z.infer<typeof FirstMateOutputSchema>;

// Tool to get location coordinates from the database
const getLocationCoordinates = ai.defineTool(
    {
        name: 'getLocationCoordinates',
        description: 'Retrieves the latitude and longitude for a given location name from the database.',
        inputSchema: z.object({ locationName: z.string() }),
        outputSchema: CoordinatesSchema,
    },
    async ({ locationName }) => {
        try {
            const client = await clientPromise;
            const db = client.db();
            const location = await db.collection('locations').findOne({ name: locationName });
            if (!location) {
                throw new Error(`Location not found: ${locationName}`);
            }
            return { lat: location.lat, lng: location.lng };
        } catch (error) {
            console.error("Error fetching location from DB:", error);
            throw new Error("Failed to retrieve location data.");
        }
    }
);


// Genkit Prompt
const briefingPrompt = ai.definePrompt({
    name: 'firstMateBriefingPrompt',
    input: { schema: FirstMateInputSchema },
    output: { schema: FirstMateOutputSchema },
    tools: [getLocationCoordinates],
    prompt: `You are an AI First Mate for a water taxi captain in coastal Kenya. Your job is to provide a concise, professional pre-trip briefing.

    The captain will provide a pickup and destination location.
    1.  Use the 'getLocationCoordinates' tool to find the exact latitude and longitude for both the pickup and destination points.
    2.  Based on the route between these points, generate a realistic, localized marine weather forecast for today. Be creative but plausible for the Kenyan coast.
    3.  Provide brief, actionable navigation advice. Note any potential hazards (like shallow areas, reefs, or heavy traffic zones) or interesting landmarks. Keep it under 50 words.

    Return the data in the required JSON format.

    Pickup: {{{pickup}}}
    Destination: {{{destination}}}
    `,
});

// Main exported flow function
export async function getFirstMateBriefing(input: FirstMateInput): Promise<FirstMateOutput> {
    const { output } = await briefingPrompt(input);
    if (!output) {
        throw new Error("The AI First Mate failed to generate a briefing. The model may have returned a null output.");
    }
    return output;
}
