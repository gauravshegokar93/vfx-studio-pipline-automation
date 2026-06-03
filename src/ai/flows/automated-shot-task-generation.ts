'use server';
/**
 * @fileOverview A Genkit flow for automatically generating a detailed list of pipeline tasks with suggested bid hours for a given shot description.
 *
 * - automatedShotTaskGeneration - A function that handles the automatic task generation process.
 * - AutomatedShotTaskGenerationInput - The input type for the automatedShotTaskGeneration function.
 * - AutomatedShotTaskGenerationOutput - The return type for the automatedShotTaskGeneration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the allowed pipeline steps as per the project proposal.
const PIPELINE_STEPS = [
  'Ingest',
  'Prep',
  'Roto',
  'Paint',
  'Matchmove',
  'CG',
  'Comp',
  'QC',
  'Delivery',
] as const; // Using 'as const' for a tuple type

const AutomatedShotTaskGenerationInputSchema = z.object({
  shotDescription: z
    .string()
    .describe('A high-level description of the shot for which tasks need to be generated.'),
});
export type AutomatedShotTaskGenerationInput = z.infer<typeof AutomatedShotTaskGenerationInputSchema>;

const AutomatedShotTaskGenerationOutputSchema = z.object({
  tasks: z.array(
    z.object({
      pipelineStep: z
        .enum(PIPELINE_STEPS)
        .describe('The pipeline step for this task. Must be one of: Ingest, Prep, Roto, Paint, Matchmove, CG, Comp, QC, Delivery.'),
      taskName:
        z.string().describe('A descriptive name for the task based on the shot description and pipeline step.'),
      suggestedBidHours: z
        .number()
        .positive()
        .describe('The suggested bid hours for this task (e.g., 2, 4, 8, 16, 24).'),
    })
  ).describe('A list of detailed tasks with suggested bid hours for the shot.'),
});
export type AutomatedShotTaskGenerationOutput = z.infer<typeof AutomatedShotTaskGenerationOutputSchema>;

export async function automatedShotTaskGeneration(
  input: AutomatedShotTaskGenerationInput
): Promise<AutomatedShotTaskGenerationOutput> {
  return automatedShotTaskGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedShotTaskGenerationPrompt',
  input: {schema: AutomatedShotTaskGenerationInputSchema},
  output: {schema: AutomatedShotTaskGenerationOutputSchema},
  prompt: `You are an expert VFX Production Manager. Your task is to analyze a high-level shot description and generate a detailed list of pipeline tasks, along with suggested bid hours for each task.

Here are the allowed pipeline steps you MUST use:
${PIPELINE_STEPS.map(step => `- ${step}`).join('\n')}

For each task, provide a descriptive task name and a reasonable estimate for 'suggestedBidHours'. The suggested bid hours should be realistic for common VFX tasks, typically in increments like 2, 4, 8, 16, 24, etc.

Shot Description: {{{shotDescription}}}`,
});

const automatedShotTaskGenerationFlow = ai.defineFlow(
  {
    name: 'automatedShotTaskGenerationFlow',
    inputSchema: AutomatedShotTaskGenerationInputSchema,
    outputSchema: AutomatedShotTaskGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate tasks.');
    }
    return output;
  }
);
