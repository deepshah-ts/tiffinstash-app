const {releaseErrors}=require('../lib/core.cjs');
const errors=releaseErrors(process.env);
if(errors.length){console.error('RELEASE BLOCKED\n'+errors.map(x=>'- '+x).join('\n'));process.exit(1);}
console.log('Configuration fields supplied. This does not verify signing keys, console access, native functionality or store approval. Complete docs/RELEASE-CHECKLIST.md.');
