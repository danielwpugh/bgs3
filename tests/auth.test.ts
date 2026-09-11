import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {verifyToken,createToken} from '../lib/auth';
test('admin token validation rejects preview tokens and malformed identity',()=>{
  process.env.JWT_SECRET='test-only-secret-with-at-least-32-characters';
  assert.equal(verifyToken(jwt.sign({type:'frontend-auth'},process.env.JWT_SECRET)),null);
  assert.equal(verifyToken(jwt.sign({id:'1',username:'admin'},process.env.JWT_SECRET)),null);
  assert.deepEqual(verifyToken(createToken({id:1,username:'admin'})),{id:1,username:'admin'});
});
