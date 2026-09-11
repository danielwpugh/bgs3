import EmbeddedPostgres from 'embedded-postgres';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
const pg=new EmbeddedPostgres({databaseDir:resolve('.local/postgres'),user:'beastgames',password:'beastgames_local',port:5433,persistent:true,postgresFlags:['-h','127.0.0.1','-k','/tmp']});
let initialized = false;
try { await access(resolve('.local/postgres/PG_VERSION')); initialized = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!initialized) await pg.initialise();
await pg.start();
const client=pg.getPgClient();await client.connect();
const result=await client.query("SELECT 1 FROM pg_database WHERE datname='beastgames_local'");
await client.end();if(!result.rowCount)await pg.createDatabase('beastgames_local');
console.log('Local PostgreSQL ready on 127.0.0.1:5433. Ctrl-C stops it; data is retained.');
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await pg.stop();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
await new Promise(()=>{});
