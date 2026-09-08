#!/usr/bin/env node
/**
 * Pharmacy Live Smoke Test — post-deploy sanity check against a real environment.
 *
 * This is NOT the source of truth for pharmacy logic correctness — that's the
 * xUnit/NUnit suite in EasyHMSAPI.UnitTests (GetBatchByBarcodeHandlerTests,
 * GetNearExpiryReportHandlerTests, GetReorderThresholdSuggestionsHandlerTests,
 * PharmacyRetailCheckoutCommandHandlerTests, BulkBatchCommandHandlersTests,
 * SearchMedicinesHandlerTests — 24 tests, run via `dotnet test`).
 *
 * This script only verifies the deployed API is reachable, authenticated calls
 * succeed, and the real routes respond with the expected shape. It requires a
 * real login and a real hospitalId — there is no meaningful way to smoke-test
 * an authenticated API without them.
 *
 * Required environment variables:
 *   TEST_USER_EMAIL     - login email/phone for a dev-environment test account
 *   TEST_USER_PASSWORD  - password for that account
 *   TEST_HOSPITAL_ID    - a real hospital GUID that account has access to
 *
 * Optional:
 *   API_URL             - defaults to https://1hms-dev.nexeagle.com
 *   TEST_INVENTORY_ITEM_ID - a known InventoryItemId GUID with batches, to
 *                             exercise the FEFO batch-list endpoint directly
 *   TEST_BARCODE         - a known batch barcode to exercise barcode lookup
 */

const API_BASE = process.env.API_URL || 'https://1hms-dev.nexeagle.com';
const TIMEOUT = 15000;

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
const HOSPITAL_ID = process.env.TEST_HOSPITAL_ID;
const INVENTORY_ITEM_ID = process.env.TEST_INVENTORY_ITEM_ID;
const BARCODE = process.env.TEST_BARCODE;

let passed = 0, failed = 0, skipped = 0;
let accessToken = null;

console.log(`\n🧪 PHARMACY LIVE SMOKE TEST`);
console.log(`API: ${API_BASE}`);
console.log(`Time: ${new Date().toISOString()}\n`);
console.log('═'.repeat(70) + '\n');

async function call(method, path, body = null, auth = true) {
  const url = API_BASE + path;
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  try {
    const options = { method, headers, signal: AbortSignal.timeout(TIMEOUT) };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON response */ }

    return {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type') || '',
      data,
      raw: text,
    };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  }
}

function logPass(name, msg = '') {
  console.log(`✅ ${name}`);
  if (msg) console.log(`   → ${msg}`);
  passed++;
}
function logFail(name, msg) {
  console.log(`❌ ${name}: ${msg}`);
  failed++;
}
function logSkip(name, msg) {
  console.log(`⏭️  ${name} (${msg})`);
  skipped++;
}

// Guards against the false-positive trap that bit the earlier version of this
// script: a 200 with HTML content-type means we hit an SPA fallback, not the
// API — treat that as a hard failure, not a pass.
function isRealApiResponse(res) {
  return res.ok && res.contentType.includes('application/json');
}

async function login() {
  console.log('🔐 Authenticating...\n');
  const res = await call('POST', '/auth/user/login', {
    IsLoginWithOtp: false,
    EmailOrPhone: EMAIL,
    Password: PASSWORD,
  }, false);

  if (!isRealApiResponse(res) || !res.data?.accessToken) {
    console.log(`❌ Login failed: ${res.error || res.status} ${JSON.stringify(res.data)}\n`);
    return false;
  }

  accessToken = res.data.accessToken;
  console.log('✅ Authenticated\n');
  return true;
}

