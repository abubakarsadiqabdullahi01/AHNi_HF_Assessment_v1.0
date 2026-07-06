const META = [
  {id:"state",   label:"State",              type:"select", options:["","Borno","Adamawa","Yobe","Taraba","Gombe","Other"]},
  {id:"lgas",    label:"LGA(s) covered",     type:"text"},
  {id:"assessor",label:"Assessor name",      type:"text"},
  {id:"role",    label:"Designation / role", type:"text"},
  {id:"org",     label:"Organisation",       type:"text", value:"AHNi"},
  {id:"period",  label:"Reporting period",   type:"text", ph:"e.g. FY23–FY25"},
  {id:"date",    label:"Assessment date",    type:"date"},
  {id:"sources", label:"Data sources consulted", type:"text", ph:"budgets, reports, KIIs…"},
  {id:"partners",label:"Respondents / offices", type:"text", ph:"SMOH, SPHCDA, SHIS…"},
];

const T = "text", B = "bin"; // question kinds
const SECTIONS = [
  {id:"A", title:"Policy and Governance", type:"qa", items:[
    ["Does the state have a Health Financing Strategy?", B],
    ["Does the strategy specifically address HIV, TB, malaria and MNCH financing?", B],
    {q:"What policies support domestic financing for health?", kind:"sub", n:5, ph:"Policy"},
    ["How are health financing decisions made?", T],
    {q:"Which institutions coordinate health financing?", kind:"sub", n:5, ph:"Institution"},
    ["Is there a functional Health Financing Technical Working Group?", B],
    ["How are development partners coordinated?", T],
    ["Are financing priorities aligned with the Health Sector Renewal Investment Initiative?", B],
    ["How is the U.S.–Nigeria Health MOU reflected in state planning?", T],
    {q:"What governance challenges affect resource mobilization?", kind:"sub", n:5, ph:"Challenge"},
  ]},
  {id:"B", title:"Government Budget Commitment", type:"qa", items:[
    {q:"State budget allocation to health (last three financial years)", kind:"budget"},
    ["Are HIV, TB and malaria included as budget lines?", B],
    {q:"Which services remain completely donor-funded?", kind:"sub", n:5, ph:"Service"},
    ["Are facilities allowed to retain internally generated revenue?", B],
    {q:"How predictable are government releases?", kind:"likert", scale:["Very predictable","Predictable","Moderately predictable","Unpredictable","Very unpredictable"]},
    {q:"What are the major constraints to budget execution?", kind:"sub", n:5, ph:"Constraint"},
    {q:"Which programmes experienced funding shortfalls?", kind:"sub", n:5, ph:"Programme"},
    ["What additional investments are planned over the next three years?", T],
  ]},
  {id:"C", title:"Domestic Financing Sources", type:"matrix",
    note:"For each source, record the last full financial year unless a period is noted. Amounts in ₦. Ring-fenced = funds earmarked and protected for a specific purpose.",
    sources:[
      "State Government Budget","Basic Health Care Provision Fund (BHCPF)",
      "State Health Insurance Scheme (Formal Sector)","Informal Sector Health Insurance",
      "Equity / Vulnerable Group Fund","Local Government Health Allocation",
      "Internally Generated Revenue","Corporate Social Responsibility (CSR)",
      "Philanthropic Organizations","Faith-based Organizations","Community Financing",
      "Private Sector Contributions","Other Domestic Sources"
    ],
    cols:[
      {key:"alloc", label:"Annual allocation (₦)", w:"input"},
      {key:"exp",   label:"Actual expenditure (₦)", w:"input"},
      {key:"ring",  label:"Ring-fenced", w:"yn"},
      {key:"sust",  label:"Sustainability", w:"hml"},
      {key:"notes", label:"Activities financed / challenges", w:"area"},
    ]},
  {id:"D", title:"Health Insurance", type:"qa",
    note:"Reimbursement = payment made to a health facility by an insurance scheme (e.g. the State Social Health Insurance Scheme or BHCPF) to cover the cost of services already delivered to an enrolled member. \u201CAre X services reimbursed?\u201D therefore asks whether the scheme pays facilities for providing that service, rather than the patient paying out of pocket.",
    items:[
    ["What percentage of the population is insured?", T],
    ["What proportion of vulnerable populations are covered?", T],
    ["Are HIV services reimbursed?", B],
    ["Are TB services reimbursed?", B],
    ["Are malaria services reimbursed?", B],
    ["Are laboratory services reimbursed?", B],
    {q:"Which benefit packages include chronic disease management?", kind:"sub", n:5, ph:"Benefit package"},
    {q:"What opportunities exist to integrate HIV services?", kind:"sub", n:5, ph:"Opportunity"},
    ["Are facilities receiving reimbursements on time?", B],
    {q:"What reforms are planned?", kind:"sub", n:5, ph:"Reform"},
  ]},
  {id:"E", title:"BHCPF", type:"qa", items:[
    ["Is the state implementing BHCPF?", B],
    ["How many facilities benefit?", T],
    {q:"Which services are financed?", kind:"sub", n:5, ph:"Service"},
    ["Can HIV commodities be financed?", B],
    ["Can TB commodities be financed?", B],
    ["Can malaria interventions be financed?", B],
    ["Are quality improvement activities financed?", B],
    {q:"What are implementation bottlenecks?", kind:"sub", n:5, ph:"Bottleneck"},
    ["What proportion of eligible facilities access BHCPF?", T],
    ["How can BHCPF support transition?", T],
  ]},
  {id:"F", title:"Donor Dependence", type:"qa", items:[
    {q:"Which programmes remain donor-dependent?", kind:"sub", n:5, ph:"Programme"},
    ["What proportion of HIV financing comes from donors?", T],
    ["What proportion of TB financing comes from donors?", T],
    ["What proportion of malaria financing comes from donors?", T],
    {q:"Which health system functions depend on donors?", kind:"sub", n:5, ph:"Function"},
    {q:"Which commodities are donor-funded?", kind:"sub", n:5, ph:"Commodity"},
    {q:"Which laboratories are donor-supported?", kind:"sub", n:5, ph:"Laboratory"},
    {q:"What activities would stop if donor funding ceased?", kind:"sub", n:5, ph:"Activity"},
    {q:"Which functions can government immediately assume?", kind:"sub", n:5, ph:"Function"},
  ]},
  {id:"G", title:"Resource Mobilization", type:"qa", items:[
    ["Does the state have a Resource Mobilization Strategy?", B],
    {q:"What innovative financing approaches exist?", kind:"sub", n:5, ph:"Approach"},
    ["Are there partnerships with the private sector?", B],
    ["Are there Corporate Social Responsibility (CSR) investments?", B],
    ["Are philanthropists engaged?", B],
    ["Are faith-based organizations mobilizing resources?", B],
    ["Are Local Governments contributing?", B],
    ["Are legislators supporting health financing?", B],
    {q:"Are investment cases available?", kind:"bin", help:"An investment case is an evidence-based document that sets out the costs, expected health outcomes and economic returns of investing in a programme \u2014 used to persuade government and partners to commit funding."},
    {q:"Which financing opportunities remain untapped?", kind:"sub", n:5, ph:"Opportunity"},
  ]},
  {id:"H", title:"Financial Management", type:"qa", items:[
    ["How are funds tracked?", T],
    ["Are expenditures regularly monitored?", B],
    ["Are financial reports timely?", B],
    ["Are audits conducted?", B],
    ["Are donor and government reporting harmonized?", B],
    ["Are facilities financially autonomous?", B],
    ["Are electronic financial systems used?", B],
    {q:"What fiduciary risks exist?", kind:"text", help:"Fiduciary means holding and managing funds in trust on behalf of others. Fiduciary risks are the risks that funds are misused, diverted, poorly controlled or not properly accounted for."},
    ["How are procurement decisions made?", T],
    {q:"What improvements are needed?", kind:"sub", n:5, ph:"Improvement"},
  ]},
  {id:"I", title:"Sustainability and Transition Readiness", type:"qa", items:[
    {q:"Which donor-supported activities can government immediately absorb?", kind:"sub", n:5, ph:"Activity"},
    {q:"Which activities require phased transition?", kind:"sub", n:5, ph:"Activity"},
    {q:"Which require continued donor investment?", kind:"sub", n:5, ph:"Activity"},
    {q:"Which institutions require capacity strengthening?", kind:"sub", n:5, ph:"Institution"},
    {q:"Which financing mechanisms should be expanded?", kind:"sub", n:5, ph:"Mechanism"},
    {q:"Which policies require revision?", kind:"sub", n:5, ph:"Policy"},
    {q:"What financing milestones should be achieved over the next five years?", kind:"sub", n:5, ph:"Milestone"},
    {q:"What transition risks exist?", kind:"sub", n:5, ph:"Risk"},
    {q:"What mitigation measures are proposed?", kind:"sub", n:5, ph:"Mitigation"},
    {q:"How will sustainability be monitored?", kind:"sub", n:5, ph:"Indicator/method"},
  ]},
  {id:"J", title:"Disease-Specific Financing", type:"disease",
    note:"Rate how adequately each item is currently financed on the five-point scale (Very adequate \u2192 Very inadequate), then add a qualitative note on the situation and gaps.",
    diseases:[
      {name:"HIV", items:["Current financing sources","Government contribution","Insurance coverage","Commodity financing","Workforce financing","Laboratory financing","Sustainability gaps"]},
      {name:"Tuberculosis", items:["Domestic financing","GeneXpert financing","Drug procurement","Community TB financing","Contact investigation","TPT financing"]},
      {name:"Malaria", items:["LLIN financing","IRS financing","RDT financing","ACT financing","Seasonal Malaria Chemoprevention","Vector surveillance"]},
      {name:"MNCH", items:["ANC","Delivery","Newborn care","Family planning","Immunization","Nutrition"]},
    ]},
  {id:"K", title:"Opportunities for Sustainability and Transition", type:"checklist",
    note:"Rate the strength of evidence available in this state to support each intervention, and note the specifics.",
    items:[
      "Expansion of BHCPF to finance integrated HIV, TB, malaria and MNCH services",
      "Integration of HIV services into State Health Insurance benefit packages",
      "Development of state investment cases for HIV and TB",
      "Establishment / strengthening of Health Financing & Domestic Resource Mobilization (DRM) Technical Working Groups",
      "Advocacy for increased state and LGA health budget allocations",
      "Performance-based financing linked to integrated service delivery",
      "Public-private partnerships for diagnostics, laboratories and digital health",
      "Corporate Social Responsibility financing for primary health care",
      "Community-based financing mechanisms",
      "Quarterly scorecards comparing donor versus domestic financing",
    ]},
];

