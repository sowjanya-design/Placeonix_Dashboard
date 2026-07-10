/*
 * Placeonix Hub — Entity CRUD: users, leads, batches, resources, courses, sessions,
 * certificates, reviews, payments, settings.
 * Part of the dashboard app; loaded after core.js (see the HTML).
 */
// ───────────────────────── USERS (students / mentors) ─────────────────────────
function addUser(role){
  var label = role==='mentor'?'Mentor':role==='student'?'Student':'User';
  formModal({
    title:'Add '+label,
    submitLabel:'Create '+label,
    fields:[
      {name:'firstName',label:'First Name',required:true},
      {name:'lastName',label:'Last Name',required:true},
      {name:'email',label:'Login Email',type:'email',required:true,help:'They log in with this email.'},
      {name:'phone',label:'Phone',type:'tel',placeholder:'+91...'},
      {name:'password',label:'Login Password (share with the '+label.toLowerCase()+')',value:'Password123',required:true,help:'This is the password they use to log in. Keep the default or set your own (min 8 chars). They can change it later.'}
    ],
    onSubmit:async function(v){
      if(v.password && v.password.length<8) throw new Error('Password must be at least 8 characters.');
      var em=v.email, pw=v.password;
      if(_demoMode){ toast(label+' "'+v.firstName+'" created (demo)','success'); refreshPage(); setTimeout(function(){ showCredentials(label, em, pw); },80); return; }
      v.role=role;
      await apiFetch('/users',{method:'POST',body:JSON.stringify(v)});
      toast(label+' created successfully','success'); refreshPage();
      setTimeout(function(){ showCredentials(label, em, pw); }, 80);
    }
  });
}
var _lastCreds = { email:'', password:'' };
function showCredentials(label, email, password){
  _lastCreds = { email:email, password:password };
  var body = '<div style="font-size:.85rem;color:var(--ink2);line-height:1.6;margin-bottom:.9rem">&#9989; '+label+' account created. Share these login details:</div>'+
    '<div style="background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:.6rem 1rem">'+
      '<div style="display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0"><span style="color:var(--muted);font-size:.82rem">Email</span><b style="font-family:monospace;font-size:.85rem">'+email+'</b></div>'+
      '<div style="display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0;border-top:1px solid var(--line)"><span style="color:var(--muted);font-size:.82rem">Password</span><b style="font-family:monospace;font-size:.85rem">'+password+'</b></div>'+
    '</div>'+
    '<div style="font-size:.74rem;color:var(--muted);margin-top:.7rem">&#128274; They can change this password after first login.</div>';
  var foot = '<button class="btn-secondary" onclick="copyCreds()">&#10697; Copy</button><button class="btn-primary" onclick="closeModal()">Done</button>';
  _buildModal('Login Details', body, foot);
}
function copyCreds(){
  var txt = 'Placeonix login\nEmail: '+_lastCreds.email+'\nPassword: '+_lastCreds.password;
  if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(function(){ toast('Login details copied','success'); }, function(){ toast('Could not copy','error'); }); }
  else { toast('Email: '+_lastCreds.email+' / Password: '+_lastCreds.password,'info'); }
}
function deleteUserAccount(id, name){
  confirmModal('Delete '+(name||'user')+'?', 'This permanently removes the account - they can no longer log in. This cannot be undone.', 'Delete', async function(){
    if(_demoMode){ toast('Account removed (demo)','success'); return refreshPage(); }
    await apiFetch('/users/'+id,{method:'DELETE'});
    toast((name||'Account')+' removed','success'); refreshPage();
  });
}
async function editUser(id){
  var u = (_studentsCache||[]).filter(function(x){return x._id===id;})[0];
  if(!u && !_demoMode){ try{ var r=await apiFetch('/users/'+id); u=(r.data&&r.data.user)||r.data; }catch(e){} }
  u = u || {};
  formModal({
    title:'Edit '+(((u.firstName||'')+' '+(u.lastName||'')).trim()||'User'),
    submitLabel:'Save Changes',
    fields:[
      {name:'firstName',label:'First Name',value:u.firstName||'',required:true},
      {name:'lastName',label:'Last Name',value:u.lastName||'',required:true},
      {name:'phone',label:'Phone',value:u.phone||''},
      {name:'status',label:'Status',type:'select',value:u.status||'active',options:[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'suspended',label:'Suspended'},{value:'pending',label:'Pending'}]}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Saved (demo)','success'); return refreshPage(); }
      await apiFetch('/users/'+id,{method:'PATCH',body:JSON.stringify(v)});
      toast('Student updated','success'); refreshPage();
    }
  });
}
async function viewEntity(kind, id){
  var path = kind==='user'?'/users/'+id : kind==='batch'?'/batches/'+id : kind==='course'?'/courses/'+id : kind==='drive'?'/placements/'+id : null;
  if(!path){ toast('Details unavailable','info'); return; }
  _buildModal('Details', loadingHTML(), '');
  try{
    var res=await apiFetch(path); var w=res.data||{};
    // detail endpoints wrap the object (data.course / data.batch / data.user / data.drive)
    var d = w[kind] || w.course || w.batch || w.user || w.drive || w.placement || w;
    var rows;
    if(kind==='user'){
      rows=[['Name',fullName(d)],['Email',d.email],['Phone',d.phone],['Role',d.role],['Status',d.status],['Joined',fmtDate(d.createdAt)]];
      if(d.mentorProfile && d.mentorProfile.specialization && d.mentorProfile.specialization.length) rows.push(['Specialization',d.mentorProfile.specialization.join(', ')]);
      if(d.studentProfile && d.studentProfile.enrollmentId) rows.push(['Enrollment ID',d.studentProfile.enrollmentId]);
    } else if(kind==='batch'){
      rows=[['Batch',d.name],['Code',d.code],['Course',d.course&&d.course.title],['Mentor',d.mentor?fullName(d.mentor):'Unassigned'],['Status',d.status],['Capacity',d.capacity],['Enrolled',(d.students||[]).length]];
    } else if(kind==='course'){
      rows=[['Title',d.title],['Category',d.category],['Modules',d.totalModules!=null?d.totalModules:(d.modules||[]).length],['Published',d.isPublished?'Yes':'No'],['Duration',d.duration||'—']];
    } else if(kind==='drive'){
      rows=[['Company',d.company],['Role',d.role],['Status',d.status],['Package',d.package?((d.package.min!=null?d.package.min:'')+(d.package.max!=null?'–'+d.package.max:'')+' LPA'):'—'],['Vacancies',d.vacancies||'—'],['Deadline',fmtDate(d.applicationDeadline)]];
    }
    detailModal(d.name||d.title||d.company||fullName(d)||'Details', rows);
  }catch(e){ _buildModal('Details', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); }
}