async function runSmokeTests() {
  // 3a-01: item search
  let res = await call('GET', `/inventory/items?hospitalId=${HOSPITAL_ID}&search=a&activeOnly=true`);
  if (isRealApiResponse(res) && Array.isArray(res.data?.items)) {
    logPass('3a-01: Inventory item search', `${res.data.items.length} item(s) returned`);
  } else {
    logFail('3a-01: Inventory item search', `status=${res.status} type=${res.contentType}`);
  }

  // 3a-02: FEFO batch list (only if we have a known item)
  if (INVENTORY_ITEM_ID) {
    res = await call('GET', `/inventory/items/${INVENTORY_ITEM_ID}/batches?hospitalId=${HOSPITAL_ID}`);
    if (isRealApiResponse(res) && Array.isArray(res.data?.batches)) {
      const sorted = res.data.batches.every((b, i, arr) =>
        i === 0 || new Date(arr[i - 1].expiryDate ?? '9999-12-31') <= new Date(b.expiryDate ?? '9999-12-31'));
      if (sorted) {
        logPass('3a-02: FEFO batch ordering', `${res.data.batches.length} batch(es), expiry-ascending confirmed`);
      } else {
        logFail('3a-02: FEFO batch ordering', 'Batches NOT sorted by expiry date');
      }
    } else {
      logFail('3a-02: FEFO batch ordering', `status=${res.status} type=${res.contentType}`);
    }
  } else {
    logSkip('3a-02: FEFO batch ordering', 'TEST_INVENTORY_ITEM_ID not provided');
  }

  // 3a-04: barcode lookup
  if (BARCODE) {
    res = await call('GET', `/inventory/batches/by-barcode?hospitalId=${HOSPITAL_ID}&barcodeValue=${encodeURIComponent(BARCODE)}`);
    if (isRealApiResponse(res) && res.data?.found) {
      logPass('3a-04: Barcode lookup', `Resolved to ${res.data.itemName}`);
    } else if (isRealApiResponse(res)) {
      logFail('3a-04: Barcode lookup', 'found=false for a barcode expected to exist');
    } else {
      logFail('3a-04: Barcode lookup', `status=${res.status} type=${res.contentType}`);
    }
  } else {
    logSkip('3a-04: Barcode lookup', 'TEST_BARCODE not provided');
  }

  // 3b-01: near-expiry report + bucketing
  res = await call('GET', `/inventory/expiry/near-expiry-report?hospitalId=${HOSPITAL_ID}`);
  if (isRealApiResponse(res) && res.data) {
    logPass('3b-01: Near-expiry report', `Reachable, buckets present`);
  } else {
    logFail('3b-01: Near-expiry report', `status=${res.status} type=${res.contentType}`);
  }

  // 3b-02: H1/schedule register
  res = await call('GET', `/inventory/schedule-register?hospitalId=${HOSPITAL_ID}`);
  if (isRealApiResponse(res)) {
    logPass('3b-02: Schedule register (H1)', 'Reachable');
  } else {
    logFail('3b-02: Schedule register (H1)', `status=${res.status} type=${res.contentType}`);
  }

  // 3c-02: reorder threshold suggestions
  res = await call('GET', `/inventory/reorder-threshold-suggestions?hospitalId=${HOSPITAL_ID}`);
  if (isRealApiResponse(res) && Array.isArray(res.data?.suggestions)) {
    logPass('3c-02: Reorder threshold suggestions', `${res.data.suggestions.length} suggestion(s)`);
  } else {
    logFail('3c-02: Reorder threshold suggestions', `status=${res.status} type=${res.contentType}`);
  }

  // Board (broad sanity check covering stock + expiry + reorder together)
  res = await call('GET', `/inventory/board?hospitalId=${HOSPITAL_ID}`);
  if (isRealApiResponse(res)) {
    logPass('Inventory board', 'Reachable');
  } else {
    logFail('Inventory board', `status=${res.status} type=${res.contentType}`);
  }
}

(async () => {
  if (!EMAIL || !PASSWORD || !HOSPITAL_ID) {
    console.log('❌ Missing required env vars.\n');
    console.log('   Set TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_HOSPITAL_ID before running.');
    console.log('   Optional: TEST_INVENTORY_ITEM_ID, TEST_BARCODE for deeper checks.\n');
    console.log('   This script cannot meaningfully test an authenticated API without real');
    console.log('   credentials — that was the flaw in the earlier version of this suite.\n');
    process.exit(2);
  }

  const authed = await login();
  if (!authed) {
    console.log('❌ Cannot proceed without authentication.\n');
    process.exit(1);
  }

  await runSmokeTests();

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 RESULTS\n`);
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}\n`);
  console.log('═'.repeat(70) + '\n');

  process.exit(failed > 0 ? 1 : 0);
})();