const BIN_OPTS = ["Yes","Partial","No","Not known"];
export { META, SECTIONS, BIN_OPTS };

export const LIKERT = [
  ["Very adequate","l1"],["Adequate","l2"],["Moderately adequate","l3"],
  ["Inadequate","l4"],["Very inadequate","l5"]
];

export function normItem(it){ return Array.isArray(it) ? {q:it[0], kind:it[1]} : it; }

// Representative field ids per section — used for the completion meter
export function repIds(){
  const out=[];
  for(const sec of SECTIONS){
    const ids=[];
    if(sec.type==="qa") sec.items.forEach((raw,i)=>{
      const it=normItem(raw); const b=`${sec.id}-${i+1}`;
      if(it.kind===B||it.kind==="bin") ids.push(b+"-r");
      else if(it.kind==="sub") ids.push(b+"-s1");
      else if(it.kind==="likert") ids.push(b+"-lk");
      else if(it.kind==="budget") ids.push(b+"-state-y0");
      else ids.push(b);
    });
    else if(sec.type==="matrix") sec.sources.forEach((_,si)=>ids.push(`${sec.id}-s${si}-alloc`));
    else if(sec.type==="disease") sec.diseases.forEach((d,di)=>d.items.forEach((_,ii)=>ids.push(`${sec.id}-d${di}-${ii}-st`)));
    else if(sec.type==="checklist") sec.items.forEach((_,i)=>ids.push(`${sec.id}-${i}-s`));
    out.push({sec:sec.id, ids});
  }
  return out;
}
