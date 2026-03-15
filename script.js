let transactions=JSON.parse(localStorage.getItem('hisab_txns')||'[]');
let budgets=JSON.parse(localStorage.getItem('hisab_budgets')||'{}');
let curType='expense';
let months=['January','February','March','April','May','June','July','August','September','October','November','December'];
let curMonthIdx=2;let curYear=2026;
const catColors={Food:'#f87171',Transport:'#60a5fa',Shopping:'#a78bfa',Bills:'#fbbf24',Health:'#34d399',Entertainment:'#f472b6',Salary:'#34d399',Other:'#94a3b8'};
const catIcons={Food:'🍜',Transport:'🚗',Shopping:'🛍',Bills:'💡',Health:'🏥',Entertainment:'🎬',Salary:'💼',Other:'📦'};
const catBg={Food:'rgba(248,113,113,.15)',Transport:'rgba(96,165,250,.15)',Shopping:'rgba(167,139,250,.15)',Bills:'rgba(251,191,36,.15)',Health:'rgba(52,211,153,.15)',Entertainment:'rgba(244,114,182,.15)',Salary:'rgba(52,211,153,.15)',Other:'rgba(148,163,184,.15)'};

function fmt(n){return '₹'+n.toLocaleString('en-IN',{maximumFractionDigits:0})}
function today(){return new Date().toISOString().split('T')[0]}
function getMonthTxns(){return transactions.filter(t=>{let d=new Date(t.date);return d.getMonth()===curMonthIdx&&d.getFullYear()===curYear})}

function updateSummary(){
  let txns=getMonthTxns();
  let inc=txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  let exp=txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  let bal=inc-exp;
  document.getElementById('s-balance').textContent=fmt(bal);
  document.getElementById('s-income').textContent=fmt(inc);
  document.getElementById('s-expense').textContent=fmt(exp);
  document.getElementById('s-income-count').textContent=txns.filter(t=>t.type==='income').length+' entries';
  document.getElementById('s-expense-count').textContent=txns.filter(t=>t.type==='expense').length+' entries';
  let savePct=inc>0?Math.round((bal/inc)*100):0;
  document.getElementById('s-balance-sub').textContent=inc>0?'Savings rate: '+savePct+'%':'Add income to track savings';
  let barPct=inc>0?Math.min(100,Math.round((exp/inc)*100)):50;
  let bar=document.getElementById('balance-bar');
  bar.style.width=barPct+'%';
  bar.style.background=barPct>80?'var(--red)':barPct>60?'var(--amber)':'linear-gradient(90deg,var(--accent),var(--accent3))';
}