// ───────────────────────── LEADS ─────────────────────────
function addLead(){
  formModal({
    title:'Add Lead', submitLabel:'Add Lead',
    fields:[
      {name:'firstName',label:'First Name',required:true},
      {name:'lastName',label:'Last Name',required:true},
      {name:'email',label:'Email',type:'email',required:true},
      {name:'phone',label:'Phone',type:'tel',required:true},
      {name:'courseInterestedName',label:'Interested In',type:'select',placeholder:'Select course…',options:[{value:'Full Stack',label:'Full Stack'},{value:'Data Science',label:'Data Science'},{value:'Python',label:'Python'},{value:'UI/UX',label:'UI/UX'},{value:'Cloud & DevOps',label:'Cloud & DevOps'}]},
      {name:'source',label:'Source',type:'select',options:[{value:'website',label:'Website'},{value:'referral',label:'Referral'},{value:'instagram',label:'Instagram'},{value:'whatsapp',label:'WhatsApp'},{value:'walk-in',label:'Walk-in'}]}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Lead "'+v.firstName+'" added (demo)','success'); return refreshPage(); }
      await apiFetch('/leads',{method:'POST',body:JSON.stringify(v)});
      toast('Lead added successfully','success'); refreshPage();
    }
  });
}

// ───────────────────────── BATCHES ─────────────────────────
async function addBatch(){
  var courses = _demoMode ? _DEMO_COURSES.map(function(c){return{value:c._id,label:c.title};}) : await loadOptions('/courses?limit=100',function(c){return c.title;});
  var mentors = _demoMode ? _DEMO_MENTORS.map(function(m){return{value:m._id,label:fullName(m)};}) : await loadOptions('/users?role=mentor&limit=100',fullName);
  formModal({
    title:'Create Batch', submitLabel:'Create Batch',
    fields:[
      {name:'name',label:'Batch Name',required:true,placeholder:'FSWD Batch A — Morning'},
      {name:'code',label:'Batch Code',required:true,placeholder:'FSWD-A-2025'},
      {name:'course',label:'Course',type:'select',required:true,placeholder:'Select course…',options:courses},
      {name:'mentor',label:'Mentor',type:'select',required:true,placeholder:'Assign mentor…',options:mentors},
      {name:'startDate',label:'Start Date',type:'date',required:true},
      {name:'endDate',label:'End Date',type:'date',required:true},
      {name:'capacity',label:'Capacity',type:'number',value:'30',required:true}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Batch "'+v.name+'" created (demo)','success'); return refreshPage(); }
      v.capacity=Number(v.capacity);
      v.code=v.code.toUpperCase();
      await apiFetch('/batches',{method:'POST',body:JSON.stringify(v)});
      toast('Batch created successfully','success'); refreshPage();
    }
  });
}

