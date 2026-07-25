// Sanity harness: runs the insight functions against the local CSV snapshots.
// Not a unit test suite — a guard that the numbers are plausible before UI work.
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import esbuild from 'esbuild';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const load = async (rel) => {
  const out = await esbuild.build({
    entryPoints: [path.join(root, rel)], bundle: true, write: false,
    format: 'esm', platform: 'neutral', target: 'es2022',
  });
  const b64 = Buffer.from(out.outputFiles[0].text).toString('base64');
  return import('data:text/javascript;base64,' + b64);
};

const { parseCSV } = await load('utils/csv.ts');
const I = await load('utils/insights.ts');
const A = await load('utils/analytics.ts');

const read = (f) => parseCSV(fs.readFileSync(path.join(root, f), 'utf8'));
const cases = read('dataset_Case.csv');
const votes = read('dataset_Votes.csv');
const issues = read('dataset_Issues.csv');
const present = read('dataset_JusticesPresent.csv');
const missing = read('dataset_MissingJustices.csv');
const jpMap = new Map();
present.forEach(j => { if (j.justiceID && !jpMap.has(j.justiceID)) jpMap.set(j.justiceID, j.justiceName); });
const justices = [...jpMap].map(([justiceID, justiceName]) => ({ justiceID, justiceName }));

console.log(`loaded: ${cases.length} cases, ${votes.length} votes, ${issues.length} issues, ${justices.length} justices\n`);

// --- Agreement scope ---
const divided = A.countDividedCases(votes);
const allCases = new Set(votes.map(v => v.primaryCaseID)).size;
console.log(`AGREEMENT SCOPE: ${allCases} cases with votes, ${divided} divided (${(100*divided/allCases).toFixed(1)}%)`);
for (const scope of ['all', 'divided']) {
  const m = A.generateMatrixData(votes, justices, scope);
  const off = m.filter(c => c.x !== c.y && c.shared > 50);
  const mean = off.reduce((s, c) => s + c.rate, 0) / off.length;
  const min = Math.min(...off.map(c => c.rate)), max = Math.max(...off.map(c => c.rate));
  console.log(`  scope=${scope.padEnd(8)} pairs=${off.length} mean=${mean.toFixed(3)} range=[${min.toFixed(3)}, ${max.toFixed(3)}] spread=${(max-min).toFixed(3)}`);
}

// --- Direction timeline ---
const tl = I.computeDirectionTimeline(cases, issues);
const withData = tl.filter(p => p.liberalShare !== null);
console.log(`\nDIRECTION TIMELINE: ${tl.length} years, ${withData.length} with >=5 coded issues`);
console.log('  sample:', withData.slice(0, 3).map(p => `${p.year}:${(p.liberalShare*100).toFixed(0)}%`).join(' '), '...',
            withData.slice(-3).map(p => `${p.year}:${(p.liberalShare*100).toFixed(0)}%`).join(' '));
const totalCoded = tl.reduce((s,p)=>s+p.coded,0);
console.log(`  total coded issues: ${totalCoded} / ${issues.length}`);

// --- Justice profiles ---
const profs = I.computeJusticeDirectionProfiles(votes, justices);
console.log(`\nJUSTICE DIRECTION PROFILES: ${profs.length} justices with >=20 coded votes`);
profs.slice(0,3).forEach(p => console.log(`  most liberal: ${p.justiceName} ${(p.liberalShare*100).toFixed(1)}% (n=${p.coded})`));
profs.slice(-3).forEach(p => console.log(`  most cons.:   ${p.justiceName} ${(p.liberalShare*100).toFixed(1)}% (n=${p.coded})`));

// --- Absence ---
const abs = I.computeAbsenceProfiles(cases, present, missing, justices);
console.log(`\nPANEL ABSENCE: ${abs.length} justices with >=25 eligible cases`);
abs.slice(0,3).forEach(p => console.log(`  ${p.justiceName}: absent ${p.absent}/${p.eligible} (${(p.absenceRate*100).toFixed(1)}%) | full-panel ${p.fullPanelAbsent}/${p.fullPanelEligible} (${p.fullPanelAbsenceRate!==null?(p.fullPanelAbsenceRate*100).toFixed(1)+'%':'n/a'})`));
const totalSat = abs.reduce((s,p)=>s+p.sat,0), totalAbs = abs.reduce((s,p)=>s+p.absent,0);
console.log(`  totals: sat=${totalSat} absent=${totalAbs} (expect absent ~= ${missing.length})`);

// --- Coalitions ---
const { edges, influence } = I.computeCoalitions(votes, justices);
console.log(`\nCOALITIONS: ${edges.length} edges (>=5 joins), ${influence.length} justices ranked`);
influence.slice(0,3).forEach(i => console.log(`  opinion leader: ${i.justiceName} received=${i.joinsReceived} given=${i.joinsGiven} ratio=${(i.leadershipRatio*100).toFixed(0)}% distinct=${i.distinctJoiners}`));
edges.slice(0,3).forEach(e => console.log(`  strongest edge: ${e.joinerName} joined ${e.authorName} x${e.count}`));

// --- Case blocs spot check ---
const target = cases.find(c => c.decisionUnanimous === '0' && c.panelSize === '9');
const cv = votes.filter(v => v.primaryCaseID === target.primaryCaseID);
const blocs = I.computeCaseBlocs(cv);
console.log(`\nCASE BLOCS spot-check: "${target.caseName.slice(0,48)}" panel=${target.panelSize}`);
blocs.forEach(b => console.log(`  bloc led by #${b.authorID}: ${b.members.length} joiner(s) ${b.isMajority ? '[majority]' : '[dissent/other]'}`));
const covered = new Set(blocs.flatMap(b => [b.authorID, ...b.members])).size;
console.log(`  justices covered by blocs: ${covered} (panel size ${target.panelSize})`);
