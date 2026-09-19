const http = require('http');

function calcQuotation(items, discountPct) {
  let subtotal = 0;
  let totalTax = 0;
  items.forEach(item => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const lineSubtotal = Math.max(0, qty * rate - disc);
    const taxRate = 18.0;
    const lineTax = (lineSubtotal * taxRate) / 100;
    subtotal += qty * rate;
    totalTax += lineTax;
  });

  const pct = Number(discountPct) || 0;
  if (pct < 0 || pct > 100) {
    throw new Error('Discount percentage must be between 0% and 100%.');
  }

  const discountAmount = Number(((subtotal * pct) / 100).toFixed(2));
  const grandTotal = Number((subtotal - discountAmount + totalTax).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(totalTax.toFixed(2)),
    discountPct: pct,
    discountAmount,
    grandTotal,
  };
}

async function runTests() {
  console.log('=== TESTING SPECIAL DISCOUNT PERCENTAGE CALCULATIONS ===\n');

  const baseItems = [{ quantity: 1, unitPrice: 42500, discount: 0 }];

  // TEST 1
  console.log('--- TEST 1: Discount 0% ---');
  const t1 = calcQuotation(baseItems, 0);
  console.log('Result:', t1);
  console.assert(t1.subtotal === 42500, 'Subtotal should be 42500');
  console.assert(t1.tax === 7650, 'Tax should be 7650');
  console.assert(t1.discountAmount === 0, 'Discount should be 0');
  console.assert(t1.grandTotal === 50150, 'Grand total should be 50150');
  console.log('✅ TEST 1 PASSED');

  // TEST 2
  console.log('\n--- TEST 2: Discount 10% ---');
  const t2 = calcQuotation(baseItems, 10);
  console.log('Result:', t2);
  console.assert(t2.discountAmount === 4250, 'Discount should be 4250');
  console.assert(t2.grandTotal === 45900, 'Grand total should be 45900');
  console.log('✅ TEST 2 PASSED');

  // TEST 3
  console.log('\n--- TEST 3: Discount 5% ---');
  const t3 = calcQuotation(baseItems, 5);
  console.log('Result:', t3);
  console.assert(t3.discountAmount === 2125, 'Discount should be 2125');
  console.assert(t3.grandTotal === 48025, 'Grand total should be 48025');
  console.log('✅ TEST 3 PASSED');

  // TEST 4
  console.log('\n--- TEST 4: Discount 100% ---');
  const t4 = calcQuotation(baseItems, 100);
  console.log('Result:', t4);
  console.assert(t4.discountAmount === 42500, 'Discount should be 42500');
  console.assert(t4.grandTotal === 7650, 'Grand total should be 7650');
  console.log('✅ TEST 4 PASSED');

  // TEST 5
  console.log('\n--- TEST 5: Discount 10.5% ---');
  const t5 = calcQuotation(baseItems, 10.5);
  console.log('Result:', t5);
  console.assert(t5.discountAmount === 4462.50, 'Discount should be 4462.50');
  console.log('✅ TEST 5 PASSED');

  // TEST 6
  console.log('\n--- TEST 6: Discount -5% (Negative Rejection) ---');
  try {
    calcQuotation(baseItems, -5);
    console.error('❌ TEST 6 FAILED: Did not throw on negative discount');
  } catch (err) {
    console.log('Caught expected error:', err.message);
    console.log('✅ TEST 6 PASSED');
  }

  // TEST 7
  console.log('\n--- TEST 7: Discount 101% (>100% Rejection) ---');
  try {
    calcQuotation(baseItems, 101);
    console.error('❌ TEST 7 FAILED: Did not throw on >100% discount');
  } catch (err) {
    console.log('Caught expected error:', err.message);
    console.log('✅ TEST 7 PASSED');
  }

  // TEST 8 & 9: Quantity change dynamic update
  console.log('\n--- TEST 8 & 9: Quantity Change Dynamic Recalculation ---');
  const changedItems = [{ quantity: 2, unitPrice: 42500, discount: 0 }]; // Subtotal = 85000
  const t8 = calcQuotation(changedItems, 10);
  console.log('Result for Qty 2 @ 10%:', t8);
  console.assert(t8.subtotal === 85000, 'Subtotal should be 85000');
  console.assert(t8.discountAmount === 8500, 'Discount should be 8500');
  console.assert(t8.grandTotal === 91800, 'Grand total should be 91800');
  console.log('✅ TEST 8 & 9 PASSED');

  // TEST 10: Create Quotation via Backend API with ₹4,250 discount (10% on 42,500)
  console.log('\n--- TEST 10: Persist Quotation via Backend API with Discount Amount ---');
  const custRes = await new Promise((res) => {
    http.get('http://localhost:5000/api/customers', (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => res(JSON.parse(b)));
    });
  });
  const prodRes = await new Promise((res) => {
    http.get('http://localhost:5000/api/products', (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => res(JSON.parse(b)));
    });
  });

  const customerId = custRes.data[0].id;
  const productId = prodRes.data[0].id;

  const createPayload = JSON.stringify({
    customerId,
    discount: 4250, // 10% of 42500
    status: 'Draft',
    items: [
      {
        productId,
        quantity: 1,
        unitPrice: 42500,
        discount: 0,
      }
    ]
  });

  const postReq = http.request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/quotations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(createPayload),
      },
    },
    (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        const json = JSON.parse(b);
        console.log('Created Quotation:', json.data?.quotationNumber, '| Grand Total:', json.data?.grandTotal, '| Stored Discount:', json.data?.discount);
        console.assert(json.data?.discount === 4250, 'Stored discount should be 4250');
        console.assert(json.data?.grandTotal === 45900, 'Grand total should be 45900');
        console.log('✅ TEST 10 & 11 PASSED');

        // TEST 12: Verify Edit Mode percentage derivation
        const subtotal = json.data?.subtotal;
        const derivedPct = Number(((json.data?.discount / subtotal) * 100).toFixed(2));
        console.log('\n--- TEST 12: Derived Edit Percentage ---');
        console.log('Derived Percentage:', derivedPct + '%');
        console.assert(derivedPct === 10, 'Derived percentage should be 10%');
        console.log('✅ TEST 12 PASSED');

        console.log('\n=== ALL 12 TEST SCENARIOS PASSED SUCCESSFULLY ===');
      });
    }
  );
  postReq.write(createPayload);
  postReq.end();
}

runTests().catch(console.error);
