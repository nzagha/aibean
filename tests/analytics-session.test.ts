import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsToken } from '../src/lib/discovery/session-proof';
test('analytics sessions validate signatures, expiry and exact format without identifying accounts',()=>{
 const secret='Synthetic analytics secret minimum length',now=1791806400000,initial=analyticsToken(secret,'',now);
 assert.equal(initial.renew,true);assert.match(initial.hash,/^[a-f0-9]{64}$/);
 assert.deepEqual(analyticsToken(secret,initial.value,now+1000),{...initial,renew:false});
 for(const [value,at] of [[initial.value,now+1800000],[initial.value,now-1],[initial.value+'.extra',now],[initial.value.replace(/.$/,'x'),now]] as const) assert.equal(analyticsToken(secret,value,at).renew,true);
 assert.equal(analyticsToken('Another synthetic analytics secret',initial.value,now).renew,true);
 assert.throws(()=>analyticsToken('short','',now));
});
