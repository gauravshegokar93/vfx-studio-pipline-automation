'use server';
/**
 * @fileOverview A Genkit flow for summarizing feedback and action items for VFX shots.
 *
 * - reviewFeedbackSummary - A function that generates a concise summary of all accumulated feedback and action items for a given shot.
 * - ReviewFeedbackSummaryInput - The input type for the reviewFeedbackSummary function.
 * - ReviewFeedbackSummaryOutput - The return type for the reviewFeedbackSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VersionFeedbackSchema = z.object({
  versionNumber: z.number().describe('The version number of the asset.'),
  reviewStatus: z.string().describe('The review status of the version (e.g., Approved, Retake, Pending Review).'),
  reviewComment: z.string().describe('The review comment associated with this version.').optional(),
});

const CommentSchema = z.object({
  author: z.string().describe('The author of the comment.').optional(),
  timestamp: z.string().describe('The timestamp when the comment was made.').optional(),
  text: z.string().describe('The actual text content of the comment.'),
});

const ReviewFeedbackSummaryInputSchema = z.object({
  shotId: z.string().describe('The unique identifier of the shot being reviewed.'),
  versions: z.array(VersionFeedbackSchema).describe('A list of all versions associated with the shot, including their review status and comments.'),
  comments: z.array(CommentSchema).describe('A list of all general comments for the shot.'),
});
export type ReviewFeedbackSummaryInput = z.infer<typeof ReviewFeedbackSummaryInputSchema>;

const ReviewFeedbackSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of all accumulated feedback for the shot.'),
  actionItems: z.array(z.string()).describe('A list of identified action items that need to be addressed.'),
  overallSentiment: z.enum(['Positive', 'Neutral', 'Negative']).describe('The overall sentiment of the feedback.'),
});
export type ReviewFeedbackSummaryOutput = z.infer<typeof ReviewFeedbackSummaryOutputSchema>;

export async function reviewFeedbackSummary(input: ReviewFeedbackSummaryInput): Promise<ReviewFeedbackSummaryOutput> {
  return reviewFeedbackSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reviewFeedbackSummaryPrompt',
  input: { schema: ReviewFeedbackSummaryInputSchema },
  output: { schema: ReviewFeedbackSummaryOutputSchema },
  prompt: `You are an AI assistant specialized in summarizing VFX production feedback and extracting action items.

Your task is to analyze the provided versions and comments for a shot and generate a concise summary, a list of actionable items, and an overall sentiment.

Shot ID: {{{shotId}}}

--- Versions Feedback ---
{{#if versions}}
{{#each versions}}
Version Number: {{{versionNumber}}}
Review Status: {{{reviewStatus}}}
{{#if reviewComment}}Review Comment: {{{reviewComment}}}{{/if}}

{{/each}}
{{else}}
No versions feedback available.
{{/if}}

--- General Comments ---
{{#if comments}}
{{#each comments}}
{{#if author}}Author: {{{author}}}{{/if}}
{{#if timestamp}}Timestamp: {{{timestamp}}}{{/if}}
Comment: {{{text}}}

{{/each}}
{{else}}
No general comments available.
{{/if}}

---

Based on the above information, provide:
1. A concise summary of all feedback.
2. A numbered list of clear, actionable items.
3. An overall sentiment (Positive, Neutral, or Negative).
`,
});

const reviewFeedbackSummaryFlow = ai.defineFlow(
  {
    name: 'reviewFeedbackSummaryFlow',
    inputSchema: ReviewFeedbackSummaryInputSchema,
    outputSchema: ReviewFeedbackSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