// ───────────────────────── RESOURCES ─────────────────────────
function addResource(){
  formModal({
    title:'Add Resource', submitLabel:'Add Resource',
    fields:[
      {name:'title',label:'Title',required:true},
      {name:'type',label:'Type',type:'select',required:true,options:[{value:'link',label:'External Link'},{value:'video',label:'Video'},{value:'document',label:'Document'}]},
      {name:'externalUrl',label:'URL',required:true,placeholder:'https://…'},
      {name:'description',label:'Description',type:'textarea'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Resource "'+v.title+'" added (demo)','success'); return refreshPage(); }
      await apiFetch('/resources',{method:'POST',body:JSON.stringify(v)});
      toast('Resource added successfully','success'); refreshPage();
    }
  });
}

// ───────────────────────── COURSES ─────────────────────────
function addCourse(){
  formModal({
    title:'Add Course', submitLabel:'Create Course',
    fields:[
      {name:'title',label:'Course Title',required:true},
      {name:'category',label:'Category',type:'select',required:true,options:[{value:'Web Development',label:'Web Development'},{value:'Data Science',label:'Data Science'},{value:'Programming',label:'Programming'},{value:'Cloud & DevOps',label:'Cloud & DevOps'},{value:'Cybersecurity',label:'Cybersecurity'},{value:'UI/UX',label:'UI/UX'}]},
      {name:'description',label:'Description',type:'textarea',required:true},
      {name:'duration',label:'Duration',required:true,placeholder:'e.g. 4-6 Months'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Course "'+v.title+'" created (demo)','success'); return refreshPage(); }
      var payload={ title:v.title, category:v.category, description:v.description, shortDescription:v.description.slice(0,120), duration:v.duration, fee:{ amount:0 } };
      await apiFetch('/courses',{method:'POST',body:JSON.stringify(payload)});
      toast('Course created successfully','success'); refreshPage();
    }
  });
}
function startLearning(title){ toast('Loading "'+(title||'course')+'"…','info'); }

// ───────────────────────── SESSIONS ─────────────────────────
async function addSession(){
  var batches = _demoMode ? _DEMO_BATCHES.map(function(b){return{value:b._id,label:b.name};}) : await loadOptions('/batches?limit=100',function(b){return b.name;});
  formModal({
    title:'Schedule Session', submitLabel:'Schedule',
    fields:[
      {name:'title',label:'Session Title',required:true,placeholder:'React Hooks Deep Dive'},
      {name:'batch',label:'Batch',type:'select',required:true,placeholder:'Select batch…',options:batches},
      {name:'startTime',label:'Start',type:'datetime-local',required:true},
      {name:'endTime',label:'End',type:'datetime-local',required:true},
      {name:'meetingLink',label:'Meeting Link',placeholder:'https://meet.google.com/…'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Session "'+v.title+'" scheduled (demo)','success'); return refreshPage(); }
      await apiFetch('/sessions',{method:'POST',body:JSON.stringify(v)});
      toast('Session scheduled successfully','success'); refreshPage();
    }
  });
}

// ───────────────────────── CERTIFICATES ─────────────────────────
function issueCertificate(){
  toast('Issuing requires a completed enrollment — open the student to issue.','info');
}
var _certsCache = {};
function downloadCert(num){
  var c = _certsCache[num] || { num:num, course:'Course', holder:(_currentUser?(_currentUser.firstName+' '+_currentUser.lastName):''), date:fmtDate(new Date().toISOString()), grade:'' };
  var w = window.open('', '_blank');
  if(!w){ toast('Allow pop-ups to download the certificate','info'); return; }
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate '+c.num+'</title>'+
    '<style>@page{size:landscape;margin:0}body{margin:0;font-family:Georgia,serif;background:#eceaf6}'+
    '.cert{width:1000px;max-width:96vw;margin:24px auto;background:#fff;border:2px solid #5b5fc7;border-radius:16px;padding:56px 64px;text-align:center;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.15)}'+
    '.bar{height:8px;background:linear-gradient(135deg,#7c6ce6,#5a52c9);border-radius:8px;margin-bottom:34px}'+
    '.brand{font-family:Arial,sans-serif;font-size:14px;letter-spacing:4px;text-transform:uppercase;color:#5b5fc7;font-weight:800}'+
    'h1{font-size:38px;margin:18px 0 6px;color:#19191f;letter-spacing:1px}'+
    '.sub{color:#666;font-size:15px;margin-bottom:30px}'+
    '.name{font-size:34px;color:#2a2168;margin:14px 0;font-weight:bold;border-bottom:2px dotted #c9c6e6;display:inline-block;padding:0 30px 8px}'+
    '.for{color:#444;font-size:16px;margin:22px 0 6px}.course{font-size:24px;color:#5b5fc7;font-weight:bold}'+
    '.meta{display:flex;justify-content:space-between;margin-top:48px;font-family:Arial,sans-serif;font-size:13px;color:#555}'+
    '.meta b{display:block;color:#19191f;font-size:14px;margin-top:4px}'+
    '.seal{position:absolute;right:54px;bottom:48px;width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,#7c6ce6,#5a52c9);color:#fff;font-family:Arial;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 4px 12px rgba(91,95,199,.4)}'+
    '@media print{.noprint{display:none}body{background:#fff}.cert{box-shadow:none;margin:0}}'+
    '</style></head><body>'+
    '<div class="cert"><div class="bar"></div>'+
    '<div class="brand">Placeonix &bull; Training | Placement | Future</div>'+
    '<h1>Certificate of Completion</h1>'+
    '<div class="sub">This is proudly presented to</div>'+
    '<div class="name">'+(c.holder||'Student')+'</div>'+
    '<div class="for">for successfully completing the program</div>'+
    '<div class="course">'+c.course+'</div>'+
    (c.grade?'<div class="sub" style="margin-top:14px">Grade achieved: <b>'+c.grade+'</b></div>':'')+
    '<div class="meta"><div>Certificate No.<b>'+c.num+'</b></div><div>Issued on<b>'+c.date+'</b></div><div>Authorised by<b>Placeonix Hub</b></div></div>'+
    '<div class="seal">PLX<br>VERIFIED</div></div>'+
    '<div class="noprint" style="text-align:center;margin:18px"><button onclick="window.print()" style="background:#5b5fc7;color:#fff;border:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial">Print / Save as PDF</button></div>'+
    '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},400);}</scr'+'ipt>'+
    '</body></html>';
  w.document.write(html); w.document.close();
}
async function verifyCert(num){
  if(!num){ toast('No certificate number','error'); return; }
  _buildModal('Verify Certificate', loadingHTML(), '');
  try{
    if(_demoMode){ detailModal('Certificate Verified ✓',[['Number',num],['Status','Valid'],['Issued by','Placeonix Hub']]); return; }
    var res=await apiFetch('/certificates/verify/'+num);
    var d=res.data||{};
    detailModal('Certificate '+(d.valid===false?'Invalid':'Verified ✓'),[['Number',num],['Holder',d.student?fullName(d.student):'—'],['Course',d.course&&d.course.title],['Status',d.status||'valid'],['Issued',fmtDate(d.issuedAt)]]);
  }catch(e){ detailModal('Verification Failed',[['Number',num],['Result',e.message]]); }
}

// ───────────────────────── REVIEWS ─────────────────────────
async function writeReview(){
  var targets=[];
  if(_demoMode){
    targets=[{value:'mentor::'+_DEMO_MENTORS[0]._id,label:'Mentor: '+fullName(_DEMO_MENTORS[0])}];
  } else {
    try{
      var res=await apiFetch('/users/me/enrollments'); var ens=res.data||[];
      var seenM={}, seenC={};
      ens.forEach(function(e){
        if(e.course && e.course._id && !seenC[e.course._id]){ seenC[e.course._id]=1; targets.push({value:'course::'+e.course._id,label:'Course: '+(e.course.title||'')}); }
        var m=e.batch && e.batch.mentor;
        if(m && m._id && !seenM[m._id]){ seenM[m._id]=1; targets.push({value:'mentor::'+m._id,label:'Mentor: '+(((m.firstName||'')+' '+(m.lastName||'')).trim()||'Mentor')}); }
      });
    }catch(e){}
  }
  if(!targets.length){ toast('Enroll in a course first to leave feedback.','info'); return; }
  formModal({
    title:'Write Feedback', submitLabel:'Submit Feedback',
    fields:[
      {name:'target',label:'What are you reviewing?',type:'select',required:true,placeholder:'Select…',options:targets},
      {name:'rating',label:'Rating',type:'select',required:true,options:[{value:'5',label:'★★★★★ Excellent'},{value:'4',label:'★★★★ Good'},{value:'3',label:'★★★ Average'},{value:'2',label:'★★ Poor'},{value:'1',label:'★ Bad'}]},
      {name:'comment',label:'Your Feedback',type:'textarea',required:true,placeholder:'Share your experience…'}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Thanks for your feedback!','success'); return refreshPage(); }
      var parts=String(v.target).split('::');
      await apiFetch('/reviews',{method:'POST',body:JSON.stringify({targetType:parts[0],target:parts[1],rating:Number(v.rating),comment:v.comment})});
      toast('Feedback submitted — thank you!','success'); refreshPage();
    }
  });
}
function respondReview(id){
  formModal({
    title:'Respond to Review', submitLabel:'Post Response',
    fields:[{name:'text',label:'Your Response',type:'textarea',required:true}],
    onSubmit:async function(v){
      if(_demoMode){ toast('Response posted (demo)','success'); return refreshPage(); }
      await apiFetch('/reviews/'+id+'/respond',{method:'POST',body:JSON.stringify({text:v.text})});
      toast('Response posted','success'); refreshPage();
    }
  });
}

// ───────────────────────── PAYMENTS ─────────────────────────
function payNow(amount){
  formModal({
    title:'Pay Fees', submitLabel:'Pay ₹'+Number(amount||0).toLocaleString('en-IN'),
    fields:[
      {name:'method',label:'Payment Method',type:'select',required:true,options:[{value:'UPI',label:'UPI'},{value:'Card',label:'Credit / Debit Card'},{value:'NetBanking',label:'Net Banking'}]},
      {name:'amount',label:'Amount (₹)',type:'number',value:amount||0,required:true}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast("Payment recorded (demo)","success"); return refreshPage(); }
      await apiFetch("/payments/me/pay",{method:"POST",body:JSON.stringify({amount:Number(v.amount),method:v.method})});
      toast('Payment of ₹'+Number(v.amount).toLocaleString('en-IN')+' successful!','success');
      refreshPage();
    }
  });
}
async function recordPayment(){
  var students = _demoMode ? [{value:'demo',label:'Arjun Reddy'}] : await loadOptions('/users?role=student&limit=200',fullName);
  formModal({
    title:'Record Payment — Step 1', submitLabel:'Next &rarr;',
    fields:[
      {name:'student',label:'Student',type:'select',required:true,placeholder:'Select student…',options:students}
    ],
    onSubmit:async function(v){
      var enr;
      if(_demoMode){
        enr = [{value:'e-demo',label:'Full Stack Web Development — ₹5,000 due'}];
      } else {
        var res = await apiFetch('/users/'+v.student+'/enrollments');
        enr = (res.data||[]).map(function(e){ var due=(e.fee&&e.fee.due)||0; return { value:e._id, label:((e.course&&e.course.title)||'Course')+' — ₹'+due.toLocaleString('en-IN')+' due' }; });
        if(!enr.length){ toast('This student has no enrollments to bill','info'); return; }
      }
      // open step 2 after this modal auto-closes
      setTimeout(function(){ recordPaymentStep2(enr); }, 240);
    }
  });
}
function recordPaymentStep2(enrOptions){
  formModal({
    title:'Record Payment — Step 2', submitLabel:'Record Payment',
    fields:[
      {name:'enrollmentId',label:'Course / Enrollment',type:'select',required:true,options:enrOptions},
      {name:'amount',label:'Amount (₹)',type:'number',required:true},
      {name:'method',label:'Method',type:'select',required:true,options:[{value:'upi',label:'UPI'},{value:'card',label:'Card'},{value:'bank_transfer',label:'Bank Transfer'},{value:'cash',label:'Cash'}]}
    ],
    onSubmit:async function(v){
      if(_demoMode){ toast('Payment of ₹'+Number(v.amount).toLocaleString('en-IN')+' recorded (demo)','success'); return refreshPage(); }
      await apiFetch('/payments',{method:'POST',body:JSON.stringify({ enrollmentId:v.enrollmentId, amount:Number(v.amount), method:v.method, status:'completed' })});
      toast('Payment recorded successfully','success'); refreshPage();
    }
  });
}

// ───────────────────────── SETTINGS ─────────────────────────
function toggleSwitch(el){ el.classList.toggle('on'); toast('Setting '+(el.classList.contains('on')?'enabled':'disabled'),'success'); }
function saveSettings(){ toast('Settings saved successfully','success'); }
function changePassword(){
  formModal({
    title:'Change Password', submitLabel:'Update Password',
    fields:[
      {name:'currentPassword',label:'Current Password',type:'password',required:true},
      {name:'newPassword',label:'New Password',type:'password',required:true,help:'Minimum 8 characters.'}
    ],
    onSubmit:async function(v){
      if(v.newPassword.length<8) throw new Error('New password must be at least 8 characters.');
      if(_demoMode){ toast('Password updated (demo)','success'); return; }
      await apiFetch('/auth/password',{method:'PATCH',body:JSON.stringify(v)});
      toast('Password updated successfully','success');
    }
  });
}