function renderRecent(){
  let txns=getMonthTxns().slice().reverse().slice(0,5);
  let el=document.getElementById('recent-list');
  if(!txns.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">No transactions this month.<br>Tap + to add one!</div></div>';return}
  el.innerHTML=txns.map(t=>txnHTML(t)).join('');
}

function renderTransactions(){
  let cat=document.getElementById('filter-cat').value;
  let type=document.getElementById('filter-type').value;
  let txns=getMonthTxns().slice().reverse().filter(t=>{
    if(cat&&t.category!==cat)return false;
    if(type&&t.type!==type)return false;
    return true;
  });
  let el=document.getElementById('all-list');
  if(!txns.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">No transactions found.</div></div>';return}
  el.innerHTML=txns.map(t=>txnHTML(t)).join('');
}

function txnHTML(t){
  let amtClass=t.type==='expense'?'neg':'pos';
  let sign=t.type==='expense'?'-':'+';
  let d=new Date(t.date);
  let dateStr=d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  return `<div class="txn-item" onclick="deleteTxn('${t.id}')">
    <div class="txn-icon" style="background:${catBg[t.category]||catBg.Other}">${catIcons[t.category]||'📦'}</div>
    <div class="txn-info">
      <div class="txn-name">${t.desc||t.category}</div>
      <div class="txn-meta">${t.category} · ${dateStr}</div>
    </div>
    <div class="txn-amount ${amtClass}">${sign}${fmt(t.amount)}</div>
  </div>`;
}

function deleteTxn(id){
  if(!confirm('Delete this transaction?'))return;
  transactions=transactions.filter(t=>t.id!==id);
  localStorage.setItem('hisab_txns',JSON.stringify(transactions));
  refresh();
}

function renderWeekChart(){
  let days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let today=new Date();
  let data=days.map((_,i)=>{
    let d=new Date(today);
    let diff=(today.getDay()||7)-i-1;
    d.setDate(today.getDate()-diff);
    let ds=d.toISOString().split('T')[0];
    return transactions.filter(t=>t.date===ds&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
  });
  let max=Math.max(...data)||1;
  document.getElementById('week-chart').innerHTML=data.map((v,i)=>`
    <div class="bar-col">
      <div class="bar" style="height:${Math.round((v/max)*80)+4}px;background:${v>0?'linear-gradient(to top,var(--accent),var(--accent2))':'var(--surface3)'}"></div>
      <div class="bar-lbl">${days[i]}</div>
    </div>`).join('');
}

function renderMonthlyChart(){
  let data=months.map((m,i)=>transactions.filter(t=>{let d=new Date(t.date);return d.getMonth()===i&&d.getFullYear()===curYear&&t.type==='expense'}).reduce((s,t)=>s+t.amount,0));
  let max=Math.max(...data)||1;
  let shortM=['J','F','M','A','M','J','J','A','S','O','N','D'];
  document.getElementById('monthly-chart').innerHTML=data.map((v,i)=>`
    <div class="bar-col">
      <div class="bar" style="height:${Math.round((v/max)*80)+4}px;background:${i===curMonthIdx?'linear-gradient(to top,var(--red),#f87171aa)':'var(--surface3)'}"></div>
      <div class="bar-lbl">${shortM[i]}</div>
    </div>`).join('');
}

function renderCatBreakdown(){
  let txns=getMonthTxns().filter(t=>t.type==='expense');
  let cats={};
  txns.forEach(t=>{cats[t.category]=(cats[t.category]||0)+t.amount});
  let total=Object.values(cats).reduce((s,v)=>s+v,0)||1;
  let sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  let el=document.getElementById('cat-breakdown-list');
  if(!sorted.length){el.innerHTML='<div class="empty-state" style="padding:20px 0"><div class="empty-text">No expenses yet</div></div>';return}
  el.innerHTML=sorted.map(([cat,amt])=>`
    <div class="cat-row">
      <div class="cat-dot" style="background:${catColors[cat]||'#94a3b8'}"></div>
      <div class="cat-row-info">
        <div class="cat-row-name">${catIcons[cat]} ${cat}</div>
        <div class="cat-row-bar"><div class="cat-row-fill" style="width:${Math.round((amt/total)*100)}%;background:${catColors[cat]||'#94a3b8'}"></div></div>
      </div>
      <div class="cat-row-amt">${fmt(amt)}</div>
    </div>`).join('');
}

function renderInsights(){
  let txns=getMonthTxns();
  let exp=txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  let inc=txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  let el=document.getElementById('insights-section');
  let html='';
  if(inc>0){
    let rate=Math.round(((inc-exp)/inc)*100);
    html+=`<div class="insights-card"><div class="insights-icon">💡</div><div class="insights-text">Your savings rate this month is <strong>${rate}%</strong>. ${rate>=20?'Great job! Saving above the recommended 20%.':'Try to save at least 20% of your income.'}</div></div>`;
  }
  let cats={};
  txns.filter(t=>t.type==='expense').forEach(t=>{cats[t.category]=(cats[t.category]||0)+t.amount});
  let topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  if(topCat) html+=`<div class="insights-card"><div class="insights-icon">📈</div><div class="insights-text">Biggest spending: <strong>${topCat[0]}</strong> at <strong>${fmt(topCat[1])}</strong> this month.</div></div>`;
  if(!html) html='<div class="empty-state"><div class="empty-icon">💡</div><div class="empty-text">Add transactions to see insights</div></div>';
  el.innerHTML=html;
}

function renderBudgets(){
  let el=document.getElementById('budget-list');
  let keys=Object.keys(budgets);
  if(!keys.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">No budgets set yet.<br>Tap below to add one!</div></div>';return}
  let txns=getMonthTxns().filter(t=>t.type==='expense');
  el.innerHTML=keys.map(cat=>{
    let lim=budgets[cat];
    let spent=txns.filter(t=>t.category===cat).reduce((s,t)=>s+t.amount,0);
    let pct=Math.min(100,Math.round((spent/lim)*100));
    let color=pct>90?'var(--red)':pct>70?'var(--amber)':'var(--green)';
    return `<div class="budget-card">
      <div class="budget-header">
        <div class="budget-name">${catIcons[cat]} ${cat}</div>
        <div class="budget-vals">${fmt(spent)} / ${fmt(lim)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="budget-prog" style="flex:1"><div class="budget-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="budget-pct" style="color:${color}">${pct}%</div>
      </div>
    </div>`;
  }).join('');
}

function refresh(){
  updateSummary();renderRecent();renderTransactions();renderWeekChart();
  renderMonthlyChart();renderCatBreakdown();renderInsights();renderBudgets();
}

function openModal(){
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('inp-date').value=today();
  document.getElementById('inp-amount').value='';
  document.getElementById('inp-desc').value='';
}
function closeModal(){document.getElementById('modal').classList.add('hidden')}

function setType(t){
  curType=t;
  document.getElementById('btn-expense').className='type-btn'+(t==='expense'?' active expense':'');
  document.getElementById('btn-income').className='type-btn'+(t==='income'?' active income':'');
  let catSel=document.getElementById('inp-cat');
  catSel.innerHTML=t==='income'
    ?'<option value="Salary">💼 Salary</option><option value="Other">📦 Other</option>'
    :'<option value="Food">🍜 Food</option><option value="Transport">🚗 Transport</option><option value="Shopping">🛍 Shopping</option><option value="Bills">💡 Bills</option><option value="Health">🏥 Health</option><option value="Entertainment">🎬 Entertainment</option><option value="Other">📦 Other</option>';
}

function addTransaction(){
  let amt=parseFloat(document.getElementById('inp-amount').value);
  let desc=document.getElementById('inp-desc').value.trim();
  let cat=document.getElementById('inp-cat').value;
  let date=document.getElementById('inp-date').value;
  if(!amt||amt<=0){alert('Please enter a valid amount');return}
  if(!date){alert('Please select a date');return}
  transactions.push({id:Date.now().toString(),type:curType,amount:amt,desc:desc||cat,category:cat,date:date});
  localStorage.setItem('hisab_txns',JSON.stringify(transactions));
  closeModal();refresh();
}

function openBudgetModal(){document.getElementById('budget-modal').classList.remove('hidden')}
function closeBudgetModal(){document.getElementById('budget-modal').classList.add('hidden')}
function saveBudget(){
  let cat=document.getElementById('bcat').value;
  let lim=parseFloat(document.getElementById('blimit').value);
  if(!lim||lim<=0){alert('Please enter a valid limit');return}
  budgets[cat]=lim;
  localStorage.setItem('hisab_budgets',JSON.stringify(budgets));
  closeBudgetModal();renderBudgets();
}

function switchTab(idx,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.page').forEach((p,i)=>{p.className='page'+(i===idx?' active':'')});
  if(idx===1)renderTransactions();
  if(idx===2){renderMonthlyChart();renderCatBreakdown();renderInsights();}
  if(idx===3)renderBudgets();
}
function switchTabByIndex(i){switchTab(i,document.querySelectorAll('.tab')[i])}

function cycleMonth(){
  curMonthIdx=(curMonthIdx+1)%12;
  if(curMonthIdx===0)curYear++;
  document.getElementById('cur-month').textContent=months[curMonthIdx]+' '+curYear;
  refresh();
}

refresh();