import { Hono } from 'hono'
import { generateCustomId, getUserInfo, sql, tUser } from '../../helper/utility.js';
import { createRequire } from "module";
import type { User } from '../../model/data.js';
import { DateTime } from 'luxon';
import { bearerAuth } from 'hono/bearer-auth';
import { HTTPException } from 'hono/http-exception';
import type { StatusCode } from 'hono/utils/http-status';
import { getAuth } from 'firebase-admin/auth';
import { cert, initializeApp } from 'firebase-admin/app';
// import { credential } from 'firebase-admin';

const require = createRequire(import.meta.url);
const excelToJson = require('convert-excel-to-json');
const app = new Hono();
const apps = initializeApp({
  credential: cert({
    projectId: 'wedding-invitation-182f7',
    clientEmail: 'firebase-adminsdk-fbsvc@wedding-invitation-182f7.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtUOqfAw/2288N\nOpWPzz8EjBG1EM5N+vnf89t/gz3scn8J23cLhNZ21XKwHU3Wn9Q9caJm8brf/xGh\nfJod88YCs1qcqkrfBQ9f67/dn/2qh2+lueHlI1klg3np8U6HTwcyB2bQePvuCA1z\nkcLwghu282WPKD8mMg0NfhFnSOkWbZnoBgMTXGhwFwo0wAzo0vRqYhZEyJY7rbqZ\nXwfPxXKyOfXLpIziXMgBiNV6V16M0C8CrTWSCi+HWKdahnSOvUxDybOix4o4gKje\nqCOUq9XWqVz4BSpIp7Rrvc7kZbmCR4y+MqUC6poCG412OXLo9a6nBm2kHXRRJdxM\nM8eNLQ6FAgMBAAECggEARtlRl+ASGhk/+kntEsUnHy49HNX6Z+FFXTncDDOz0CD7\n8qUe9HwAicJ2qCzKgYaDpfx6ZXfCq0ejRu7fN4hL9RWpYGqywZlZcB44qBn7gcbs\nqoQipl89VXr6Dtqgfeqd5+MjsewLHIJ5MTmwRU4Ck1bLOOq8adpDALV82spw0kQc\nfFoktHHexfz5b9uyrVyAnCGSAtTJvlrYuL8TmwxaT8v6L2hic1fL4BeJkx6g7mmX\n9TsHVZKTiOHXEwsKqFAlm2Afjvnvp2JZGy0k1Vxxx50Pt9a0kdcBvHjp1hFIFsei\nP6cIn94M0SfdXMfPnf2uP69d1PKxTnQXuNuLNjZ+fwKBgQDzxx1q7HskE+5YwZMa\n8S7W+XBO1KUDSXokOpXNWbLMCq9y8Exz17LxmkXdC2fpzIEM+97hwVWUgZZVjkwa\nuP7qBsIGNg5BztLKA/LiHkrWF9eONS330wLy1KT/MKry+v13Mjfkpy7ySGyUJx5Z\nI92ixHYwHcVJRn09VxKSPJgjcwKBgQC2AW0jz7BdMQ+LIPBFemmya/MtduMcbSI/\neuVWcFvmpt6RQOLmQFb891ZfHdljCOELNZ1EqLiIKjSWC4+/ZL2f9T2796hoCLpP\n4gBZN7hSXhghDhsyISM+SVxH2ZQLiKnMPiuMoUDZatpFLeX90Ro97xNPVpcFyaIz\n4K7Tpie4JwKBgBBLxjaomk6+GlfKkOfjKYtrX0uVwXYnykdztyHkFiS3riTT1XiE\n+cxW0MbHBWpGpnXUvICA6RSlWQRdH89FgJzqWLwLjwZtKgAhJXJiLgSD0YALJAiG\nDZNoDaOVgEf/6UO3kq7xUh0WJFP/DXNOB3njAjeTNeYBFUwtbuthq5XrAoGAROJd\nUER2146N93ZL+b/O6Tx6GSb55fRYFfaJfiGgZreZXRhVyBdp1Ow3wGAnupfNtNRh\n5W6GCOMQbAmMKkASlMvYxZ+CGX3UJg+/WgUAugvqzffsyxhHondZecgbhBIBUc/l\n45/UT3VljvFELsBJUk9923VGS2Z5AXF0OZ6VQdkCgYEAkdRxddHeItqq75uTPj9g\nvtemEkXVcdebzqMaOPYb9c0BhUSkTvWLIpbBDwauTwHy+wMPyoS5slUOjTI/b+zz\nbrX0qKxf83BnT9Ioolm3FOFIs+aNEDyuZ5o0Zct/ckObks7idUOmQqyGBnVUBx0/\nyBM2aMsVH5wffPwtOYfjopg=\n-----END PRIVATE KEY-----\n'
  })
});

