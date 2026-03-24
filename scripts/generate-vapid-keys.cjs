// Run once to generate VAPID keys, then add them to .env.local and Vercel env vars.
// Usage: node scripts/generate-vapid-keys.cjs

const webpush = require('web-push')
const keys = webpush.generateVAPIDKeys()

console.log('VAPID Keys generated — add these to .env.local and Vercel:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:you@example.com`)
console.log(`CRON_SECRET=<generate a random secret string here>`)
console.log('\nKeep VAPID_PRIVATE_KEY and CRON_SECRET server-side only (no NEXT_PUBLIC_ prefix).')
