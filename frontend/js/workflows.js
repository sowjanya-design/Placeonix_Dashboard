/*
 * Placeonix Hub — Workflows namespace.
 * The multi-step "actions" that tie records together, beyond simple CRUD:
 * the assignment lifecycle (create → submit → grade), course-progress tracking,
 * the gamification leaderboard, lead→student conversion, batch enrollment,
 * session management (start/complete/record), online-join request approvals,
 * and the render functions for the admin/mentor management pages plus support
 * chat. Loaded after core.js + ui.js (uses apiFetch, formModal, toast, etc.).
 */
// ───────────────────────── ASSESSMENTS / ASSIGNMENTS ─────────────────────────
/** Find the current student's submission inside an assignment (or null if they haven't submitted yet). */
function _mySubmission(a){
  if(!a.submissions || !_currentUser) return null;
  return a.submissions.find(function(s){ return s.student && (s.student._id===_currentUser._id || s.student===_currentUser._id); });
}
/** Render an assignment card from the student's view — shows their status (pending/submitted/graded/overdue) and a submit button. */
function studentAssignmentCard(a){
  var due = a.dueDate ? fmtDate(a.dueDate) : '—';
  var overdue = a.dueDate && new Date(a.dueDate).getTime() < Date.now();
  var my = _mySubmission(a);
  var graded = my && (my.score!=null || my.status==='reviewed');
  var statusBadge = graded ? '<span class="badge b-graded">Graded · '+(my.score!=null?my.score:'?')+'/'+(a.maxScore||100)+'</span>'
    : my ? '<span class="badge b-active">Submitted</span>'
    : overdue ? '<span class="badge b-due">Overdue</span>' : '<span class="badge b-pending">Pending</span>';
  var feedback = (graded && my.mentorFeedback) ? '<div class="sched-covers" style="margin-top:.45rem"><b>Mentor feedback:</b> '+my.mentorFeedback+'</div>' : '';
  var btnLabel = my ? 'Resubmit' : 'Submit Work';
  return '<div class="course-row" style="flex-direction:column;align-items:stretch;gap:.5rem">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem">'+
      '<div style="min-width:0"><div class="course-name">&#128221; '+a.title+'</div>'+
      '<div class="course-desc">'+((a.course&&a.course.title)||'')+' · '+(a.type||'homework')+' · Due '+due+'</div></div>'+
      statusBadge+
    '</div>'+
    (a.description?'<div style="font-size:.8rem;color:var(--muted);line-height:1.5">'+a.description+'</div>':'')+
    feedback+
    '<div><button class="continue-btn" style="padding:.5rem 1.1rem" onclick="submitWork(\''+a._id+'\')">'+btnLabel+'</button></div>'+
  '</div>';
}
/** Render an assignment card from the mentor's view — submission counts plus view/edit/delete actions. */
function mentorAssignmentCard(a){
  var due = a.dueDate ? fmtDate(a.dueDate) : '—';
  var subs = (a.submissions||[]).length;
  var graded = (a.submissions||[]).filter(function(s){ return s.status==='reviewed'; }).length;
  return '<div class="course-row" style="flex-direction:column;align-items:stretch;gap:.55rem">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem">'+
      '<div style="min-width:0"><div class="course-name">&#128221; '+a.title+'</div>'+
      '<div class="course-desc">'+((a.course&&a.course.title)||'')+(a.batch?' · '+(a.batch.name||''):'')+' · Due '+due+'</div></div>'+
      '<span class="badge '+(subs?'b-graded':'b-pending')+'">'+subs+' submission'+(subs!==1?'s':'')+(graded?' · '+graded+' graded':'')+'</span>'+
    '</div>'+
    '<div style="display:flex;gap:.5rem;flex-wrap:wrap">'+
      '<button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem" onclick="viewSubmissions(\''+a._id+'\')">&#128203; View Submissions</button>'+
      '<button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem;background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editAssignment(\''+a._id+'\')">Edit</button>'+
      '<button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteAssignment(\''+a._id+'\')">Delete</button>'+
    '</div>'+
  '</div>';
}
/** Student submission form: paste a Drive/GitHub link and optional notes against an assignment. */
function submitWork(id){
  var a=_assignmentsCache[id]||{}; var my=_mySubmission(a)||{};
  formModal({
    title:'Submit: '+(a.title||'Assessment'), submitLabel:'Submit Work',
    fields:[
      {name:'githubLink',label:'Submission link (Google Drive / GitHub / etc.)',value:my.githubLink||'',placeholder:'https://…',help:'Upload your file to Drive/GitHub and paste the share link here.'},
      {name:'content',label:'Notes (optional)',type:'textarea',value:my.content||''}
    ],
    onSubmit:async function(v){
      if(!v.githubLink && !v.content) throw new Error('Add a submission link or some notes.');
      if(_demoMode){ if(a.submissions){a.submissions=a.submissions.filter(function(s){return String(s.student&&(s.student._id||s.student))!==String(_currentUser._id);}); a.submissions.push({student:_currentUser._id, content:v.content, githubLink:v.githubLink, status:'submitted', submittedAt:new Date().toISOString()});} toast('Work submitted (demo)','success'); return refreshPage(); }
      await apiFetch('/assignments/'+id+'/submit',{method:'POST',body:JSON.stringify({ content:v.content, githubLink:v.githubLink })});
      toast('Work submitted successfully','success'); refreshPage();
    }
  });
}
/** Shared add/edit assignment form (loads course + batch dropdown options first). */
async function _assignmentForm(title, submitLabel, initial, onSubmit){
  initial = initial || {};
  var courses = _demoMode ? _DEMO_COURSES.map(function(c){return{value:c._id,label:c.title};}) : await loadOptions('/courses?limit=100',function(c){return c.title;});
  var batches = _demoMode ? _DEMO_BATCHES.map(function(b){return{value:b._id,label:b.name};}) : await loadOptions('/batches?limit=100',function(b){return b.name;});
  formModal({
    title:title, submitLabel:submitLabel,
    fields:[
      {name:'title',label:'Title',value:initial.title||'',required:true},
      {name:'description',label:'Instructions',type:'textarea',value:initial.description||'',required:true},
      {name:'course',label:'Course',type:'select',required:true,placeholder:'Select course…',value:(initial.course&&(initial.course._id||initial.course))||'',options:courses},
      {name:'batch',label:'Batch',type:'select',required:true,placeholder:'Select batch…',value:(initial.batch&&(initial.batch._id||initial.batch))||'',options:batches},
      {name:'dueDate',label:'Due Date',type:'date',value:initial.dueDate?initial.dueDate.slice(0,10):'',required:true},
      {name:'type',label:'Type',type:'select',value:initial.type||'homework',options:[{value:'homework',label:'Homework'},{value:'project',label:'Project'},{value:'mini-project',label:'Mini Project'},{value:'capstone',label:'Capstone'},{value:'quiz',label:'Quiz'}]},
      {name:'maxScore',label:'Max Score',type:'number',value:initial.maxScore||100},
      {name:'difficulty',label:'Difficulty',type:'select',value:initial.difficulty||'medium',options:[{value:'easy',label:'Easy'},{value:'medium',label:'Medium'},{value:'hard',label:'Hard'}]}
    ],
    onSubmit:onSubmit
  });
}
/** Normalise assignment form values into the shape the API expects. */
function _assignmentPayload(v){
  return { title:v.title, description:v.description, course:v.course, batch:v.batch, dueDate:v.dueDate,
    type:v.type, maxScore:v.maxScore?Number(v.maxScore):100, difficulty:v.difficulty, status:'published' };
}
/** Create a new assignment and publish it so students can see it. */
function addAssignment(){
  _assignmentForm('New Assignment','Assign to Students', {}, async function(v){
    if(_demoMode){ toast('Assignment created (demo)','success'); return refreshPage(); }
    await apiFetch('/assignments',{method:'POST',body:JSON.stringify(_assignmentPayload(v))});
    toast('Assignment created — now visible to students','success'); refreshPage();
  });
}
/** Edit an existing assignment. */
function editAssignment(id){
  _assignmentForm('Edit Assignment','Save Changes', _assignmentsCache[id]||{}, async function(v){
    if(_demoMode){ toast('Assignment updated (demo)','success'); return refreshPage(); }
    await apiFetch('/assignments/'+id,{method:'PATCH',body:JSON.stringify(_assignmentPayload(v))});
    toast('Assignment updated','success'); refreshPage();
  });
}
/** Delete an assignment and all its submissions (behind a confirm). */
function deleteAssignment(id){
  confirmModal('Delete Assignment','Delete this assessment and all its submissions?','Delete',async function(){
    if(_demoMode){ toast('Assignment deleted (demo)','success'); return refreshPage(); }
    await apiFetch('/assignments/'+id,{method:'DELETE'}); toast('Assignment deleted','success'); refreshPage();
  });
}
/** Mentor view: list every student's submission for an assignment, each with inline score + feedback inputs. */
async function viewSubmissions(id){
  _buildModal('Submissions', '<div style="padding:2rem">'+loadingHTML()+'</div>', '');
  var a = _assignmentsCache[id] || {};
  if(!_demoMode){
    try{ var res=await apiFetch('/assignments/'+id); a=(res.data&&res.data.assignment)||res.data||a; }catch(e){}
  }
  var subs=a.submissions||[];
  var body;
  if(!subs.length){
    body='<div style="padding:1rem;color:var(--muted);font-size:.85rem">No submissions yet. Students appear here once they submit.</div>';
  } else {
    body=subs.map(function(s){
      var st=s.student||{}; var name=((st.firstName||'')+' '+(st.lastName||'')).trim()||'Student';
      var link = s.githubLink ? '<a href="'+s.githubLink+'" target="_blank" style="color:var(--purple);font-weight:600;word-break:break-all">'+s.githubLink+'</a>' : '';
      var stB = s.status==='reviewed'?'b-graded':(s.status==='late'?'b-due':'b-active');
      return '<div style="border:1px solid var(--line);border-radius:11px;padding:.85rem;margin-bottom:.7rem">'+
        '<div style="display:flex;justify-content:space-between;align-items:center"><b>'+name+'</b><span class="badge '+stB+'">'+s.status+'</span></div>'+
        '<div style="font-size:.7rem;color:var(--muted);margin-top:.2rem">Submitted '+fmtDate(s.submittedAt)+'</div>'+
        (s.content?'<div style="font-size:.82rem;color:var(--ink2);margin-top:.4rem">'+s.content+'</div>':'')+
        (link?'<div style="font-size:.78rem;margin-top:.35rem">&#128279; '+link+'</div>':'')+
        '<div style="display:flex;gap:.4rem;margin-top:.6rem;align-items:center">'+
          '<input id="sc_'+s._id+'" type="number" placeholder="Score /'+(a.maxScore||100)+'" value="'+(s.score!=null?s.score:'')+'" style="width:110px;border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;font-size:.82rem">'+
          '<input id="fb_'+s._id+'" placeholder="Feedback" value="'+((s.mentorFeedback||'').replace(/"/g,'&quot;'))+'" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;font-size:.82rem">'+
          '<button class="btn-primary" style="padding:.45rem .9rem" onclick="gradeSubmission(\''+id+'\',\''+s._id+'\')">Save</button>'+
        '</div>'+
      '</div>';
    }).join('');
  }
  _buildModal('Submissions — '+(a.title||'Assessment'), body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
  var box=document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth='640px';
}
/** Save a score + feedback for one submission and push it back to the student. */
async function gradeSubmission(aid, sid){
  var scEl=document.getElementById('sc_'+sid), fbEl=document.getElementById('fb_'+sid);
  var score=scEl?scEl.value:''; var fb=fbEl?fbEl.value:'';
  if(score===''){ toast('Enter a score first','info'); return; }
  if(_demoMode){ toast('Grade saved (demo)','success'); return; }
  try{
    await apiFetch('/assignments/'+aid+'/submissions/'+sid+'/review',{method:'POST',body:JSON.stringify({ score:Number(score), feedback:fb })});
    toast('Grade saved & sent to student','success');
    var btn = scEl && scEl.parentNode ? scEl.parentNode.querySelector('button') : null; if(btn){ btn.textContent='Saved'; }
  }catch(e){ toast(e.message,'error'); }
}

// ───────────────────────── PROGRESS TRACKING ─────────────────────────
/** Mark a course module complete/incomplete, updating the student's overall progress percentage. */
async function toggleModule(eid, mid, completed){
  if(_demoMode){ toast(completed?'Module marked complete (demo)':'Marked incomplete (demo)','success'); return; }
  try{
    var res=await apiFetch('/users/me/enrollments/'+eid+'/progress',{method:'PATCH',body:JSON.stringify({moduleId:mid,completed:completed})});
    toast(completed?('Module completed! Course progress: '+((res.data&&res.data.overall)||0)+'%'):'Marked incomplete','success');
    refreshPage();
  }catch(e){ toast(e.message,'error'); }
}

// ───────────────────────── GAMIFICATION / LEADERBOARD ─────────────────────────
/** Compute the achievement badges (Topper, Perfect Attendance, Fast Learner…) a leaderboard row has earned. */
function _badgesFor(r){
  var b=[];
  if(r.rank===1) b.push('&#129351; Topper');
  else if(r.rank<=3) b.push('&#127942; Top 3');
  if(r.attendance>=90) b.push('&#9989; Perfect Attendance');
  if(r.progress>=80) b.push('&#128218; Fast Learner');
  if(r.progress>=100) b.push('&#127891; Course Complete');
  return b;
}
/** Render the points leaderboard; highlights the current student and shows their personal rank banner. */
async function renderLeaderboard(role){
  var res = await apiFetch('/users/leaderboard');
  var rows = res.data || [];
  var meId = _currentUser ? _currentUser._id : null;
  var medal = ['&#129351;','&#129352;','&#129353;'];
  var list = rows.length ? rows.map(function(r,i){
    var isMe = String(r.id)===String(meId);
    var rankBadge = i<3 ? '<span style="font-size:1.4rem">'+medal[i]+'</span>' : '<span style="font-weight:800;color:var(--muted);width:1.4rem;display:inline-block;text-align:center">'+r.rank+'</span>';
    var badges = _badgesFor(r).map(function(x){ return '<span class="badge" style="background:var(--purple-lt);color:var(--purple);margin-left:.3rem">'+x+'</span>'; }).join('');
    return '<div class="course-row" style="'+(isMe?'border:1.5px solid var(--purple);background:var(--purple-lt)':'')+'">'+
      '<div style="width:34px;text-align:center;flex-shrink:0">'+rankBadge+'</div>'+
      '<div class="course-info"><div class="course-name">'+r.name+(isMe?' <span style="font-size:.7rem;color:var(--purple);font-weight:700">(You)</span>':'')+'</div>'+
      '<div class="course-desc">'+r.progress+'% progress &bull; '+r.attendance+'% attendance'+badges+'</div></div>'+
      '<div style="text-align:right;flex-shrink:0"><div style="font-size:1.2rem;font-weight:800;color:var(--purple)">'+r.points.toLocaleString('en-IN')+'</div><div style="font-size:.66rem;color:var(--muted);font-weight:600">POINTS</div></div>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No students ranked yet.</div>';
  var me = rows.filter(function(r){ return String(r.id)===String(meId); })[0];
  var myCard = (role==='student' && me) ? '<div class="welcome-banner" style="margin-bottom:1.3rem"><div>'+
    '<div class="wb-title">You are ranked #'+me.rank+' of '+rows.length+' &#127919;</div>'+
    '<div class="wb-sub">'+me.points.toLocaleString('en-IN')+' points &bull; '+me.progress+'% progress &bull; '+me.attendance+'% attendance. Keep going to climb the leaderboard!</div>'+
    '</div><div class="wb-illus">&#127942;</div></div>' : '';
  return myCard + '<div class="section-head"><span class="section-title">Leaderboard '+
    '<span style="font-size:.72rem;font-weight:600;color:var(--muted)">points = progress &times;10 + attendance &times;5</span></span></div>'+
    '<div class="course-list">'+list+'</div>';
}

// ───────────────────────── LEAD → STUDENT CONVERSION ─────────────────────────
/** Convert a CRM lead into a real student account (pre-fills the lead's details, marks it converted, then shows credentials). */
function convertLead(id){
  var l = _leadsCache.find ? null : null;
  var lead = (_leadsCache && _leadsCache.filter) ? _leadsCache.filter(function(x){return x._id===id;})[0] : null;
  lead = lead || {};
  formModal({
    title:'Convert Lead to Student', submitLabel:'Create Student',
    fields:[
      {name:'firstName',label:'First Name',value:lead.firstName||'',required:true},
      {name:'lastName',label:'Last Name',value:lead.lastName||'',required:true},
      {name:'email',label:'Email',type:'email',value:lead.email||'',required:true},
      {name:'phone',label:'Phone',type:'tel',value:lead.phone||''},
      {name:'password',label:'Temp Password',value:'Password123',required:true,help:'Student can change after first login.'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Lead converted to student (demo)','success'); refreshPage(); setTimeout(function(){ showCredentials('Student', v.email, v.password); },80); return; }
      v.role='student';
      await apiFetch('/users',{method:'POST',body:JSON.stringify(v)});
      try{ await apiFetch('/leads/'+id,{method:'PATCH',body:JSON.stringify({status:'converted'})}); }catch(e){}
      toast('Lead converted - student account created','success'); refreshPage(); setTimeout(function(){ showCredentials('Student', v.email, v.password); },80);
    }
  });
}

// ───────────────────────── BATCH ENROLLMENT (admin) ─────────────────────────
/** Batch management modal: lists enrolled students with remove/enroll actions. */
async function manageBatch(id){
  _buildModal('Manage Batch', '<div style="padding:2rem">'+loadingHTML()+'</div>', '');
  var batch={}, enrollments=[];
  if(_demoMode){
    batch={name:'FSWD Batch A',course:{title:'Full Stack Web Development'},mentor:{firstName:'Priya',lastName:'Sharma'},capacity:30};
    enrollments=[{student:{_id:'st1',firstName:'Arjun',lastName:'Reddy',email:'arjun@placeonix.in'}}];
  } else {
    try{ var res=await apiFetch('/batches/'+id); var d=res.data||{}; batch=d.batch||d; enrollments=d.enrollments||[]; }
    catch(e){ _buildModal('Manage Batch', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); return; }
  }
  var courseName = batch.course ? (batch.course.title||'') : '';
  var mentorName = batch.mentor ? (((batch.mentor.firstName||'')+' '+(batch.mentor.lastName||'')).trim()||'Unassigned') : 'Unassigned';
  var rows = enrollments.length ? enrollments.map(function(e){
    var s=e.student||{}; var name=((s.firstName||'')+' '+(s.lastName||'')).trim()||'Student';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px solid var(--line)">'+
      '<div><div style="font-weight:600;font-size:.86rem">'+name+'</div><div style="font-size:.72rem;color:var(--muted)">'+(s.email||'')+'</div></div>'+
      '<button class="continue-btn" style="padding:.35rem .8rem;font-size:.7rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="unenrollStudent(\''+id+'\',\''+s._id+'\')">Remove</button>'+
    '</div>';
  }).join('') : '<div style="color:var(--muted);font-size:.85rem;padding:.6rem 0">No students enrolled yet. Use "Enroll Student" below.</div>';
  var body = '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;font-size:.8rem;color:var(--ink2);margin-bottom:1rem">'+
      '&#128218; <b>'+courseName+'</b> &nbsp;&bull;&nbsp; &#128104;&#8205;&#127979; Mentor: <b>'+mentorName+'</b> &nbsp;&bull;&nbsp; '+enrollments.length+'/'+(batch.capacity||'∞')+' seats</div>'+
    '<div style="font-size:.82rem;font-weight:800;color:var(--ink);margin-bottom:.4rem">Enrolled Students ('+enrollments.length+')</div>'+rows;
  var foot = '<button class="btn-secondary" onclick="closeModal()">Close</button><button class="btn-primary" onclick="enrollStudentModal(\''+id+'\')">+ Enroll Student</button>';
  _buildModal('Manage: '+(batch.name||'Batch'), body, foot);
  var box=document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth='560px';
}
/** Enroll a chosen student into a batch (also adds them to its course and mentor). */
async function enrollStudentModal(batchId){
  var students = _demoMode ? [{value:'st1',label:'Arjun Reddy'},{value:'st2',label:'Sneha Patel'}] : await loadOptions('/users?role=student&limit=300',fullName);
  formModal({
    title:'Enroll Student into Batch', submitLabel:'Enroll',
    fields:[{name:'studentId',label:'Student',type:'select',required:true,placeholder:'Select student…',options:students,help:'They get added to this course and assigned to this batch\'s mentor.'}],
    onSubmit:async function(v){
      if(_demoMode){ toast('Student enrolled (demo)','success'); setTimeout(function(){ manageBatch(batchId); },70); return; }
      await apiFetch('/batches/'+batchId+'/enroll',{method:'POST',body:JSON.stringify({studentId:v.studentId})});
      toast('Student enrolled — added to course & mentor','success'); setTimeout(function(){ manageBatch(batchId); },70);
    }
  });
}
/** Remove a student from a batch and its course (behind a confirm). */
function unenrollStudent(batchId, studentId){
  confirmModal('Remove Student','Remove this student from the batch (and its course)?','Remove',async function(){
    if(_demoMode){ toast('Student removed (demo)','success'); setTimeout(function(){ manageBatch(batchId); },70); return; }
    await apiFetch('/batches/'+batchId+'/enroll/'+studentId,{method:'DELETE'});
    toast('Student removed','success'); setTimeout(function(){ manageBatch(batchId); },70);
  });
}
// Open batch management filtered by a mentor or course (assign-to-mentor / add-to-course)
/** Open batch management filtered by a mentor or course — resolves to the single matching batch, or asks which one. */
async function manageBatchFor(kind, id, label){
  if(_demoMode){ manageBatch('demo'); return; }
  var res = await apiFetch('/batches?limit=200');
  var all = res.data || [];
  var batches = all.filter(function(b){
    var v = kind==='mentor' ? (b.mentor&&(b.mentor._id||b.mentor)) : (b.course&&(b.course._id||b.course));
    return String(v)===String(id);
  });
  if(!batches.length){ toast('No batches found for this '+kind+'. Create a batch first, then enroll students.','info'); return; }
  if(batches.length===1){ manageBatch(batches[0]._id); return; }
  formModal({
    title:'Select a Batch'+(label?' — '+label:''), submitLabel:'Manage',
    fields:[{name:'batchId',label:'Batch',type:'select',required:true,options:batches.map(function(b){return{value:b._id,label:b.name||b.code};})}],
    onSubmit:async function(v){ setTimeout(function(){ manageBatch(v.batchId); },60); }
  });
}


/** Render the profile page: editable personal info; students also get degree/resume fields and live course/attendance/progress stats. */
async function renderProfile(role) {
  var cfg = ROLES[role];
  var u = _currentUser || {};
  var sp = u.studentProfile || {};
  var mp = u.mentorProfile || {};
  var skills = sp.skills || mp.specialization || [];
  var initials = ((u.firstName||'')[0]||'') + ((u.lastName||'')[0]||'');
  var enrollId = sp.enrollmentId || u._id || '';
  var statCourses='—', statAtt='—', statProg='—';
  if(role==='student'){
    if(_demoMode){ statCourses=2; statAtt='91%'; statProg='68%'; }
    else { try{
      var _enr=(await apiFetch('/users/me/enrollments')).data||[];
      statCourses=_enr.length;
      statProg=(_enr.length?Math.round(_enr.reduce(function(a,e){return a+((e.progress&&e.progress.overall)||0);},0)/_enr.length):0)+'%';
      var _att=(await apiFetch('/attendance/me').catch(function(){return{data:{}};})).data||{};
      var _as=_att.summary||{}; statAtt=(_as.percentage!=null?_as.percentage:0)+'%';
    }catch(e){} }
  }
  return `
  <div class="profile-grid">
    <div>
      <div class="profile-card">
        <div class="profile-header"><div class="profile-av-wrap"><div class="profile-av" style="background:${cfg.color}">${initials||cfg.initials}</div></div></div>
        <div class="profile-body">
          <div class="profile-name">${(u.firstName||'')+' '+(u.lastName||'')}</div>
          <div class="profile-id">${enrollId} &bull; ${cfg.label}</div>
          <div class="profile-stat-row">
            <div class="profile-stat"><div class="profile-stat-v">${statCourses}</div><div class="profile-stat-l">Courses</div></div>
            <div class="profile-stat"><div class="profile-stat-v">${statAtt}</div><div class="profile-stat-l">Attendance</div></div>
            <div class="profile-stat"><div class="profile-stat-v">${statProg}</div><div class="profile-stat-l">Progress</div></div>
          </div>
          ${skills.length ? '<div style="font-size:.78rem;font-weight:600;color:var(--muted);margin-bottom:.5rem">Skills</div><div class="skill-tags">'+skills.map(function(s){return '<span class="skill-tag">'+s+'</span>';}).join('')+'</div>' : ''}
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Personal Information</div>
      <div class="form-row">
        <div class="fg"><label>First Name</label><input id="profFirst" value="${u.firstName||''}"/></div>
        <div class="fg"><label>Last Name</label><input id="profLast" value="${u.lastName||''}"/></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Email</label><input value="${u.email||''}" readonly style="background:var(--bg)"/></div>
        <div class="fg"><label>Phone</label><input id="profPhone" value="${u.phone||''}"/></div>
      </div>
      ${role==='student'?`
      <div class="form-row">
        <div class="fg"><label>Degree</label><input id="profDegree" value="${sp.degree||''}"/></div>
        <div class="fg"><label>Graduation Year</label><input id="profGrad" value="${sp.graduationYear||''}"/></div>
      </div>
      <div class="fg" style="margin-bottom:1rem"><label>Resume Link <span style="color:var(--muted);font-weight:400">(Google Drive / PDF URL — attached when you apply to placement drives)</span></label><input id="profResume" value="${sp.resume||''}" placeholder="https://drive.google.com/…"/></div>`:``}
      <div class="fg" style="margin-bottom:1rem"><label>About Me</label><textarea id="profBio" rows="3">${u.bio||''}</textarea></div>
      <button class="save-btn" onclick="saveProfile()">Save Changes</button>
      <span id="profMsg" style="font-size:.82rem;margin-left:1rem"></span>
    </div>
  </div>`;
}

/** Persist profile edits, using dot-notation keys so we patch individual studentProfile fields without clobbering the whole object. */
async function saveProfile() {
  var msg = document.getElementById('profMsg');
  var body = {
    firstName: (document.getElementById('profFirst') || {}).value || undefined,
    lastName: (document.getElementById('profLast') || {}).value || undefined,
    phone: (document.getElementById('profPhone') || {}).value || undefined,
    bio: (document.getElementById('profBio') || {}).value || undefined
  };
  // Student profile fields (dot-notation so we don't overwrite the whole studentProfile)
  var _rz=document.getElementById('profResume'); if(_rz) body['studentProfile.resume']=_rz.value||'';
  var _dg=document.getElementById('profDegree'); if(_dg && _dg.value) body['studentProfile.degree']=_dg.value;
  var _gy=document.getElementById('profGrad'); if(_gy && _gy.value) body['studentProfile.graduationYear']=_gy.value;
  Object.keys(body).forEach(function(k){ if(body[k]===undefined) delete body[k]; });
  try {
    if(msg){ msg.style.color='var(--muted)'; msg.textContent='Saving...'; }
    var res = await apiFetch('/users/' + (_currentUser && _currentUser._id), {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    _currentUser = Object.assign({}, _currentUser, body);
    if(msg){ msg.style.color='var(--green)'; msg.textContent='Saved!'; }
  } catch(e) {
    if(msg){ msg.style.color='var(--red)'; msg.textContent='Error: '+e.message; }
  }
}


var _sessionsCache = {};
/** Escape a string so it's safe inside a single-quoted inline onclick argument. */
function _escArg(s){ return (s||'').replace(/'/g,'&#39;'); }
/** Convert an ISO timestamp into the value format an <input type=datetime-local> expects. */
function toLocalInput(iso){ if(!iso) return ''; var d=new Date(iso); var p=function(n){return String(n).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }
/** Build the mentor/admin action row for a session (start/complete/copy-link/recording/edit/delete) based on its current status. */
function sessionManageRow(s){
  var st=(s.status||'scheduled').toLowerCase();
  var sm='style="padding:.4rem .8rem;font-size:.72rem"';
  var ghost='style="padding:.4rem .8rem;font-size:.72rem;background:transparent;color:var(--ink2);border:1.5px solid var(--line)"';
  var b=[];
  if(st==='scheduled') b.push('<button class="continue-btn" '+sm+' onclick="startSession(\''+s._id+'\')">&#9654; Start</button>');
  if(st==='live') b.push('<button class="continue-btn" '+sm+' onclick="completeSession(\''+s._id+'\')">&#9632; Complete</button>');
  if(s.meetingLink) b.push('<button class="continue-btn" '+ghost+' onclick="copyLink(\''+s.meetingLink+'\')">&#10697; Copy Link</button>');
  else if(st==='scheduled'||st==='live') b.push('<button class="continue-btn" '+sm+' onclick="generateMeetLink(\''+s._id+'\')">&#9889; Generate Link</button>');
  if(st==='completed') b.push('<button class="continue-btn" '+sm+' onclick="addRecording(\''+s._id+'\')">'+(s.recordingUrl?'&#8635; Update Recording':'&#8593; Upload Recording')+'</button>');
  if(s.recordingUrl) b.push('<button class="continue-btn" '+sm+' style="padding:.4rem .8rem;font-size:.72rem;background:var(--ink-panel)" onclick="watchRecording(\''+s.recordingUrl+'\',\''+_escArg(s.title)+'\')">&#9654; Recording</button>');
  b.push('<button class="continue-btn" '+ghost+' onclick="editSession(\''+s._id+'\')">Edit</button>');
  b.push('<button class="continue-btn" style="padding:.4rem .8rem;font-size:.72rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteSession(\''+s._id+'\',\''+_escArg(s.title)+'\')">Delete</button>');
  return '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.7rem">'+b.join('')+'</div>';
}
/** Render the sessions list; mentors/admins get management controls, students get join buttons. */
async function renderSessions(role){
  var res = await apiFetch('/sessions?limit=50');
  var sessions = res.data || [];
  _sessionsCache = {}; sessions.forEach(function(s){ _sessionsCache[s._id]=s; });
  var canManage = role === 'mentor' || role === 'admin';
  var statusStyle = { scheduled:['var(--blue-lt)','var(--blue)'], live:['var(--red-lt)','var(--red)'], completed:['var(--green-lt)','var(--green)'], cancelled:['var(--bg)','var(--muted)'] };
  var addBtn = canManage ? '<button class="continue-btn" onclick="addSession()">+ Schedule Session</button>' : '';
  return '<div class="section-head"><span class="section-title">'+(canManage?'Manage Sessions':'My Sessions')+'</span>'+addBtn+'</div>'+
  '<div class="ann-list">'+ (sessions.length ? sessions.map(function(s){
    var st = (s.status||'scheduled').toLowerCase();
    var sc = statusStyle[st] || statusStyle.scheduled;
    var batchName = s.batch ? (s.batch.name||'') : '';
    var mentorName = s.instructor ? ((s.instructor.firstName||'')+' '+(s.instructor.lastName||'')).trim() : (s.mentor?((s.mentor.firstName||'')+' '+(s.mentor.lastName||'')).trim():'');
    var covers = (s.agenda&&s.agenda.length)?'<div class="sched-covers" style="margin-top:.3rem"><b>Covers:</b> '+s.agenda.slice(0,3).join(' &bull; ')+'</div>':'';
    var joinBtn = (st==='live'||st==='scheduled') && s.meetingLink
      ? '<a href="'+s.meetingLink+'" target="_blank" class="continue-btn" style="text-decoration:none;padding:.4rem .9rem;font-size:.72rem">'+(st==='live'?'&#128308; Join':'Join')+'</a>' : '';
    return '<div class="ann-item" style="align-items:stretch">'+
      '<div class="ann-dot" style="background:'+sc[1]+';margin-top:.4rem"></div>'+
      '<div style="flex:1">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem">'+
          '<div class="ann-title">'+(s.title||'Session')+'</div>'+
          '<span class="badge" style="background:'+sc[0]+';color:'+sc[1]+'">'+st+'</span>'+
        '</div>'+
        '<div class="ann-body" style="margin-top:.25rem">'+[batchName, mentorName].filter(Boolean).join(' &bull; ')+'</div>'+
        covers+
        '<div class="ann-date" style="display:flex;justify-content:space-between;align-items:center;margin-top:.4rem">'+
          '<span>&#128197; '+fmtDate(s.startTime)+' &bull; '+fmtTime(s.startTime)+(s.venue?' &bull; &#128205; '+s.venue:'')+'</span>'+joinBtn+
        '</div>'+
        (canManage ? sessionManageRow(s) : '')+
      '</div>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted);font-size:.85rem">No sessions scheduled.</div>') + '</div>';
}
/** Copy a meeting link to the clipboard. */
function copyLink(url){
  if(navigator.clipboard) navigator.clipboard.writeText(url).then(function(){toast('Meeting link copied','success');},function(){toast('Link: '+url,'info');});
  else toast('Link: '+url,'info');
}
/** Mark a scheduled session as live. */
async function startSession(id){
  if(_demoMode){ toast('Session is now live (demo)','success'); return refreshPage(); }
  try{ await apiFetch('/sessions/'+id+'/start',{method:'PATCH'}); toast('Session is now live','success'); refreshPage(); }
  catch(e){ toast(e.message,'error'); }
}
/** Mark a live session complete (which unlocks recording upload). */
async function completeSession(id){
  if(_demoMode){ toast('Session marked complete (demo)','success'); return refreshPage(); }
  try{ await apiFetch('/sessions/'+id+'/complete',{method:'PATCH'}); toast('Session marked complete — you can now upload a recording','success'); refreshPage(); }
  catch(e){ toast(e.message,'error'); }
}
/** Generate a Google-Meet-style link and save it onto the session. */
function generateMeetLink(id){
  var link='https://meet.google.com/plx-'+Math.random().toString(36).slice(2,6)+'-'+Math.random().toString(36).slice(2,6);
  if(_demoMode){ toast('Meeting link generated (demo)','success'); return refreshPage(); }
  apiFetch('/sessions/'+id,{method:'PATCH',body:JSON.stringify({meetingLink:link})})
    .then(function(){ toast('Meeting link generated & saved','success'); refreshPage(); })
    .catch(function(e){ toast(e.message,'error'); });
}
/** Edit a session's title, time, meeting link or venue. */
function editSession(id){
  var s=_sessionsCache[id]||{};
  formModal({
    title:'Edit Session', submitLabel:'Save Changes',
    fields:[
      {name:'title',label:'Title',value:s.title||'',required:true},
      {name:'startTime',label:'Start',type:'datetime-local',value:toLocalInput(s.startTime),required:true},
      {name:'endTime',label:'End',type:'datetime-local',value:toLocalInput(s.endTime),required:true},
      {name:'meetingLink',label:'Meeting Link',value:s.meetingLink||'',placeholder:'https://meet.google.com/…'},
      {name:'venue',label:'Venue (for offline)',value:s.venue||''}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Session updated (demo)','success'); return refreshPage(); }
      await apiFetch('/sessions/'+id,{method:'PATCH',body:JSON.stringify(v)});
      toast('Session updated','success'); refreshPage();
    }
  });
}
/** Attach or update a recording URL on a completed session so the batch's students can watch it. */
function addRecording(id){
  var s=_sessionsCache[id]||{};
  formModal({
    title:'Upload Class Recording', submitLabel:'Save Recording',
    fields:[
      {name:'recordingUrl',label:'Recording URL',value:s.recordingUrl||'',required:true,placeholder:'https://… (mp4, Google Drive, YouTube)',help:'Paste the link to the recorded class. Students of this batch will be able to watch it.'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Recording uploaded (demo)','success'); return refreshPage(); }
      await apiFetch('/sessions/'+id,{method:'PATCH',body:JSON.stringify({recordingUrl:v.recordingUrl, status:'completed'})});
      toast('Recording uploaded — now available to students','success'); refreshPage();
    }
  });
}
/** Delete a session (behind a confirm). */
function deleteSession(id, title){
  confirmModal('Delete Session','Delete <b>'+(title||'this session')+'</b>? This cannot be undone.','Delete',async function(){
    if(_demoMode){ toast('Session deleted (demo)','success'); return refreshPage(); }
    await apiFetch('/sessions/'+id,{method:'DELETE'}); toast('Session deleted','success'); refreshPage();
  });
}

// ── Online-join requests (mentor/admin) ──
/** Mentor/admin view of students' online-join requests, split into pending (actionable) and history. */
async function renderJoinRequests(){
  var res = await apiFetch('/join-requests');
  var reqs = res.data || [];
  var pending = reqs.filter(function(r){ return r.status==='pending'; });
  var resolved = reqs.filter(function(r){ return r.status!=='pending'; });
  function card(r, isPending){
    var stu=r.student||{}; var name=((stu.firstName||'')+' '+(stu.lastName||'')).trim()||'Student';
    var batch=r.batch?(r.batch.name||''):''; var course=r.course?(r.course.title||''):'';
    var stColor=r.status==='approved'?'b-active':r.status==='rejected'?'b-due':'b-pending';
    var actions = isPending
      ? '<div style="display:flex;gap:.5rem;margin-top:.7rem"><button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem" onclick="approveRequest(\''+r._id+'\')">&#10003; Approve &amp; Share Link</button>'+
        '<button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="rejectRequest(\''+r._id+'\')">Reject</button></div>'
      : (r.meetingLink ? '<div class="ann-date" style="margin-top:.4rem">&#128279; '+r.meetingLink+'</div>' : '');
    return '<div class="ann-item" style="align-items:stretch"><div class="ann-dot" style="background:var(--purple);margin-top:.4rem"></div><div style="flex:1">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem"><div class="ann-title">'+name+'</div><span class="badge '+stColor+'">'+r.status+'</span></div>'+
      '<div class="ann-body" style="margin-top:.25rem">'+[course,batch].filter(Boolean).join(' &bull; ')+'</div>'+
      (r.reason?'<div class="sched-covers" style="margin-top:.3rem"><b>Reason:</b> '+r.reason+'</div>':'')+
      '<div class="ann-date" style="margin-top:.3rem">&#128197; Requested for '+fmtDate(r.requestedDate||r.createdAt)+'</div>'+actions+
    '</div></div>';
  }
  return '<div class="section-head"><span class="section-title">Online Join Requests'+
    (pending.length?' <span class="badge b-due">'+pending.length+' pending</span>':'')+'</span></div>'+
    (pending.length?'<div class="ann-list">'+pending.map(function(r){return card(r,true);}).join('')+'</div>'
      :'<div style="padding:1.5rem;color:var(--muted);font-size:.85rem">No pending requests right now &#127881;</div>')+
    (resolved.length?'<div class="section-head" style="margin-top:1.4rem"><span class="section-title">History</span></div><div class="ann-list">'+resolved.map(function(r){return card(r,false);}).join('')+'</div>':'');
}
/** Approve an online-join request and share a meeting link with the student. */
function approveRequest(id){
  var link='https://meet.google.com/plx-'+Math.random().toString(36).slice(2,6)+'-'+Math.random().toString(36).slice(2,6);
  formModal({ title:'Approve &amp; Share Meeting Link', submitLabel:'Approve',
    fields:[{name:'meetingLink',label:'Meeting link to share with the student',value:link,required:true}],
    onSubmit:async function(v){
      if(_demoMode){ toast('Approved — link shared with student','success'); return refreshPage(); }
      await apiFetch('/join-requests/'+id,{method:'PATCH',body:JSON.stringify({status:'approved',meetingLink:v.meetingLink})});
      toast('Approved — link shared with student','success'); refreshPage();
    }
  });
}
/** Reject an online-join request (behind a confirm). */
function rejectRequest(id){
  confirmModal('Reject Request','Reject this online-join request?','Reject',async function(){
    if(_demoMode){ toast('Request rejected','success'); return refreshPage(); }
    await apiFetch('/join-requests/'+id,{method:'PATCH',body:JSON.stringify({status:'rejected'})});
    toast('Request rejected','success'); refreshPage();
  });
}

/** Admin mentors directory: specialization, assigned-student counts, and manage/view/delete actions. */
async function renderMentors(){
  var res = await apiFetch('/users?role=mentor&limit=50');
  var mentors = res.data || [];
  var total = (res.meta && res.meta.total) || mentors.length;
  var cards = mentors.length ? mentors.map(function(m){
    var name=((m.firstName||'')+' '+(m.lastName||'')).trim();
    var init=(m.firstName?m.firstName[0]:'')+(m.lastName?m.lastName[0]:'');
    var spec=(m.mentorProfile && m.mentorProfile.specialization) ? (Array.isArray(m.mentorProfile.specialization)?m.mentorProfile.specialization.join(', '):m.mentorProfile.specialization) : 'General Mentor';
    var students=(m.mentorProfile && m.mentorProfile.assignedStudents)?m.mentorProfile.assignedStudents.length:(m.studentCount||0);
    return '<div class="course-row">'+
      '<div class="stat-ico" style="background:#e0f2fe;color:#0369a1;font-weight:800;width:44px;height:44px">'+init+'</div>'+
      '<div class="course-info"><div class="course-name">'+name+'</div>'+
      '<div class="course-desc">'+spec+'</div></div>'+
      '<div style="text-align:center;margin-right:.6rem"><div style="font-weight:800">'+students+'</div><div style="font-size:.7rem;color:var(--muted)">students</div></div>'+
      '<span class="badge '+((m.status||'active')==='active'?'b-active':'b-due')+'">'+(m.status||'active')+'</span>'+
      '<button class="continue-btn" style="padding:.45rem .9rem;font-size:.74rem" onclick="manageBatchFor(\'mentor\',\''+m._id+'\')">Assign Students</button><button class="continue-btn" style="background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="viewEntity(\'user\',\''+m._id+'\')">View</button><button class="continue-btn" style="background:transparent;color:var(--red);border:1.5px solid var(--red)" onclick="deleteUserAccount(\''+m._id+'\',\''+(name||'').replace(/'/g,'')+'\')">Delete</button>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No mentors yet.</div>';
  return '<div class="section-head"><span class="section-title">Mentors ('+total+')</span><button class="continue-btn" onclick="addUser(\'mentor\')">+ Add Mentor</button></div>'+
    '<div class="course-list">'+cards+'</div>';
}

/** Batches grid with capacity progress bars; admins also get manage/students actions. */
async function renderBatches(role){
  var res = await apiFetch('/batches?limit=50');
  var batches = res.data || [];
  var canManage = role === 'admin';
  var statusStyle = { active:['#d1fae5','#059669'], upcoming:['#dbeafe','#2563eb'], completed:['#f3f4f6','#6b7280'], paused:['#fef3c7','#b45309'] };
  var addBtn = canManage ? '<button class="continue-btn" onclick="addBatch()">+ Create Batch</button>' : '';
  var cards = batches.length ? batches.map(function(b){
    var st=(b.status||'active').toLowerCase();
    var sc=statusStyle[st]||statusStyle.active;
    var course = b.course ? (b.course.title||'') : '';
    var mentorName = b.mentor ? ((b.mentor.firstName||'')+' '+(b.mentor.lastName||'')).trim() : 'Unassigned';
    var count = b.students ? b.students.length : (b.studentCount||0);
    var cap = b.capacity || 0;
    var pct = cap ? Math.round((count/cap)*100) : 0;
    return '<div class="course-row" style="flex-direction:column;align-items:stretch;gap:.55rem">'+
      '<div style="display:flex;align-items:center;gap:.8rem">'+
        '<div class="course-ico" style="background:#ede9fe;width:42px;height:42px;font-size:1.1rem">&#128101;</div>'+
        '<div style="flex:1"><div class="course-name">'+(b.name||'Batch')+'</div><div style="font-size:.72rem;color:var(--muted)">'+course+'</div></div>'+
        '<span class="badge" style="background:'+sc[0]+';color:'+sc[1]+'">'+st+'</span>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted)">'+
        '<span>&#128104;&#8205;&#127979; '+mentorName+'</span><span>'+count+'/'+(cap||'&#8734;')+' seats</span>'+
      '</div>'+
      '<div class="prog-bar"><div class="prog-fill" style="width:'+pct+'%"></div></div>'+
      (canManage?'<div style="display:flex;gap:.5rem"><button class="continue-btn" style="flex:1;background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="manageBatch(\''+b._id+'\')">Manage</button><button class="continue-btn" style="flex:1" onclick="batchStudents(\''+b._id+'\')">Students</button></div>':'')+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No batches yet.</div>';
  return '<div class="section-head"><span class="section-title">Batches</span>'+addBtn+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">'+cards+'</div>';
}

var _resourcesCache = {};
/** Learning resources grouped by course; students are view-only, staff can add/edit/delete. */
async function renderResources(role){
  var res = await apiFetch('/resources?limit=50');
  var items = res.data || [];
  _resourcesCache = {};
  items.forEach(function(r){ _resourcesCache[r._id] = r; });
  var canManage = role === 'mentor' || role === 'admin';
  var typeIco = { pdf:'&#128196;', video:'&#127909;', link:'&#128279;', document:'&#128209;', doc:'&#128209;', image:'&#128247;', archive:'&#128230;', other:'&#128206;' };
  var addBtn = canManage ? '<button class="continue-btn" onclick="addResource()">+ Upload Resource</button>' : '';
  var rowFor = function(r){
    var type = (r.type||'other').toLowerCase();
    var url = r.externalUrl || r.fileUrl || r.url || '';
    var ico = typeIco[type] || '&#128206;';
    var course = r.course ? (r.course.title||'') : (r.category||'General');
    var title = (r.title||'Resource').replace(/'/g,'&#39;');
    var action;
    if (role === 'student') {
      // view-only: links open in a new tab, everything else opens the in-app viewer
      action = (type === 'link')
        ? '<button class="continue-btn" onclick="window.open(\''+url+'\',\'_blank\')">Open Link</button>'
        : '<button class="continue-btn" onclick="viewResource(\''+url+'\',\''+title+'\',\''+type+'\')">&#128065; View</button>';
    } else {
      var openBtn = (type === 'link')
        ? '<button class="continue-btn" onclick="window.open(\''+url+'\',\'_blank\')">Open</button>'
        : '<button class="continue-btn" onclick="viewResource(\''+url+'\',\''+title+'\',\''+type+'\')">View</button>';
      action = '<div style="display:flex;gap:.5rem">'+ openBtn +
        '<button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editResource(\''+r._id+'\')">Edit</button>'+
        '<button class="continue-btn" style="background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteResource(\''+r._id+'\',\''+title+'\')">Delete</button>'+
      '</div>';
    }
    return '<div class="course-row">'+
      '<div class="course-ico" style="background:var(--amber-lt);width:40px;height:40px;font-size:1.1rem">'+ico+'</div>'+
      '<div class="course-info"><div class="course-name">'+(r.title||'Resource')+'</div>'+
      '<div class="course-desc">'+course+' &bull; '+type.toUpperCase()+(role==='student'?(type==='link'?' &bull; opens externally':' &bull; view only'):'')+'</div></div>'+
      action+
    '</div>';
  };
  var _groups={};
  items.forEach(function(r){ var k=r.course?(r.course.title||'General'):(r.category||'General'); (_groups[k]=_groups[k]||[]).push(r); });
  var rows = items.length ? Object.keys(_groups).sort().map(function(k){
    return '<div class="learn-sec-title" style="margin-top:1.1rem">&#128218; '+k+' <span style="font-weight:600;color:var(--muted);font-size:.74rem">&bull; '+_groups[k].length+' resource'+(_groups[k].length!==1?'s':'')+'</span></div>'+
      '<div class="course-list">'+_groups[k].map(rowFor).join('')+'</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No resources available yet.</div>';
  var note = role === 'student'
    ? '<div class="mode-note online" style="margin-bottom:1.1rem"><div>&#128218; Resources are <b>view-only</b>. Links open in a new tab; documents &amp; videos open in the in-app viewer (no download).</div></div>'
    : '';
  return '<div class="section-head"><span class="section-title">Learning Resources</span>'+addBtn+'</div>'+
    note + '<div class="course-list">'+rows+'</div>';
}
/** Edit a resource's title/type/URL/description. */
function editResource(id){
  var r = _resourcesCache[id] || {};
  formModal({
    title:'Edit Resource', submitLabel:'Save Changes',
    fields:[
      {name:'title',label:'Title',value:r.title||'',required:true},
      {name:'type',label:'Type',type:'select',value:(r.type||'link'),required:true,options:[{value:'link',label:'External Link'},{value:'video',label:'Video'},{value:'pdf',label:'PDF'},{value:'document',label:'Document'}]},
      {name:'url',label:'URL',value:(r.externalUrl||r.fileUrl||''),required:true,placeholder:'https://…'},
      {name:'description',label:'Description',type:'textarea',value:r.description||''}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Resource updated (demo)','success'); return refreshPage(); }
      var payload = { title:v.title, type:v.type, description:v.description };
      if(v.type==='link') payload.externalUrl = v.url; else payload.fileUrl = v.url;
      await apiFetch('/resources/'+id,{method:'PATCH',body:JSON.stringify(payload)});
      toast('Resource updated','success'); refreshPage();
    }
  });
}
/** Delete a resource (behind a confirm). */
function deleteResource(id, title){
  confirmModal('Delete Resource', 'Delete <b>'+(title||'this resource')+'</b>? This action cannot be undone.', 'Delete', async function(){
    if(_demoMode){ toast('Resource deleted (demo)','success'); return refreshPage(); }
    await apiFetch('/resources/'+id,{method:'DELETE'});
    toast('Resource deleted','success'); refreshPage();
  });
}
/** In-app, view-only viewer for a resource — video player, PDF/image iframe, or the Google Docs viewer for other files. */
function viewResource(url, title, type){
  if(!url){ toast('Preview not available for this resource','info'); return; }
  type = (type||'other').toLowerCase();
  var body;
  if(type === 'video'){
    body = '<video src="'+url+'" controls controlsList="nodownload" autoplay style="width:100%;max-height:64vh;background:#000;border-radius:12px;display:block"></video>';
  } else if(type === 'pdf' || type === 'image'){
    body = '<iframe src="'+url+'#toolbar=0" style="width:100%;height:70vh;border:none;border-radius:12px"></iframe>';
  } else {
    body = '<iframe src="https://docs.google.com/viewer?url='+encodeURIComponent(url)+'&embedded=true" style="width:100%;height:70vh;border:none;border-radius:12px"></iframe>';
  }
  _buildModal('&#128065; '+(title||'Resource')+' <span style="font-size:.68rem;font-weight:700;color:var(--muted)">&bull; view only</span>', body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
  var box = document.querySelector('#modalOverlay .modal-box'); if(box) box.style.maxWidth = '900px';
}

/** Delete a CRM lead permanently (behind a confirm). */
function deleteLead(id){
  confirmModal('Delete Lead','Remove this lead permanently? This cannot be undone.','Delete',async function(){
    if(_demoMode){ toast('Lead removed (demo)','success'); return refreshPage(); }
    await apiFetch('/leads/'+id,{method:'DELETE'});
    toast('Lead removed','success'); refreshPage();
  });
}
/** CRM leads page: status summary cards plus a table with inline status change, convert-to-student and delete. */
async function renderLeads(){
  var res = await apiFetch('/leads?limit=50');
  var leads = res.data || [];
  _leadsCache = leads;
  var total = (res.meta && res.meta.total) || leads.length;
  var statusStyle = { new:['#dbeafe','#2563eb'], contacted:['#fef3c7','#b45309'], qualified:['#ede9fe','#7c3aed'], converted:['#d1fae5','#059669'], lost:['#fee2e2','#dc2626'] };
  var counts = leads.reduce(function(a,l){ var s=(l.status||'new').toLowerCase(); a[s]=(a[s]||0)+1; return a; },{});
  var summary = ['new','contacted','qualified','converted'].map(function(s){
    var sc=statusStyle[s];
    return '<div class="stat-card"><div class="stat-ico" style="background:'+sc[0]+';color:'+sc[1]+'">&#128100;</div><div><div class="stat-v">'+(counts[s]||0)+'</div><div class="stat-l" style="text-transform:capitalize">'+s+'</div></div></div>';
  }).join('');
  var rows = leads.length ? leads.map(function(l){
    var name=((l.firstName||'')+' '+(l.lastName||'')).trim();
    var st=(l.status||'new').toLowerCase();
    var sc=statusStyle[st]||statusStyle.new;
    return '<div class="course-row">'+
      '<div class="stat-ico" style="background:#f3f4f6;width:40px;height:40px;font-weight:800;color:#6b7280">'+(name[0]||'L')+'</div>'+
      '<div class="course-info"><div class="course-name">'+name+'</div>'+
      '<div class="course-desc">'+(l.email||'')+' &bull; '+(l.phone||'')+'</div></div>'+
      '<div style="font-size:.72rem;color:var(--muted);margin-right:.6rem">'+(l.courseInterestedName||l.source||'')+'</div>'+
      '<span class="badge" style="background:'+sc[0]+';color:'+sc[1]+'">'+st+'</span>'+
      '<select onchange="updateLeadStatus(\''+l._id+'\',this.value)" style="margin-left:.6rem;padding:.35rem .5rem;border:1.5px solid var(--line);border-radius:8px;font-size:.72rem;font-family:inherit;cursor:pointer;text-transform:capitalize">'+['new','contacted','qualified','converted','lost'].map(function(_s){return '<option value="'+_s+'"'+(st===_s?' selected':'')+'>'+_s+'</option>';}).join('')+'</select>'+
      (st!=='converted' ? '<button class="continue-btn" style="margin-left:.6rem;padding:.4rem .85rem;font-size:.72rem" onclick="convertLead(\''+l._id+'\')">Convert</button>' : '<span style="margin-left:.6rem;font-size:.72rem;color:var(--green);font-weight:700">&#10003; Student</span>')+'<button class="continue-btn" style="margin-left:.4rem;padding:.4rem .7rem;font-size:.72rem;background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteLead(\''+l._id+'\')">Delete</button>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No leads yet.</div>';
  return '<div class="section-head"><span class="section-title">Leads — CRM ('+total+')</span><div style="display:flex;gap:.5rem"><button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="exportLeads()">&#8681; Export CSV</button><button class="continue-btn" onclick="addLead()">+ Add Lead</button></div></div>'+
    '<div class="stat-grid">'+summary+'</div>'+
    '<div class="course-list" style="margin-top:1rem">'+rows+'</div>';
}

/** Payments page — students see their own fee summary + history; admins see all payments and can record new ones. */
async function renderPayments(role){
  if (role === 'student') {
    var sumRes = await apiFetch('/payments/me/summary');
    var histRes = await apiFetch('/payments?limit=50').catch(function(){ return {data:[]}; });
    var s = (sumRes.data && sumRes.data.summary) ? sumRes.data.summary : (sumRes.data || {});
    var total=s.totalCommitted||s.totalFee||s.total||0, paid=s.totalPaid||s.paid||0, due=s.totalDue||s.due||(total-paid);
    var pct = total ? Math.round((paid/total)*100) : 0;
    var history = histRes.data || [];
    return '<div class="section-head"><span class="section-title">My Fees</span></div>'+
      '<div class="stat-grid">'+
        '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128176;</div><div><div class="stat-v">&#8377;'+total.toLocaleString('en-IN')+'</div><div class="stat-l">Total Fee</div></div></div>'+
        '<div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#9989;</div><div><div class="stat-v">&#8377;'+paid.toLocaleString('en-IN')+'</div><div class="stat-l">Paid</div></div></div>'+
        '<div class="stat-card"><div class="stat-ico" style="background:#fee2e2">&#9203;</div><div><div class="stat-v">&#8377;'+due.toLocaleString('en-IN')+'</div><div class="stat-l">Due</div></div></div>'+
        '<div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#128200;</div><div><div class="stat-v">'+pct+'%</div><div class="stat-l">Cleared</div></div></div>'+
      '</div>'+
      (due>0?'<div style="margin-top:1rem;text-align:right"><button class="continue-btn" onclick="payNow('+due+')">Pay &#8377;'+due.toLocaleString('en-IN')+' Now</button></div>':'')+
      '<div class="section-head" style="margin-top:1.2rem"><span class="section-title">Payment History</span></div>'+
      '<div class="ann-list">'+ (history.length ? history.map(function(p){
        return '<div class="ann-item"><div class="ann-dot" style="background:var(--green)"></div><div style="flex:1">'+
          '<div style="display:flex;justify-content:space-between"><div class="ann-title">&#8377;'+(p.amount||0).toLocaleString('en-IN')+'</div>'+
          '<span class="badge b-active">'+(p.status||'paid')+'</span></div>'+
          '<div class="ann-date">'+fmtDate(p.paidOn||p.createdAt)+' &bull; '+(p.method||p.mode||'Online')+'</div></div></div>';
      }).join('') : '<div style="padding:1.2rem;color:var(--muted);font-size:.85rem">No payments recorded yet.</div>') + '</div>';
  }
  var res = await apiFetch('/payments?limit=50');
  var payments = res.data || [];
  _paymentsCache = payments;
  var totalCollected = payments.reduce(function(a,p){ return a + (p.status==='completed'||p.status==='paid'?(p.amount||0):0); },0);
  var rows = payments.length ? payments.map(function(p){
    var stu = p.student || p.user || {};
    var name = ((stu.firstName||'')+' '+(stu.lastName||'')).trim() || 'Student';
    var st=(p.status||'paid').toLowerCase();
    var stColor = st==='completed'||st==='paid'?'b-active':st==='pending'?'b-pending':'b-due';
    return '<div class="course-row">'+
      '<div class="stat-ico" style="background:#d1fae5;width:40px;height:40px;font-weight:800;color:#059669">&#8377;</div>'+
      '<div class="course-info"><div class="course-name">'+name+' — &#8377;'+(p.amount||0).toLocaleString('en-IN')+'</div>'+
      '<div class="course-desc">'+fmtDate(p.paidOn||p.createdAt)+' &bull; '+(p.method||p.mode||'Online')+'</div></div>'+
      '<span class="badge '+stColor+'">'+st+'</span>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No payments recorded.</div>';
  return '<div class="section-head"><span class="section-title">Payments</span><div style="display:flex;gap:.5rem"><button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="exportPayments()">&#8681; Export CSV</button><button class="continue-btn" onclick="recordPayment()">+ Record Payment</button></div></div>'+
    '<div class="stat-grid"><div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#128176;</div><div><div class="stat-v">&#8377;'+totalCollected.toLocaleString('en-IN')+'</div><div class="stat-l">Total Collected</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#129534;</div><div><div class="stat-v">'+payments.length+'</div><div class="stat-l">Transactions</div></div></div></div>'+
    '<div class="course-list" style="margin-top:1rem">'+rows+'</div>';
}

/** Certificates page; students see their own, admins can issue. Caches metadata so the PDF download works offline. */
async function renderCertificates(role){
  // /certificates is role-scoped (students see only their own) and returns an array
  var res = await apiFetch('/certificates?limit=50');
  var certs = (res.data && res.data.certificates) ? res.data.certificates : (res.data || []);
  var addBtn = role === 'admin' ? '<button class="continue-btn" onclick="issueCertificate()">+ Issue Certificate</button>' : '';
  if (role === 'student' && !certs.length) {
    return '<div class="section-head"><span class="section-title">My Certificates</span></div>'+
      '<div style="padding:3rem;text-align:center;color:var(--muted)"><div style="font-size:2.5rem">&#127942;</div>'+
      '<div style="margin-top:.6rem;font-size:.9rem">Complete a course to earn your first certificate!</div></div>';
  }
  _certsCache = {};
  var cards = certs.length ? certs.map(function(c){
    var course = c.course ? (c.course.title||'') : (c.courseNameSnapshot||c.courseName||'Course');
    var holder = c.student ? ((c.student.firstName||'')+' '+(c.student.lastName||'')).trim() : (c.studentNameSnapshot||'');
    var num = c.certificateNumber || c.number || '';
    var revoked = c.isRevoked || c.status === 'revoked';
    _certsCache[num] = { num:num, course:course, holder:holder, date:fmtDate(c.issuedDate||c.issuedAt||c.createdAt), grade:c.grade||'', revoked:revoked };
    return '<div class="course-row" style="flex-direction:column;align-items:stretch;gap:.5rem;border-left:3px solid '+(revoked?'#dc2626':'#f59e0b')+'">'+
      '<div style="display:flex;align-items:center;gap:.7rem">'+
        '<div style="font-size:1.6rem">&#127942;</div>'+
        '<div style="flex:1"><div class="course-name">'+course+'</div>'+
        (holder?'<div style="font-size:.72rem;color:var(--muted)">'+holder+'</div>':'')+'</div>'+
        (revoked?'<span class="badge b-due">revoked</span>':'<span class="badge b-active">valid</span>')+
      '</div>'+
      '<div style="font-size:.72rem;color:var(--muted);display:flex;justify-content:space-between">'+
        '<span>No: '+num+'</span><span>Issued '+fmtDate(c.issuedDate||c.issuedAt||c.createdAt)+'</span></div>'+
      '<div style="display:flex;gap:.5rem"><button class="continue-btn" style="flex:1" onclick="downloadCert(\''+num+'\')">Download PDF</button>'+
      '<button class="continue-btn" style="flex:1;background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="verifyCert(\''+num+'\')">Verify</button></div>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No certificates issued yet.</div>';
  return '<div class="section-head"><span class="section-title">Certificates</span>'+addBtn+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">'+cards+'</div>';
}

/** Reviews/feedback page with average rating; students can write reviews, staff can respond. */
async function renderReviews(role){
  var res = await apiFetch('/reviews?limit=50');
  var reviews = res.data || [];
  var avg = reviews.length ? (reviews.reduce(function(a,r){return a+(r.rating||0);},0)/reviews.length).toFixed(1) : '0.0';
  function stars(n){ var s=''; for(var i=1;i<=5;i++){ s += '<span style="color:'+(i<=n?'#f59e0b':'#d1d5db')+'">&#9733;</span>'; } return s; }
  var headLabel = role === 'mentor' ? 'Student Feedback' : 'Reviews & Feedback';
  var addBtn = role === 'student' ? '<button class="continue-btn" onclick="writeReview()">+ Write a Review</button>' : '';
  var rows = reviews.length ? reviews.map(function(r){
    var author = r.author || r.student || {};
    var name = ((author.firstName||'')+' '+(author.lastName||'')).trim() || 'Anonymous';
    var target = r.targetType ? (r.targetType.charAt(0).toUpperCase()+r.targetType.slice(1)) : '';
    return '<div class="ann-item"><div class="ann-dot" style="background:#f59e0b"></div><div style="flex:1">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<div class="ann-title">'+name+'</div><div style="font-size:.85rem">'+stars(r.rating||0)+'</div></div>'+
      '<div class="ann-body" style="margin-top:.2rem">'+(r.comment||r.text||'')+'</div>'+
      '<div class="ann-date">'+(target?target+' &bull; ':'')+fmtDate(r.createdAt)+
      (r.response?' &bull; <span style="color:var(--green)">Responded</span>':'')+'</div>'+
      (role!=='student'&&!r.response?'<button class="continue-btn" style="margin-top:.5rem;padding:.3rem .8rem;font-size:.72rem" onclick="respondReview(\''+r._id+'\')">Respond</button>':'')+
    '</div></div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No reviews yet.</div>';
  return '<div class="section-head"><span class="section-title">'+headLabel+'</span>'+addBtn+'</div>'+
    '<div class="stat-grid">'+
      '<div class="stat-card"><div class="stat-ico" style="background:#fef3c7">&#11088;</div><div><div class="stat-v">'+avg+'</div><div class="stat-l">Average Rating</div></div></div>'+
      '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128172;</div><div><div class="stat-v">'+reviews.length+'</div><div class="stat-l">Total Reviews</div></div></div>'+
    '</div>'+
    '<div class="ann-list" style="margin-top:1rem">'+rows+'</div>';
}

/** Admin analytics dashboard: KPI cards, a monthly-enrollments bar chart, course distribution, and placement + revenue summaries. */
async function renderReports(){
  var [ov, monthly, dist, plc, rev] = await Promise.all([
    apiFetch('/analytics/overview'),
    apiFetch('/analytics/enrollments/monthly'),
    apiFetch('/analytics/courses/distribution'),
    apiFetch('/analytics/placements'),
    apiFetch('/analytics/revenue')
  ]);
  var o = ov.data || {};
  var months = (monthly.data && monthly.data.data) || [];
  var distribution = (dist.data && dist.data.distribution) || [];
  var p = plc.data || {};
  var revenue = (rev.data && rev.data.summary) || {};
  var MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var maxM = Math.max.apply(null, months.map(function(m){return m.count;}).concat([1]));
  var bars = months.map(function(m){
    var h = Math.round((m.count/maxM)*100);
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:.3rem">'+
      '<div style="width:100%;display:flex;align-items:flex-end;height:120px"><div style="width:100%;background:var(--purple);border-radius:4px 4px 0 0;height:'+Math.max(h,3)+'%" title="'+m.count+'"></div></div>'+
      '<div style="font-size:.62rem;color:var(--muted)">'+MN[m.month-1]+'</div></div>';
  }).join('');
  var palette = ['#5b5fc7','#5b7c99','#3f9c6d','#b58a3a','#c2554f','#8a86c9'];
  var distRows = distribution.length ? distribution.map(function(d,i){
    var col = d.color || palette[i%palette.length];
    return '<div style="margin-bottom:.7rem"><div style="display:flex;justify-content:space-between;font-size:.78rem"><span>'+(d.title||'Course')+'</span><span style="font-weight:700">'+d.percentage+'%</span></div>'+
      '<div class="prog-bar" style="margin-top:.3rem"><div class="prog-fill" style="width:'+d.percentage+'%;background:'+col+'"></div></div></div>';
  }).join('') : '<div style="color:var(--muted);font-size:.82rem">No enrollment data.</div>';
  return '<div class="section-head"><span class="section-title">Reports &amp; Analytics</span></div>'+
  '<div class="stat-grid">'+
    '<div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#127979;</div><div><div class="stat-v">'+((o.students&&o.students.total)||0)+'</div><div class="stat-l">Students</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128188;</div><div><div class="stat-v">'+(p.placementRate||0)+'%</div><div class="stat-l">Placement Rate</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#128176;</div><div><div class="stat-v">&#8377;'+((revenue.totalRevenue||0)/100000).toFixed(1)+'L</div><div class="stat-l">Revenue</div></div></div>'+
    '<div class="stat-card"><div class="stat-ico" style="background:#fef3c7">&#127942;</div><div><div class="stat-v">'+(p.avgPackage?('&#8377;'+(p.avgPackage/100000).toFixed(1)+'L'):'—')+'</div><div class="stat-l">Avg Package</div></div></div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:1.2rem;margin-top:1.2rem">'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.8rem">Monthly Enrollments</div>'+
      '<div style="display:flex;gap:.3rem;align-items:flex-end">'+bars+'</div>'+
    '</div>'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.8rem">Course Distribution</div>'+distRows+
    '</div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-top:1.2rem">'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.6rem">Placement Summary</div>'+
      '<div style="display:flex;flex-direction:column;gap:.5rem;font-size:.82rem">'+
        '<div style="display:flex;justify-content:space-between"><span>Total Applications</span><b>'+(p.totalApplications||0)+'</b></div>'+
        '<div style="display:flex;justify-content:space-between"><span>Students Placed</span><b>'+(p.totalPlaced||0)+'</b></div>'+
        '<div style="display:flex;justify-content:space-between"><span>Highest Package</span><b>'+(p.highestPackage?('&#8377;'+(p.highestPackage/100000).toFixed(1)+'L'):'—')+'</b></div>'+
      '</div>'+
    '</div>'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.6rem">Revenue Summary</div>'+
      '<div style="display:flex;flex-direction:column;gap:.5rem;font-size:.82rem">'+
        '<div style="display:flex;justify-content:space-between"><span>Collected</span><b>&#8377;'+(revenue.totalRevenue||0).toLocaleString('en-IN')+'</b></div>'+
        '<div style="display:flex;justify-content:space-between"><span>Outstanding Due</span><b style="color:var(--red)">&#8377;'+(revenue.totalDue||0).toLocaleString('en-IN')+'</b></div>'+
        '<div style="display:flex;justify-content:space-between"><span>Total Committed</span><b>&#8377;'+(revenue.totalCommitted||0).toLocaleString('en-IN')+'</b></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/** Admin settings page (institute profile, notification toggles, security, account). */
function renderSettings(){
  var u = _currentUser || {};
  var name = ((u.firstName||'')+' '+(u.lastName||'')).trim() || 'Administrator';
  function toggle(on){ return '<div class="switch'+(on?' on':'')+'" onclick="toggleSwitch(this)"><div class="knob"></div></div>'; }
  function row(label,sub,ctrl){ return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid var(--line)"><div><div style="font-size:.85rem;font-weight:600">'+label+'</div><div style="font-size:.72rem;color:var(--muted)">'+sub+'</div></div>'+ctrl+'</div>'; }
  return '<div class="section-head"><span class="section-title">Settings</span></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.4rem">Institute Profile</div>'+
      row('Institute Name','Placeonix Hub','<input value="Placeonix Hub" style="border:1px solid var(--line);border-radius:6px;padding:.35rem .6rem;font-size:.8rem;width:160px">')+
      row('Support Email','support@placeonix.in','<input value="support@placeonix.in" style="border:1px solid var(--line);border-radius:6px;padding:.35rem .6rem;font-size:.8rem;width:160px">')+
      row('Contact Number','+91 98765 43210','<input value="+91 98765 43210" style="border:1px solid var(--line);border-radius:6px;padding:.35rem .6rem;font-size:.8rem;width:160px">')+
      '<button class="continue-btn" style="margin-top:.8rem;align-self:flex-start" onclick="saveSettings()">Save Changes</button>'+
    '</div>'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.4rem">Notifications</div>'+
      row('Email Notifications','Send updates to users via email',toggle(true))+
      row('SMS Alerts','Send SMS for urgent updates',toggle(false))+
      row('New Lead Alerts','Notify admins of new leads',toggle(true))+
      row('Payment Reminders','Auto-remind students of due fees',toggle(true))+
    '</div>'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.4rem">Security</div>'+
      row('Two-Factor Auth','Require 2FA for admin logins',toggle(false))+
      row('Session Timeout','Auto-logout after inactivity','<select style="border:1px solid var(--line);border-radius:6px;padding:.35rem .6rem;font-size:.8rem"><option>30 min</option><option>1 hour</option><option>4 hours</option></select>')+
      '<button class="continue-btn" style="margin-top:.8rem;align-self:flex-start;background:transparent;color:var(--purple);border:1.5px solid var(--purple)" onclick="changePassword()">Change Password</button>'+
    '</div>'+
    '<div class="course-row" style="flex-direction:column;align-items:stretch;cursor:default">'+
      '<div class="section-title" style="margin-bottom:.4rem">Account</div>'+
      row('Signed in as',name,'<span class="badge b-active">Admin</span>')+
      row('Plan','Pro — Unlimited students','<span class="badge" style="background:#ede9fe;color:#7c3aed">Pro</span>')+
      '<button class="logout-btn" style="margin-top:.8rem;align-self:flex-start;width:auto;padding:.5rem 1rem" onclick="doLogout()">Sign Out</button>'+
    '</div>'+
  '</div>';
}

/** Student support center: quick contact links plus a live-chat launcher. */
function renderSupport(){
  return `
  <div class="section-head"><span class="section-title">Support Center</span></div>
  <div class="quick-links">
    <div class="ql-item" onclick="openLiveChat()"><div class="ql-ico">&#128172;</div><div class="ql-label">Live Chat</div><div class="ql-sub">Chat with admin</div></div>
    <div class="ql-item" onclick="window.location.href='mailto:support@placeonix.in'"><div class="ql-ico">&#128231;</div><div class="ql-label">Email Support</div><div class="ql-sub">support@placeonix.in</div></div>
    <div class="ql-item" onclick="window.location.href='tel:+919949494020'"><div class="ql-ico">&#128222;</div><div class="ql-label">Call Us</div><div class="ql-sub">+91 99494 94020</div></div>
    <div class="ql-item" onclick="toast('FAQ coming soon','info')"><div class="ql-ico">&#128214;</div><div class="ql-label">FAQ</div><div class="ql-sub">Common questions</div></div>
  </div>
  <div style="margin-top:1.5rem;background:#fff;border:1px solid var(--line);border-radius:16px;padding:1.4rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <div><div style="font-weight:800;color:var(--ink);font-size:1rem">Need help right now?</div>
    <div style="font-size:.83rem;color:var(--muted);margin-top:.2rem">Start a live chat with the Placeonix support team &mdash; we usually reply within a few minutes.</div></div>
    <button class="continue-btn" onclick="openLiveChat()">&#128172; Start Live Chat</button>
  </div>`;
}

// ── Live chat with admin/support ──
var _chatMsgs = null;
/** Render the current support-chat message thread as HTML. */
function _chatThreadHTML(){
  return _chatMsgs.map(function(m){
    return '<div class="chat-msg '+(m.from==='me'?'me':'admin')+'">'+m.text+'</div>';
  }).join('');
}
/** Re-render the chat thread and scroll to the newest message. */
function refreshChat(){ var t=document.getElementById('chatThread'); if(t){ t.innerHTML=_chatThreadHTML(); t.scrollTop=t.scrollHeight; } }
/** Open the support live-chat modal (seeds a greeting message on first open). */
function openLiveChat(){
  if(!_chatMsgs) _chatMsgs = [{from:'admin', text:'Hi &#128075; You are chatting with Placeonix Support. How can we help you today?'}];
  var body = '<div id="chatThread" class="chat-thread">'+_chatThreadHTML()+'</div>'+
    '<div class="chat-input"><input id="chatInput" placeholder="Type your message…" onkeydown="if(event.key===\'Enter\'){sendChat();}"/>'+
    '<button class="btn-primary" onclick="sendChat()">Send</button></div>';
  _buildModal('&#128172; Live Chat &mdash; Support', body, '');
  refreshChat();
  setTimeout(function(){ var i=document.getElementById('chatInput'); if(i) i.focus(); }, 60);
}
/** Send a chat message, then generate a canned support auto-reply based on keywords. */
function sendChat(){
  var i=document.getElementById('chatInput'); if(!i) return;
  var v=(i.value||'').trim(); if(!v) return;
  _chatMsgs.push({from:'me', text:v.replace(/</g,'&lt;')});
  i.value=''; refreshChat();
  setTimeout(function(){
    var low=v.toLowerCase(); var reply;
    if(/fee|payment|pay/.test(low)) reply='For fee or payment queries, please check the Fees tab or email accounts@placeonix.in. Anything else?';
    else if(/class|schedule|timing|recording/.test(low)) reply='You can see your full class schedule and recordings under <b>My Courses</b>. Want me to flag anything to your mentor?';
    else if(/placement|job|drive/.test(low)) reply='Placement drives are listed under the <b>Placements</b> tab. Our team will also notify you when you are eligible.';
    else reply='Thanks for reaching out! A support executive will follow up shortly. Meanwhile, is there anything specific I can help with?';
    _chatMsgs.push({from:'admin', text:reply}); refreshChat();
  }, 700);
}