const bearerAuths = bearerAuth({async verifyToken(token, c) {
  console.log('check token ', token, c);
  let isAllow = false;
  if (token && token != 'temp-pass') {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (decodedToken) {
      console.log('result decoded token ', decodedToken);
      if (decodedToken.email == 'rijallabdullah@gmail.com' || decodedToken.email == 'putri.darmawanalif98@gmail.com') {
        isAllow = true;
      }
    }
  } else if (token == 'temp-pass') {
    isAllow = true;
  }
  
  console.log('is allow ', isAllow)
  return isAllow;
},
})

// app.use('/*', bearerAuths)

app.on('GET', '/', async (c, next) => {
  // List of valid tokens
  const bearer = bearerAuths;
  return bearer(c, next)
})

app.on('POST', '*', async (c, next) => {
  // List of valid tokens
  const bearer = bearerAuths;
  return bearer(c, next)
})

app.on('DELETE', '*', async (c, next) => {
  // List of valid tokens
  const bearer = bearerAuths;
  return bearer(c, next)
})

app.onError((err, c): any => {
  if (err instanceof HTTPException) {
    // Get the custom response
    if (err.status == 401) {
      return c.newResponse(JSON.stringify({message: 'Unauthorized'}), err.getResponse().status as StatusCode, err.getResponse().headers as any);
    } else {
      return err.getResponse();
    }
  }
  // ...
})

