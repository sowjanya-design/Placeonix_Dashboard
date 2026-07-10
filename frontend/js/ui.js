/*
 * Placeonix Hub — Shared UI framework: toast + modal builders, CSV export, notifications.
 * Part of the dashboard app; loaded after core.js (see the HTML).
 */
// ───────────────────────── TOAST + MODAL FRAMEWORK ─────────────────────────
// ── CSV export ──
var _studentsCache=[], _leadsCache=[], _paymentsCache=[];
function _csvCell(v){ var s=(v==null?'':String(v)).replace(/"/g,'""'); return /[",\n]/.test(s)?'"'+s+'"':s; }
function exportCSV(filename, headers, rows){
  var csv=[headers.join(',')].concat(rows.map(function(r){return r.map(_csvCell).join(',');})).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url); toast('Exported '+rows.length+' rows','success');
}
function exportStudents(){
  exportCSV('students.csv', ['Name','Email','Phone','Status'], _studentsCache.map(function(u){
    return [((u.firstName||'')+' '+(u.lastName||'')).trim(), u.email||'', u.phone||'', u.status||''];
  }));
}
function exportLeads(){
  exportCSV('leads.csv', ['Name','Email','Phone','Interested In','Source','Status'], _leadsCache.map(function(l){
    return [((l.firstName||'')+' '+(l.lastName||'')).trim(), l.email||'', l.phone||'', l.courseInterestedName||'', l.source||'', l.status||''];
  }));
}
function exportPayments(){
  exportCSV('payments.csv', ['Student','Amount','Method','Status','Date'], _paymentsCache.map(function(p){
    var s=p.student||{}; return [((s.firstName||'')+' '+(s.lastName||'')).trim(), p.amount||0, p.method||'', p.status||'', fmtDate(p.paidOn||p.createdAt)];
  }));
}
function confirmModal(title, message, confirmLabel, onConfirm){
  var body = '<div style="font-size:.9rem;color:var(--ink2);line-height:1.55">'+message+'</div>';
  var foot = '<button class="btn-secondary" onclick="closeModal()">Cancel</button>'+
             '<button class="btn-primary" id="cfmBtn" style="background:var(--red)">'+(confirmLabel||'Confirm')+'</button>';
  _buildModal(title, body, foot);
  document.getElementById('cfmBtn').onclick = async function(){
    var b=this; b.disabled=true; var orig=b.textContent; b.textContent='Working…';
    try{ await onConfirm(); closeModal(); }
    catch(e){ b.disabled=false; b.textContent=orig; toast(e.message||'Action failed','error'); }
  };
}
function toast(msg, type){
  var wrap = document.getElementById('toastWrap');
  if(!wrap){ wrap=document.createElement('div'); wrap.id='toastWrap'; document.body.appendChild(wrap); }
  var t = document.createElement('div');
  t.className = 'toast ' + (type||'info');
  var ico = type==='success'?'&#10003;':type==='error'?'&#9888;':'&#8505;';
  t.innerHTML = '<span style="font-size:1rem">'+ico+'</span><span>'+msg+'</span>';
  wrap.appendChild(t);
  setTimeout(function(){ t.style.transition='opacity .3s,transform .3s'; t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(function(){ t.remove(); },300); }, 3000);
}

function closeModal(){
  var ov = document.getElementById('modalOverlay');
  if(ov){ ov.classList.remove('show'); setTimeout(function(){ ov.remove(); },200); }
}
function _buildModal(title, bodyHTML, footHTML){
  closeModal();
  var ov = document.createElement('div');
  ov.id='modalOverlay'; ov.className='modal-overlay';
  ov.onclick=function(e){ if(e.target===ov) closeModal(); };
  ov.innerHTML =
    '<div class="modal-box">'+
      '<div class="modal-head"><div class="modal-title">'+title+'</div><button class="modal-close" onclick="closeModal()">&times;</button></div>'+
      '<div class="modal-body">'+bodyHTML+'</div>'+
      (footHTML?'<div class="modal-foot">'+footHTML+'</div>':'')+
    '</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(function(){ ov.classList.add('show'); });
  return ov;
}

// Generic detail modal: rows = [[key,value],...]
function detailModal(title, rows, extraHTML){
  var body = rows.map(function(r){
    return '<div class="modal-detail-row"><span class="k">'+r[0]+'</span><span class="v">'+(r[1]==null||r[1]===''?'—':r[1])+'</span></div>';
  }).join('') + (extraHTML||'');
  _buildModal(title, body, '<button class="btn-primary" onclick="closeModal()">Close</button>');
}

