'use server';
/**
 * @fileOverview An AI agent that assists in scheduling VFX production tasks.
 *
 * - intelligentSchedulingAssistant - A function that handles the intelligent scheduling process.
 * - IntelligentSchedulingAssistantInput - The input type for the intelligentSchedulingAssistant function.
 * - IntelligentSchedulingAssistantOutput - The return type for the intelligentSchedulingAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentSchedulingAssistantInputSchema = z.object({
  unassignedTasks: z.array(
    z.object({
      id: z.string().describe('Unique ID of the task.'),
      taskName: z.string().describe('Name of the task.'),
      pipelineStep: z.string().describe('The pipeline step this task belongs to (e.g., Roto, Paint).'),
      bidHours: z.number().describe('Estimated hours required to complete the task.'),
      dueDate: z.string().describe('The deadline for the task in YYYY-MM-DD format.'),
      requiredSkills: z.array(z.string()).optional().describe('List of skills required for the task.'),
      description: z.string().optional().describe('A brief description of the task.'),
    })
  ).describe('List of tasks that need to be assigned.'),
  artists: z.array(
    z.object({
      id: z.string().describe('Unique ID of the artist.'),
      name: z.string().describe('Name of the artist.'),
      departmentId: z.string().describe('ID of the department the artist belongs to.'),
      skillSets: z.array(z.string()).optional().describe('List of skills the artist possesses.'),
      availableHoursPerDay: z.number().describe('Number of hours the artist is available to work per day.'),
      currentAssignedTasks: z.array(
        z.object({
          taskId: z.string().describe('ID of an already assigned task.'),
          estimatedHoursRemaining: z.number().describe('Estimated hours remaining on this assigned task.'),
          dueDate: z.string().describe('Due date of the assigned task in YYYY-MM-DD format.'),
        })
      ).optional().describe('List of tasks currently assigned to the artist, with remaining work.'),
      vacationDays: z.array(z.string()).optional().describe('List of dates (YYYY-MM-DD) when the artist is unavailable.'),
    })
  ).describe('List of available artists with their profiles and current workload.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format, to aid in scheduling calculations.'),
});

export type IntelligentSchedulingAssistantInput = z.infer<typeof IntelligentSchedulingAssistantInputSchema>;

const IntelligentSchedulingAssistantOutputSchema = z.object({
  suggestedAssignments: z.array(
    z.object({
      taskId: z.string().describe('The ID of the task to be assigned.'),
      artistId: z.string().describe('The ID of the artist suggested for the task.'),
      suggestedStartDate: z.string().describe('The suggested start date for the task in YYYY-MM-DD format.'),
      suggestedEndDate: z.string().describe('The suggested end date for the task in YYYY-MM-DD format.'),
      rationale: z.string().optional().describe('Explanation for this assignment.'),
    })
  ).describe('List of suggested task assignments for artists.'),
  potentialBottlenecks: z.array(
    z.object({
      type: z.enum(['task', 'artist']).describe('Indicates whether the bottleneck is a task or an artist.'),
      id: z.string().describe('The ID of the task or artist causing the bottleneck.'),
      reason: z.string().describe('Explanation of why this is a bottleneck.'),
    })
  ).describe('Identified potential bottlenecks in the production schedule.'),
  schedulingConflicts: z.array(
    z.object({
      taskIds: z.array(z.string()).describe('IDs of tasks involved in the conflict.'),
      artistIds: z.array(z.string()).describe('IDs of artists involved in the conflict.'),
      conflictReason: z.string().describe('Description of the scheduling conflict.'),
    })
  ).describe('Detected scheduling conflicts.'),
  overallSummary: z.string().describe('A high-level summary of the scheduling recommendations and findings.'),
});

export type IntelligentSchedulingAssistantOutput = z.infer<typeof IntelligentSchedulingAssistantOutputSchema>;

export async function intelligentSchedulingAssistant(input: IntelligentSchedulingAssistantInput): Promise<IntelligentSchedulingAssistantOutput> {
  return intelligentSchedulingAssistantFlow(input);
}

const intelligentSchedulingAssistantPrompt = ai.definePrompt({
  name: 'intelligentSchedulingAssistantPrompt',
  input: { schema: IntelligentSchedulingAssistantInputSchema },
  output: { schema: IntelligentSchedulingAssistantOutputSchema },
  prompt: `You are an expert VFX Production Scheduling Assistant. Your primary goal is to help optimize task assignments for artists based on project bid hours, artist availability, and skill sets. You need to identify potential scheduling conflicts or bottlenecks.

Here is the data:

Unassigned Tasks:
{{{JSON.stringify unassignedTasks true}}}

Artists:
{{{JSON.stringify artists true}}}

Current Date: {{{currentDate}}}

Carefully analyze the unassigned tasks, considering their bid hours, due dates, and required skills. For each artist, review their available hours per day, current assigned tasks (including estimated remaining hours and due dates), and their skill sets. Also, consider any vacation days.

Based on this analysis, provide a set of optimal suggested assignments for the unassigned tasks. For each assignment, propose a suggested start and end date, ensuring that artist workloads are balanced and due dates are met. Provide a brief rationale for each assignment.

Identify any potential bottlenecks, either with specific tasks that are hard to assign or artists who are overbooked or critical for many tasks. Also, point out any scheduling conflicts that arise from existing assignments or your proposed assignments.

Finally, provide an overall summary of your recommendations and findings.

Your output MUST be a JSON object that strictly conforms to the provided schema. Do NOT include any additional text or formatting outside of the JSON.`,
});

const intelligentSchedulingAssistantFlow = ai.defineFlow(
  {
    name: 'intelligentSchedulingAssistantFlow',
    inputSchema: IntelligentSchedulingAssistantInputSchema,
    outputSchema: IntelligentSchedulingAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await intelligentSchedulingAssistantPrompt(input);
    return output!;
  }
);
