import esbuild from 'esbuild';
const out = await esbuild.build({
  entryPoints: ['services/a2ajService.ts'], bundle: true, write: false,
  format: 'esm', platform: 'neutral', target: 'es2022',
});
const m = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const cov = await m.fetchCoverage();
const prov = cov.filter(c => m.PROVINCIAL_COURTS.includes(c.dataset));
console.log(`coverage: ${cov.length} courts | provincial: ${prov.length}, ${prov.reduce((s,c)=>s+c.count,0).toLocaleString()} decisions`);

console.log('\n--- lookupByCitation ---');
for (const c of ['2015 SCC 42','2001 SCC 32','2009 SCC 1','1959 SCR 478','2099 SCC 1']) {
  const r = await m.lookupByCitation(c);
  console.log(`  ${c.padEnd(14)} ${r ? `cited_by=${String(r.citingCasesCount).padStart(3)} | ${r.name.slice(0,38)}` : 'null'}`);
}
const one = await m.lookupByCitation('2015 SCC 42');
console.log('  no text field leaked:', !Object.keys(one).some(k => /text|snippet/i.test(k)) ? 'YES' : 'NO');
console.log('  upstream_license:', one.upstreamLicense.slice(0,72) + '...');

console.log('\n--- distinctiveTokens ---');
for (const n of ['Chevron Corp. v. Yaiguaje','R. v. Find','Canadian Bank of Commerce v. T. McAvity & Sons Ltd.','Lipson v. Canada']) {
  console.log(`  ${n.slice(0,45).padEnd(46)} -> [${m.distinctiveTokens(n,2).join(', ')}]`);
}

console.log('\n--- findRelatedAppellateDecisions ---');
for (const [n,y] of [['Chevron Corp. v. Yaiguaje',2015],['R. v. Marshall',1999]]) {
  const rel = await m.findRelatedAppellateDecisions(n,y);
  console.log(`  "${n}" -> ${rel.length} candidates`);
  rel.slice(0,4).forEach(r => console.log(`     ${r.dataset} ${r.citation} ${r.date} [${r.matchedOn}] ${r.name.slice(0,40)}`));
}