// Generic form modal.
// opts:{ title, fields:[{name,label,type,value,options,required,placeholder,help}], submitLabel, onSubmit(values) }
function formModal(opts){
  var fieldsHTML = opts.fields.map(function(f){
    var id='mf_'+f.name;
    var ctrl;
    if(f.type==='select'){
      ctrl='<select id="'+id+'">'+ (f.placeholder?'<option value="">'+f.placeholder+'</option>':'') +
        (f.options||[]).map(function(o){ return '<option value="'+o.value+'"'+(String(o.value)===String(f.value)?' selected':'')+'>'+o.label+'</option>'; }).join('') + '</select>';
    } else if(f.type==='textarea'){
      ctrl='<textarea id="'+id+'" placeholder="'+(f.placeholder||'')+'">'+(f.value||'')+'</textarea>';
    } else {
      ctrl='<input id="'+id+'" type="'+(f.type||'text')+'" value="'+(f.value!=null?String(f.value).replace(/"/g,'&quot;'):'')+'" placeholder="'+(f.placeholder||'')+'">';
    }
    return '<div class="mf-field"><label for="'+id+'">'+f.label+(f.required?' <span style="color:var(--red)">*</span>':'')+'</label>'+ctrl+
      (f.help?'<div style="font-size:.7rem;color:var(--muted);margin-top:.25rem">'+f.help+'</div>':'')+'</div>';
  }).join('');
  var body='<div class="mf-err" id="mfErr"></div>'+fieldsHTML;
  var foot='<button class="btn-secondary" onclick="closeModal()">Cancel</button>'+
           '<button class="btn-primary" id="mfSubmit">'+(opts.submitLabel||'Save')+'</button>';
  _buildModal(opts.title, body, foot);
  document.getElementById('mfSubmit').onclick=async function(){
    var vals={}, ok=true, errEl=document.getElementById('mfErr');
    errEl.style.display='none';
    var missing=[];
    opts.fields.forEach(function(f){
      var el=document.getElementById('mf_'+f.name);
      var v=el?String(el.value).trim():'';
      if(f.required && !v){ ok=false; missing.push(f.label); if(el) el.style.borderColor='var(--red)'; }
      else if(el){ el.style.borderColor=''; }
      vals[f.name]=v;
    });
    if(!ok){ errEl.textContent='Please fill: '+missing.join(', '); errEl.style.display='block'; return; }
    var btn=this; btn.disabled=true; var orig=btn.textContent; btn.textContent='Saving…';
    try{
      await opts.onSubmit(vals);
      closeModal();
    }catch(e){
      errEl.textContent=e.message||'Something went wrong.'; errEl.style.display='block';
      btn.disabled=false; btn.textContent=orig;
    }
  };
}

function refreshPage(){ showPage(_currentPage); }
async function loadOptions(path, labelFn){
  try{ var res=await apiFetch(path); var arr=res.data||[];
    if(arr.students) arr=arr.students;
    return arr.map(function(x){ return { value:x._id, label:labelFn(x) }; });
  }catch(e){ return []; }
}
function fullName(u){ return ((u.firstName||'')+' '+(u.lastName||'')).trim()||u.email||'—'; }

// ───────────────────────── NOTIFICATIONS ─────────────────────────
async function openNotifications(){
  var _nd=document.getElementById('notifDot'); if(_nd) _nd.style.display='none';
  if(!_demoMode){ apiFetch('/notifications/read-all',{method:'PATCH'}).catch(function(){}); } else { (_DEMO_NOTIFS||[]).forEach(function(n){n.read=true;}); }
  _buildModal('Notifications', loadingHTML(), '');
  try{
    var res=await apiFetch('/notifications?limit=15');
    var items=res.data|| (res.notifications) ||[];
    if(items.notifications) items=items.notifications;
    var body = items.length ? '<div class="ann-list">'+items.map(function(n){
      return '<div class="ann-item"><div class="ann-dot" style="background:'+(n.read?'#d1d5db':'var(--purple)')+'"></div><div style="flex:1">'+
        '<div class="ann-title">'+(n.title||'Notification')+'</div>'+
        '<div class="ann-body">'+(n.message||n.body||'')+'</div>'+
        '<div class="ann-date">'+fmtDate(n.createdAt)+'</div></div></div>';
    }).join('')+'</div>' : '<div style="padding:1.5rem;text-align:center;color:var(--muted)">No notifications.</div>';
    var foot = items.length ? '<button class="btn-secondary" onclick="closeModal()">Close</button><button class="btn-primary" onclick="markAllNotifs()">Mark all read</button>' : '<button class="btn-primary" onclick="closeModal()">Close</button>';
    _buildModal('Notifications', body, foot);
  }catch(e){ _buildModal('Notifications', errorHTML(e.message), '<button class="btn-primary" onclick="closeModal()">Close</button>'); }
}
async function markAllNotifs(){
  try{ await apiFetch('/notifications/read-all',{method:'PATCH'}); }catch(e){}
  var dot=document.getElementById('notifDot'); if(dot) dot.style.display='none';
  closeModal(); toast('All notifications marked as read','success');
}
