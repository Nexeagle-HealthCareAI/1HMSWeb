// Audit billing service method usage across the frontend.
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'services'].includes(ent.name)) walk(p, files);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      files.push(p);
    }
  }
  return files;
}

const code = walk('./src').map((f) => ({ file: f, txt: fs.readFileSync(f, 'utf8') }));

const methods = {
  ipdBillingService: [
    'listChargeMasters', 'getChargeMaster', 'upsertChargeMaster',
    'deleteChargeMaster', 'updateChargeMasterStatus', 'createEncounter',
    'addChargeEvents', 'cancelChargeEvent', 'createDraftInvoice',
    'finalize', 'addPayment', 'getEncounterEvents', 'getPatientEvents',
    'deleteEvent', 'dashboard', 'print', 'getPolicy', 'updatePolicy',
  ],
  dayCloseService: ['preview', 'list', 'close', 'reopen', 'receipt'],
  discountApprovalService: ['list', 'decide'],
  analyticsService: ['revenue', 'ipd'],
};

for (const [svc, ms] of Object.entries(methods)) {
  console.log('=== ' + svc + ' ===');
  for (const m of ms) {
    const pat = new RegExp(svc + '\\s*\\.\\s*' + m + '\\s*\\(', 'g');
    const hits = code.filter(({ file, txt }) => pat.test(txt))
                     .map((h) => h.file.replace(/\\/g, '/').replace(/^.*\/src\//, 'src/'));
    const tag = hits.length > 0 ? '✓ (' + hits.length + ')' : '✗ ORPHAN';
    const where = hits.length ? '  → ' + hits.slice(0, 3).join(', ') : '';
    console.log('  ' + m.padEnd(28) + ' ' + tag + where);
  }
  console.log();
}
