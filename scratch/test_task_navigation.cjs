const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const pure = path => {const exports={}; new Function('exports',compile(path))(exports); return exports;};
const nav=pure('src/lib/task-navigation.ts');
const artistSearch=pure('src/lib/artist-search.ts');
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
const label=node=>Array.isArray(node)?node.map(label).join(''):node&&typeof node==='object'?label(node.props?.children):String(node??'');
const task={id:502,taskId:502,taskCode:'QUEUE-502',taskName:'Task',assignedArtist:'Artist',assignedArtistId:1059,shotCode:'SHOT',estimatedHours:16,stage:'Roto',statusId:1,status:'Assigned',assignmentsJson:'[]',actualHours:0};
function harness(path,{query='',role='Super Admin',user={userId:1059},missing=false}={}) {
  const state=[],effects=[],calls=[]; let cursor=0;
  const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useEffect(fn){effects.push(fn);},useCallback(fn){return fn;}};
  const jsx=(type,props)=>({type,props:props||{}});
  const services=new Proxy({}, {get:(_,method)=>async(...args)=>{
    calls.push({method,args});
    if(method==='getById')return missing?null:task;
    if(method==='getTaskTimeSummary')return null;
    if(method==='getTaskReviewHistory')return {reviews:[],reworks:[]};
    return [];
  }});
  const requireMock=name=>{
    if(name==='react')return react;
    if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'Fragment'};
    if(name==='next/link')return{__esModule:true,default:'Link'};
    if(name==='next/navigation')return{useParams:()=>({id:'502'}),useSearchParams:()=>new URLSearchParams(query),usePathname:()=>'/tasks/502',useRouter:()=>({push:href=>calls.push({method:'push',args:[href]})})};
    if(name==='@/context/AuthContext')return{useAuth:()=>({role,user})};
    if(name==='@/lib/store')return{useLuminaStore:()=>({currentUser:{...user,permissions:['tasks.view','departments.view']}})};
    if(name==='@/lib/task-navigation')return nav;
    if(name==='@/lib/artist-search')return artistSearch;
    if(name==='@/lib/utils')return{cn:(...args)=>args.filter(Boolean).join(' ')};
    if(name==='@/hooks/use-toast')return{useToast:()=>({toast(){}}),toast(){}};
    if(name==='@/services/taskService')return{taskService:services};
    if(name==='@/services/dashboardService')return{dashboardService:{getExecutiveDashboard:async()=>({})}};
    if(name==='@/lib/formatTime')return new Proxy({},{get:()=>()=>''});
    return new Proxy({},{get:(_,key)=>String(key)});
  };
  const module={exports:{}};
  new Function('require','module','exports',compile(path))(requireMock,module,module.exports);
  const component=module.exports.default||module.exports.AppSidebar;
  return{state,effects,calls,render(props){cursor=0;effects.length=0;return component(props);}};
}
async function main(){
  for(const stage of ['all','1','2','3','4']){
    const href=nav.departmentTaskHref(502,stage); const url=new URL(href,'https://local.test');
    assert.equal(url.pathname,'/tasks/502');
    const context=nav.taskNavigationContext(url.searchParams);
    assert.equal(context.workbenchHref,`/department-queue?stage=${stage}`);
    const queue=harness('src/app/department-queue/page.tsx');
    global.window={location:{search:`?stage=${stage}`}};
    global.localStorage={getItem:()=>null};
    queue.render();queue.effects[0]();queue.state[0]=[task];
    const tree=queue.render();
    assert.equal(queue.state[6],stage,'Queue restores selected stage');
    const row=nodes(tree).find(n=>n.type==='TableRow'&&typeof n.props.onClick==='function');assert(row);
    row.props.onClick(); assert.equal(queue.calls.at(-1).args[0],href);
    assert(nodes(tree).some(n=>n.type==='Link'&&n.props.href===href),'Queue detail button preserves source/stage');
  }
  const lead=harness('src/app/department-queue/page.tsx');
  global.window={location:{search:'?stage=3'}};
  global.localStorage={getItem:()=>JSON.stringify({roleName:'Team Lead',departmentName:'Roto'})};
  lead.render();lead.effects[0]();assert.equal(lead.state[6],'1','Existing lead department restriction overrides URL stage');
  for(const role of ['Artist','Team Lead','Super Admin']){
    const signatures=[];
    for(const source of ['', 'source=department-queue&stage=2']){
      const h=harness('src/app/tasks/[id]/page.tsx',{query:source,role});
      h.render(); await h.effects[0](); await new Promise(resolve=>setImmediate(resolve));const tree=h.render();
      assert.deepEqual(h.calls.find(c=>c.method==='getById').args,['502']);
      assert.deepEqual(h.calls.find(c=>c.method==='getTaskTimeSummary').args,['502',role==='Artist'?1059:undefined]);
      const back=nodes(tree).find(n=>n.type==='Link'&&label(n).includes('Back to Workbench'));
      assert.equal(back.props.href,source?'/department-queue?stage=2':'/tasks');
      const sidebar=nodes(tree).find(n=>n.type==='AppSidebar');
      assert.equal(sidebar.props.activePath,source?'/department-queue':undefined);
      signatures.push(nodes(tree).filter(n=>n.type==='Button').map(label));
    }
    assert.deepEqual(...signatures,`${role}: source must not alter role-based actions`);
  }
  for(const query of ['', 'source=department-queue&stage=4']){
    const h=harness('src/app/tasks/[id]/page.tsx',{query,missing:true});
    h.render();await h.effects[0](); await new Promise(resolve=>setImmediate(resolve));
    const back=nodes(h.render()).find(n=>n.type==='Link');
    assert.equal(back.props.href,query?'/department-queue?stage=4':'/tasks');
  }
  const myTasks=harness('src/app/tasks/page.tsx',{role:'Artist'});
  myTasks.render();myTasks.state[0]=[task];myTasks.state[2]=false;
  assert(nodes(myTasks.render()).some(n=>n.type==='Link'&&n.props.href==='/tasks/502'),'My Tasks detail link unchanged');
  const sidebar=harness('src/components/layout/sidebar.tsx');
  for(const activePath of [undefined,'/department-queue']){
    const tree=sidebar.render({activePath});
    const links=nodes(tree).filter(n=>n.type==='Link');
    const active=links.filter(n=>nodes(n).some(c=>c.type==='span'&&c.props.className?.includes('bg-sidebar-accent text-white shadow-sm')));
    assert.deepEqual(active.map(n=>n.props.href),[activePath||'/tasks']);
  }
  assert.equal(nav.taskNavigationContext(new URLSearchParams('source=https://bad.test&stage=2')).workbenchHref,'/tasks');
  assert.equal(nav.taskNavigationContext(new URLSearchParams('source=department-queue&stage=bad')).workbenchHref,'/department-queue?stage=all');
  console.log('PASS: queue row and detail links, all five stages, task ID, return links (including missing task), sidebar context, unchanged My Tasks link and role-based detail behavior, lead stage restriction, invalid context fallback.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
