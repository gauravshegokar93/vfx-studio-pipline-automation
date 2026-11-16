// Read real multi-artist records, then exercise the UI and existing API handler
// against an in-memory copy. This test never writes to the database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { sql, config } = require('../backend/config/db');
const clone = value => JSON.parse(JSON.stringify(value));
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
}}).outputText;

async function main() {
  const pool = await sql.connect({ ...config, connectionTimeout: 10000 });
  let fixture;
  try {
    const candidate = await pool.request().query(`SELECT TOP 1 ta.TaskID
      FROM TaskAssignment ta JOIN TaskMaster t ON t.TaskID=ta.TaskID
      WHERE t.IsActive=1 GROUP BY ta.TaskID HAVING COUNT(*)>1 ORDER BY COUNT(*) DESC`);
    assert(candidate.recordset.length, 'Need a task with multiple assigned artists');
    const taskId = candidate.recordset[0].TaskID;
    const result = await pool.request().input('TaskId', sql.BigInt, taskId).query(`
      SELECT * FROM TaskMaster WHERE TaskID=@TaskId;
      SELECT ta.*, u.FullName FROM TaskAssignment ta JOIN UserMaster u ON u.UserId=ta.UserID WHERE ta.TaskID=@TaskId;
      SELECT * FROM TimeLog WHERE TaskID=@TaskId;
      SELECT * FROM TaskAssignmentHistory WHERE TaskID=@TaskId;`);
    fixture = { task: result.recordsets[0][0], assignments: result.recordsets[1], logs: result.recordsets[2], history: result.recordsets[3] };
  } finally { await sql.close(); }

  fixture.assignments.sort((a,b)=>a.FullName.trim().localeCompare(b.FullName.trim(),'en',{sensitivity:'base'}));

  // Execute the real unassign handler using an isolated in-memory SQL adapter.
  async function scenario(withLoggedWork, failure = false) {
    const data = clone(fixture);
    if (withLoggedWork) {
      data.assignments[0].TargetHours = 8;
      data.logs = [{ TaskID: data.task.TaskID, UserID: data.assignments[0].UserID, HoursWorked: 2 }];
    }
    const removed = clone(data.assignments[0]);
    const otherAssignments = clone(data.assignments.slice(1));
    const originalLogs = clone(data.logs);
    const originalHistory = clone(data.history);
    let deletes = 0, refreshes = 0, pendingRefresh;
    class Request {
      constructor() { this.params = {}; }
      input(name, type, value) { this.params[name] = value; return this; }
      async query(query) {
        const p = this.params;
        if (query.includes('SELECT ta.AssignmentID')) return { recordset: data.assignments.filter(a => String(a.AssignmentID) === String(p.AssignmentID)).map(a => ({ ...a, ...data.task, ...a })) };
        if (query.includes('SUM(HoursWorked)')) return { recordset: [{ ActualHours: data.logs.filter(l => String(l.UserID) === String(p.UserID)).reduce((n,l) => n + Number(l.HoursWorked), 0) }] };
        if (query.includes('INSERT INTO TaskAssignmentHistory')) { data.history.push(clone(p)); return {}; }
        if (query.includes('DELETE FROM TaskAssignment')) { deletes++; data.assignments = data.assignments.filter(a => String(a.AssignmentID) !== String(p.AssignmentID)); return {}; }
        if (query.includes('SELECT StatusID FROM TaskAssignment')) return { recordset: data.assignments.map(a => ({ StatusID: a.StatusID })) };
        if (query.includes('UPDATE TaskMaster')) { data.task.StatusID = p.StatusID ?? null; return {}; }
        throw Error('Unexpected SQL: ' + query);
      }
    }
    class Transaction { async begin() {} async commit() {} async rollback() {} }
    const mockSql = { ...sql, connect: async () => ({}), Request, Transaction };
    const routes = [];
    const router = {};
    for (const verb of ['get','post','delete','put','patch']) router[verb] = (path, handler) => routes.push({verb,path,handler});
    const requireBackend = name => {
      if (name === 'express') return { Router: () => router };
      if (name === '../middleware/authMiddleware') return (roles, handler) => handler;
      if (name === '../config/db') return { sql: mockSql, config: {} };
      if (name === '../utils/historyHelper') return {};
      throw Error(name);
    };
    new Function('require','module','exports',fs.readFileSync('backend/routes/assignmentsRoutes.js','utf8'))(requireBackend,{exports:{}},{});
    const handler = routes.find(r => r.verb === 'delete' && r.path === '/:assignmentId').handler;
    const makeTask = () => ({
      ...data.task, id: data.task.TaskID, taskId: Number(data.task.TaskID), taskCode: data.task.TaskCode,
      estimatedHours: Number(data.task.EstimatedHours), estimatedBid: Number(data.task.EstimatedHours)/8,
      assignedArtist: data.assignments[0]?.FullName || null, assignedArtistId: data.assignments[0]?.UserID || null,
      actualHours: data.logs.reduce((n,l) => n + Number(l.HoursWorked),0),
      assignmentsJson: JSON.stringify(data.assignments.map(a => ({
        assignmentId: a.AssignmentID, userId: a.UserID, artistName: a.FullName, targetHours: Number(a.TargetHours), statusId: a.StatusID,
        actualHours: data.logs.filter(l => String(l.UserID) === String(a.UserID)).reduce((n,l)=> n + Number(l.HoursWorked),0),
      }))),
    });
    const initialTask = makeTask();
    let serviceCalls = [];
    const service = {
      getEligibleArtists: async () => fixture.assignments.map(a => ({UserId:a.UserID,FullName:a.FullName})),
      getUsers: async () => [],
      getDepartmentQueue: async () => { refreshes++; if (pendingRefresh) await pendingRefresh; return [makeTask()]; },
      unassignTask: async id => {
        serviceCalls.push(id);
        if (failure) throw Error('Test API rejection');
        let status = 200, response;
        await handler({params:{assignmentId:id},user:{userId:1,roleName:'Super Admin'}}, {
          status(code) { status=code; return this; }, json(body) { response=body; return this; },
        });
        assert.equal(status,200); assert.equal(response.success,true);
        return response;
      },
    };
    // Minimal React hook/JSX adapter executes the actual page's event handlers.
    const state = []; let cursor = 0;
    const react = {
      useState(initial) { const index=cursor++; if (!(index in state)) state[index]=initial;
        return [state[index], value => {state[index]=typeof value==='function'?value(state[index]):value;}]; },
      useEffect() {}, useCallback(fn) { return fn; },
    };
    const jsx = (type,props) => ({type,props:props||{}});
    const searchModule={exports:{}};
    new Function('exports',compile(fs.readFileSync('src/lib/artist-search.ts','utf8')))(searchModule.exports);
    const requireUI = name => {
      if (name==='next/navigation') return {useRouter:()=>({push() {}})};
      if (name==='@/lib/task-navigation') { const nav={}; new Function('exports',compile(fs.readFileSync('src/lib/task-navigation.ts','utf8')))(nav); return nav; }
      if (name==='react') return react;
      if (name==='react/jsx-runtime') return {jsx,jsxs:jsx,Fragment:'Fragment'};
      if (name==='@/services/taskService') return {taskService:service};
      if (name==='@/services/dashboardService') return {dashboardService:{getExecutiveDashboard:async()=>({})}};
      if (name==='@/hooks/use-toast') return {toast() {}};
      if (name==='@/lib/utils') return {cn:(...args)=>args.filter(Boolean).join(' ')};
      if (name==='@/lib/artist-search') return searchModule.exports;
      return new Proxy({}, {get:(_,key)=>String(key)});
    };
    const pageModule={exports:{}};
    new Function('require','module','exports',compile(fs.readFileSync('src/app/department-queue/page.tsx','utf8')))(requireUI,pageModule,pageModule.exports);
    const render=()=>{cursor=0; return pageModule.exports.default();};
    const nodes=(node)=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
    const label=node=>Array.isArray(node)?node.map(label).join(''):node&&typeof node==='object'?label(node.props?.children):String(node??'');
    const findButton=(tree,text)=>nodes(tree).find(n=>n.type==='Button'&&label(n)===text);
    const event={stopPropagation(){}};
    render(); state[0]=[initialTask];
    let tree=render();
    const cell=nodes(tree).find(n=>typeof n.props?.handleOpenAssignModal==='function');
    assert(cell);
    await cell.props.handleOpenAssignModal(event,initialTask);
    tree=render();
    const removeButtons=nodes(tree).filter(n=>n.type==='Button'&&label(n)==='Remove');
    assert.equal(removeButtons.length,data.assignments.length);
    const modal=nodes(tree).find(n=>n.type==='Dialog'&&nodes(n).some(c=>c.props?.['aria-label']==='Search assignment artists by name'));
    assert.equal(modal.props.open,true);
    const remainingBid=tree=>{
      const title=nodes(tree).find(n=>n.type==='p'&&label(n)==='Remaining Bid');
      // The Remaining stat sits next to its numeric paragraph.
      const parent=nodes(tree).find(n=>Array.isArray(n.props?.children)&&n.props.children.includes(title));
      return Number(label(parent.props.children[1]).replace(' Bid',''));
    };
    const before=remainingBid(tree);
    removeButtons.find(b=>String(b.props.onClick).includes('handleOpenUnassignModal')).props.onClick(event);
    tree=render();
    assert.equal(serviceCalls.length,0,'Remove must wait for confirmation');
    const confirm=findButton(tree,'Unassign Artist'); assert(confirm);
    // Cancel leaves all assignments untouched.
    const confirmation=nodes(tree).find(n=>n.type==='Dialog'&&nodes(n).includes(confirm));
    const cancel=findButton(confirmation,'Cancel'); cancel.props.onClick();
    assert.equal(serviceCalls.length,0);
    tree=render(); nodes(tree).find(n=>n.type==='Button'&&label(n)==='Remove').props.onClick(event);
    tree=render();
    let releaseRefresh;
    pendingRefresh=new Promise(resolve=>{releaseRefresh=resolve;});
    const action=findButton(tree,'Unassign Artist').props.onClick();
    // Let the successful API call finish while queue refresh is deliberately held.
    for(let i=0;i<30&&!refreshes&&!failure;i++) await new Promise(resolve=>setImmediate(resolve));
    tree=render();
    if (failure) {
      releaseRefresh(); await action;
      assert.equal(deletes,0); assert.deepEqual(data.assignments,clone(fixture.assignments));
      assert.equal(nodes(render()).filter(n=>n.type==='Button'&&label(n)==='Remove').length,fixture.assignments.length);
    } else {
      assert.equal(nodes(tree).filter(n=>n.type==='Button'&&label(n)==='Remove').length,otherAssignments.length);
      const actual=originalLogs.filter(l=>String(l.UserID)===String(removed.UserID)).reduce((n,l)=>n+Number(l.HoursWorked),0);
      const released=Math.max(0,Number(removed.TargetHours)-actual)/8;
      assert(Math.abs(remainingBid(tree)-before-released)<0.011,'Remaining Bid must immediately restore unworked bid');
      releaseRefresh(); await action;
      assert.equal(deletes,1); assert.deepEqual(serviceCalls,[removed.AssignmentID]);
      assert.deepEqual(data.assignments,otherAssignments);
      assert.deepEqual(data.logs,originalLogs);
      assert.deepEqual(data.history.slice(0,-1),originalHistory);
      assert.equal(data.history.at(-1).AssignmentType,'Unassigned');
      assert.equal(refreshes,1);
      tree=render();
      assert.equal(nodes(tree).filter(n=>n.type==='Button'&&label(n)==='Remove').length,otherAssignments.length);
      assert(Math.abs(remainingBid(tree)-before-released)<0.011);
      const assignmentModal=nodes(tree).find(n=>n.type==='Dialog'&&nodes(n).some(c=>c.props?.['aria-label']==='Search assignment artists by name'));
      assert.equal(assignmentModal.props.open,true);
    }
    console.log(`PASS: ${failure?'API failure preserves assignments':withLoggedWork?'completed work and TimeLogs preserved; only unworked bid restored':'database fixture: one artist removed, other assignments and history preserved'}; task ${data.task.TaskID}, ${fixture.assignments.length} artists`);
  }
  await scenario(false);
  await scenario(true);
  await scenario(false,true);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
