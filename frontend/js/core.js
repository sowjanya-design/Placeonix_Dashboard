/*
 * Placeonix Hub — dashboard application (vanilla JS, no framework).
 * Single-page app for the Admin / Mentor / Student portals.
 * Calls the REST API at /api/v1 (see docs/ARCHITECTURE.md).
 * Code is organised into banner-commented sections below.
 */
// — API CLIENT —
// Local dev hits the standalone backend on :5000; in production (Vercel) the API
// is served same-origin under /api/v1. Falls back to demo mode if unreachable.
var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api/v1'
  : '/api/v1';
var _token = localStorage.getItem('plx_token') || null;
var _currentUser = null;
var _demoMode = false;

// — DEMO DATA (used when backend is offline) —
var _DEMO_USERS = {
  'admin@placeonix.in':   { _id:'demo-adm', firstName:'Avinash', lastName:'Murari', email:'admin@placeonix.in',  role:'admin',  status:'active' },
  'mentor@placeonix.in':  { _id:'demo-mnt', firstName:'Priya',   lastName:'Sharma', email:'mentor@placeonix.in', role:'mentor', status:'active' },
  'student@placeonix.in': { _id:'demo-std', firstName:'Arjun',   lastName:'Reddy',  email:'student@placeonix.in',role:'student',status:'active', studentProfile:{ enrollmentId:'STU10023', skills:['JavaScript','React','Node.js','HTML/CSS','MongoDB'] } }
};
var _DEMO_COURSES = [
  { _id:'c1', title:'SAP Full Stack Program', category:'ERP', shortDescription:'Complete SAP Cloud & Modern Dev Stack — 5 modules', duration:'4-6 Months', fee:{amount:65000}, isPublished:true, isFeatured:true, modules:[{_id:'m1',title:'Module 1: SAP BTP',order:1,topics:[{_id:'t1',title:'BTP Overview'},{_id:'t2',title:'HANA Cloud'}]},{_id:'m2',title:'Module 2: SAP CPI',order:2,topics:[]},{_id:'m3',title:'Module 3: SAP CAP',order:3,topics:[]}] },
  { _id:'c2', title:'Full Stack Web Development', category:'Web Development', shortDescription:'MERN / Java — become a full stack developer', duration:'4-6 Months', fee:{amount:25000}, isPublished:true, modules:[] },
  { _id:'c3', title:'Data Science & Analytics', category:'Data Science', shortDescription:'Python + Machine Learning with real datasets', duration:'4-6 Months', fee:{amount:40000}, isPublished:true, modules:[] },
  { _id:'c4', title:'DevOps & Cloud Engineering', category:'Cloud & DevOps', shortDescription:'AWS + Azure with hands-on cloud credits', duration:'4-6 Months', fee:{amount:37000}, isPublished:true, modules:[] },
  { _id:'c5', title:'SAP FICO', category:'ERP', shortDescription:'Finance & Controlling on live SAP servers', duration:'2-3 Months', fee:{amount:22000}, isPublished:true, modules:[] },
  { _id:'c6', title:'UI/UX Design', category:'UI/UX', shortDescription:'Figma + Design Systems', duration:'4-6 Months', fee:{amount:15000}, isPublished:true, modules:[] }
];
var _DEMO_ANNOUNCEMENTS = [
  { _id:'an1', title:'Mock Interview Schedule', body:'Mock interviews for final year students start from 25th May. Register before 22nd May.', type:'general', isPinned:true,  publishAt: new Date().toISOString() },
  { _id:'an2', title:'New Placement Drive — Wipro', body:'Wipro is hiring Full Stack & SAP consultants. Eligible students can apply from the Placements tab.', type:'general', isPinned:false, publishAt: new Date().toISOString() },
  { _id:'an3', title:'New Course Added',        body:'Advanced Excel has been added to the catalog. Students can enroll now.', type:'general', isPinned:false, publishAt: new Date().toISOString() }
];
var _DEMO_NOTIFS = [
  { _id:'n1', title:'New Placement Drive: Wipro', message:'Full Stack & SAP consultant roles — apply from Placements.', read:false, createdAt:new Date(Date.now()-36e5).toISOString() },
  { _id:'n2', title:'Assignment graded', message:'Your React Portfolio Project was graded 85/100.', read:false, createdAt:new Date(Date.now()-9e6).toISOString() },
  { _id:'n3', title:'Class reminder', message:'Live Coding: REST APIs starts at 6:00 PM today.', read:false, createdAt:new Date(Date.now()-18e6).toISOString() }
];
var _DEMO_ASSIGNMENTS = [
  { _id:'asn1', title:'React Portfolio Project', course:{_id:'c1',title:'Full Stack'}, batch:{_id:'b1',name:'Batch A'}, dueDate: new Date(Date.now()+2*864e5).toISOString(), submissions:[] },
  { _id:'asn2', title:'Node REST API',           course:{_id:'c1',title:'Full Stack'}, batch:{_id:'b1',name:'Batch A'}, dueDate: new Date(Date.now()+4*864e5).toISOString(), submissions:[] },
  { _id:'asn3', title:'SQL Database Design',     course:{_id:'c1',title:'Full Stack'}, batch:{_id:'b1',name:'Batch A'}, dueDate: new Date(Date.now()+10*864e5).toISOString(),submissions:[] }
];
var _DEMO_DRIVES = [
  { _id:'drv1', company:'TCS',       role:'Digital Developer',   package:{min:350000,max:600000}, status:'open', applicationDeadline: new Date(Date.now()+15*864e5).toISOString() },
  { _id:'drv2', company:'Wipro',     role:'Project Engineer',    package:{min:320000,max:550000}, status:'open', applicationDeadline: new Date(Date.now()+20*864e5).toISOString() },
  { _id:'drv3', company:'Infosys',   role:'System Engineer',     package:{min:380000,max:650000}, status:'open', applicationDeadline: new Date(Date.now()+25*864e5).toISOString() },
  { _id:'drv4', company:'Capgemini', role:'Software Analyst',    package:{min:300000,max:500000}, status:'open', applicationDeadline: new Date(Date.now()+30*864e5).toISOString() }
];
var _DEMO_MENTORS = [
  { _id:'mn1', firstName:'Priya', lastName:'Sharma', email:'priya@placeonix.in', role:'mentor', status:'active', mentorProfile:{ specialization:['Full Stack','React'], assignedStudents:[1,2,3,4,5,6,7,8] } },
  { _id:'mn2', firstName:'Arun', lastName:'Verma', email:'arun@placeonix.in', role:'mentor', status:'active', mentorProfile:{ specialization:['Data Science','Python'], assignedStudents:[1,2,3,4,5] } },
  { _id:'mn3', firstName:'Kavya', lastName:'Nair', email:'kavya@placeonix.in', role:'mentor', status:'active', mentorProfile:{ specialization:['UI/UX Design'], assignedStudents:[1,2,3] } },
  { _id:'mn4', firstName:'Rohan', lastName:'Mehta', email:'rohan@placeonix.in', role:'mentor', status:'active', mentorProfile:{ specialization:['Cloud & DevOps'], assignedStudents:[1,2] } }
];
var _DEMO_STUDENTS = [
  { _id:'st1', firstName:'Arjun', lastName:'Reddy', email:'arjun@placeonix.in', role:'student', status:'active', studentProfile:{ enrollmentId:'STU10023' } },
  { _id:'st2', firstName:'Sneha', lastName:'Patel', email:'sneha@placeonix.in', role:'student', status:'active', studentProfile:{ enrollmentId:'STU10024' } },
  { _id:'st3', firstName:'Vikram', lastName:'Singh', email:'vikram@placeonix.in', role:'student', status:'active', studentProfile:{ enrollmentId:'STU10025' } },
  { _id:'st4', firstName:'Meera', lastName:'Joshi', email:'meera@placeonix.in', role:'student', status:'active', studentProfile:{ enrollmentId:'STU10026' } },
  { _id:'st5', firstName:'Karthik', lastName:'Iyer', email:'karthik@placeonix.in', role:'student', status:'active', studentProfile:{ enrollmentId:'STU10027' } }
];
var _DEMO_LEADERBOARD = [
  { id:'demo-std', name:'Arjun Reddy', progress:72, attendance:88, points:72*10+88*5, rank:1 },
  { id:'st2', name:'Sneha Patel', progress:63, attendance:71, points:63*10+71*5, rank:2 },
  { id:'st3', name:'Vikram Singh', progress:45, attendance:80, points:45*10+80*5, rank:3 },
  { id:'st4', name:'Meera Joshi', progress:38, attendance:66, points:38*10+66*5, rank:4 }
];
var _DEMO_BATCHES = [
  { _id:'b1', name:'FSWD Batch A — Morning', course:{title:'Full Stack Web Development'}, mentor:{firstName:'Priya',lastName:'Sharma'}, status:'active', capacity:30, students:new Array(24), startDate:new Date().toISOString() },
  { _id:'b2', name:'Data Science Batch B', course:{title:'Data Structures & Algorithms'}, mentor:{firstName:'Arun',lastName:'Verma'}, status:'active', capacity:25, students:new Array(18) },
  { _id:'b3', name:'Python Evening Batch', course:{title:'Python Programming'}, mentor:{firstName:'Kavya',lastName:'Nair'}, status:'upcoming', capacity:20, students:new Array(7) },
  { _id:'b4', name:'FSWD Batch C — Weekend', course:{title:'Full Stack Web Development'}, mentor:{firstName:'Rohan',lastName:'Mehta'}, status:'completed', capacity:30, students:new Array(30) }
];
var _DEMO_RESOURCES = [
  { _id:'r1', title:'React Official Documentation', type:'link', externalUrl:'https://react.dev', course:{title:'Full Stack Web Development'} },
  { _id:'r2', title:'MDN JavaScript Guide', type:'link', externalUrl:'https://developer.mozilla.org/en-US/docs/Web/JavaScript', course:{title:'Full Stack Web Development'} },
  { _id:'r3', title:'Full Stack Roadmap (PDF)', type:'pdf', fileUrl:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', course:{title:'Full Stack Web Development'} },
  { _id:'r4', title:'SAP FICO Configuration Handbook', type:'document', fileUrl:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', course:{title:'SAP FICO'} },
  { _id:'r5', title:'Intro Walkthrough (Video)', type:'video', fileUrl:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', course:{title:'Full Stack Web Development'} }
];
var _DEMO_LEADS = [
  { _id:'l1', firstName:'Sneha', lastName:'Patil', email:'sneha@gmail.com', phone:'9876543210', status:'new', interestedIn:'Full Stack', source:'Website' },
  { _id:'l2', firstName:'Vikram', lastName:'Singh', email:'vikram@gmail.com', phone:'9876501234', status:'contacted', interestedIn:'Data Science', source:'Referral' },
  { _id:'l3', firstName:'Anjali', lastName:'Rao', email:'anjali@gmail.com', phone:'9123456780', status:'qualified', interestedIn:'Python', source:'Instagram' },
  { _id:'l4', firstName:'Karthik', lastName:'Iyer', email:'karthik@gmail.com', phone:'9988776655', status:'converted', interestedIn:'Full Stack', source:'Website' },
  { _id:'l5', firstName:'Meera', lastName:'Joshi', email:'meera@gmail.com', phone:'9001122334', status:'new', interestedIn:'UI/UX', source:'Walk-in' }
];
var _DEMO_CERTS = [
  { _id:'ct1', course:{title:'Python Programming'}, student:{firstName:'Arjun',lastName:'Reddy'}, certificateNumber:'PLX-2025-0451', status:'active', issuedAt:new Date(Date.now()-30*864e5).toISOString() },
  { _id:'ct2', course:{title:'Data Structures & Algorithms'}, student:{firstName:'Arjun',lastName:'Reddy'}, certificateNumber:'PLX-2025-0298', status:'active', issuedAt:new Date(Date.now()-90*864e5).toISOString() }
];
var _DEMO_PAYMENTS = [
  { _id:'p1', student:{firstName:'Arjun',lastName:'Reddy'}, amount:25000, status:'completed', method:'UPI', paidOn:new Date(Date.now()-10*864e5).toISOString() },
  { _id:'p2', student:{firstName:'Sneha',lastName:'Patil'}, amount:30000, status:'completed', method:'Card', paidOn:new Date(Date.now()-5*864e5).toISOString() },
  { _id:'p3', student:{firstName:'Vikram',lastName:'Singh'}, amount:15000, status:'pending', method:'Net Banking', paidOn:new Date().toISOString() }
];
var _DEMO_REVIEWS = [
  { _id:'rv1', author:{firstName:'Arjun',lastName:'Reddy'}, rating:5, comment:'Priya ma\'am explains React concepts incredibly well. Best mentor!', targetType:'mentor', createdAt:new Date(Date.now()-3*864e5).toISOString(), response:'Thank you Arjun!' },
  { _id:'rv2', author:{firstName:'Sneha',lastName:'Patil'}, rating:4, comment:'Great course content, would love more live projects.', targetType:'course', createdAt:new Date(Date.now()-7*864e5).toISOString() },
  { _id:'rv3', author:{firstName:'Karthik',lastName:'Iyer'}, rating:5, comment:'Got placed at TCS thanks to the placement support. Highly recommend!', targetType:'institute', createdAt:new Date(Date.now()-14*864e5).toISOString() }
];
function _demoSessAt(days,h){ var d=new Date(); d.setDate(d.getDate()+days); d.setHours(h,0,0,0); return d.toISOString(); }
var _DEMO_REC = ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'];
var _DEMO_BATCH_ON = { _id:'b-online', name:'Full Stack — Online Batch A', mode:'online' };
var _DEMO_BATCH_OFF = { _id:'b-offline', name:'SAP FICO — Offline Batch C', mode:'offline', venue:'Kapil Kavuri Hub, 9th Floor' };
var _DEMO_SESSIONS = [
  // online live classes (batchA)
  { _id:'s1', title:'React Hooks Deep Dive', batch:_DEMO_BATCH_ON, instructor:{firstName:'Priya',lastName:'Sharma'}, mode:'online', meetingLink:'https://meet.google.com/placeonix-live', status:'live', agenda:['useState','useEffect','Custom hooks'], startTime:new Date(Date.now()-12e5).toISOString(), endTime:new Date(Date.now()+54e5).toISOString() },
  { _id:'s2', title:'Live Coding: REST APIs with Node.js', batch:_DEMO_BATCH_ON, instructor:{firstName:'Priya',lastName:'Sharma'}, mode:'online', meetingLink:'https://meet.google.com/placeonix-live', status:'scheduled', agenda:['Express routing','JWT auth','Live Q&A'], startTime:_demoSessAt(1,18), endTime:_demoSessAt(1,20) },
  { _id:'s3', title:'React State Management Workshop', batch:_DEMO_BATCH_ON, instructor:{firstName:'Priya',lastName:'Sharma'}, mode:'online', meetingLink:'https://meet.google.com/placeonix-live', status:'scheduled', agenda:['Context API','Redux Toolkit','Lifting state'], startTime:_demoSessAt(3,18), endTime:_demoSessAt(3,20) },
  { _id:'s4', title:'JavaScript ES6+ Essentials', batch:_DEMO_BATCH_ON, instructor:{firstName:'Priya',lastName:'Sharma'}, mode:'online', status:'completed', recordingUrl:_DEMO_REC[2], agenda:['let/const','Arrow functions','Destructuring','Promises'], startTime:_demoSessAt(-3,18), endTime:_demoSessAt(-3,20) },
  // offline recordings (batchC)
  { _id:'s5', title:'SAP FICO: Organizational Structure', batch:_DEMO_BATCH_OFF, instructor:{firstName:'Arun',lastName:'Verma'}, mode:'offline', venue:'Room 204', status:'completed', recordingUrl:_DEMO_REC[0], agenda:['Company code','Chart of accounts','Fiscal year variant'], startTime:_demoSessAt(-6,8), endTime:_demoSessAt(-6,10) },
  { _id:'s6', title:'SAP FICO: General Ledger Accounting', batch:_DEMO_BATCH_OFF, instructor:{firstName:'Arun',lastName:'Verma'}, mode:'offline', venue:'Room 204', status:'completed', recordingUrl:_DEMO_REC[1], agenda:['GL master data','Document posting','Account groups'], startTime:_demoSessAt(-4,8), endTime:_demoSessAt(-4,10) },
  { _id:'s7', title:'SAP FICO: Accounts Payable', batch:_DEMO_BATCH_OFF, instructor:{firstName:'Arun',lastName:'Verma'}, mode:'offline', venue:'Room 204', status:'completed', recordingUrl:_DEMO_REC[2], agenda:['Vendor master','Invoice posting','Outgoing payments'], startTime:_demoSessAt(-2,8), endTime:_demoSessAt(-2,10) },
  { _id:'s8', title:'SAP FICO: Accounts Receivable', batch:_DEMO_BATCH_OFF, instructor:{firstName:'Arun',lastName:'Verma'}, mode:'offline', venue:'Kapil Kavuri Hub, 9th Floor', status:'scheduled', agenda:['Customer master','Incoming payments','Dunning basics'], startTime:_demoSessAt(1,8), endTime:_demoSessAt(1,10) }
];
var _DEMO_ENROLLMENTS = [
  { _id:'e1', course:{ _id:'c2', title:'Full Stack Web Development', category:'Web Development', color:'#6c3ff5', duration:'4-6 Months' }, batch:_DEMO_BATCH_ON, progress:{overall:72}, status:'in_progress' },
  { _id:'e2', course:{ _id:'c5', title:'SAP FICO', category:'ERP', color:'#d97706', duration:'2-3 Months' }, batch:_DEMO_BATCH_OFF, progress:{overall:40}, status:'in_progress' }
];
var _DEMO_REQUESTS = [
  { _id:'jr1', student:{firstName:'Arjun',lastName:'Reddy'}, batch:_DEMO_BATCH_OFF, course:{title:'SAP FICO'}, requestedDate:_demoSessAt(1,8), reason:'Travelling this week — would like to attend the class online.', status:'pending' },
  { _id:'jr2', student:{firstName:'Arjun',lastName:'Reddy'}, batch:_DEMO_BATCH_OFF, course:{title:'SAP FICO'}, requestedDate:_demoSessAt(-2,8), reason:'Was unwell, needed remote access.', status:'approved', meetingLink:'https://meet.google.com/placeonix-live' }
];
var _DEMO_ATT = (function(){
  var names=[['Arjun','Reddy'],['Sneha','Patil'],['Vikram','Singh'],['Anjali','Rao'],['Karthik','Iyer']];
  var rows=[]; var off=1;
  for(var i=0;i<28;i++){ var d=new Date(); d.setDate(d.getDate()-off); off++; if(d.getDay()===0){i--;continue;}
    var n=names[i%names.length]; var r=Math.random(); var st=r>0.86?'absent':r>0.80?'excused':r>0.72?'late':'present';
    rows.push({ student:{firstName:n[0],lastName:n[1]}, date:d.toISOString(), sessionTitle:'Class', status:st });
  }
  return rows;
})();

function _demoResponse(path) {
  var p = path.split('?')[0];
  var role = _currentUser ? _currentUser.role : 'student';
  if (p==='/auth/login'||p==='/auth/me') return { success:true, data:{ user:_currentUser, accessToken:'demo' } };
  if (p==='/auth/logout') return { success:true };
  if (p==='/users/me/enrollments') return { success:true, data:_DEMO_ENROLLMENTS };
  if (p==='/users/leaderboard') return { success:true, data:_DEMO_LEADERBOARD };
  if (p.indexOf('/users/me/enrollments/')===0 && p.indexOf('/progress')>0) return { success:true, data:{ overall:50, completedModules:[] } };
  if (p==='/users/me/stats') {
    if(role==='student') return { success:true, data:{ enrolledCourses:2, avgProgress:56 } };
    if(role==='mentor')  return { success:true, data:{ myStudents:18 } };
    return { success:true, data:{ totalStudents:124, totalMentors:8, activeStudents:118 } };
  }
  if (p==='/analytics/overview') return { success:true, data:{ students:{total:124,active:118}, mentors:{total:8}, courses:{total:5,published:5}, batches:{active:6}, enrollments:{total:87,completed:12}, placement:{placed:10,rate:83,openDrives:3}, leads:{new:5} } };
  if (p==='/courses') return { success:true, data:_DEMO_COURSES, meta:{total:3,page:1,limit:20,pages:1} };
  if (p==='/announcements') return { success:true, data:_DEMO_ANNOUNCEMENTS, meta:{total:3,page:1,limit:20,pages:1} };
  if (p==='/assignments') return { success:true, data:_DEMO_ASSIGNMENTS, meta:{total:3,page:1,limit:20,pages:1} };
  if (p==='/attendance/me') return { success:true, data:{ records:[], summary:{present:19,absent:2,late:1,excused:0,total:22,percentage:91} } };
  if (p.indexOf('/attendance/batch/')===0) return { success:true, data:{ records:_DEMO_ATT, count:_DEMO_ATT.length } };
  if (p==='/attendance/mark') return { success:true, data:{marked:5} };
  if (p==='/placements') return { success:true, data:_DEMO_DRIVES, meta:{total:4,page:1,limit:20,pages:1} };
  if (p==='/placements/my/applications') return { success:true, data:{applications:[]} };
  if (p==='/notifications/unread-count') return { success:true, data:{count:_DEMO_NOTIFS.filter(function(n){return !n.read;}).length} };
  if (p==='/notifications') return { success:true, data:_DEMO_NOTIFS };
  if (p==='/notifications/read-all') { _DEMO_NOTIFS.forEach(function(n){n.read=true;}); return { success:true }; }
  if (p==='/sessions/today') return { success:true, data:_DEMO_SESSIONS.filter(function(s){return s.status!=='completed';}) };
  if (p==='/sessions') return { success:true, data:_DEMO_SESSIONS, meta:{total:_DEMO_SESSIONS.length,page:1,limit:30,pages:1} };
  if (p==='/users/my-students') return { success:true, data:{students:[],count:0} };
  if (p==='/batches') return { success:true, data:_DEMO_BATCHES, meta:{total:_DEMO_BATCHES.length,page:1,limit:50,pages:1} };
  if (p==='/resources') return { success:true, data:_DEMO_RESOURCES, meta:{total:_DEMO_RESOURCES.length,page:1,limit:50,pages:1} };
  if (p.indexOf('/resources/')===0 && p.indexOf('/download')>0) return { success:true, data:{ fileUrl:'' } };
  if (p==='/leads') return { success:true, data:_DEMO_LEADS, meta:{total:_DEMO_LEADS.length,page:1,limit:50,pages:1} };
  if (p==='/certificates/me') return { success:true, data:_DEMO_CERTS };
  if (p==='/certificates') return { success:true, data:_DEMO_CERTS, meta:{total:_DEMO_CERTS.length} };
  if (p==='/payments/me/summary') return { success:true, data:{ totalFee:50000, totalPaid:25000, totalDue:25000, payments:[{amount:25000,status:'paid',method:'UPI',paidOn:new Date(Date.now()-10*864e5).toISOString()}] } };
  if (p==='/payments') return { success:true, data:_DEMO_PAYMENTS, meta:{total:_DEMO_PAYMENTS.length} };
  if (p==='/reviews') return { success:true, data:_DEMO_REVIEWS, meta:{total:_DEMO_REVIEWS.length} };
  if (p==='/join-requests') return { success:true, data:_DEMO_REQUESTS };
  if (p==='/analytics/enrollments/monthly') return { success:true, data:{ year:2025, data:[4,7,5,9,12,8,15,11,14,10,13,9].map(function(c,i){return{month:i+1,count:c};}) } };
  if (p==='/analytics/courses/distribution') return { success:true, data:{ total:87, distribution:[{title:'Full Stack Web Development',percentage:42,color:'#7c3aed'},{title:'Data Structures & Algorithms',percentage:31,color:'#0ea5c9'},{title:'Python Programming',percentage:27,color:'#10b981'}] } };
  if (p==='/analytics/placements') return { success:true, data:{ totalApplications:48, totalPlaced:40, placementRate:83, avgPackage:480000, highestPackage:1200000, lowestPackage:300000 } };
  if (p==='/analytics/revenue') return { success:true, data:{ summary:{ totalRevenue:2150000, totalDue:430000, totalCommitted:2580000 }, monthly:[] } };
  if (p.indexOf('/users')===0 && path.indexOf('role=mentor')>0) return { success:true, data:_DEMO_MENTORS, meta:{total:_DEMO_MENTORS.length} };
  if (p.indexOf('/users')===0 && path.indexOf('role=student')>0) return { success:true, data:_DEMO_STUDENTS, meta:{total:124} };
  if (p.startsWith('/users')) return { success:true, data:[], meta:{total:0} };
  return { success:true, data:[], meta:{total:0,page:1,limit:20,pages:1} };
}
// —

async function apiFetch(path, opts) {
  if (_demoMode) {
    await new Promise(function(r){ setTimeout(r,180); });
    return _demoResponse(path);
  }
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  var res = await fetch(API_BASE + path, Object.assign({}, opts, { headers: headers }));
  var json;
  try { json = await res.json(); } catch (e) { json = {}; }
  if (!res.ok) {
    var err = new Error(json.message || ('Request failed (' + res.status + ')'));
    err.status = res.status;
    throw err;
  }
  return json;
}

function _showDemoBanner() {
  if (document.getElementById('demoBanner')) return;
  var b = document.createElement('div');
  b.id = 'demoBanner';
  b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#f59e0b;color:#fff;text-align:center;padding:.55rem 1rem;font-size:.78rem;font-weight:600;z-index:9999;letter-spacing:.2px';
  b.innerHTML = '&#9888; Demo Mode &mdash; backend not connected, showing sample data. Connect a database for live data.';
  document.body.appendChild(b);
  // push pages area up so banner doesn't cover content
  var pg = document.getElementById('pages');
  if(pg) pg.style.paddingBottom='2.5rem';
}

function loadingHTML() {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;gap:16px"><div class="spin"></div><div style="color:var(--muted);font-size:.9rem">Loading...</div></div>';
}

function errorHTML(msg) {
  return '<div style="padding:40px;text-align:center;color:var(--red);font-size:.9rem">&#9888; ' + (msg || 'Something went wrong') + '</div>';
}

function populateROLES() {
  if (!_currentUser) return;
  var u = _currentUser;
  var role = u.role;
  var name = (u.firstName || '') + ' ' + (u.lastName || '');
  var initials = (u.firstName ? u.firstName[0] : '') + (u.lastName ? u.lastName[0] : '');
  var id = (role === 'student' && u.studentProfile && u.studentProfile.enrollmentId)
    ? u.studentProfile.enrollmentId
    : u._id.slice(-8).toUpperCase();
  if (ROLES[role]) {
    ROLES[role].name = name.trim() || ROLES[role].name;
    ROLES[role].initials = initials || ROLES[role].initials;
    ROLES[role].id = id || ROLES[role].id;
  }
}

async function autoLogin() {
  if (!_token) return;
  if (_token === 'demo') {
    // Demo session stored — clear it, require fresh login
    _token = null;
    localStorage.removeItem('plx_token');
    return;
  }
  try {
    var res = await apiFetch('/auth/me');
    _currentUser = res.data.user;
    currentRole = _currentUser.role;
    populateROLES();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initApp(currentRole);
  } catch (e) {
    _token = null;
    localStorage.removeItem('plx_token');
  }
}

async function fetchNotifCount() {
  try {
    var res = await apiFetch('/notifications/unread-count');
    var count = (res.data && res.data.count) ? res.data.count : 0;
    var dot = document.getElementById('notifDot');
    if (dot) dot.style.display = count > 0 ? 'block' : 'none';
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', function () { autoLogin(); });
// —

var currentRole = 'student';

var ROLES = {
  admin:{
    label:'Administrator', color:'#5b5fc7', initials:'AM',
    name:'Avinash Murari', id:'ADM0001',
    nav:[
      {id:'dashboard',label:'Dashboard',ico:'home'},
      {id:'calendar',label:'Calendar',ico:'calendar'},
      {id:'mock-interviews',label:'Mock Interviews',ico:'chalkboard'},
      {id:'alumni',label:'Alumni',ico:'award'},
      {id:'office-hours',label:'Office Hours',ico:'calendar'},
      {id:'students',label:'Students',ico:'users'},
      {id:'mentors',label:'Mentors',ico:'chalkboard'},
      {id:'batches',label:'Batches',ico:'folder'},
      {id:'courses',label:'Courses',ico:'book'},
      {id:'sessions',label:'Sessions',ico:'calendar'},
      {id:'placements',label:'Placements',ico:'briefcase'},
      {id:'companies',label:'Companies',ico:'briefcase'},
      {id:'leads',label:'Leads',ico:'target'},
      {id:'payments',label:'Payments',ico:'card'},
      {id:'certificates',label:'Certificates',ico:'award'},
      {id:'resources',label:'Resources',ico:'file'},
      {id:'reviews',label:'Reviews',ico:'star'},
      {id:'leaderboard',label:'Leaderboard',ico:'award'},
      {id:'announcements',label:'Announcements',ico:'bell'},
      {id:'reports',label:'Reports',ico:'chart'},
      {id:'settings',label:'Settings',ico:'settings'}
    ]
  },
  mentor:{
    label:'Mentor', color:'#5b7c99', initials:'PS',
    name:'Priya Sharma', id:'MNT0012',
    nav:[
      {id:'dashboard',label:'Dashboard',ico:'home'},
      {id:'calendar',label:'Calendar',ico:'calendar'},
      {id:'mock-interviews',label:'Mock Interviews',ico:'chalkboard'},
      {id:'alumni',label:'Alumni',ico:'award'},
      {id:'office-hours',label:'Office Hours',ico:'calendar'},
      {id:'my-students',label:'My Students',ico:'users'},
      {id:'sessions',label:'Sessions',ico:'calendar'},
      {id:'assignments',label:'Assignments',ico:'clipboard'},
      {id:'attendance-mark',label:'Attendance',ico:'check'},
      {id:'requests',label:'Online Requests',ico:'target'},
      {id:'resources',label:'Resources',ico:'file'},
      {id:'reviews',label:'Feedback',ico:'star'},
      {id:'leaderboard',label:'Leaderboard',ico:'award'},
      {id:'profile',label:'Profile',ico:'user'}
    ]
  },
  student:{
    label:'Student', color:'#3f9c6d', initials:'AR',
    name:'Arjun Reddy', id:'STU10023',
    nav:[
      {id:'dashboard',label:'Dashboard',ico:'home'},
      {id:'calendar',label:'Calendar',ico:'calendar'},
      {id:'mock-interviews',label:'Mock Interviews',ico:'chalkboard'},
      {id:'alumni',label:'Alumni',ico:'award'},
      {id:'office-hours',label:'Office Hours',ico:'calendar'},
      {id:'my-courses',label:'My Courses',ico:'book'},
      {id:'attendance',label:'Attendance',ico:'calendar'},
      {id:'assignments',label:'Assignments',ico:'clipboard'},
      {id:'sessions',label:'Sessions',ico:'calendar'},
      {id:'resources',label:'Resources',ico:'file'},
      {id:'placements',label:'Placements',ico:'briefcase'},
      {id:'certificates',label:'Certificates',ico:'award'},
      {id:'leaderboard',label:'Leaderboard',ico:'star'},
      {id:'payments',label:'Fees',ico:'card'},
      {id:'reviews',label:'Feedback',ico:'message'},
      {id:'profile',label:'Profile',ico:'user'},
      {id:'support',label:'Support',ico:'help'}
    ]
  }
};

function iconSvg(name){
  var icons={
    home:'<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    users:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    book:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    briefcase:'<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
    bell:'<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clipboard:'<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    folder:'<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    chart:'<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    user:'<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    check:'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    file:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    chalkboard:'<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21l4-4 4 4"/></svg>',
    target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    card:'<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    award:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    star:'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };
  return icons[name] || icons['home'];
}

function quickLogin(e, role) {
  currentRole = role;
  var emails = { admin: 'admin@placeonix.in', mentor: 'mentor@placeonix.in', student: 'student@placeonix.in' };
  document.getElementById('loginEmail').value = emails[role];
  document.getElementById('loginPass').value = 'Password123';
  setTimeout(doLogin, 150);
}

function togglePass() {
  var inp = document.getElementById('loginPass');
  var btn = document.getElementById('eyeBtn');
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

function forgotPassword(e){
  if(e && e.preventDefault) e.preventDefault();
  formModal({
    title:'Reset Your Password', submitLabel:'Update Password',
    fields:[
      {name:'email',label:'Account email',type:'email',required:true,placeholder:'you@example.com'},
      {name:'password',label:'New Password',type:'password',required:true,help:'Minimum 8 characters.'},
      {name:'confirm',label:'Confirm New Password',type:'password',required:true}
    ],
    onSubmit:async function(v){
      if(v.password.length<8) throw new Error('Password must be at least 8 characters.');
      if(v.password!==v.confirm) throw new Error('Passwords do not match.');
      if(_demoMode){ toast('Password updated (demo)','success'); return; }
      var res = await apiFetch('/auth/forgot-password',{method:'POST',body:JSON.stringify({email:v.email})});
      if(res.data && res.data.emailed){ toast('A reset link has been emailed to you.','success'); return; }
      var token = res.data && res.data.resetToken;
      if(!token) throw new Error('No account found with that email.');
      await apiFetch('/auth/reset-password/'+token,{method:'POST',body:JSON.stringify({password:v.password})});
      toast('Password updated! Log in with your new password.','success');
      var em=document.getElementById('loginEmail'); if(em) em.value=v.email;
      var pw=document.getElementById('loginPass'); if(pw) pw.value='';
    }
  });
}

async function doLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPass').value;
  var errEl = document.getElementById('loginErr');
  var btn = document.getElementById('loginBtn');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  try {
    var res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password })
    });
    _token = res.data.accessToken;
    _currentUser = res.data.user;
    localStorage.setItem('plx_token', _token);
    currentRole = _currentUser.role;
    populateROLES();
    var ls = document.getElementById('loginScreen');
    ls.style.transition = 'opacity .35s';
    ls.style.opacity = '0';
    setTimeout(function () {
      ls.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      initApp(currentRole);
    }, 350);
  } catch (e) {
    var isNetworkErr = (e instanceof TypeError) || e.message === 'Failed to fetch' || e.message.includes('NetworkError') || e.message.includes('fetch');
    // Treat an unreachable / database-less backend (e.g. a Vercel deploy with no
    // MONGO_URI set yet) as "offline" so the demo experience still works.
    var isBackendDown = isNetworkErr || e.status >= 500 || /database|MONGO_URI/i.test(e.message);
    if (isBackendDown) {
      // Backend offline — try demo mode with known demo credentials
      var demoUser = _DEMO_USERS[email];
      if (demoUser && password === 'Password123') {
        _demoMode = true;
        _token = 'demo';
        _currentUser = demoUser;
        currentRole = demoUser.role;
        populateROLES();
        btn.disabled = false;
        btn.textContent = 'Login';
        var ls = document.getElementById('loginScreen');
        ls.style.transition = 'opacity .35s';
        ls.style.opacity = '0';
        setTimeout(function() {
          ls.style.display = 'none';
          document.getElementById('app').style.display = 'block';
          initApp(currentRole);
          _showDemoBanner();
        }, 350);
        return;
      }
      errEl.innerHTML = '&#9888; Backend is offline. Use demo credentials with <strong>Password123</strong>.';
    } else {
      errEl.textContent = e.message;
    }
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function doLogout() {
  try { if(!_demoMode) await apiFetch('/auth/logout', { method: 'POST' }); } catch (e) {}
  _token = null;
  _currentUser = null;
  _demoMode = false;
  localStorage.removeItem('plx_token');
  closeModal();
  var db = document.getElementById('demoBanner'); if (db) db.remove();
  // Reset the login form so credentials & button don't persist
  var em = document.getElementById('loginEmail'); if (em) em.value = '';
  var pw = document.getElementById('loginPass'); if (pw) { pw.value = ''; pw.type = 'password'; }
  var lb = document.getElementById('loginBtn');
  if (lb) { lb.disabled = false; lb.innerHTML = 'Login <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'; }
  var le = document.getElementById('loginErr'); if (le) le.style.display = 'none';
  var app = document.getElementById('app');
  app.style.display = 'none';
  var ls = document.getElementById('loginScreen');
  ls.style.display = 'flex';
  ls.style.opacity = '0';
  setTimeout(function () { ls.style.transition = 'opacity .3s'; ls.style.opacity = '1'; }, 10);
}

function initApp(role) {
  var cfg = ROLES[role];
  document.getElementById('sbAv').textContent = cfg.initials;
  document.getElementById('sbAv').style.background = cfg.color;
  document.getElementById('sbName').textContent = cfg.name;
  document.getElementById('sbId').textContent = cfg.id;
  document.getElementById('topAv').textContent = cfg.initials;
  document.getElementById('topAv').style.background = cfg.color;
  document.getElementById('topName').textContent = cfg.name;
  document.getElementById('topId').textContent = cfg.id;
  var _gw=document.getElementById("gsearchWrap"); if(_gw) _gw.style.display=(role==="admin"||role==="mentor")?"flex":"none";
  buildNav(cfg.nav);
  showPage('dashboard');
  fetchNotifCount();
}

function buildNav(nav){
  var html='';
  nav.forEach(function(item){
    html+='<div class="sb-item" id="nav-'+item.id+'" onclick="showPage(&apos;'+item.id+'&apos;)">';
    html+=iconSvg(item.ico||'home');
    html+=item.label;
    if(item.badge) html+='<span class="sb-badge">'+item.badge+'</span>';
    html+='</div>';
  });
  document.getElementById('sbNav').innerHTML=html;
}
// Dynamically set/clear a sidebar count badge (e.g. pending assignments)
function setNavBadge(id, count){
  var el=document.getElementById('nav-'+id); if(!el) return;
  var b=el.querySelector('.sb-badge');
  if(count && count>0){
    if(!b){ b=document.createElement('span'); b.className='sb-badge'; el.appendChild(b); }
    b.textContent=count;
  } else if(b){ b.remove(); }
}

function toggleSidebar(){
  var s=document.getElementById('sidebar'), o=document.getElementById('sbOverlay');
  var open = s.classList.toggle('open');
  if(o) o.classList.toggle('show', open);
}
function closeSidebar(){
  var s=document.getElementById('sidebar'), o=document.getElementById('sbOverlay');
  if(s) s.classList.remove('open'); if(o) o.classList.remove('show');
}
var _currentPage = 'dashboard';
async function showPage(id) {
  _currentPage = id;
  closeSidebar();
  document.querySelectorAll('.sb-item').forEach(function (el) { el.classList.remove('active'); });
  var nav = document.getElementById('nav-' + id);
  if (nav) nav.classList.add('active');
  var labels = {
    dashboard: 'Dashboard', calendar: 'Calendar', companies: 'Companies', 'mock-interviews': 'Mock Interviews', alumni: 'Alumni', 'office-hours': 'Office Hours', 'my-courses': 'My Courses', 'my-students': 'My Students',
    attendance: 'Attendance', assignments: 'Assignments', exams: 'Exams',
    placements: 'Placements', announcements: 'Announcements', profile: 'Profile',
    support: 'Support', sessions: 'Sessions', 'attendance-mark': 'Mark Attendance',
    resources: 'Resources', students: 'Students', mentors: 'Mentors', batches: 'Batches',
    courses: 'Courses', reports: 'Reports & Analytics', settings: 'Settings',
    leads: 'Leads (CRM)', payments: 'Payments', certificates: 'Certificates', reviews: 'Reviews & Feedback',
    requests: 'Online Join Requests', leaderboard: 'Leaderboard'
  };
  document.getElementById('topbarTitle').textContent = labels[id] || id;
  var pagesEl = document.getElementById('pages');
  pagesEl.innerHTML = loadingHTML();
  try {
    pagesEl.innerHTML = await renderPage(id);
  } catch (e) {
    pagesEl.innerHTML = errorHTML(e.message);
  }
}

async function renderPage(id) {
  var r = currentRole;
  if (id === 'dashboard') return renderDashboard(r);
  if (id === 'calendar') return renderCalendar(r);
  if (id === 'companies') return renderCompanies();
  if (id === 'mock-interviews') return renderMockInterviews(r);
  if (id === 'alumni') return renderAlumni(r);
  if (id === 'office-hours') return renderOfficeHours(r);
  if (id === 'my-courses' || id === 'courses') return renderCourses(r);
  if (id === 'my-students' || id === 'students') return renderStudents(r);
  if (id === 'attendance') return r === 'student' ? renderAttendance() : renderAttendanceAdmin();
  if (id === 'attendance-mark') return renderMarkAttendance();
  if (id === 'assignments') return renderAssignments(r);
  if (id === 'placements') return renderPlacements(r);
  if (id === 'announcements') return renderAnnouncements(r);
  if (id === 'profile') return renderProfile(r);
  if (id === 'sessions') return renderSessions(r);
  if (id === 'support') return renderSupport();
  if (id === 'mentors') return renderMentors();
  if (id === 'batches') return renderBatches(r);
  if (id === 'resources') return renderResources(r);
  if (id === 'leads') return renderLeads();
  if (id === 'payments') return renderPayments(r);
  if (id === 'certificates') return renderCertificates(r);
  if (id === 'reviews') return renderReviews(r);
  if (id === 'reports') return renderReports();
  if (id === 'requests') return renderJoinRequests();
  if (id === 'leaderboard') return renderLeaderboard(r);
  if (id === 'settings') return renderSettings();
  return '<div style="padding:2rem;text-align:center;color:var(--muted)">Coming soon</div>';
}

// — HELPERS —
function getCourseStyle(cat) {
  var m = {
    'Web Development': { ico: '&#128187;', bg: '#ede9fe' },
    'Data Science':    { ico: '&#128202;', bg: '#ffedd5' },
    'ERP':             { ico: '&#127970;', bg: '#dbeafe' },
    'Cloud & DevOps':  { ico: '&#9729;',   bg: '#fef3c7' },
    'Cybersecurity':   { ico: '&#128274;', bg: '#fee2e2' },
    'UI/UX':           { ico: '&#127912;', bg: '#f0fdf4' },
    'Programming':     { ico: '&#9000;',   bg: '#f5f3ff' }
  };
  return m[cat] || { ico: '&#128218;', bg: '#f3f4f6' };
}
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
// —

function escHtml(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
var _calRef=null, _calEvents=[];
async function renderCalendar(role){
  var r = await Promise.all([
    apiFetch('/sessions?limit=300').catch(function(){return {data:[]};}),
    apiFetch('/assignments?limit=300').catch(function(){return {data:[]};}),
    apiFetch('/placements?limit=300').catch(function(){return {data:[]};})
  ]);
  var ev=[];
  (r[0].data||[]).forEach(function(s){ if(s.startTime) ev.push({date:new Date(s.startTime),type:'class',title:s.title||'Class',sub:(s.batch&&s.batch.name)||'',time:fmtTime(s.startTime)}); });
  (r[1].data||[]).forEach(function(a){ if(a.dueDate) ev.push({date:new Date(a.dueDate),type:'assignment',title:(a.title||'Assignment')+' due',sub:(a.course&&a.course.title)||'',time:''}); });
  (r[2].data||[]).forEach(function(p){ if(p.applicationDeadline) ev.push({date:new Date(p.applicationDeadline),type:'placement',title:(p.company||'Drive')+' deadline',sub:p.role||'',time:''}); });
  _calEvents=ev;
  if(!_calRef){ var n=new Date(); _calRef={y:n.getFullYear(),m:n.getMonth()}; }
  return '<div id="calWrap">'+calendarHTML()+'</div>';
}
function calShift(delta){
  if(delta===0){ var n=new Date(); _calRef={y:n.getFullYear(),m:n.getMonth()}; }
  else { _calRef.m+=delta; if(_calRef.m<0){_calRef.m=11;_calRef.y--;} if(_calRef.m>11){_calRef.m=0;_calRef.y++;} }
  var w=document.getElementById('calWrap'); if(w) w.innerHTML=calendarHTML();
}
function calendarHTML(){
  var y=_calRef.y,m=_calRef.m;
  var first=new Date(y,m,1),startDow=first.getDay(),days=new Date(y,m+1,0).getDate();
  var monthName=first.toLocaleString('en-US',{month:'long'});
  var today=new Date(),isThisMonth=(today.getFullYear()===y&&today.getMonth()===m);
  var tc={class:'#2563eb',assignment:'#d97706',placement:'#7c3aed'};
  var byDay={};
  _calEvents.forEach(function(e){ if(e.date.getFullYear()===y&&e.date.getMonth()===m){ var d=e.date.getDate(); (byDay[d]=byDay[d]||[]).push(e); } });
  var dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(x){return '<div class="cal-dow">'+x+'</div>';}).join('');
  var cells='';
  for(var i=0;i<startDow;i++) cells+='<div class="cal-cell cal-empty"></div>';
  for(var d=1;d<=days;d++){
    var evs=(byDay[d]||[]).sort(function(a,b){return a.date-b.date;});
    var chips=evs.slice(0,3).map(function(e){ return '<div class="cal-chip" style="background:'+tc[e.type]+'22;color:'+tc[e.type]+'">'+(e.time?escHtml(e.time)+' ':'')+escHtml(e.title)+'</div>'; }).join('');
    if(evs.length>3) chips+='<div class="cal-more">+'+(evs.length-3)+' more</div>';
    var isToday=isThisMonth&&today.getDate()===d;
    cells+='<div class="cal-cell'+(isToday?' cal-today':'')+'"'+(evs.length?' onclick="calDay('+d+')" style="cursor:pointer"':'')+'><div class="cal-daynum">'+d+'</div>'+chips+'</div>';
  }
  var head='<div class="cal-head"><div style="font-size:1.15rem;font-weight:800;color:var(--ink)">'+monthName+' '+y+'</div>'+
    '<div class="cal-nav"><button class="cal-btn" onclick="calShift(-1)">&#8249; Prev</button><button class="cal-btn" onclick="calShift(0)">Today</button><button class="cal-btn" onclick="calShift(1)">Next &#8250;</button></div></div>';
  var legend='<div class="cal-legend"><span><span class="cal-leg-dot" style="background:#2563eb"></span>Classes</span><span><span class="cal-leg-dot" style="background:#d97706"></span>Assignment due</span><span><span class="cal-leg-dot" style="background:#7c3aed"></span>Placement deadline</span></div>';
  var grid='<div class="cal-grid">'+dow+cells+'</div>';
  var now0=new Date(new Date().toDateString());
  var up=_calEvents.filter(function(e){return e.date>=now0;}).sort(function(a,b){return a.date-b.date;}).slice(0,6);
  var upHtml=up.length?'<div class="section-head" style="margin-top:1.4rem"><span class="section-title">Upcoming</span></div><div class="ann-list">'+up.map(function(e){ return '<div class="ann-item"><div class="ann-dot" style="background:'+tc[e.type]+'"></div><div style="flex:1"><div class="ann-title">'+escHtml(e.title)+'</div><div class="ann-date">'+fmtDate(e.date)+(e.time?' &bull; '+escHtml(e.time):'')+(e.sub?' &bull; '+escHtml(e.sub):'')+'</div></div></div>'; }).join('')+'</div>':'';
  return head+legend+grid+upHtml;
}
function calDay(d){
  var y=_calRef.y,m=_calRef.m;
  var evs=_calEvents.filter(function(e){return e.date.getFullYear()===y&&e.date.getMonth()===m&&e.date.getDate()===d;}).sort(function(a,b){return a.date-b.date;});
  var tc={class:'#2563eb',assignment:'#d97706',placement:'#7c3aed'};
  var body=evs.map(function(e){ return '<div style="display:flex;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--line)"><div style="width:8px;height:8px;border-radius:3px;background:'+tc[e.type]+';margin-top:.4rem;flex-shrink:0"></div><div><div style="font-weight:700;font-size:.86rem">'+escHtml(e.title)+'</div><div style="font-size:.74rem;color:var(--muted)">'+(e.time?escHtml(e.time)+' &bull; ':'')+escHtml(e.sub||'')+'</div></div></div>'; }).join('');
  _buildModal(new Date(y,m,d).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}), body||'<div style="color:var(--muted)">No events.</div>', '<button class="btn-primary" onclick="closeModal()">Close</button>');
}
var _gsTimer=null;
function gsInput(q){
  clearTimeout(_gsTimer);
  var box=document.getElementById('gsResults');
  if(!q || q.trim().length<2){ if(box){box.classList.remove('show'); box.innerHTML='';} return; }
  _gsTimer=setTimeout(function(){ gsRun(q.trim()); }, 220);
}
async function gsRun(q){
  var box=document.getElementById('gsResults'); if(!box) return;
  try{
    var res = _demoMode ? {data:{results:[]}} : await apiFetch('/search?q='+encodeURIComponent(q));
    var items=(res.data&&res.data.results)||[];
    var tc={student:'#3f9c6d',mentor:'#5b7c99',course:'#7c3aed',batch:'#d97706',placement:'#2563eb'};
    box.innerHTML = items.length ? items.map(function(r){
      return '<div class="gs-item" onclick="gsGo(\''+r.page+'\',\''+r.type+'\',\''+r.id+'\')">'+
        '<span class="gs-badge" style="background:'+tc[r.type]+'22;color:'+tc[r.type]+'">'+r.type+'</span>'+
        '<div style="min-width:0"><div style="font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(r.label)+'</div>'+
        '<div style="font-size:.7rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(r.sub||'')+'</div></div></div>';
    }).join('') : '<div class="gs-empty">No matches for "'+escHtml(q)+'"</div>';
    box.classList.add('show');
  }catch(e){ box.innerHTML='<div class="gs-empty">Search unavailable</div>'; box.classList.add('show'); }
}
function gsGo(page, type, id){
  var box=document.getElementById('gsResults'); if(box) box.classList.remove('show');
  var inp=document.getElementById('gsearch'); if(inp) inp.value='';
  showPage(page);
  var kind = (type==='student'||type==='mentor')?'user':type;
  if(kind==='user'||kind==='course'||kind==='batch'){ setTimeout(function(){ try{ viewEntity(kind, id); }catch(e){} }, 360); }
}
document.addEventListener('click', function(e){ var w=document.getElementById('gsearchWrap'); var b=document.getElementById('gsResults'); if(w&&b&&!w.contains(e.target)) b.classList.remove('show'); });
async function renderCompanies(){
  var res = await apiFetch('/companies').catch(function(){ return {data:[]}; });
  var items = res.data || [];
  var cards = items.length ? items.map(function(c){
    var init=(c.name||'?')[0].toUpperCase();
    return '<div class="course-row">'+
      '<div class="stat-ico" style="background:#e0e7ff;color:#4338ca;font-weight:800;width:44px;height:44px">'+init+'</div>'+
      '<div class="course-info"><div class="course-name">'+escHtml(c.name)+'</div>'+
      '<div class="course-desc">'+escHtml([c.industry,c.location].filter(Boolean).join(' · ')||'Employer')+(c.contactPerson?' · '+escHtml(c.contactPerson):'')+'</div></div>'+
      (c.website?'<a href="'+escHtml(c.website)+'" target="_blank" class="continue-btn" style="background:transparent;color:var(--purple);border:1.5px solid var(--purple);text-decoration:none">Visit</a>':'')+
      '<button class="continue-btn" style="background:transparent;color:var(--ink2);border:1.5px solid var(--line)" onclick="editCompany(\''+c._id+'\')">Edit</button>'+
      '<button class="continue-btn" style="background:transparent;color:var(--red);border:1.5px solid var(--line)" onclick="deleteCompany(\''+c._id+'\',\''+escHtml((c.name||'').replace(/\x27/g,'')) +'\')">Delete</button>'+
    '</div>';
  }).join('') : '<div style="padding:1.5rem;color:var(--muted)">No companies yet. Add your first employer.</div>';
  return '<div class="section-head"><span class="section-title">Company Database ('+items.length+')</span><button class="continue-btn" onclick="addCompany()">+ Add Company</button></div>'+
    '<div class="mode-note online" style="margin-bottom:1.1rem"><div>&#127970; Reusable employer profiles. Add a company here, then attach it to placement drives.</div></div>'+
    '<div class="course-list">'+cards+'</div>';
}
function _companyForm(title, initial, onSubmit){
  initial=initial||{};
  formModal({ title:title, submitLabel:'Save',
    fields:[
      {name:'name',label:'Company Name',value:initial.name||'',required:true},
      {name:'industry',label:'Industry',value:initial.industry||'',placeholder:'IT Services, Fintech…'},
      {name:'location',label:'Location',value:initial.location||''},
      {name:'website',label:'Website',value:initial.website||'',placeholder:'https://…'},
      {name:'contactPerson',label:'Contact Person',value:initial.contactPerson||''},
      {name:'contactEmail',label:'Contact Email',value:initial.contactEmail||''},
      {name:'contactPhone',label:'Contact Phone',value:initial.contactPhone||''},
      {name:'notes',label:'Notes',type:'textarea',value:initial.notes||''}
    ],
    onSubmit:onSubmit
  });
}
function addCompany(){
  _companyForm('Add Company', {}, async function(v){
    if(_demoMode){ toast('Company added (demo)','success'); return refreshPage(); }
    await apiFetch('/companies',{method:'POST',body:JSON.stringify(v)});
    toast('Company added','success'); refreshPage();
  });
}
async function editCompany(id){
  var c={};
  if(!_demoMode){ try{ var r=await apiFetch('/companies'); c=(r.data||[]).filter(function(x){return String(x._id)===String(id);})[0]||{}; }catch(e){} }
  _companyForm('Edit Company', c, async function(v){
    if(_demoMode){ toast('Saved (demo)','success'); return refreshPage(); }
    await apiFetch('/companies/'+id,{method:'PATCH',body:JSON.stringify(v)});
    toast('Company updated','success'); refreshPage();
  });
}
function deleteCompany(id, name){
  confirmModal('Delete '+(name||'company')+'?','Remove this company from the database?','Delete',async function(){
    if(_demoMode){ toast('Removed (demo)','success'); return refreshPage(); }
    await apiFetch('/companies/'+id,{method:'DELETE'});
    toast('Company removed','success'); refreshPage();
  });
}
function placementAnalyticsHTML(an){
  var stages=[{v:'applied',l:'Applied'},{v:'shortlisted',l:'Shortlisted'},{v:'interview_scheduled',l:'Interview'},{v:'offered',l:'Offered'},{v:'placed',l:'Placed'}];
  var sc={applied:'#64748b',shortlisted:'#2563eb',interview_scheduled:'#d97706',offered:'#7c3aed',placed:'#059669'};
  var max=Math.max.apply(null,stages.map(function(s){return (an.funnel&&an.funnel[s.v])||0;}).concat([1]));
  var funnel=stages.map(function(s){ var n=(an.funnel&&an.funnel[s.v])||0; var w=Math.round(n/max*100); return '<div style="margin-bottom:.5rem"><div style="display:flex;justify-content:space-between;font-size:.74rem;font-weight:700;margin-bottom:.2rem"><span>'+s.l+'</span><span>'+n+'</span></div><div style="height:8px;background:var(--bg);border-radius:5px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:'+sc[s.v]+'"></div></div></div>'; }).join('');
  var byc=(an.byCourse||[]).sort(function(a,b){return b.placed-a.placed;}).slice(0,6).map(function(c){ return '<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--line);font-size:.8rem"><span>'+escHtml(c.course)+'</span><span style="font-weight:800;color:#059669">'+c.placed+' placed</span></div>'; }).join('')||'<div style="color:var(--muted);font-size:.8rem">No placements yet.</div>';
  return '<div class="section-head"><span class="section-title">Placement Analytics</span></div>'+
    '<div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">'+
      '<div class="stat-card"><div class="stat-ico" style="background:#d1fae5">&#127881;</div><div><div class="stat-v">'+(an.placementRate||0)+'%</div><div class="stat-l">Placement Rate</div></div></div>'+
      '<div class="stat-card"><div class="stat-ico" style="background:#dbeafe">&#128101;</div><div><div class="stat-v">'+(an.placed||0)+'</div><div class="stat-l">Students Placed</div></div></div>'+
      '<div class="stat-card"><div class="stat-ico" style="background:#ede9fe">&#128176;</div><div><div class="stat-v">&#8377;'+(an.avgPackage||0)+'L</div><div class="stat-l">Avg Package</div></div></div>'+
      '<div class="stat-card"><div class="stat-ico" style="background:#fef3c7">&#11088;</div><div><div class="stat-v">&#8377;'+(an.highestPackage||0)+'L</div><div class="stat-l">Highest</div></div></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin:1rem 0">'+
      '<div class="form-section"><div class="form-section-title">Hiring Funnel</div>'+funnel+'</div>'+
      '<div class="form-section"><div class="form-section-title">Placed by Course</div>'+byc+'</div>'+
    '</div>';
}
