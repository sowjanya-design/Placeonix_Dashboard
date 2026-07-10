/*
 * Placeonix Hub — Learning & schedule: mock interviews, alumni, office hours, dashboard,
 * courses, student "My Learning", attendance, placement drives, bulk import.
 * Part of the dashboard app; loaded after core.js (see the HTML).
 */
// ───────────────────────── MOCK INTERVIEWS ─────────────────────────
async function renderMockInterviews(role){
  var res = await apiFetch('/mock-interviews').catch(function(){ return {data:[]}; });
  var mocks = res.data || [];
  var canManage = role==='admin'||role==='mentor';
  var done = mocks.filter(function(m){ return m.status==='completed' && m.overallScore!=null; });
  var avg = done.length ? Math.round(done.reduce(function(a,m){return a+m.overallScore;},0)/done.length) : null;
  var trend = '';
  if(role==='student' && done.length>=2){
    var first=done[done.length-1].overallScore, last=done[0].overallScore, diff=last-first;
    trend = '<div class="stat-card"><div class="stat-ico" style="background:'+(diff>=0?'#d1fae5':'#fee2e2')+'">'+(diff>=0?'&#128200;':'&#128201;')+'</div><div><div class="stat-v">'+(diff>=0?'+':'')+diff+'</div><div class="stat-l">Improvement</div></div></div>';
  }
  var head = '<div class="section-head"><span class="section-title">Mock Interviews</span>'+(canManage?'<button class="continue-btn" onclick="scheduleMock()">+ Schedule Mock</button>':'')+'</div>';
  var stats = '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'+
    '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-lt)">&#127908;</div><div><div class="stat-v">'+mocks.length+'</div><div class="stat-l">Total</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#9989;</div><div><div class="stat-v">'+done.length+'</div><div class="stat-l">Completed</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#fef3c7">&#11088;</div><div><div class="stat-v">'+(avg!=null?avg+'/100':'—')+'</div><div class="stat-l">Avg Score</div></div></div>'+trend+'</div>';
  if(!mocks.length) return head+stats+'<div style="padding:2rem;text-align:center;color:var(--muted)">No mock interviews yet.</div>';
  var rows = mocks.map(function(m){
    var s=m.student||{}; var sn=((s.firstName||'')+' '+(s.lastName||'')).trim();
    var stc = m.status==='completed'?'b-active':m.status==='cancelled'?'b-due':'b-pending';
    var score = m.overallScore!=null?'<span style="font-weight:800;color:var(--purple)">'+m.overallScore+'/100</span> ':'';
    var who = role==='student' ? (m.role||m.type||'Interview') : escHtml(sn||'Student');
    var btn = canManage ? '<button class="continue-btn" style="padding:.4rem .8rem;font-size:.74rem" onclick="recordMock(\''+m._id+'\')">'+(m.status==='completed'?'Edit Feedback':'Record Feedback')+'</button>'
      : (m.status==='completed'?'<button class="continue-btn" style="padding:.4rem .8rem;font-size:.74rem;background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="viewMockFeedback(\''+m._id+'\')">View Feedback</button>':'');
    return '<div class="course-row">'+
      '<div class="stat-ico" style="background:#ede9fe;color:var(--purple);font-weight:800;width:44px;height:44px">&#127908;</div>'+
      '<div class="course-info"><div class="course-name">'+escHtml(m.title||'Mock Interview')+' '+score+'</div>'+
      '<div class="course-desc">'+who+' &bull; '+(m.type||'technical')+' &bull; '+fmtDate(m.scheduledAt)+'</div></div>'+
      '<span class="badge '+stc+'">'+(m.status||'scheduled')+'</span>'+btn+
      (canManage?'<button class="continue-btn" style="padding:.4rem .7rem;font-size:.74rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteMock(\''+m._id+'\')">Delete</button>':'')+
    '</div>';
  }).join('');
  return head+stats+'<div class="course-list">'+rows+'</div>';
}
async function scheduleMock(){
  var students;
  if(_demoMode){ students=[{value:'demo',label:'Arjun Reddy'}]; }
  else if(currentRole==='mentor'){
    students=[];
    try{ var r=await apiFetch('/users/my-students'); var seen={}; ((r.data&&r.data.students)||[]).forEach(function(e){ var s=e.student; if(s&&s._id&&!seen[s._id]){ seen[s._id]=1; students.push({value:s._id,label:((s.firstName||'')+' '+(s.lastName||'')).trim()||'Student'}); } }); }catch(e){}
    if(!students.length){ toast('No students assigned to you yet. Enroll students into your batch first.','info'); return; }
  }
  else { students = await loadOptions('/users?role=student&limit=300',fullName); }
  // Admins can assign a mentor as the interviewer so it shows in that mentor's list.
  var interviewerField = [];
  if(currentRole==='admin' && !_demoMode){
    var mentors = await loadOptions('/users?role=mentor&limit=100',fullName);
    interviewerField = [{name:'interviewer',label:'Interviewer (mentor)',type:'select',placeholder:'Assign a mentor (optional)',options:mentors}];
  }
  formModal({ title:'Schedule Mock Interview', submitLabel:'Schedule',
    fields:[
      {name:'student',label:'Student',type:'select',required:true,placeholder:'Select student…',options:students}
    ].concat(interviewerField).concat([
      {name:'title',label:'Title',required:true,placeholder:'e.g. Technical Round — Full Stack'},
      {name:'role',label:'Target Role',placeholder:'Full Stack Developer'},
      {name:'company',label:'Target Company (optional)'},
      {name:'type',label:'Type',type:'select',value:'technical',options:[{value:'technical',label:'Technical'},{value:'hr',label:'HR'},{value:'aptitude',label:'Aptitude'},{value:'group-discussion',label:'Group Discussion'},{value:'system-design',label:'System Design'}]},
      {name:'scheduledAt',label:'Date & Time',type:'datetime-local',required:true},
      {name:'mode',label:'Mode',type:'select',value:'online',options:[{value:'online',label:'Online'},{value:'offline',label:'Offline'}]},
      {name:'meetingLink',label:'Meeting Link (optional)'}
    ]),
    onSubmit:async function(v){
      if(v.interviewer==='') delete v.interviewer;
      if(_demoMode){ toast('Mock interview scheduled (demo)','success'); return refreshPage(); }
      await apiFetch('/mock-interviews',{method:'POST',body:JSON.stringify(v)});
      toast('Mock interview scheduled','success'); refreshPage();
    }
  });
}
async function recordMock(id){
  var m={};
  if(!_demoMode){ try{ m=((await apiFetch('/mock-interviews')).data||[]).filter(function(x){return String(x._id)===String(id);})[0]||{}; }catch(e){} }
  formModal({ title:'Record Feedback', submitLabel:'Save',
    fields:[
      {name:'status',label:'Status',type:'select',value:m.status||'completed',options:[{value:'completed',label:'Completed'},{value:'scheduled',label:'Scheduled'},{value:'cancelled',label:'Cancelled'}]},
      {name:'overallScore',label:'Overall Score (0-100)',type:'number',value:m.overallScore!=null?m.overallScore:''},
      {name:'strengths',label:'Strengths',type:'textarea',value:m.strengths||''},
      {name:'improvements',label:'Areas to Improve',type:'textarea',value:m.improvements||''},
      {name:'notes',label:'Notes',type:'textarea',value:m.notes||''}
    ],
    onSubmit:async function(v){
      v.overallScore = v.overallScore===''?null:Number(v.overallScore);
      if(_demoMode){ toast('Feedback saved (demo)','success'); return refreshPage(); }
      await apiFetch('/mock-interviews/'+id,{method:'PATCH',body:JSON.stringify(v)});
      toast('Feedback saved','success'); refreshPage();
    }
  });
}
async function viewMockFeedback(id){
  try{
    var m=((await apiFetch('/mock-interviews')).data||[]).filter(function(x){return String(x._id)===String(id);})[0]||{};
    var body='<div style="font-size:.85rem;line-height:1.7">'+
      (m.overallScore!=null?'<div style="font-size:1.4rem;font-weight:800;color:var(--purple);margin-bottom:.6rem">'+m.overallScore+'/100</div>':'')+
      (m.strengths?'<div style="margin-bottom:.6rem"><b>&#9989; Strengths</b><br>'+escHtml(m.strengths)+'</div>':'')+
      (m.improvements?'<div style="margin-bottom:.6rem"><b>&#128161; Improve</b><br>'+escHtml(m.improvements)+'</div>':'')+
      (m.notes?'<div><b>&#128221; Notes</b><br>'+escHtml(m.notes)+'</div>':'')+
      (m.overallScore==null&&!m.strengths?'<div style="color:var(--muted)">Feedback not recorded yet.</div>':'')+
    '</div>';
    _buildModal('Feedback — '+escHtml(m.title||'Mock'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
  }catch(e){ toast(e.message,'error'); }
}
function deleteMock(id){
  confirmModal('Delete Mock Interview','Remove this mock interview?','Delete',async function(){
    if(_demoMode){ toast('Removed (demo)','success'); return refreshPage(); }
    await apiFetch('/mock-interviews/'+id,{method:'DELETE'});
    toast('Removed','success'); refreshPage();
  });
}
// ───────────────────────── ALUMNI SHOWCASE ─────────────────────────
async function renderAlumni(role){
  var res=await apiFetch('/alumni').catch(function(){return {data:[]};});
  var items=res.data||[];
  var canManage=role==='admin';
  var head='<div class="section-head"><span class="section-title">Alumni &amp; Success Stories</span>'+(canManage?'<button class="continue-btn" onclick="addAlumni()">+ Add Alumni</button>':'')+'</div>';
  if(!items.length) return head+'<div style="padding:2rem;text-align:center;color:var(--muted)">No alumni added yet.'+(canManage?' Showcase your placed students here.':'')+'</div>';
  var cards=items.map(function(a){
    var init=(a.name||'?')[0].toUpperCase();
    var av=a.photo?'<img src="'+escHtml(a.photo)+'" style="width:54px;height:54px;border-radius:14px;object-fit:cover" onerror="this.outerHTML=\'<div style=&quot;width:54px;height:54px;border-radius:14px;background:var(--purple-lt);color:var(--purple);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem&quot;>'+init+'</div>\'"/>':'<div style="width:54px;height:54px;border-radius:14px;background:var(--purple-lt);color:var(--purple);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem">'+init+'</div>';
    var pkg=a.packageLPA?' &bull; <span style="font-weight:800;color:#059669">&#8377;'+a.packageLPA+' LPA</span>':'';
    var manage=canManage?'<div style="display:flex;gap:.4rem;margin-top:.6rem"><button class="continue-btn" style="padding:.3rem .7rem;font-size:.7rem;background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editAlumni(\''+a._id+'\')">Edit</button><button class="continue-btn" style="padding:.3rem .7rem;font-size:.7rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteAlumni(\''+a._id+'\')">Delete</button></div>':'';
    return '<div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:1.1rem;'+(a.featured?'box-shadow:0 0 0 2px var(--purple-lt)':'')+'">'+
      '<div style="display:flex;gap:.9rem;align-items:center">'+av+'<div style="min-width:0"><div style="font-weight:800;color:var(--ink)">'+escHtml(a.name)+(a.featured?' <span style="font-size:.58rem;background:var(--purple-lt);color:var(--purple);padding:1px 6px;border-radius:6px;vertical-align:middle;font-weight:800">FEATURED</span>':'')+'</div>'+
      '<div style="font-size:.8rem;color:var(--muted)">'+escHtml([a.role,a.company].filter(Boolean).join(' @ '))+'</div>'+
      '<div style="font-size:.74rem;color:var(--muted)">'+escHtml([a.course,a.placedYear].filter(Boolean).join(' • '))+pkg+'</div></div></div>'+
      (a.testimonial?'<div style="font-size:.82rem;color:var(--ink2);line-height:1.6;margin-top:.7rem;font-style:italic">“'+escHtml(a.testimonial)+'”</div>':'')+
      (a.linkedIn?'<a href="'+escHtml(a.linkedIn)+'" target="_blank" style="font-size:.74rem;color:var(--purple);font-weight:700;text-decoration:none;display:inline-block;margin-top:.5rem">View LinkedIn &rarr;</a>':'')+
      manage+
    '</div>';
  }).join('');
  return head+'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">'+cards+'</div>';
}
function _alumniForm(title,initial,onSubmit){
  initial=initial||{};
  formModal({title:title,submitLabel:'Save',fields:[
    {name:'name',label:'Name',value:initial.name||'',required:true},
    {name:'company',label:'Company',value:initial.company||'',required:true},
    {name:'role',label:'Role',value:initial.role||'',placeholder:'Software Engineer'},
    {name:'packageLPA',label:'Package (LPA)',type:'number',value:initial.packageLPA||''},
    {name:'course',label:'Course / Program',value:initial.course||''},
    {name:'batch',label:'Batch',value:initial.batch||''},
    {name:'placedYear',label:'Placed Year',type:'number',value:initial.placedYear||''},
    {name:'photo',label:'Photo URL (optional)',value:initial.photo||''},
    {name:'linkedIn',label:'LinkedIn URL (optional)',value:initial.linkedIn||''},
    {name:'testimonial',label:'Testimonial',type:'textarea',value:initial.testimonial||''},
    {name:'featured',label:'Feature on showcase?',type:'select',value:initial.featured?'yes':'no',options:[{value:'no',label:'No'},{value:'yes',label:'Yes'}]}
  ],onSubmit:onSubmit});
}
function _alumniPayload(v){ v.packageLPA=v.packageLPA?Number(v.packageLPA):undefined; v.placedYear=v.placedYear?Number(v.placedYear):undefined; v.featured=v.featured==='yes'; return v; }
function addAlumni(){
  _alumniForm('Add Alumni',{},async function(v){ v=_alumniPayload(v);
    if(_demoMode){toast('Alumni added (demo)','success');return refreshPage();}
    await apiFetch('/alumni',{method:'POST',body:JSON.stringify(v)}); toast('Alumni added','success');refreshPage();
  });
}
async function editAlumni(id){
  var a={}; if(!_demoMode){try{a=((await apiFetch('/alumni')).data||[]).filter(function(x){return String(x._id)===String(id);})[0]||{};}catch(e){}}
  _alumniForm('Edit Alumni',a,async function(v){ v=_alumniPayload(v);
    if(_demoMode){toast('Saved (demo)','success');return refreshPage();}
    await apiFetch('/alumni/'+id,{method:'PATCH',body:JSON.stringify(v)}); toast('Alumni updated','success');refreshPage();
  });
}
function deleteAlumni(id){
  confirmModal('Delete Alumni','Remove this alumni profile?','Delete',async function(){
    if(_demoMode){toast('Removed (demo)','success');return refreshPage();}
    await apiFetch('/alumni/'+id,{method:'DELETE'}); toast('Removed','success');refreshPage();
  });
}
// ───────────────────────── OFFICE HOURS ─────────────────────────
async function renderOfficeHours(role){
  var res=await apiFetch('/office-hours').catch(function(){return {data:[]};});
  var slots=res.data||[];
  if(role==='mentor'||role==='admin'){
    var head='<div class="section-head"><span class="section-title">Office Hours</span>'+(role==='mentor'?'<button class="continue-btn" onclick="addSlot()">+ Add Slot</button>':'')+'</div>';
    if(!slots.length) return head+'<div style="padding:2rem;text-align:center;color:var(--muted)">No slots yet.'+(role==='mentor'?' Add availability for students to book 1:1 time.':'')+'</div>';
    var rows=slots.map(function(s){
      var when=fmtDate(s.startTime)+' '+fmtTime(s.startTime)+(s.endTime?'–'+fmtTime(s.endTime):'');
      var booked=s.status==='booked';
      var who=booked&&s.bookedBy?((s.bookedBy.firstName||'')+' '+(s.bookedBy.lastName||'')).trim():'';
      var ment=role==='admin'&&s.mentor?(' • '+((s.mentor.firstName||'')+' '+(s.mentor.lastName||'')).trim()):'';
      return '<div class="course-row"><div class="stat-ico" style="background:'+(booked?'#fef3c7':'#d1fae5')+';width:42px;height:42px">'+(booked?'&#128197;':'&#9989;')+'</div>'+
        '<div class="course-info"><div class="course-name">'+escHtml(s.topic||'Office Hour')+'</div><div class="course-desc">'+when+' • '+(s.mode||'online')+ment+(booked?' • Booked by '+escHtml(who):'')+'</div></div>'+
        '<span class="badge '+(booked?'b-pending':'b-active')+'">'+s.status+'</span>'+
        (role==='mentor'?'<button class="continue-btn" style="padding:.4rem .7rem;font-size:.72rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteSlot(\''+s._id+'\')">Delete</button>':'')+
      '</div>';
    }).join('');
    return head+'<div class="course-list">'+rows+'</div>';
  }
  var avail=slots.filter(function(s){return s.status==='available';});
  var mine=slots.filter(function(s){return s.status==='booked';});
  var head='<div class="section-head"><span class="section-title">Book Office Hours</span></div>';
  var mineHtml=mine.length?'<div class="learn-sec-title">Your Bookings</div><div class="course-list" style="margin-bottom:1.3rem">'+mine.map(function(s){
    var m=s.mentor||{}; var when=fmtDate(s.startTime)+' '+fmtTime(s.startTime);
    return '<div class="course-row"><div class="stat-ico" style="background:#ede9fe;width:42px;height:42px">&#128197;</div><div class="course-info"><div class="course-name">'+escHtml(s.topic||'Office Hour')+'</div><div class="course-desc">with '+escHtml(((m.firstName||'')+' '+(m.lastName||'')).trim())+' • '+when+' • '+(s.mode||'online')+'</div></div>'+(s.meetingLink&&s.mode==='online'?'<a href="'+escHtml(s.meetingLink)+'" target="_blank" class="continue-btn" style="text-decoration:none">Join</a>':'')+'<button class="continue-btn" style="padding:.4rem .7rem;font-size:.72rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="cancelBooking(\''+s._id+'\')">Cancel</button></div>';
  }).join('')+'</div>':'';
  var availHtml=avail.length?'<div class="learn-sec-title">Available Slots</div><div class="course-list">'+avail.map(function(s){
    var m=s.mentor||{}; var when=fmtDate(s.startTime)+' '+fmtTime(s.startTime);
    return '<div class="course-row"><div class="stat-ico" style="background:#d1fae5;width:42px;height:42px">&#9989;</div><div class="course-info"><div class="course-name">'+escHtml(s.topic||'Office Hour')+'</div><div class="course-desc">with '+escHtml(((m.firstName||'')+' '+(m.lastName||'')).trim())+' • '+when+' • '+(s.mode||'online')+'</div></div><button class="continue-btn" onclick="bookSlot(\''+s._id+'\')">Book</button></div>';
  }).join('')+'</div>':'<div style="padding:2rem;text-align:center;color:var(--muted)">No open slots right now. Check back soon.</div>';
  return head+mineHtml+availHtml;
}
function addSlot(){
  formModal({title:'Add Office-Hour Slot',submitLabel:'Add Slot',fields:[
    {name:'startTime',label:'Start Time',type:'datetime-local',required:true},
    {name:'endTime',label:'End Time',type:'datetime-local'},
    {name:'topic',label:'Topic',placeholder:'Doubt clearing, career advice…'},
    {name:'mode',label:'Mode',type:'select',value:'online',options:[{value:'online',label:'Online'},{value:'offline',label:'Offline'}]},
    {name:'meetingLink',label:'Meeting Link (if online)'},
    {name:'venue',label:'Venue (if offline)'}
  ],onSubmit:async function(v){
    if(_demoMode){toast('Slot added (demo)','success');return refreshPage();}
    await apiFetch('/office-hours',{method:'POST',body:JSON.stringify(v)}); toast('Slot added','success');refreshPage();
  }});
}
function bookSlot(id){
  formModal({title:'Book Slot',submitLabel:'Confirm Booking',fields:[{name:'note',label:'What do you want to discuss? (optional)',type:'textarea'}],onSubmit:async function(v){
    if(_demoMode){toast('Booked (demo)','success');return refreshPage();}
    await apiFetch('/office-hours/'+id+'/book',{method:'POST',body:JSON.stringify({note:v.note})}); toast('Slot booked!','success');refreshPage();
  }});
}
function cancelBooking(id){
  confirmModal('Cancel Booking','Release this slot?','Cancel Booking',async function(){
    if(_demoMode){toast('Cancelled (demo)','success');return refreshPage();}
    await apiFetch('/office-hours/'+id+'/cancel',{method:'POST'}); toast('Booking cancelled','success');refreshPage();
  });
}
function deleteSlot(id){
  confirmModal('Delete Slot','Remove this slot?','Delete',async function(){
    if(_demoMode){toast('Removed (demo)','success');return refreshPage();}
    await apiFetch('/office-hours/'+id,{method:'DELETE'}); toast('Removed','success');refreshPage();
  });
}
var _attDayCache={};
async function attOverviewHTML(dateStr){
  var d = dateStr || new Date().toISOString().slice(0,10);
  var an={};
  try{ an=(await apiFetch('/attendance/overview?date='+d)).data||{}; }catch(e){}
  var batches=an.batches||[];
  var totals=an.totals||{present:0,absent:0,late:0,total:0};
  _attDayCache={}; batches.forEach(function(b){_attDayCache[b.batchId]=b;});
  var stat='<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">'+
    '<div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#9989;</div><div><div class="stat-v">'+(an.percentage||0)+'%</div><div class="stat-l">Day Attendance</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128101;</div><div><div class="stat-v">'+((totals.present||0)+(totals.late||0))+'/'+(totals.total||0)+'</div><div class="stat-l">Present</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#fee2e2">&#10060;</div><div><div class="stat-v">'+(totals.absent||0)+'</div><div class="stat-l">Absent</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#128218;</div><div><div class="stat-v">'+batches.length+'</div><div class="stat-l">Batches Active</div></div></div>'+
  '</div>';
  var batchRows=batches.length?batches.map(function(b){
    return '<div class="course-row"><div class="stat-ico" style="background:var(--purple-lt);color:var(--purple);width:44px;height:44px;font-weight:800;font-size:.8rem">'+(b.percentage||0)+'%</div>'+
      '<div class="course-info"><div class="course-name">'+escHtml(b.batchName)+' <span style="font-size:.7rem;color:var(--muted)">'+escHtml(b.batchCode||'')+'</span></div>'+
      '<div class="course-desc">Mentor: '+escHtml(b.mentor)+' • '+((b.present||0)+(b.late||0))+' present, '+(b.absent||0)+' absent of '+b.total+'</div></div>'+
      '<button class="continue-btn" style="padding:.4rem .8rem;font-size:.72rem;background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="attDayBatchDetail(\''+b.batchId+'\',\''+d+'\')">Students</button>'+
    '</div>';
  }).join(''):'<div style="padding:1.5rem;color:var(--muted);font-size:.85rem">No attendance recorded on this date.</div>';
  var mentors=an.mentorActivity||[];
  var mentorRows=mentors.length?'<div class="learn-sec-title" style="margin-top:1.1rem">&#128104;&#8205;&#127979; Mentor Activity (sessions held)</div><div class="course-list">'+mentors.map(function(m){
    return '<div class="course-row"><div class="stat-ico" style="background:'+(m.attendanceTaken?'#d1fae5':'#fef3c7')+';width:40px;height:40px">'+(m.attendanceTaken?'&#9989;':'&#128336;')+'</div><div class="course-info"><div class="course-name">'+escHtml(m.mentor)+'</div><div class="course-desc">'+escHtml(m.title||'Session')+' • '+escHtml(m.batch||'')+' • '+fmtTime(m.startTime)+' • '+(m.attendanceTaken?'attendance taken':'attendance pending')+'</div></div><span class="badge '+(m.status==='completed'?'b-active':'b-pending')+'">'+(m.status||'scheduled')+'</span></div>';
  }).join('')+'</div>':'';
  return stat+'<div class="learn-sec-title">By Batch</div><div class="course-list">'+batchRows+'</div>'+mentorRows;
}
async function attOverviewLoad(dateStr){ var box=document.getElementById('attDayBox'); if(box){ box.innerHTML=loadingHTML(); box.innerHTML=await attOverviewHTML(dateStr); } }
function attDayBatchDetail(batchId,date){
  var b=_attDayCache[batchId]; if(!b) return;
  var rows=(b.students||[]).map(function(s){
    var c=s.status==='present'?'b-active':s.status==='late'?'b-pending':'b-due';
    return '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--line);font-size:.85rem"><span>'+escHtml(s.name)+' <span style="color:var(--muted);font-size:.72rem">'+escHtml(s.enrollmentId||'')+'</span></span><span class="badge '+c+'">'+s.status+'</span></div>';
  }).join('')||'<div style="color:var(--muted)">No records.</div>';
  _buildModal(escHtml(b.batchName)+' — '+fmtDate(date), rows, '<button class="btn-primary" onclick="closeModal()">Close</button>');
}
async function viewCourseDetail(id){
  _buildModal('Course', '<div style="padding:2rem">'+loadingHTML()+'</div>', '');
  try{
    var res=await apiFetch('/courses/'+id);
    var c=(res.data&&(res.data.course||res.data))||{};
    var mods=c.modules||[];
    var modHtml=mods.length?mods.map(function(m,i){
      var topics=(m.topics&&m.topics.length)?'<div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">'+m.topics.map(function(t){return escHtml(t.title||t);}).join(' • ')+'</div>':'';
      return '<div style="padding:.6rem 0;border-bottom:1px solid var(--line)"><div style="font-weight:700;font-size:.86rem">'+(i+1)+'. '+escHtml(m.title||'Module')+'</div>'+topics+'</div>';
    }).join(''):'<div style="color:var(--muted);font-size:.85rem">Curriculum coming soon.</div>';
    var fee=(c.fee&&c.fee.amount)?'&#8377;'+c.fee.amount.toLocaleString('en-IN'):'—';
    var body='<div style="font-size:.85rem;color:var(--ink2);line-height:1.6">'+
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.9rem">'+
        '<span class="badge b-active">'+escHtml(c.category||'Course')+'</span>'+
        (c.duration?'<span class="badge b-pending">'+escHtml(c.duration)+'</span>':'')+
        '<span class="badge" style="background:#ede9fe;color:var(--purple)">Fee: '+fee+'</span>'+
      '</div>'+
      (c.description?'<div style="margin-bottom:1rem">'+escHtml(c.description)+'</div>':'')+
      '<div class="learn-sec-title">Curriculum ('+mods.length+' module'+(mods.length===1?'':'s')+')</div>'+modHtml+
    '</div>';
    _buildModal(escHtml(c.title||'Course'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
    var box=document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth='620px';
  }catch(e){ _buildModal('Course', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); }
}
async function batchStudents(id){
  _buildModal('Batch Students', '<div style="padding:2rem">'+loadingHTML()+'</div>', '');
  try{
    var res=await apiFetch('/batches/'+id);
    var d=res.data||{}; var batch=d.batch||d; var enrollments=d.enrollments||[];
    var rows=enrollments.length?enrollments.map(function(e){
      var s=e.student||{}; var name=((s.firstName||'')+' '+(s.lastName||'')).trim()||'Student';
      var prog=(e.progress&&e.progress.overall)||0;
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 0;border-bottom:1px solid var(--line)">'+
        '<div style="min-width:0"><div style="font-weight:600;font-size:.86rem">'+escHtml(name)+'</div><div style="font-size:.72rem;color:var(--muted)">'+escHtml(s.email||'')+' '+escHtml((s.studentProfile&&s.studentProfile.enrollmentId)||'')+'</div></div>'+
        '<div style="min-width:120px;text-align:right"><div style="font-size:.72rem;font-weight:700;margin-bottom:.2rem">'+prog+'% complete</div><div class="pb"><div class="pf" style="width:'+prog+'%"></div></div></div>'+
      '</div>';
    }).join(''):'<div style="color:var(--muted);font-size:.85rem;padding:.6rem 0">No students enrolled in this batch yet.</div>';
    var body='<div style="font-size:.82rem;color:var(--muted);margin-bottom:.8rem">&#128218; '+escHtml((batch.course&&batch.course.title)||'')+' &bull; '+enrollments.length+' student'+(enrollments.length===1?'':'s')+'</div>'+rows;
    _buildModal('Students — '+escHtml(batch.name||'Batch'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
    var box=document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth='560px';
  }catch(e){ _buildModal('Batch Students', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); }
}
function updateLeadStatus(id, status){
  if(_demoMode){ toast('Status updated (demo)','success'); return; }
  apiFetch('/leads/'+id,{method:'PATCH',body:JSON.stringify({status:status})}).then(function(){ toast('Lead moved to '+status,'success'); refreshPage(); }).catch(function(e){ toast(e.message,'error'); });
}
function renderDashboard(role) {
  if (role === 'student') return renderStudentDash();
  if (role === 'mentor') return renderMentorDash();
  return renderAdminDash();
}


async function renderStudentDash() {
  var [statsRes, enrRes, annRes, sessRes, attRes, mockRes] = await Promise.all([
    apiFetch('/users/me/stats'),
    apiFetch('/users/me/enrollments').catch(function(){ return {data:[]}; }),
    apiFetch('/announcements?limit=2'),
    apiFetch('/sessions?limit=30').catch(function(){ return {data:[]}; }),
    apiFetch('/attendance/me').catch(function(){ return {data:{summary:{}}}; }),
    apiFetch('/mock-interviews').catch(function(){ return {data:[]}; })
  ]);
  var stats = statsRes.data || {};
  var enrollments = enrRes.data || [];
  var anns = annRes.data || [];
  var sessions = (sessRes.data || []).filter(function(s){ return (s.status||'scheduled') !== 'cancelled'; });
  sessions.sort(function(a,b){ return new Date(a.startTime) - new Date(b.startTime); });
  var now = Date.now();
  var live = sessions.filter(function(s){ return s.status === 'live'; })[0];
  var next = live || sessions.filter(function(s){ return new Date(s.endTime||s.startTime).getTime() >= now; })[0];
  var att = (attRes.data && attRes.data.summary) ? attRes.data.summary : {};
  var attPct = att.percentage != null ? att.percentage : '—';
  var firstName = _currentUser ? _currentUser.firstName : 'Student';

  // ── Up Next card (the one thing a student needs first) ──
  var upnext;
  if (next) {
    var mode = (next.mode||'online').toLowerCase();
    var isLive = next.status === 'live';
    var d = new Date(next.startTime);
    var covers = (next.agenda && next.agenda.length) ? ' &bull; Covers: '+next.agenda.slice(0,2).join(', ') : '';
    var action;
    if (isLive) action = '<a class="upnext-btn live" href="'+(next.meetingLink||'#')+'" target="_blank">&#9654; Join Live</a>';
    else if (mode === 'offline') action = '<span class="upnext-loc">&#128205; '+(next.venue||'Campus')+'</span>';
    else action = '<a class="upnext-btn" href="'+(next.meetingLink||'#')+'" target="_blank" onclick="if(this.getAttribute(\'href\')===\'#\'){event.preventDefault();toast(\'Link shared 15 min before class\',\'info\');}">&#9654; Join Class</a>';
    upnext = '<div class="upnext'+(isLive?' is-live':'')+'">'+
      '<div class="upnext-cal"><div class="d">'+d.getDate()+'</div><div class="m">'+d.toLocaleDateString('en-IN',{month:'short'})+'</div></div>'+
      '<div class="upnext-body">'+(isLive?'<span class="upnext-tag live">&#9679; Live now</span>':'<span class="upnext-tag">Up next</span>')+
        '<div class="upnext-title">'+next.title+'</div>'+
        '<div class="upnext-meta">&#128336; '+fmtDate(next.startTime)+' &bull; '+fmtTime(next.startTime)+' &ndash; '+fmtTime(next.endTime)+covers+'</div>'+
      '</div>'+
      '<div class="upnext-action">'+action+'</div>'+
    '</div>';
  } else {
    upnext = '<div class="upnext"><div class="upnext-cal">&#127909;</div><div class="upnext-body"><span class="upnext-tag">All caught up</span><div class="upnext-title">No upcoming classes</div><div class="upnext-meta">Revisit your class recordings anytime.</div></div><div class="upnext-action"><button class="upnext-btn" onclick="showPage(\'my-courses\')">My Courses</button></div></div>';
  }

    var _resE = enrollments.filter(function(e){ var p=(e.progress&&e.progress.overall)||0; return p>0 && p<100; })
    .sort(function(a,b){ return ((b.progress&&b.progress.overall)||0)-((a.progress&&a.progress.overall)||0); })[0]
    || enrollments.filter(function(e){ return ((e.progress&&e.progress.overall)||0)<100; })[0];
  var continueCard='';
  var mockCard='';
  try{ var _nm2=((mockRes&&mockRes.data)||[]).filter(function(m){return m.status==='scheduled';}).sort(function(a,b){return new Date(a.scheduledAt)-new Date(b.scheduledAt);})[0];
    if(_nm2){ mockCard='<div style="display:flex;align-items:center;gap:1rem;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid var(--line);border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.2rem">'+'<div style="font-size:1.7rem">&#127908;</div>'+'<div style="flex:1;min-width:0"><div style="font-size:.7rem;font-weight:800;color:#c2410c;text-transform:uppercase;letter-spacing:.5px">Upcoming mock interview</div><div style="font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(_nm2.title||'Mock Interview')+'</div><div style="font-size:.76rem;color:var(--muted)">'+(_nm2.type||'technical')+' &bull; '+fmtDate(_nm2.scheduledAt)+' '+fmtTime(_nm2.scheduledAt)+'</div></div>'+'<button class="continue-btn" onclick="showPage(\'mock-interviews\')">View &rarr;</button>'+'</div>'; }
  }catch(e){}
  if(_resE){
    var _rc=_resE.course||{}; var _rp=(_resE.progress&&_resE.progress.overall)||0;
    var _mods=_rc.modules||[]; var _done=((_resE.progress&&_resE.progress.moduleProgress)||[]).filter(function(m){return m.progress>=100;}).map(function(m){return String(m.moduleId);});
    var _nm=_mods.filter(function(m){return _done.indexOf(String(m._id))<0;})[0];
    continueCard='<div style="display:flex;align-items:center;gap:1rem;background:linear-gradient(135deg,#faf8ff,#f1ecfe);border:1px solid var(--line);border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.2rem">'+
      '<div style="font-size:1.7rem">&#128214;</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:.7rem;font-weight:800;color:var(--purple);text-transform:uppercase;letter-spacing:.5px">Continue learning</div>'+
        '<div style="font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(_rc.title||'Your course')+'</div>'+
        '<div style="font-size:.76rem;color:var(--muted)">'+(_nm?('Next: '+escHtml(_nm.title||'module')):('Progress '+_rp+'%'))+'</div>'+
        '<div class="pb" style="margin-top:.45rem"><div class="pf" style="width:'+_rp+'%"></div></div>'+
      '</div>'+
      '<button class="continue-btn" onclick="showPage(\'my-courses\')">Resume &rarr;</button>'+
    '</div>';
  }
  return `
  <div class="welcome-banner">
    <div>
      <div class="wb-title">Hi ${firstName} &#128075;</div>
      <div class="wb-sub">Here's what's happening with your learning today.</div>
    </div>
    <div class="wb-illus">&#128218;</div>
  </div>

  ${upnext}
  ${continueCard}
  ${mockCard}

  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card">
      <div class="stat-ico" style="background:var(--purple-lt)">&#128218;</div>
      <div><div class="stat-v">${stats.enrolledCourses || enrollments.length || 0}</div><div class="stat-l">My Courses</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-ico" style="background:var(--green-lt)">&#128200;</div>
      <div><div class="stat-v">${stats.avgProgress || 0}%</div><div class="stat-l">Avg Progress</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-ico" style="background:var(--amber-lt)">&#9989;</div>
      <div><div class="stat-v">${attPct}${attPct==='—'?'':'%'}</div><div class="stat-l">Attendance</div></div>
    </div>
  </div>

  <div class="section-head"><span class="section-title">My Courses</span><button class="view-all" onclick="showPage('my-courses')">Open My Courses &rarr;</button></div>
  <div class="course-list">
    ${enrollments.length ? enrollments.map(function(e){
      var c=e.course||{}; var s=getCourseStyle(c.category); var prog=(e.progress&&e.progress.overall)||0;
      var mode=((e.batch&&e.batch.mode)||'online').toLowerCase();
      var modeChip = mode==='offline'?'<span class="mode-badge mode-offline" style="margin-left:.5rem"><span class="dot"></span>Offline</span>':'<span class="mode-badge mode-online" style="margin-left:.5rem"><span class="dot"></span>Online</span>';
      return '<div class="course-row" onclick="showPage(\'my-courses\')">'+
        '<div class="course-ico" style="background:'+s.bg+'">'+s.ico+'</div>'+
        '<div class="course-info">'+
          '<div class="course-name">'+c.title+modeChip+'</div>'+
          '<div class="course-desc">'+(c.category||'')+(c.duration?' &bull; '+c.duration:'')+'</div>'+
          '<div class="prog-bar"><div class="prog-fill" style="width:'+prog+'%"></div></div>'+
        '</div>'+
        '<span class="prog-pct">'+prog+'%</span>'+
        '<button class="continue-btn" onclick="event.stopPropagation();showPage(\'my-courses\')">Resume</button>'+
      '</div>';
    }).join('') : '<div class="course-row" style="cursor:default;color:var(--muted);font-size:.85rem;justify-content:center">You are not enrolled in any course yet.</div>'}
  </div>

  ${anns.length ? '<div class="section-head" style="margin-top:1.6rem"><span class="section-title">Announcements</span><button class="view-all" onclick="showPage(\'announcements\')">View All</button></div>'+
  '<div class="ann-list">'+anns.map(function(a){
    return '<div class="ann-item"><div class="ann-dot"></div><div>'+
      '<div class="ann-title">'+a.title+'</div>'+
      '<div class="ann-body">'+(a.body||'')+'</div>'+
      '<div class="ann-date">'+fmtDate(a.publishAt||a.createdAt)+'</div>'+
    '</div></div>';
  }).join('')+'</div>' : ''}`;
}

async function renderMentorDash() {
  var [statsRes, studentsRes, todayRes, allSessRes, reqRes] = await Promise.all([
    apiFetch('/users/me/stats'),
    apiFetch('/users/my-students?limit=5'),
    apiFetch('/sessions/today').catch(function(){ return {data:[]}; }),
    apiFetch('/sessions?limit=100').catch(function(){ return {data:[]}; }),
    apiFetch('/join-requests').catch(function(){ return {data:[]}; })
  ]);
  var stats = statsRes.data || {};
  var students = (studentsRes.data && studentsRes.data.students) ? studentsRes.data.students.slice(0, 5) : [];
  var sessions = todayRes.data || [];
  var allSess = allSessRes.data || [];
  var reqs = reqRes.data || [];
  var pendingReq = reqs.filter(function(r){ return r.status==='pending'; }).length;
  var needRec = allSess.filter(function(s){ return s.status==='completed' && !s.recordingUrl; });
  var firstName = _currentUser ? _currentUser.firstName : 'Mentor';
  return `
  <div class="welcome-banner">
    <div>
      <div class="wb-title">Good day, ${firstName}! &#9728;</div>
      <div class="wb-sub">You have <b>${sessions.length}</b> session${sessions.length !== 1 ? 's' : ''} today${pendingReq?', and <b>'+pendingReq+'</b> online-join request'+(pendingReq!==1?'s':'')+' to review':''}.</div>
    </div>
    <div class="wb-illus">&#128104;&#8205;&#127979;</div>
  </div>
  <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.3rem">
    <button class="continue-btn" onclick="addSession()">+ Schedule Session</button>
    <button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="showPage('sessions')">&#9654; Manage Sessions</button>
    <button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="showPage('attendance-mark')">&#9989; Mark Attendance</button>
    <button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="showPage('requests')">&#128241; Online Requests${pendingReq?' ('+pendingReq+')':''}</button>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-ico" style="background:var(--purple-lt)">&#127979;</div><div><div class="stat-v">${stats.myStudents || students.length || 0}</div><div class="stat-l">My Students</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:var(--blue-lt)">&#128197;</div><div><div class="stat-v">${sessions.length}</div><div class="stat-l">Sessions Today</div></div></div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('sessions')"><div class="stat-ico" style="background:var(--amber-lt)">&#127909;</div><div><div class="stat-v">${needRec.length}</div><div class="stat-l">Need Recording</div></div></div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('requests')"><div class="stat-ico" style="background:var(--red-lt)">&#128241;</div><div><div class="stat-v">${pendingReq}</div><div class="stat-l">Pending Requests</div></div></div>
  </div>
  ${needRec.length ? '<div class="mode-note offline" style="margin-bottom:1.3rem"><div>&#127909; <b>'+needRec.length+' completed class'+(needRec.length!==1?'es':'')+'</b> still need a recording uploaded for students.</div><button class="sched-btn sb-join" onclick="showPage(\'sessions\')">Upload now</button></div>' : ''}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
    <div>
      <div class="section-head"><span class="section-title">Student Progress</span><button class="view-all" onclick="showPage('my-students')">View All</button></div>
      <div class="course-list">
        ${students.length ? students.map(function(e){
          var s=e.student||{};
          var p=(e.progress&&e.progress.overall)||0;
          var c=p>=80?'#10b981':p>=60?'#f59e0b':'#ef4444';
          var name=((s.firstName||'')+' '+(s.lastName||'')).trim();
          var init=(s.firstName?s.firstName[0]:'')+(s.lastName?s.lastName[0]:'');
          return '<div class="course-row">'+
            '<div class="stat-ico" style="background:var(--purple-lt);font-size:.9rem;font-weight:800;color:var(--purple);width:40px;height:40px">'+init+'</div>'+
            '<div class="course-info">'+
              '<div class="course-name">'+name+'</div>'+
              '<div class="prog-bar" style="margin-top:.4rem"><div class="prog-fill" style="width:'+p+'%;background:'+c+'"></div></div>'+
            '</div>'+
            '<span class="prog-pct" style="color:'+c+'">'+p+'%</span>'+
          '</div>';
        }).join('') : '<div style="padding:1.2rem;color:var(--muted);font-size:.85rem">No students assigned yet.</div>'}
      </div>
    </div>
    <div>
      <div class="section-head"><span class="section-title">Today\'s Sessions</span></div>
      <div class="ann-list">
        ${sessions.length ? sessions.map(function(s){
          var batchName=s.batch?(s.batch.name||''):'';
          return '<div class="ann-item">'+
            '<div class="ann-dot" style="background:#0ea5c9"></div>'+
            '<div>'+
              '<div class="ann-title">'+s.title+'</div>'+
              '<div class="ann-body">'+batchName+'</div>'+
              '<div class="ann-date">'+fmtTime(s.startTime)+'</div>'+
            '</div>'+
          '</div>';
        }).join('') : '<div style="padding:1.2rem;color:var(--muted);font-size:.85rem">No sessions today.</div>'}
      </div>
    </div>
  </div>`;
}

async function renderAdminDash() {
  var [overviewRes, studentsRes] = await Promise.all([
    apiFetch('/analytics/overview'),
    apiFetch('/users?role=student&limit=3&sort=-createdAt')
  ]);
  var ov = overviewRes.data || { students:{total:0}, mentors:{total:0}, batches:{active:0}, placement:{rate:0,openDrives:0,placed:0}, courses:{total:0,published:0}, enrollments:{total:0,completed:0}, leads:{new:0} };
  var users = studentsRes.data || [];
  var firstName = _currentUser ? _currentUser.firstName : 'Admin';
  var metrics = [
    ['Published Courses', ov.courses.published, '#ede9fe'],
    ['Total Enrollments', ov.enrollments.total, '#dbeafe'],
    ['Completed', ov.enrollments.completed, '#d1fae5'],
    ['Open Drives', ov.placement.openDrives, '#fef3c7'],
    ['New Leads', ov.leads.new, '#ffedd5']
  ];
  return `
  <div class="welcome-banner">
    <div>
      <div class="wb-title">Welcome, ${firstName}! &#128075;</div>
      <div class="wb-sub">Institute overview. All systems running normally.</div>
    </div>
    <div class="wb-illus">&#127970;</div>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#127979;</div><div><div class="stat-v">${ov.students.total}</div><div class="stat-l">Total Students</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128105;&#8205;&#127979;</div><div><div class="stat-v">${ov.mentors.total}</div><div class="stat-l">Active Mentors</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#128188;</div><div><div class="stat-v">${ov.placement.rate}%</div><div class="stat-l">Placement Rate</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:#fef3c7">&#128202;</div><div><div class="stat-v">${ov.batches.active}</div><div class="stat-l">Active Batches</div></div></div>
  </div>
  <div class="admin-grid">
    <div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">
      <div class="section-title" style="margin-bottom:.8rem">Key Metrics</div>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        ${metrics.map(function(m){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem .8rem;border-radius:8px;background:'+m[2]+'">'+
            '<span style="font-size:.82rem;font-weight:500">'+m[0]+'</span>'+
            '<span style="font-size:1rem;font-weight:800;color:var(--ink)">'+m[1]+'</span>'+
          '</div>';
        }).join('')}
      </div>
    </div>
    <div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">
      <div class="section-title" style="margin-bottom:.8rem">Recent Students</div>
      ${users.length ? users.map(function(u){
        var name=((u.firstName||'')+' '+(u.lastName||'')).trim();
        var init=(u.firstName?u.firstName[0]:'')+(u.lastName?u.lastName[0]:'');
        return '<div style="display:flex;align-items:center;gap:.8rem;padding:.5rem 0;border-bottom:1px solid var(--line)">'+
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--purple-lt);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--purple);flex-shrink:0">'+init+'</div>'+
          '<div style="flex:1"><div style="font-size:.82rem;font-weight:600">'+name+'</div><div style="font-size:.72rem;color:var(--muted)">'+(u.email||'')+'</div></div>'+
          '<span style="font-size:.75rem;font-weight:600;padding:.2rem .6rem;border-radius:6px;background:var(--green-lt);color:var(--green)">'+(u.status||'active')+'</span>'+
        '</div>';
      }).join('') : '<div style="padding:1rem;color:var(--muted);font-size:.85rem">No students yet.</div>'}
    </div>
  </div>`;
}

function courseCardPremium(c, role) {
  var s = getCourseStyle(c.category);
  var tags = (c.tags && c.tags.length) ? c.tags.slice(0,3) : [];
  var btn = role === 'admin'
    ? '<div style="display:flex;gap:.4rem"><button class="continue-btn" style="background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="viewCourseDetail(\''+c._id+'\')">View</button><button class="continue-btn" onclick="manageBatchFor(\'course\',\''+c._id+'\')">Manage</button></div>'
    : '<button class="continue-btn" onclick="startLearning(\''+(c.title||'').replace(/[\x27"]/g,'')+'\')">View Course</button>';
  return '<div class="course-card2" data-cat="'+(c.category||'Other')+'">'+
    '<div class="cc2-head">'+
      '<div class="cc2-ico" style="background:'+s.bg+'">'+s.ico+'</div>'+
      '<div style="min-width:0"><div style="font-weight:800;font-size:.9rem;line-height:1.25;color:var(--ink)">'+c.title+'</div>'+
      '<div style="font-size:.68rem;color:var(--muted);margin-top:2px">'+(c.duration||'')+(c.isFeatured?' &bull; &#9733; Flagship':'')+'</div></div>'+
    '</div>'+
    '<div class="cc2-body">'+
      '<div class="cc2-tag">'+(c.category||'')+'</div>'+
      '<div style="font-size:.79rem;color:var(--muted);line-height:1.5;min-height:2.4em">'+(c.shortDescription||c.description||'')+'</div>'+
      (tags.length?'<div style="display:flex;gap:.3rem;flex-wrap:wrap">'+tags.map(function(t){return '<span style="font-size:.64rem;font-weight:700;color:var(--ink2);background:var(--bg);border:1px solid var(--line);padding:.18rem .5rem;border-radius:6px">'+t+'</span>';}).join('')+'</div>':'')+
      '<div class="cc2-foot"><span style="font-size:.72rem;color:var(--muted);font-weight:600">'+(c.level||'All levels')+'</span>'+btn+'</div>'+
    '</div>'+
  '</div>';
}

async function renderCourses(role) {
  if (role === 'student') return renderMyLearning();
  return renderCatalog(role);
}

async function renderCatalog(role) {
  var res = await apiFetch('/courses?limit=50&isPublished=true');
  var courses = res.data || [];
  var cats = [];
  courses.forEach(function(c){ if(c.category && cats.indexOf(c.category)<0) cats.push(c.category); });
  var featured = courses.filter(function(c){ return c.isFeatured; })[0] || courses[0];
  var addBtn = role === 'admin' ? '<button class="continue-btn" onclick="addCourse()">+ Add Course</button>' : '';

  var heroHTML = featured ? `
  <div class="welcome-banner" style="margin-bottom:1.3rem">
    <div>
      <div style="font-size:.68rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.55);position:relative">&#9733; Flagship Program</div>
      <div class="wb-title" style="margin-top:.3rem">${featured.title}</div>
      <div class="wb-sub">${featured.shortDescription||featured.description||''} &mdash; <b>${featured.duration||''}</b></div>
      <button class="continue-btn" style="margin-top:1rem;background:#fff;color:var(--ink)" onclick="${role==='admin'?'viewEntity(\'course\',\''+featured._id+'\')':'startLearning(\''+(featured.title||'').replace(/[\x27"]/g,'')+'\')'}">View Program</button>
    </div>
    <div class="wb-illus">&#127891;</div>
  </div>` : '';

  var pills = '<div class="pill-row" id="coursePills"><button class="pill active" onclick="filterCourses(\'all\',this)">All Courses</button>'+
    cats.map(function(cat){ return '<button class="pill" onclick="filterCourses(\''+cat+'\',this)">'+cat+'</button>'; }).join('')+'</div>';

  var grid = courses.length
    ? '<div id="courseGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.1rem">'+
      courses.map(function(c){ return courseCardPremium(c, role); }).join('')+'</div>'
    : '<div style="padding:1.5rem;color:var(--muted)">No courses available.</div>';

  return '<div class="section-head"><span class="section-title">'+(role==='admin'?'Course Catalog ':'Explore Courses ')+
    '<span style="font-size:.72rem;font-weight:600;color:var(--muted)">'+courses.length+' programs</span></span>'+addBtn+'</div>'+
    heroHTML + pills + grid;
}
function filterCourses(cat, el){
  document.querySelectorAll('#courseGrid .course-card2').forEach(function(card){
    card.style.display = (cat==='all' || card.getAttribute('data-cat')===cat) ? '' : 'none';
  });
  document.querySelectorAll('#coursePills .pill').forEach(function(p){ p.classList.remove('active'); });
  if(el) el.classList.add('active');
}

// ─── Student "My Learning" — only enrolled courses, with live classes / recordings ───
function watchRecording(url, title){
  if(!url){ toast('Recording not available yet','info'); return; }
  var body = '<div style="background:#000;border-radius:12px;overflow:hidden">'+
    '<video src="'+url+'" controls autoplay style="width:100%;display:block;max-height:60vh"></video></div>';
  _buildModal('&#127909; '+(title||'Class Recording'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
}
function requestOnline(batchId, courseTitle){
  formModal({
    title:'Request to Join Online',
    submitLabel:'Send Request',
    fields:[
      {name:'date',label:'Which class date?',type:'date',required:true},
      {name:'reason',label:'Reason (optional)',type:'textarea',placeholder:'e.g. travelling this week'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Request sent! Your mentor will review and share the meeting link.','success'); return; }
      await apiFetch('/join-requests',{method:'POST',body:JSON.stringify({ batchId:batchId, date:v.date, reason:v.reason })});
      toast('Request sent! Your mentor will review and share the meeting link.','success');
    }
  });
}

function scheduleRow(s, isNext){
  var d = new Date(s.startTime);
  var now = Date.now();
  var live = s.status === 'live';
  var done = s.status === 'completed' || new Date(s.endTime||s.startTime).getTime() < now;
  var covers = (s.agenda && s.agenda.length) ? s.agenda.join(' &bull; ') : '';
  var mode = (s.mode||'online').toLowerCase();
  var badge = live ? '<span class="mode-badge mode-live"><span class="dot"></span>Live</span>'
    : done ? '<span class="mode-badge mode-recorded"><span class="dot"></span>'+(s.recordingUrl?'Recorded':'Done')+'</span>'
    : mode==='offline' ? '<span class="mode-badge mode-offline"><span class="dot"></span>In-Person</span>'
    : mode==='hybrid' ? '<span class="mode-badge mode-hybrid"><span class="dot"></span>Hybrid</span>'
    : '<span class="mode-badge mode-online"><span class="dot"></span>Online</span>';
  var title = (s.title||'Class').replace(/'/g,'&#39;');
  var action;
  if (live) action = '<a class="sched-btn sb-live" href="'+(s.meetingLink||'#')+'" target="_blank">&#9679; Join Live</a>';
  else if (done && s.recordingUrl) action = '<button class="sched-btn sb-watch" onclick="watchRecording(\''+s.recordingUrl+'\',\''+title+'\')">&#9654; Recording</button>';
  else if (done) action = '<span class="sched-btn sb-done">Completed</span>';
  else if (mode === 'offline') action = '<span class="sched-btn sb-soon">In-Person</span>';
  else action = '<a class="sched-btn sb-join" href="'+(s.meetingLink||'#')+'" target="_blank" onclick="if(this.getAttribute(\'href\')===\'#\'){event.preventDefault();toast(\'Link shared 15 min before class\',\'info\');}">Join</a>';
  return '<div class="sched-row'+(isNext?' is-next':'')+'">'+
    '<div class="sched-date"><div class="d">'+d.getDate()+'</div><div class="m">'+d.toLocaleDateString('en-IN',{month:'short'})+'</div><div class="wd">'+d.toLocaleDateString('en-IN',{weekday:'short'})+'</div></div>'+
    '<div class="sched-main">'+
      '<div class="sched-title">'+s.title+'</div>'+
      (covers ? '<div class="sched-covers"><b>Covers:</b> '+covers+'</div>' : '')+
      '<div class="sched-meta">'+badge+'<span>&#128336; '+fmtTime(s.startTime)+' &ndash; '+fmtTime(s.endTime)+'</span>'+(s.venue?'<span>&#128205; '+s.venue+'</span>':'')+'</div>'+
    '</div>'+
    '<div class="sched-action">'+action+'</div>'+
  '</div>';
}

function toggleLearn(head){
  var body=head.parentElement.querySelector('.learn-body'); if(!body) return;
  var hidden = body.style.display==='none';
  body.style.display = hidden?'':'none';
  var ch=head.querySelector('.lh-chev'); if(ch) ch.style.transform = hidden?'':'rotate(-90deg)';
}
async function renderMyLearning(){
  var [enrRes, sessRes] = await Promise.all([
    apiFetch('/users/me/enrollments'),
    apiFetch('/sessions?limit=100').catch(function(){ return {data:[]}; })
  ]);
  var enrollments = enrRes.data || [];
  var sessions = sessRes.data || [];
  if (!enrollments.length) {
    return '<div class="section-head"><span class="section-title">My Learning</span></div>'+
      '<div style="padding:3rem;text-align:center;color:var(--muted)"><div style="font-size:2.6rem">&#128218;</div>'+
      '<div style="margin-top:.6rem;font-size:.95rem;font-weight:600;color:var(--ink)">You are not enrolled in any course yet.</div>'+
      '<div style="margin-top:.3rem;font-size:.85rem">Explore our programs and enroll to start learning.</div>'+
      '<button class="continue-btn" style="margin-top:1rem" onclick="renderCatalogInto()">Browse Catalog</button></div>';
  }
  var byBatch = {};
  sessions.forEach(function(s){ var b = s.batch && (s.batch._id || s.batch); if(!b) return; (byBatch[b] = byBatch[b] || []).push(s); });

  var blocks = enrollments.map(function(e){
    var c = e.course || {}; var b = e.batch || {};
    var mode = (b.mode || 'online').toLowerCase();
    var prog = (e.progress && e.progress.overall) || 0;
    var col = c.color || '#6c3ff5';
    var s = getCourseStyle(c.category);
    var bs = (byBatch[b._id] || []).slice().sort(function(a,z){ return new Date(a.startTime) - new Date(z.startTime); });
    var modeBadge = mode === 'offline'
      ? '<span class="mode-badge mode-offline"><span class="dot"></span>Offline</span>'
      : mode === 'hybrid' ? '<span class="mode-badge mode-hybrid"><span class="dot"></span>Hybrid</span>'
      : '<span class="mode-badge mode-online"><span class="dot"></span>Online</span>';

    var now = Date.now();
    var doneCount = bs.filter(function(x){ return x.status === 'completed' || new Date(x.endTime||x.startTime).getTime() < now; }).length;
    var nextIdx = bs.findIndex(function(x){ return x.status === 'live' || new Date(x.endTime||x.startTime).getTime() >= now; });
    var modeHint = mode === 'offline' ? 'in-person classes &bull; recordings available' : 'live classes &bull; join online';
    var ctitle = (c.title||'this course').replace(/'/g,'&#39;');
    // Mode-specific note — the 2 student variations
    var note = mode === 'offline'
      ? '<div class="mode-note offline"><div>&#127979; <b>Offline batch</b> at '+(b.venue||'campus')+'. Recordings of every class are available below. Can\'t attend in person? You can occasionally join the live online session.</div>'+
          '<button class="sched-btn sb-join" onclick="requestOnline(\''+(b._id||'')+'\',\''+ctitle+'\')">&#128421; Request to Join Online</button></div>'
      : '<div class="mode-note online"><div>&#128250; <b>Live online batch</b> &mdash; join every class from anywhere. Missed one? The recording appears here afterwards.</div></div>';
    // Curriculum with mark-complete (progress tracking)
    var mods = c.modules || [];
    var completedMods = ((e.progress && e.progress.moduleProgress) || []).filter(function(m){ return m.progress>=100; }).map(function(m){ return String(m.moduleId); });
    var curriculum = mods.length
      ? '<div class="learn-sec-title">&#128216; Curriculum <span style="font-weight:600;color:var(--muted);font-size:.74rem">&bull; tick off modules as you finish ('+completedMods.length+'/'+mods.length+')</span></div>'+
        '<div class="sched-list" style="margin-bottom:1.3rem">'+mods.map(function(m){
          var done = completedMods.indexOf(String(m._id))>=0;
          return '<div class="sched-row" style="align-items:center">'+
            '<div onclick="toggleModule(\''+e._id+'\',\''+m._id+'\','+(!done)+')" title="Mark '+(done?'incomplete':'complete')+'" style="cursor:pointer;flex-shrink:0;width:26px;height:26px;border-radius:8px;border:2px solid '+(done?'var(--green)':'var(--line)')+';background:'+(done?'var(--green)':'#fff')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:.85rem;font-weight:800">'+(done?'&#10003;':'')+'</div>'+
            '<div class="sched-main"><div class="sched-title" style="'+(done?'color:var(--muted)':'')+'">'+(m.title||'Module')+'</div>'+
            ((m.topics&&m.topics.length)?'<div class="sched-covers">'+m.topics.map(function(t){return t.title;}).join(' &bull; ')+'</div>':'')+'</div>'+
          '</div>';
        }).join('')+'</div>'
      : '';
    var panel = note + curriculum +
      '<div class="learn-sec-title">&#128197; Class Schedule '+
        '<span style="font-weight:600;color:var(--muted);font-size:.74rem">&bull; '+modeHint+'</span></div>'+
      (bs.length
        ? '<div style="font-size:.74rem;color:var(--muted);margin:-.4rem 0 .8rem">'+doneCount+' of '+bs.length+' classes completed</div>'+
          '<div class="sched-list">'+bs.map(function(x,i){ return scheduleRow(x, i===nextIdx); }).join('')+'</div>'
        : '<div style="color:var(--muted);font-size:.85rem;padding:.5rem 0">Schedule will be published soon.</div>');

    return '<div class="learn-block">'+
      '<div class="learn-head" style="cursor:pointer" onclick="toggleLearn(this)">'+
        '<div class="lh-ico" style="background:'+s.bg+'">'+s.ico+'</div>'+
        '<div style="flex:1;min-width:180px">'+
          '<div class="lh-title">'+(c.title||'Course')+'</div>'+
          '<div class="lh-sub">'+modeBadge+'<span>&#128218; '+(c.category||'')+'</span>'+(b.name?'<span>&#128101; '+b.name+'</span>':'')+'</div>'+
        '</div>'+
        '<div class="lh-prog">'+
          '<div style="display:flex;justify-content:space-between;font-size:.72rem;font-weight:700;margin-bottom:.3rem"><span>Progress</span><span>'+prog+'%</span></div>'+
          '<div class="pb"><div class="pf" style="width:'+prog+'%"></div></div>'+'<div class="lh-chev" style="transition:transform .2s;color:var(--muted);font-size:1.1rem;align-self:center;margin-left:.5rem">&#9662;</div>'+
        '</div>'+
      '</div>'+
      '<div class="learn-body">'+panel+'</div>'+
    '</div>';
  }).join('');

  return '<div class="section-head"><span class="section-title">My Learning '+
    '<span style="font-size:.72rem;font-weight:600;color:var(--muted)">'+enrollments.length+' enrolled course'+(enrollments.length!==1?'s':'')+'</span></span>'+
    '<button class="view-all" onclick="renderCatalogInto()">Browse Catalog &rarr;</button></div>'+
    blocks;
}
async function renderCatalogInto(){
  var pagesEl = document.getElementById('pages');
  pagesEl.innerHTML = loadingHTML();
  document.getElementById('topbarTitle').textContent = 'Explore Courses';
  try { pagesEl.innerHTML = await renderCatalog('student'); }
  catch(e){ pagesEl.innerHTML = errorHTML(e.message); }
}

async function renderStudents(role) {
  var res = role === 'admin'
    ? await apiFetch('/users?role=student&limit=50')
    : await apiFetch('/users/my-students');
  var enrollments = [];
  var students = [];
  if (role === 'admin') {
    students = res.data || [];
    _studentsCache = students;
  } else {
    enrollments = (res.data && res.data.students) ? res.data.students : [];
  }

  var rows = '';
  if (role === 'admin') {
    rows = students.map(function(u) {
      var name = ((u.firstName||'')+' '+(u.lastName||'')).trim();
      var init = (u.firstName?u.firstName[0]:'')+(u.lastName?u.lastName[0]:'');
      var sp = u.studentProfile || {};
      var eid = sp.enrollmentId || u._id.slice(-6);
      return '<tr>'+
        '<td><div style="display:flex;align-items:center;gap:.6rem">'+
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--purple-lt);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800">'+init+'</div>'+
          '<div><div style="font-weight:600">'+name+'</div><div style="font-size:.7rem;color:var(--muted)">'+eid+'</div></div>'+
        '</div></td>'+
        '<td>'+(u.email||'-')+'</td>'+
        '<td>'+(u.phone||'-')+'</td>'+
        '<td>'+fmtDate(u.createdAt)+'</td>'+
        '<td><span class="badge '+(u.status==="active"?"b-active":"b-pending")+'">'+(u.status||"active")+'</span></td>'+
        '<td><div style="display:flex;gap:.35rem"><button class="apply-btn" style="font-size:.7rem;padding:.35rem .7rem;background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editUser(\''+u._id+'\')">Edit</button><button class="apply-btn" style="font-size:.7rem;padding:.35rem .7rem" onclick="viewEntity(\'user\',\''+u._id+'\')">View</button><button class="apply-btn" style="font-size:.7rem;padding:.35rem .7rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteUserAccount(\''+u._id+'\',\''+(name||'').replace(/'/g,'')+'\')">Delete</button></div></td>'+
      '</tr>';
    }).join('');
  } else {
    rows = enrollments.map(function(e) {
      var s = e.student || {};
      var name = ((s.firstName||'')+' '+(s.lastName||'')).trim();
      var init = (s.firstName?s.firstName[0]:'')+(s.lastName?s.lastName[0]:'');
      var sp = s.studentProfile || {};
      var eid = sp.enrollmentId || (s._id ? s._id.slice(-6) : '');
      var prog = (e.progress && e.progress.overall) || 0;
      var batchName = e.batch ? (e.batch.name || '—') : '—';
      var courseName = e.course ? (e.course.title || '—') : '—';
      var status = e.status || 'enrolled';
      var badgeCls = status === 'completed' ? 'b-submitted' : status === 'at_risk' ? 'b-overdue' : 'b-pending';
      return '<tr>'+
        '<td><div style="display:flex;align-items:center;gap:.6rem">'+
          '<div style="width:32px;height:32px;border-radius:8px;background:var(--purple-lt);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800">'+init+'</div>'+
          '<div><div style="font-weight:600">'+name+'</div><div style="font-size:.7rem;color:var(--muted)">'+eid+'</div></div>'+
        '</div></td>'+
        '<td>'+courseName+'</td>'+
        '<td><span class="badge" style="background:var(--purple-lt);color:var(--purple)">'+batchName+'</span></td>'+
        '<td><div style="display:flex;align-items:center;gap:.5rem"><div class="prog-bar" style="width:80px"><div class="prog-fill" style="width:'+prog+'%"></div></div><span style="font-size:.78rem;font-weight:600">'+prog+'%</span></div></td>'+
        '<td>—</td>'+
        '<td><span class="badge '+badgeCls+'">'+status+'</span></td>'+
      '</tr>';
    }).join('');
  }

  if (!rows) return '<div style="padding:2rem;text-align:center;color:var(--muted)">No students found.</div>';
  return `
  <div class="section-head">
    <span class="section-title">Students</span>
    ${role==='admin'?'<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="importStudents()">&#8593; Import</button><button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="exportStudents()">&#8681; Export CSV</button><button class="continue-btn" onclick="addUser(\'student\')">+ Add Student</button></div>':''}
  </div>
  <div style="background:#fff;border-radius:14px;border:1px solid var(--line);overflow:hidden">
    <table class="drive-table" style="width:100%">
      <thead>${role==='admin'
        ? '<tr><th>Student</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th></tr>'
        : '<tr><th>Student</th><th>Course</th><th>Batch</th><th>Progress</th><th>Attendance</th><th>Status</th></tr>'}</thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

async function renderAttendance() {
  var res = await apiFetch('/attendance/me');
  var records = (res.data && res.data.records) ? res.data.records : [];
  var summary = (res.data && res.data.summary) ? res.data.summary : { present: 0, absent: 0, late: 0, total: 0, percentage: 0 };

  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth();
  var monthName = today.toLocaleString('en-IN', { month: 'long' });
  var presentDays = new Set();
  var absentDays = new Set();
  var lateDays = new Set();
  records.forEach(function(r) {
    var d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      var day = d.getDate();
      if (r.status === 'present') presentDays.add(day);
      else if (r.status === 'absent') absentDays.add(day);
      else if (r.status === 'late') lateDays.add(day);
    }
  });

  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var todayDate = today.getDate();
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var calendar = '<div class="att-grid">' + days.map(function(d){ return '<div class="att-day">'+d+'</div>'; }).join('') + '</div>';
  var cellsHTML = '';
  for (var i = 0; i < firstDay; i++) cellsHTML += '<div class="att-cell"></div>';
  for (var day = 1; day <= daysInMonth; day++) {
    var cls = day === todayDate ? 'today' : presentDays.has(day) ? 'present' : absentDays.has(day) ? 'absent' : lateDays.has(day) ? 'late' : '';
    cellsHTML += '<div class="att-cell ' + cls + '">' + day + '</div>';
  }
  var totalCells = firstDay + daysInMonth;
  var remainder = totalCells % 7;
  if (remainder) for (var k = 0; k < 7 - remainder; k++) cellsHTML += '<div class="att-cell"></div>';
  var rows = Math.ceil(totalCells / 7);
  var calRows = '';
  for (var r2 = 0; r2 < rows; r2++) {
    calRows += '<div class="att-grid">';
    for (var col = 0; col < 7; col++) {
      calRows += cellsHTML.split('</div>')[r2 * 7 + col] ? (cellsHTML.split('</div>')[r2 * 7 + col] + '</div>') : '<div></div>';
    }
    calRows += '</div>';
  }
  // Simpler calendar build
  var allCells = '';
  for (var f = 0; f < firstDay; f++) allCells += '<div class="att-cell" style="background:transparent"></div>';
  for (var d2 = 1; d2 <= daysInMonth; d2++) {
    var c2 = d2 === todayDate ? 'today' : presentDays.has(d2) ? 'present' : absentDays.has(d2) ? 'absent' : lateDays.has(d2) ? 'late' : '';
    allCells += '<div class="att-cell ' + c2 + '">' + d2 + '</div>';
  }
  var gridStyle = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;';

  return `
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#9989;</div><div><div class="stat-v">${summary.percentage || 0}%</div><div class="stat-l">Overall Attendance</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#128197;</div><div><div class="stat-v">${summary.present || 0}/${summary.total || 0}</div><div class="stat-l">Days Present</div></div></div>
    <div class="stat-card"><div class="stat-ico" style="background:#fee2e2">&#10060;</div><div><div class="stat-v">${summary.absent || 0}</div><div class="stat-l">Days Absent</div></div></div>
  </div>
  <div style="background:#fff;border-radius:14px;border:1px solid var(--line);padding:1.4rem">
    <div class="section-title" style="margin-bottom:1.2rem">${monthName} ${year} — Attendance Calendar</div>
    <div style="${gridStyle}margin-bottom:4px">
      ${days.map(function(d){ return '<div class="att-day">'+d+'</div>'; }).join('')}
    </div>
    <div style="${gridStyle}">${allCells}</div>
    <div style="display:flex;gap:1.5rem;margin-top:1rem;font-size:.78rem">
      <div style="display:flex;align-items:center;gap:.4rem"><div style="width:12px;height:12px;border-radius:3px;background:var(--green-lt)"></div>Present</div>
      <div style="display:flex;align-items:center;gap:.4rem"><div style="width:12px;height:12px;border-radius:3px;background:var(--red-lt)"></div>Absent</div>
      <div style="display:flex;align-items:center;gap:.4rem"><div style="width:12px;height:12px;border-radius:3px;background:var(--amber-lt)"></div>Late</div>
      <div style="display:flex;align-items:center;gap:.4rem"><div style="width:12px;height:12px;border-radius:3px;background:var(--purple)"></div>Today</div>
    </div>
  </div>`;
}

// ── Admin/Mentor attendance overview (per batch) ──
function attStatusBadge(st){
  var m = { present:'b-active', absent:'b-due', late:'b-pending', excused:'b-graded' };
  return '<span class="badge '+(m[st]||'b-graded')+'">'+st+'</span>';
}
function attBoxHTML(recs){
  var sum = { present:0, absent:0, late:0, excused:0, total:0 };
  recs.forEach(function(r){ sum[r.status]=(sum[r.status]||0)+1; sum.total++; });
  var pct = sum.total ? Math.round(((sum.present+sum.late)/sum.total)*100) : 0;
  var cards = '<div class="stat-grid">'+
    '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-lt)">&#128202;</div><div><div class="stat-v">'+pct+'%</div><div class="stat-l">Avg Attendance</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:var(--green-lt)">&#9989;</div><div><div class="stat-v">'+sum.present+'</div><div class="stat-l">Present</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:var(--red-lt)">&#10060;</div><div><div class="stat-v">'+sum.absent+'</div><div class="stat-l">Absent</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:var(--amber-lt)">&#9203;</div><div><div class="stat-v">'+sum.late+'</div><div class="stat-l">Late</div></div></div>'+
  '</div>';
  if(!recs.length) return cards+'<div style="padding:1.5rem;color:var(--muted)">No attendance recorded for this batch yet.</div>';
  var rows = recs.slice(0,60).map(function(r){
    var st = r.student || {};
    var name = ((st.firstName||'')+' '+(st.lastName||'')).trim() || 'Student';
    return '<tr><td style="font-weight:600">'+name+'</td><td>'+fmtDate(r.date)+'</td><td>'+(r.sessionTitle||'Class')+'</td><td>'+attStatusBadge(r.status)+'</td></tr>';
  }).join('');
  return cards+'<div style="background:#fff;border-radius:14px;border:1px solid var(--line);overflow:hidden;margin-top:1.2rem">'+
    '<table class="drive-table" style="width:100%"><thead><tr><th>Student</th><th>Date</th><th>Session</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
async function loadBatchAtt(batchId, el){
  if(el){ document.querySelectorAll('#attPills .pill').forEach(function(p){ p.classList.remove('active'); }); el.classList.add('active'); }
  var box = document.getElementById('attBox'); if(box) box.innerHTML = loadingHTML();
  try { var res = await apiFetch('/attendance/batch/'+batchId); if(box) box.innerHTML = attBoxHTML((res.data&&res.data.records)||[]); }
  catch(e){ if(box) box.innerHTML = errorHTML(e.message); }
}
async function renderAttendanceAdmin(){
  var res = await apiFetch('/batches?limit=50');
  var batches = res.data || [];
  if(!batches.length) return '<div class="section-head"><span class="section-title">Attendance</span></div><div style="padding:2rem;text-align:center;color:var(--muted)">No batches yet.</div>';
  var firstRecs = [];
  try { var ar = await apiFetch('/attendance/batch/'+batches[0]._id); firstRecs = (ar.data&&ar.data.records)||[]; } catch(e){}
  var pills = '<div class="pill-row" id="attPills">'+batches.map(function(b,i){
    return '<button class="pill'+(i===0?' active':'')+'" onclick="loadBatchAtt(\''+b._id+'\',this)">'+b.name+'</button>';
  }).join('')+'</div>';
  var _attToday=new Date().toISOString().slice(0,10);
  var _attDayBox=await attOverviewHTML(_attToday);
  return '<div class="section-head"><span class="section-title">Daily Attendance Overview</span><input type="date" value="'+_attToday+'" onchange="attOverviewLoad(this.value)" style="padding:.5rem .7rem;border:1.5px solid var(--line);border-radius:9px;font-family:inherit;font-size:.85rem"/></div>'+
    '<div id="attDayBox">'+_attDayBox+'</div>'+
    '<div class="section-head" style="margin-top:1.8rem"><span class="section-title">Attendance '+
    '<span style="font-size:.72rem;font-weight:600;color:var(--muted)">by batch</span></span></div>'+
    pills+'<div id="attBox">'+attBoxHTML(firstRecs)+'</div>';
}

async function renderMarkAttendance() {
  var res = await apiFetch('/users/my-students');
  var students = (res.data && res.data.students) ? res.data.students : [];
  var batches = {};
  students.forEach(function(e) {
    if (e.batch) {
      var bid = e.batch._id || e.batch;
      if (!batches[bid]) batches[bid] = { id: bid, name: (e.batch.name || bid), code: (e.batch.code || '') };
    }
  });
  var batchList = Object.values(batches);
  var today = new Date().toISOString().split('T')[0];
  var batchOpts = batchList.map(function(b){ return '<option value="'+b.id+'">'+b.name+(b.code?' ('+b.code+')':'')+'</option>'; }).join('');
  var studentRows = students.map(function(e) {
    var s = e.student || {};
    var name = ((s.firstName||'')+' '+(s.lastName||'')).trim();
    var init = (s.firstName?s.firstName[0]:'')+(s.lastName?s.lastName[0]:'');
    var sid = s._id || '';
    var enrollId = (s.studentProfile && s.studentProfile.enrollmentId) ? s.studentProfile.enrollmentId : sid.slice(-6);
    return '<tr>'+
      '<td><div style="display:flex;align-items:center;gap:.6rem">'+
        '<div style="width:30px;height:30px;border-radius:8px;background:var(--purple-lt);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800">'+init+'</div>'+
        name+
      '</div></td>'+
      '<td style="color:var(--muted)">'+enrollId+'</td>'+
      '<td>'+
        '<select data-sid="'+sid+'" style="padding:.35rem .7rem;border-radius:7px;border:1.5px solid var(--line);font-size:.8rem;background:var(--bg)">'+
          '<option value="present" selected>present</option>'+
          '<option value="absent">absent</option>'+
        '</select>'+
      '</td>'+
      '<td><input class="att-note" placeholder="Optional note..." style="padding:.35rem .7rem;border-radius:7px;border:1.5px solid var(--line);font-size:.8rem;background:var(--bg);width:100%"/></td>'+
    '</tr>';
  }).join('');

  if (!students.length) {
    return '<div style="padding:2rem;text-align:center;color:var(--muted)">No students assigned to your batches yet.</div>';
  }

  return `
  <div style="background:#fff;border-radius:14px;border:1px solid var(--line);padding:1.4rem;margin-bottom:1.2rem">
    <div class="section-title" style="margin-bottom:1rem">Mark Attendance</div>
    <div class="form-row">
      <div class="fg"><label>Batch</label><select id="attBatch">${batchOpts}</select></div>
      <div class="fg"><label>Date</label><input type="date" id="attDate" value="${today}"/></div>
    </div>
    <div class="fg"><label>Session Title</label><input id="attSession" placeholder="e.g. React Hooks Deep Dive"/></div>
  </div>
  <div style="background:#fff;border-radius:14px;border:1px solid var(--line);overflow:hidden">
    <table class="drive-table" style="width:100%">
      <thead><tr><th>Student</th><th>ID</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody id="attBody">${studentRows}</tbody>
    </table>
    <div style="padding:1rem 1.2rem;border-top:1px solid var(--line);display:flex;gap:.7rem;align-items:center">
      <button class="continue-btn" onclick="saveAttendance()">Save Attendance</button>
      <span id="attMsg" style="font-size:.82rem"></span>
    </div>
  </div>`;
}

async function saveAttendance() {
  var batchId = document.getElementById('attBatch') ? document.getElementById('attBatch').value : null;
  var date = document.getElementById('attDate') ? document.getElementById('attDate').value : null;
  var sessionTitle = document.getElementById('attSession') ? document.getElementById('attSession').value : '';
  var msg = document.getElementById('attMsg');
  if (!batchId || !date) { if(msg) msg.textContent = 'Please select batch and date.'; return; }
  var selects = document.querySelectorAll('#attBody select[data-sid]');
  var notes = document.querySelectorAll('#attBody .att-note');
  var records = [];
  selects.forEach(function(sel, i) {
    records.push({ studentId: sel.dataset.sid, status: sel.value, notes: (notes[i] ? notes[i].value : '') });
  });
  try {
    if(msg) { msg.style.color='var(--muted)'; msg.textContent = 'Saving...'; }
    await apiFetch('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ batchId: batchId, date: date, sessionTitle: sessionTitle, records: records })
    });
    if(msg) { msg.style.color='var(--green)'; msg.textContent = 'Attendance saved successfully!'; }
  } catch (e) {
    if(msg) { msg.style.color='var(--red)'; msg.textContent = 'Error: ' + e.message; }
  }
}

var _assignmentsCache = {};
async function renderAssignments(role){
  var res = await apiFetch('/assignments?limit=50');
  var assignments = res.data || [];
  _assignmentsCache = {}; assignments.forEach(function(a){ _assignmentsCache[a._id]=a; });
  var canManage = role==='mentor'||role==='admin';
  if(role==='student'){ setNavBadge('assignments', assignments.filter(function(a){ return !_mySubmission(a); }).length); }
  var head = '<div class="section-head"><span class="section-title">Assessments</span>'+(canManage?'<button class="continue-btn" onclick="addAssignment()">+ New Assignment</button>':'')+'</div>';
  if(!assignments.length) return head+'<div style="padding:2rem;text-align:center;color:var(--muted)">No assessments yet.</div>';
  return head+'<div class="course-list">'+assignments.map(function(a){ return canManage?mentorAssignmentCard(a):studentAssignmentCard(a); }).join('')+'</div>';
}

async function submitAssignment(id) {
  var text = prompt('Enter your submission notes or GitHub link:');
  if (text === null) return;
  try {
    await apiFetch('/assignments/' + id + '/submit', {
      method: 'POST',
      body: JSON.stringify({ content: text })
    });
    alert('Submitted successfully!');
    showPage('assignments');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}


async function renderPlacements(role) {
  var drivesRes = await apiFetch('/placements?limit=20');
  var drives = drivesRes.data || [];
  var myApps = [];
  if (role === 'student') {
    try {
      var appsRes = await apiFetch('/placements/my/applications');
      myApps = (appsRes.data && appsRes.data.applications) ? appsRes.data.applications : [];
    } catch(e) {}
  }
  _drivesCache = {}; drives.forEach(function(d){ _drivesCache[d._id]=d; });
  var appliedIds = new Set(myApps.map(function(a){ return a.drive && (a.drive._id || a.drive); }));
  var openDrives = drives.filter(function(d){ return d.status === 'open'; });
  var isAdmin = role === 'admin';
  var adminAnalytics=''; if(isAdmin){ try{ adminAnalytics=placementAnalyticsHTML((await apiFetch('/placements/analytics')).data||{}); }catch(e){} }
  var tableRows = drives.map(function(d) {
    var applied = appliedIds.has(d._id);
    var pkg = (d.package && d.package.min!=null) ? (d.package.min + (d.package.max!=null&&d.package.max!==d.package.min?'-'+d.package.max:'') + ' LPA') : '-';
    var deadline = d.applicationDeadline ? fmtDate(d.applicationDeadline) : '-';
    var actionBtn;
    if (role === 'student') { actionBtn = applied ? '<button class="apply-btn" style="background:var(--green)" disabled>Applied</button>' : '<button class="apply-btn" onclick="applyDrive(\''+d._id+'\')">Apply Now</button>'; }
    else {
      var _ac = (d.applications && d.applications.length) || d.applicationCount || 0;
      var _ab = '<button class="apply-btn" onclick="viewApplicants(\''+d._id+'\')">Applicants ('+_ac+')</button>';
      actionBtn = isAdmin
        ? '<div style="display:flex;gap:.35rem">'+_ab+'<button class="apply-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editDrive(\''+d._id+'\')">Edit</button><button class="apply-btn" style="background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteDrive(\''+d._id+'\')">Delete</button></div>'
        : _ab;
    }
    var stColor = d.status==='open'?'b-active':d.status==='closed'?'b-due':'b-pending';
    return '<tr>'+
      '<td><span class="co-logo">'+(d.company||'')+'</span></td>'+
      '<td>'+d.role+'</td>'+
      '<td>'+pkg+'</td>'+
      '<td>'+deadline+'</td>'+
      '<td><span class="badge '+stColor+'">'+(d.status||'open')+'</span></td>'+
      '<td>'+actionBtn+'</td>'+
    '</tr>';
  }).join('');

  return `
  <div class="placement-stats">
    <div class="place-stat"><div class="place-stat-ico">&#127970;</div><div class="place-stat-v">${drives.length}</div><div class="place-stat-l">Total Drives</div></div>
    <div class="place-stat"><div class="place-stat-ico">&#128197;</div><div class="place-stat-v">${openDrives.length}</div><div class="place-stat-l">Open Drives</div></div>
    <div class="place-stat"><div class="place-stat-ico">&#128203;</div><div class="place-stat-v">${myApps.length}</div><div class="place-stat-l">Applied</div></div>
    <div class="place-stat"><div class="place-stat-ico">&#127881;</div><div class="place-stat-v">${myApps.filter(function(a){return a.application&&a.application.status==='placed';}).length}</div><div class="place-stat-l">Placed</div></div>
  </div>
  ${adminAnalytics}
  <div class="section-head"><span class="section-title">Placement Drives</span>${isAdmin?'<button class="continue-btn" onclick="addDrive()">+ New Drive</button>':''}</div>
  <div style="background:#fff;border-radius:14px;border:1px solid var(--line);overflow:hidden;margin-bottom:1.5rem">
    ${drives.length ? `<table class="drive-table" style="width:100%">
      <thead><tr><th>Company</th><th>Role</th><th>Package</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>` : '<div style="padding:2rem;text-align:center;color:var(--muted)">No placement drives available.</div>'}
  </div>

  ${role==='admin' ? '' : `<div class="section-head"><span class="section-title">Quick Links</span></div>
  <div class="quick-links">
    <div class="ql-item" onclick="toast('Resume Builder coming soon','info')"><div class="ql-ico">&#128196;</div><div class="ql-label">Resume Builder</div><div class="ql-sub">Create your professional resume</div></div>
    <div class="ql-item" onclick="toast('Interview prep resources coming soon','info')"><div class="ql-ico">&#128104;&#8205;&#128187;</div><div class="ql-label">Interview Prep</div><div class="ql-sub">Practice for interviews</div></div>
    <div class="ql-item" onclick="openLiveChat()"><div class="ql-ico">&#128172;</div><div class="ql-label">Career Guidance</div><div class="ql-sub">Chat with admin</div></div>
  </div>`}`;
}

var _PLC_STAGES=[{v:'applied',l:'Applied'},{v:'shortlisted',l:'Shortlisted'},{v:'interview_scheduled',l:'Interview'},{v:'offered',l:'Offered'},{v:'placed',l:'Placed'},{v:'rejected',l:'Rejected'}];
function plcStageLabel(v){ var s=_PLC_STAGES.filter(function(x){return x.v===v;})[0]; return s?s.l:v; }
async function viewApplicants(id){
  _buildModal('Applicants', '<div style="padding:2rem">'+loadingHTML()+'</div>', '');
  try{
    var res = await apiFetch('/placements/'+id);
    var d = (res.data && (res.data.drive||res.data)) || {};
    var apps = d.applications || [];
    var counts={}; _PLC_STAGES.forEach(function(s){counts[s.v]=0;});
    apps.forEach(function(a){ if(counts[a.status]!=null) counts[a.status]++; });
    var sc={applied:'#64748b',shortlisted:'#2563eb',interview_scheduled:'#d97706',offered:'#7c3aed',placed:'#059669',rejected:'#dc2626'};
    var funnel='<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">'+_PLC_STAGES.map(function(s){ return '<div style="flex:1;min-width:74px;text-align:center;background:'+sc[s.v]+'14;border:1px solid '+sc[s.v]+'33;border-radius:9px;padding:.5rem .3rem"><div style="font-size:1.1rem;font-weight:800;color:'+sc[s.v]+'">'+counts[s.v]+'</div><div style="font-size:.62rem;font-weight:700;color:var(--muted);text-transform:uppercase">'+s.l+'</div></div>'; }).join('')+'</div>';
    var rows = apps.length ? apps.map(function(a){
      var s=a.student||{}; var name=((s.firstName||'')+' '+(s.lastName||'')).trim()||'Student';
      var opts=_PLC_STAGES.map(function(st){ return '<option value="'+st.v+'"'+(st.v===a.status?' selected':'')+'>'+st.l+'</option>'; }).join('');
      var hist=(a.history&&a.history.length)?'<button class="continue-btn" style="padding:.25rem .55rem;font-size:.66rem;background:transparent;color:var(--muted);border:1.5px solid var(--line)" onclick="appHistory(\''+id+'\',\''+a._id+'\')">History ('+a.history.length+')</button>':'';
      var offer=(a.finalOffer&&a.finalOffer.ctc)?'<span style="font-size:.7rem;color:#059669;font-weight:700">&#8377;'+a.finalOffer.ctc+' LPA</span>':'';
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.6rem 0;border-bottom:1px solid var(--line);flex-wrap:wrap">'+
        '<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:.86rem">'+escHtml(name)+' '+offer+'</div><div style="font-size:.72rem;color:var(--muted)">'+escHtml(s.email||'')+((s.studentProfile&&s.studentProfile.resume)?' &bull; <a href="'+escHtml(s.studentProfile.resume)+'" target="_blank" style="color:var(--purple);font-weight:700;text-decoration:none">Resume</a>':'')+'</div></div>'+
        '<div style="display:flex;align-items:center;gap:.4rem">'+hist+'<select onchange="moveAppStage(\''+id+'\',\''+a._id+'\',this.value)" style="padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;font-size:.74rem;font-family:inherit;cursor:pointer">'+opts+'</select></div>'+
      '</div>';
    }).join('') : '<div style="color:var(--muted);font-size:.85rem;padding:.6rem 0">No students have applied yet.</div>';
    var body='<div style="font-size:.82rem;color:var(--muted);margin-bottom:.8rem"><b>'+escHtml(d.company||'')+'</b> &bull; '+escHtml(d.role||'')+' &bull; '+apps.length+' applicant'+(apps.length===1?'':'s')+'</div>'+funnel+rows;
    _buildModal('Applicants — '+escHtml(d.company||'Drive'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
    var box=document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth='600px';
  }catch(e){ _buildModal('Applicants', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); }
}
function moveAppStage(driveId, appId, stage){
  if(stage==='offered'||stage==='placed'){
    formModal({ title:(stage==='placed'?'Mark as Placed':'Record Offer'), submitLabel:'Save',
      fields:[{name:'ctc',label:'Package (LPA)',type:'number',required:true},{name:'location',label:'Job Location'},{name:'note',label:'Note (optional)',type:'textarea'}],
      onSubmit:async function(v){
        if(_demoMode){ toast('Updated (demo)','success'); setTimeout(function(){viewApplicants(driveId);},60); return; }
        await apiFetch('/placements/'+driveId+'/applications/'+appId,{method:'PATCH',body:JSON.stringify({status:stage,finalOffer:{ctc:Number(v.ctc),location:v.location},note:v.note})});
        toast(stage==='placed'?'Marked as placed!':'Offer recorded','success'); setTimeout(function(){viewApplicants(driveId);},60);
      } });
    return;
  }
  if(_demoMode){ toast('Stage updated (demo)','success'); return; }
  apiFetch('/placements/'+driveId+'/applications/'+appId,{method:'PATCH',body:JSON.stringify({status:stage})}).then(function(){ toast('Moved to '+plcStageLabel(stage),'success'); viewApplicants(driveId); }).catch(function(e){ toast(e.message,'error'); });
}
async function appHistory(driveId, appId){
  try{ var res=await apiFetch('/placements/'+driveId); var d=(res.data&&(res.data.drive||res.data))||{}; var a=(d.applications||[]).filter(function(x){return String(x._id)===String(appId);})[0]||{}; var hs=a.history||[];
    var body=hs.length?hs.slice().reverse().map(function(x){ return '<div style="display:flex;gap:.6rem;padding:.45rem 0;border-bottom:1px solid var(--line)"><div style="font-weight:700;font-size:.82rem;min-width:90px">'+plcStageLabel(x.stage)+'</div><div style="font-size:.74rem;color:var(--muted)">'+fmtDate(x.at)+(x.note?' &bull; '+escHtml(x.note):'')+'</div></div>'; }).join(''):'<div style="color:var(--muted)">No stage changes yet.</div>';
    _buildModal('Stage History', body, '<button class="btn-primary" onclick="viewApplicants(\''+driveId+'\')">Back</button>');
  }catch(e){ toast(e.message,'error'); }
}
async function applyDrive(driveId) {
  try {
    await apiFetch('/placements/' + driveId + '/apply', { method: 'POST' });
    alert('Application submitted successfully!');
    showPage('placements');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

var _annCache = {};
async function renderAnnouncements(role) {
  var res = await apiFetch('/announcements?limit=20');
  var anns = res.data || [];
  _annCache = {}; anns.forEach(function(a){ _annCache[a._id]=a; });
  var isAdmin = role === 'admin';
  var typeDots = { placement: 'var(--amber)', urgent: 'var(--red)', holiday: 'var(--green)', event: 'var(--blue)', general: 'var(--purple)' };
  var head = '<div class="section-head"><span class="section-title">Announcements</span>'+
    (isAdmin ? '<button class="continue-btn" onclick="addAnnouncement()">+ New Announcement</button>' : '')+'</div>';
  if (!anns.length) {
    return head + '<div style="padding:2rem;text-align:center;color:var(--muted)">No announcements yet.</div>';
  }
  var rows = anns.map(function(a) {
    var dot = typeDots[a.type] || 'var(--purple)';
    var pinned = a.isPinned ? '<span style="font-size:.7rem;font-weight:700;color:var(--purple);margin-left:.5rem">&#128204; Pinned</span>' : '';
    var adminBtns = isAdmin
      ? '<div style="display:flex;gap:.4rem;margin-top:.6rem"><button class="continue-btn" style="padding:.35rem .8rem;font-size:.72rem;background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editAnnouncement(\''+a._id+'\')">Edit</button>'+
        '<button class="continue-btn" style="padding:.35rem .8rem;font-size:.72rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteAnnouncement(\''+a._id+'\')">Delete</button></div>'
      : '';
    return '<div class="ann-item" style="background:#fff;align-items:stretch">'+
      '<div class="ann-dot" style="background:'+dot+';margin-top:.4rem"></div>'+
      '<div style="flex:1">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem;gap:.6rem">'+
          '<div class="ann-title">'+a.title+pinned+'</div>'+
          '<span style="font-size:.7rem;color:var(--muted);white-space:nowrap">'+fmtDate(a.publishAt||a.createdAt)+'</span>'+
        '</div>'+
        '<div class="ann-body">'+(a.body||'')+'</div>'+
        '<div style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-top:.4rem">'+(a.type||'general')+'</div>'+
        adminBtns+
      '</div>'+
    '</div>';
  }).join('');
  return head + '<div class="ann-list">' + rows + '</div>';
}
function _annForm(title, submitLabel, initial, onSubmit){
  initial = initial || {};
  formModal({
    title:title, submitLabel:submitLabel,
    fields:[
      {name:'title',label:'Title',value:initial.title||'',required:true},
      {name:'body',label:'Message',type:'textarea',value:initial.body||'',required:true},
      {name:'type',label:'Type',type:'select',value:initial.type||'general',options:[{value:'general',label:'General'},{value:'placement',label:'Placement'},{value:'event',label:'Event'},{value:'holiday',label:'Holiday'},{value:'urgent',label:'Urgent'}]},
      {name:'priority',label:'Priority',type:'select',value:initial.priority||'normal',options:[{value:'normal',label:'Normal'},{value:'high',label:'High'},{value:'low',label:'Low'}]},
      {name:'audience',label:'Send to',type:'select',value:initial._aud||'all',options:[{value:'all',label:'Everyone'},{value:'student',label:'Students only'},{value:'mentor',label:'Mentors only'}]}
    ],
    onSubmit:onSubmit
  });
}
function _annPayload(v){
  var aud = v.audience==='all' ? { isPublic:true, roles:['student','mentor','admin'] } : { roles:[v.audience] };
  return { title:v.title, body:v.body, type:v.type, priority:v.priority, audience:aud };
}
function addAnnouncement(){
  _annForm('New Announcement','Send Announcement',{}, async function(v){
    if(_demoMode){ toast('Announcement sent (demo)','success'); return refreshPage(); }
    await apiFetch('/announcements',{method:'POST',body:JSON.stringify(_annPayload(v))});
    toast('Announcement sent','success'); refreshPage();
  });
}
function editAnnouncement(id){
  var a=_annCache[id]||{};
  a._aud = (a.audience&&a.audience.isPublic)?'all':((a.audience&&a.audience.roles&&a.audience.roles[0])||'all');
  _annForm('Edit Announcement','Save Changes',a, async function(v){
    if(_demoMode){ toast('Announcement updated (demo)','success'); return refreshPage(); }
    await apiFetch('/announcements/'+id,{method:'PATCH',body:JSON.stringify(_annPayload(v))});
    toast('Announcement updated','success'); refreshPage();
  });
}
function deleteAnnouncement(id){
  confirmModal('Delete Announcement','Delete this announcement for everyone?','Delete',async function(){
    if(_demoMode){ toast('Announcement deleted (demo)','success'); return refreshPage(); }
    await apiFetch('/announcements/'+id,{method:'DELETE'}); toast('Announcement deleted','success'); refreshPage();
  });
}

// ── Placement drives (admin) ──
var _drivesCache = {};
async function _driveForm(title, submitLabel, initial, onSubmit){
  initial = initial || {};
  var companies=[];
  if(!_demoMode){ try{ var cr=await apiFetch('/companies'); companies=(cr.data||[]).map(function(c){return {value:c.name,label:c.name};}); }catch(e){} }
  var companyField;
  if(companies.length){
    if(initial.company && !companies.some(function(o){return o.value===initial.company;})) companies.unshift({value:initial.company,label:initial.company});
    companyField={name:'company',label:'Company',type:'select',required:true,placeholder:'Select company…',value:initial.company||'',options:companies,help:'From your Company Database. Add more in the Companies tab.'};
  } else {
    companyField={name:'company',label:'Company',value:initial.company||'',required:true,help:'Tip: add reusable employers in the Companies tab to pick them here.'};
  }
  formModal({
    title:title, submitLabel:submitLabel,
    fields:[
      companyField,
      {name:'role',label:'Role',value:initial.role||'',required:true,placeholder:'e.g. Full Stack Developer'},
      {name:'min',label:'Package — Min (LPA)',type:'number',value:(initial.package&&initial.package.min!=null)?initial.package.min:'',required:true,placeholder:'5'},
      {name:'max',label:'Package — Max (LPA)',type:'number',value:(initial.package&&initial.package.max!=null)?initial.package.max:'',required:true,placeholder:'8'},
      {name:'applicationDeadline',label:'Application Deadline',type:'date',value:initial.applicationDeadline?initial.applicationDeadline.slice(0,10):'',required:true},
      {name:'vacancies',label:'Vacancies',type:'number',value:initial.vacancies||'',placeholder:'5'},
      {name:'workMode',label:'Work Mode',type:'select',value:initial.workMode||'onsite',options:[{value:'onsite',label:'On-site'},{value:'hybrid',label:'Hybrid'},{value:'remote',label:'Remote'}]},
      {name:'status',label:'Status',type:'select',value:initial.status||'open',options:[{value:'open',label:'Open'},{value:'draft',label:'Draft'},{value:'closed',label:'Closed'}]},
      {name:'description',label:'Description',type:'textarea',value:initial.description||''}
    ],
    onSubmit:onSubmit
  });
}
function _drivePayload(v){
  return { company:v.company, role:v.role, description:v.description,
    package:{ min:Number(v.min), max:Number(v.max), currency:'INR' },
    applicationDeadline:v.applicationDeadline, vacancies:v.vacancies?Number(v.vacancies):undefined,
    workMode:v.workMode, status:v.status };
}
function addDrive(){
  _driveForm('New Placement Drive','Publish Drive',{}, async function(v){
    if(_demoMode){ toast('Drive published (demo)','success'); return refreshPage(); }
    await apiFetch('/placements',{method:'POST',body:JSON.stringify(_drivePayload(v))});
    toast('Placement drive published','success'); refreshPage();
  });
}
function editDrive(id){
  _driveForm('Edit Drive','Save Changes', _drivesCache[id]||{}, async function(v){
    if(_demoMode){ toast('Drive updated (demo)','success'); return refreshPage(); }
    await apiFetch('/placements/'+id,{method:'PATCH',body:JSON.stringify(_drivePayload(v))});
    toast('Drive updated','success'); refreshPage();
  });
}
function deleteDrive(id){
  confirmModal('Delete Drive','Delete this placement drive?','Delete',async function(){
    if(_demoMode){ toast('Drive deleted (demo)','success'); return refreshPage(); }
    await apiFetch('/placements/'+id,{method:'DELETE'}); toast('Drive deleted','success'); refreshPage();
  });
}

// ── Bulk student import (CSV) ──
function importStudents(){
  var body =
    '<div style="font-size:.82rem;color:var(--ink2);line-height:1.6;margin-bottom:.8rem">Upload a CSV with columns <b>firstName, lastName, email, phone</b> (header row optional). Each student gets the default password <code style="background:var(--bg);padding:.1rem .3rem;border-radius:4px">Password123</code>.</div>'+
    '<div class="mf-field"><label>CSV file</label><input type="file" id="impFile" accept=".csv,text/csv" style="width:100%;font-size:.82rem"></div>'+
    '<div style="text-align:center;font-size:.72rem;color:var(--muted);margin:.3rem 0 .6rem">&mdash; or paste rows &mdash;</div>'+
    '<div class="mf-field"><textarea id="impText" placeholder="Riya,Sharma,riya@example.com,9876500000&#10;Arjun,Mehta,arjun@example.com,9876500001"></textarea></div>'+
    '<a href="#" onclick="downloadStudentTemplate();return false;" style="font-size:.75rem;color:var(--purple);font-weight:700">&#8681; Download CSV template</a>'+
    '<div class="mf-err" id="impErr"></div>'+
    '<div id="impProgress" style="font-size:.8rem;color:var(--muted);margin-top:.6rem"></div>';
  _buildModal('Import Students (Bulk)', body, '<button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" id="impBtn" onclick="runImportStudents()">Import</button>');
}
function downloadStudentTemplate(){
  exportCSV('students-template.csv', ['firstName','lastName','email','phone'], [['Riya','Sharma','riya@example.com','9876500000'],['Arjun','Mehta','arjun@example.com','9876500001']]);
}
function _parseCSV(text){
  var rows = text.split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean)
    .map(function(l){ return l.split(',').map(function(c){ return c.trim().replace(/^"|"$/g,''); }); });
  if(rows.length && /first\s*name|e-?mail/i.test(rows[0].join(','))) rows.shift();
  return rows;
}
async function runImportStudents(){
  var err=document.getElementById('impErr'); err.style.display='none';
  var prog=document.getElementById('impProgress');
  var fileEl=document.getElementById('impFile'); var textEl=document.getElementById('impText');
  var text='';
  if(fileEl && fileEl.files && fileEl.files[0]) text = await fileEl.files[0].text();
  else text = (textEl.value||'');
  if(!text.trim()){ err.textContent='Choose a CSV file or paste at least one row.'; err.style.display='block'; return; }
  var rows=_parseCSV(text);
  if(!rows.length){ err.textContent='No data rows found.'; err.style.display='block'; return; }
  var btn=document.getElementById('impBtn'); btn.disabled=true; btn.textContent='Importing…';
  var ok=0, fail=0, failMsgs=[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    if(r.length<3 || !r[2]){ fail++; failMsgs.push('row '+(i+1)+': missing email'); continue; }
    if(prog) prog.textContent='Importing '+(i+1)+' of '+rows.length+'…';
    if(_demoMode){ ok++; continue; }
    try{ await apiFetch('/users',{method:'POST',body:JSON.stringify({ firstName:r[0], lastName:r[1]||'', email:r[2], phone:r[3]||'', role:'student', password:'Password123' })}); ok++; }
    catch(e){ fail++; failMsgs.push((r[2]||'row '+(i+1))+': '+e.message); }
  }
  closeModal();
  toast('Imported '+ok+' student'+(ok!==1?'s':'')+(fail?(' · '+fail+' failed'):''), fail?'info':'success');
  if(failMsgs.length) console.warn('Import failures:\n'+failMsgs.join('\n'));
  refreshPage();
}
