import fetch from 'node-fetch';

async function run() {
  try {
    console.log('Running AI prompt smoke tests...');
    // 1. Test triage full
    const triage = await fetch('http://localhost:3000/api/triage/full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_input: 'I need help deciding about a new car offer. The salesperson quoted £5000 deposit and monthly payments. I am not sure about the service package.', instruction: 'Respond to this message' }) }).then(r=>r.json());
    console.log('triage/full sample:', triage.raw_llm_response ? triage.raw_llm_response.split('\n').slice(0,5).join('\n') : 'no raw');

    // 2. Test suggest endpoint (compose)
    const suggest = await fetch('http://localhost:3000/api/email/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: 'Write an email', companion_content: 'Ask Alice to move the meeting to Tuesday — I\'m travelling, offer 10am or 2pm', tone: 'Friendly' }) }).then(r=>r.json());
    console.log('email/suggest sample drafts:', (suggest.drafts || []).slice(0,2));

    console.log('AI prompt smoke tests finished.');
  } catch (e) {
    console.error('Smoke tests failed', e);
    process.exit(1);
  }
}

run();
