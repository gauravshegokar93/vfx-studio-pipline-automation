
import { Project, Sequence, Shot, Task, PipelineStep } from '@/lib/types';

export interface ImportSummary {
  projects: Project[];
  sequences: Sequence[];
  shots: Shot[];
  tasks: Task[];
  stats: {
    projectCount: number;
    sequenceCount: number;
    shotCount: number;
    taskCount: number;
  };
}

const MOCK_DELAY = 1200;

export const importService = {
  importBidSheet: async (file: File): Promise<ImportSummary> => {
    // Simulating the parsing of the NTM Bid Sheet structure:
    // Client Shot Name, Shot Name, Type, EPI/Reel, Frame Range, etc.
    // Bids: Roto Bid, Paint Bid, Comp Bid, CG Bid
    
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    
    const projectId = 'p_ntm_' + Math.random().toString(36).substr(2, 5);
    const projectName = file.name.replace(/\.[^/.]+$/, "");
    
    const projects: Project[] = [{
      id: projectId,
      projectCode: 'NTM',
      projectName: projectName || 'NTM Production',
      clientName: 'Client Alpha',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2025-12-31',
      status: 'In-Production'
    }];

    // Mocking rows from the NTM Bid Sheet
    const rawRows = [
      { shotName: 'SH_0010', reel: '010', roto: 8, paint: 0, comp: 16, cg: 0, priority: 'High', eta: '2024-08-20' },
      { shotName: 'SH_0020', reel: '010', roto: 0, paint: 4, comp: 8, cg: 0, priority: 'Medium', eta: '2024-08-25' },
      { shotName: 'SH_0030', reel: '020', roto: 0, paint: 0, comp: 24, cg: 40, priority: 'Critical', eta: '2024-09-10' },
      { shotName: 'SH_0040', reel: '020', roto: 12, paint: 12, comp: 12, cg: 0, priority: 'Low', eta: '2024-09-15' },
    ];

    const sequences: Sequence[] = [];
    const shots: Shot[] = [];
    const tasks: Task[] = [];

    const seqMap = new Map<string, string>();

    rawRows.forEach((row, index) => {
      // 1. Manage Sequence
      if (!seqMap.has(row.reel)) {
        const seqId = `seq_${row.reel}`;
        seqMap.set(row.reel, seqId);
        sequences.push({
          id: seqId,
          projectId,
          sequenceCode: row.reel
        });
      }

      // 2. Create Shot
      const shotId = `sh_${projectId}_${index}`;
      shots.push({
        id: shotId,
        projectId,
        sequenceId: seqMap.get(row.reel)!,
        shotCode: row.shotName,
        status: 'Not Started',
        priority: row.priority as any,
        dueDate: row.eta,
        description: `Imported from ${file.name}`
      });

      // 3. Create Tasks Dynamically based on Bid columns
      const bidConfigs: { step: PipelineStep; bid: number }[] = [
        { step: 'Roto', bid: row.roto },
        { step: 'Paint', bid: row.paint },
        { step: 'Comp', bid: row.comp },
        { step: 'CG', bid: row.cg },
      ];

      bidConfigs.forEach(config => {
        if (config.bid > 0) {
          tasks.push({
            id: `t_${shotId}_${config.step.toLowerCase()}`,
            shotId: shotId,
            pipelineStep: config.step,
            taskName: `${config.step} for ${row.shotName}`,
            assignedArtistId: '', // To be assigned in app
            leadId: 'l1',
            supervisorId: 'sup1',
            bidHours: config.bid,
            spentHours: 0,
            remainingHours: config.bid,
            status: 'Not Started',
            startDate: '',
            dueDate: row.eta,
            priority: row.priority
          });
        }
      });
    });

    return {
      projects,
      sequences,
      shots,
      tasks,
      stats: {
        projectCount: projects.length,
        sequenceCount: sequences.length,
        shotCount: shots.length,
        taskCount: tasks.length
      }
    };
  }
};
