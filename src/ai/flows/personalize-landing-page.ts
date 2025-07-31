'use server';
/**
 * @fileOverview A flow that personalizes the landing page content based on the user's location.
 *
 * - personalizeLandingPage - A function that personalizes the landing page.
 * - PersonalizeLandingPageInput - The input type for the personalizeLandingPage function.
 * - PersonalizeLandingPageOutput - The return type for the personalizeLandingPage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeLandingPageInputSchema = z.object({
  location: z
    .string()
    .describe('The general location of the user (e.g., city, region).'),
});
export type PersonalizeLandingPageInput = z.infer<
  typeof PersonalizeLandingPageInputSchema
>;

const PersonalizeLandingPageOutputSchema = z.object({
  greeting: z.string().describe('A personalized greeting message.'),
  highlightedContent: z
    .string()
    .describe('Content highlighted based on the user location.'),
});
export type PersonalizeLandingPageOutput = z.infer<
  typeof PersonalizeLandingPageOutputSchema
>;

export async function personalizeLandingPage(
  input: PersonalizeLandingPageInput
): Promise<PersonalizeLandingPageOutput> {
  return personalizeLandingPageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeLandingPagePrompt',
  input: {schema: PersonalizeLandingPageInputSchema},
  output: {schema: PersonalizeLandingPageOutputSchema},
  prompt: `You are an AI assistant specializing in personalizing landing page content based on user location.\n\nBased on the user's location, provide a personalized greeting and highlight relevant content for the BlueRide landing page.\n\nLocation: {{{location}}}\n\nPersonalized Greeting: \nHighlighted Content: `,
});

const personalizeLandingPageFlow = ai.defineFlow(
  {
    name: 'personalizeLandingPageFlow',
    inputSchema: PersonalizeLandingPageInputSchema,
    outputSchema: PersonalizeLandingPageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
