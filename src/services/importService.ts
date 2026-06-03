
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
    rotoCount: number;
    paintCount: number;
    compCount: number;
    cgCount: number;
  };
}

const MOCK_DELAY = 1200;

export const importService = {
  importBidSheet: async (file: File): Promise<ImportSummary> => {
    // Parser Audit Mapping:
    // "Shot Name*" -> Shot.shotCode
    // "EP/Reel*" -> Sequence.sequenceCode
    // "Complexity*" -> Shot.priority (mapped to Low, Medium, High, Critical)
    // "Roto Bid*" -> Task (Step: Roto, Bid: value)
    // "Paint Bid*" -> Task (Step: Paint, Bid: value)
    // "Comp*" -> Task (Step: Comp, Bid: value)
    // "CG*" -> Task (Step: CG, Bid: value)
    // "ETA" -> Task.dueDate / Shot.dueDate
    // "Status" -> Shot.status
    
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

    // Mocking the ACTUAL Excel rows structure as requested for verification
    const rawRows = [
      { "Sr No": 1, "Shot Name*": "SH_0010", "EP/Reel*": "010", "Complexity*": "High", "Roto Bid*": 8, "Paint Bid*": 0, "Comp*": 16, "CG*": 0, "ETA": "2024-08-20", "Status": "Not Started" },
      { "Sr No": 2, "Shot Name*": "SH_0020", "EP/Reel*": "010", "Complexity*": "Medium", "Roto Bid*": 0, "Paint Bid*": 4, "Comp*": 8, "CG*": 0, "ETA": "2024-08-25", "Status": "Not Started" },
      { "Sr No": 3, "Shot Name*": "SH_0030", "EP/Reel*": "020", "Complexity*": "Critical", "Roto Bid*": 0, "Paint Bid*": 0, "Comp*": 24, "CG*": 40, "ETA": "2024-09-10", "Status": "Not Started" },
      { "Sr No": 4, "Shot Name*": "SH_0040", "EP/Reel*": "020", "Complexity*": "Low", "Roto Bid*": 12, "Paint Bid*": 12, "Comp*": 12, "CG*": 0, "ETA": "2024-09-15", "Status": "Not Started" },
    ];

    const sequences: Sequence[] = [];
    const shots: Shot[] = [];
    const tasks: Task[] = [];

    const seqMap = new Map<string, string>();
    let rotoCount = 0;
    let paintCount = 0;
    let compCount = 0;
    let cgCount = 0;

    rawRows.forEach((row, index) => {
      const reelCode = row["EP/Reel*"];
      const shotCode = row["Shot Name*"];
      
      // 1. Manage Sequence
      if (!seqMap.has(reelCode)) {
        const seqId = `seq_${reelCode}`;
        seqMap.set(reelCode, seqId);
        sequences.push({
          id: seqId,
          projectId,
          sequenceCode: reelCode
        });
      }

      // 2. Create Shot
      const shotId = `sh_${projectId}_${index}`;
      shots.push({
        id: shotId,
        projectId,
        sequenceId: seqMap.get(reelCode)!,
        shotCode: shotCode,
        status: row["Status"] || 'Not Started',
        priority: row["Complexity*"] as any,
        dueDate: row["ETA"],
        description: `Imported from ${file.name}`
      });

      // 3. Create Tasks Dynamically based on Bid columns
      const bidConfigs: { step: PipelineStep; bid: number }[] = [
        { step: 'Roto', bid: row["Roto Bid*"] },
        { step: 'Paint', bid: row["Paint Bid*"] },
        { step: 'Comp', bid: row["Comp*"] },
        { step: 'CG', bid: row["CG*"] },
      ];

      bidConfigs.forEach(config => {
        if (config.bid > 0) {
          tasks.push({
            id: `t_${shotId}_${config.step.toLowerCase()}`,
            shotId: shotId,
            pipelineStep: config.step,
            taskName: `${config.step} for ${shotCode}`,
            assignedArtistId: '',
            leadId: 'l1',
            supervisorId: 'sup1',
            bidHours: config.bid,
            spentHours: 0,
            remainingHours: config.bid,
            status: 'Not Started',
            startDate: '',
            dueDate: row["ETA"],
            priority: row["Complexity*"]
          });

          if (config.step === 'Roto') rotoCount++;
          if (config.step === 'Paint') paintCount++;
          if (config.step === 'Comp') compCount++;
          if (config.step === 'CG') cgCount++;
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
        taskCount: tasks.length,
        rotoCount,
        paintCount,
        compCount,
        cgCount
      }
    };
  }
};
