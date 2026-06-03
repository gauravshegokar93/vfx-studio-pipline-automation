
import { Project, Sequence, Shot, Task } from '@/lib/types';

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

const MOCK_DELAY = 1500;

export const importService = {
  importBidSheet: async (file: File): Promise<ImportSummary> => {
    // In production, this would use an Excel parser library like 'xlsx'
    // and send the rows to the SQL Server backend via Sequelize.
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    
    const projectId = 'p_new_' + Math.random().toString(36).substr(2, 9);
    
    const projects: Project[] = [{
      id: projectId,
      projectCode: 'VFX_HUB',
      projectName: 'Lumina Studio Project',
      clientName: 'Enterprise Client',
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      status: 'In-Production'
    }];

    const sequences: Sequence[] = [
      { id: 'seq_1', projectId, sequenceCode: '010' },
      { id: 'seq_2', projectId, sequenceCode: '020' }
    ];

    const shots: Shot[] = [
      { id: 'sh_1', projectId, sequenceId: 'seq_1', shotCode: '0010', status: 'Not Started', priority: 'High', dueDate: '2024-07-01', description: 'Hero shot' },
      { id: 'sh_2', projectId, sequenceId: 'seq_1', shotCode: '0020', status: 'In Progress', priority: 'Medium', dueDate: '2024-07-15', description: 'Background extension' },
      { id: 'sh_3', projectId, sequenceId: 'seq_2', shotCode: '0010', status: 'Not Started', priority: 'Critical', dueDate: '2024-08-01', description: 'Complex FX simulation' }
    ];

    const tasks: Task[] = shots.flatMap(shot => ([
      { 
        id: `t_${shot.id}_comp`, 
        shotId: shot.id, 
        pipelineStep: 'Comp', 
        taskName: 'Final Compositing', 
        assignedArtistId: 'u1', 
        leadId: 'l_1', 
        supervisorId: 's_1', 
        bidHours: 24, 
        spentHours: 0, 
        remainingHours: 24, 
        status: 'Not Started', 
        startDate: '', 
        dueDate: shot.dueDate, 
        priority: shot.priority 
      },
      { 
        id: `t_${shot.id}_paint`, 
        shotId: shot.id, 
        pipelineStep: 'Paint', 
        taskName: 'Cleanup', 
        assignedArtistId: '', 
        leadId: 'l_1', 
        supervisorId: 's_1', 
        bidHours: 8, 
        spentHours: 0, 
        remainingHours: 8, 
        status: 'Not Started', 
        startDate: '', 
        dueDate: shot.dueDate, 
        priority: 'Low' 
      }
    ]));

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