app.post("/create-user", async (c) => {
  const data: User = await c.req.parseBody() as any;
  const id = generateCustomId();
  const column = ['id', 'name', 'email', 'phone', 'date_created'];
  console.log('request data ', data);
  if (!data.name) {
    return c.json({message: 'Invalid Request'}, 400);
  }

  try {
    const result = await sql`
      INSERT INTO ${ sql(tUser) }
        (${ sql(column) })
      VALUES (${ id }, ${ data.name }, ${ data.email ?? '' }, ${ data.phone ?? '' }, ${ DateTime.utc().toISO() })
      RETURNING *`;
    console.log(result);
    return c.json({message: "Success Create User", data: result && result[0] ? result[0] : null}, 201);
  } catch (error: any) {
    console.log('err Create User ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.post("/update/:id", async (c) => {
  const data: User = await c.req.parseBody() as any;
  const { id } = await c.req.param() as any;
  const column = ['id', 'name', 'email', 'phone', 'date_modified'];
  console.log('request data ', data);
  if (!id || !data.name) {
    return c.json({message: 'Invalid Request'}, 400);
  }

  const body = {
    id,
    name: data.name ? data.name : '',
    email: data.email ? data.email : '',
    phone: data.phone ? data.phone : '',
    date_modified: DateTime.utc().toISO()
  }

  try {
    const result = await sql`
      UPDATE ${ sql(tUser) }
      SET  ${ sql(body as any, column) }
      WHERE id = ${ body.id }
      RETURNING *`;
    console.log(result);
    return c.json({message: "Success Update User", data: result && result[0] ? result[0] : null}, 201);
  } catch (error: any) {
    console.log('err Update User ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.post("/import-user", async (c) => {
  const data: any = await c.req.parseBody() as any;
  if (!data.file) {
    return c.json({message: 'Invalid Request'}, 400);
  }
  const column = ['name', 'email', 'phone', 'is_invited', 'id', 'date_created'];
  const jsonFile = excelToJson({
    source: Buffer.from(await (data.file as File).arrayBuffer()),
    header:{
      rows: 1
    },
    columnToKey: {
      A: 'name',
      B: 'email',
      C: 'phone'
    }
  });
  console.log('return jsonFile excel to JSOn ', jsonFile);
  if (jsonFile && jsonFile.Sheet1 && jsonFile.Sheet1.length != 0) {
    for (let item of jsonFile.Sheet1) {
      item['is_invited'] = true;
      Object.assign(item, {id: generateCustomId(), date_created: DateTime.utc().toISO()});
    }
  }
  // return c.json(jsonFile, 200);
  
  console.log('request data ', data, jsonFile);
  

  try {
    const result = await sql`
      INSERT INTO ${ sql(tUser) }
      ${ sql(jsonFile.Sheet1, column) }
      RETURNING *`;
    console.log(result);
    return c.json({message: "Success Import User", data: result}, 201);
  } catch (error: any) {
    console.log('err Import User ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.get("/:id", async (c) => {
  const { id } = await c.req.param() as any;
  console.log('request data ', id);
  if (!id) {
    return c.json({message: 'Invalid Request'}, 400);
  }

  try {
    const result = await getUserInfo(id);
    console.log(result);
    return c.json({data: result && result.length != 0 ? result[0] : null}, 200);
  } catch (error: any) {
    console.log('err get user detail ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.get("/", async (c) => {
  console.log('req list ', c)
  const { page, sort, q } = await c.req.query() as any;
  const fetchPage = typeof page != 'undefined' ? +page : 1;
  const sorting = typeof sort != 'undefined' && (sort == 'desc' || sort == 'asc') ? sort : 'desc';
  if (q && typeof q != 'string') {
    return c.json({message: 'Query Field is Invalid'}, 400);
  }
  console.log('check sorting ', sorting);
  const query = q && typeof q == 'string' ? q.toLowerCase() : q;
  const maxPerPage = 20;
  const offset = (fetchPage * maxPerPage) - maxPerPage;
  console.log('offset ', offset, query)
  try {
    const count = await sql`
      SELECT COUNT(id) FROM ${ sql(tUser) }
      ${ query ? sql`WHERE lower(name) LIKE ${ '%'+ query + '%' }` : sql`` }
    `
    const totalPage = Math.ceil(count[0].count/maxPerPage);
    const result = await sql`
      SELECT * FROM ${ sql(tUser) }
      ${ query ? sql`WHERE lower(name) LIKE ${ '%'+ query + '%' }` : sql`` }
      order by name ${ sorting == 'asc' ? sql`asc` : sql`desc` }
      LIMIT ${ maxPerPage }
      OFFSET ${ offset }`
    console.log('result get user info List ', result, count);
    return c.json({
      data: result,
      pagination: {
        page: fetchPage,
        total: result.length,
        total_items: count && count[0] && +count[0].count,
        total_page: totalPage
      }
    }, 200);
  } catch (error: any) {
    console.log('err Get User Info List ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.delete("/delete/:id", async (c) => {
  const { id } = await c.req.param() as any;
  if (!id) {
    return c.json({message: 'Invalid Request'}, 400);
  }
  try {
    const result = await sql`
      DELETE FROM ${ sql(tUser) }
      where id = ${ id }
    `
    console.log('result Delete user ', result);
    return c.json({
      data: result,
      message: 'Success delete user'
    }, 200);
  } catch (error: any) {
    console.log('err Delete user ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

export default app