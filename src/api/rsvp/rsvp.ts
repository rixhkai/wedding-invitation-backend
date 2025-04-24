import { Hono } from 'hono';
import { generateCustomId, getRSVPUser, getUserInfo, insertUser, parseJSON, sql, tRSVP } from '../../helper/utility.js';
import type { rsvp } from '../../model/data.js';
import { createMiddleware } from 'hono/factory';
import { DateTime } from 'luxon';

const app = new Hono();

const middleware = createMiddleware<any>(async (c, next) => {
  c.var.parseJson(c.req.bodyCache.parsedBody)
  await next()
})

app.get("/list-rsvp", async (c) => {
  // console.log('check schema ', DB_SCHEMA, await sql)
  const data: rsvp = await c.req.query() as any;
  const result = await sql`SELECT * FROM ${ sql(tRSVP) } WHERE user_id=${data.user_id!}`;
  console.log(result);
  return c.json({data: result}, 200);
});

app.get("/user/:id", async (c) => {
  const { id } = await c.req.param() as any;
  console.log('request data ', id);
  if (!id) {
    return c.json({message: 'Invalid Request'}, 400);
  }

  try {
    const result = await getRSVPUser(id);
    console.log(result);
    return c.json({data: result && result.length != 0 ? result[0] : null}, 200);
  } catch (error: any) {
    console.log('err get rsvp user', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.post("/submit-rsvp", async (c) => {
  const data: rsvp = await c.req.parseBody() as any;
  const id = generateCustomId();
  const column = ['id', 'name', 'attendance', 'email', 'is_attend', 'phone', 'user_id', 'relation'];
  console.log('request data ', data, parseJSON(data as any));
  if (!data.name || (!data.attendance || typeof data.attendance == 'undefined') || typeof data.is_attend == 'undefined') {
    return c.json({message: 'Invalid Request'}, 400);
  }

  let existingRSVP = null;
  let isUserExist = null;
  const body = {
    id,
    name: data.name,
    attendance: data.attendance,
    email: data.email,
    is_attend: data.is_attend == true || data.is_attend == 'true' ? true : false,
    user_id: data.user_id,
    relation: data.relation
  }

  if (data.user_id) {
    isUserExist = await getUserInfo(data.user_id);
    // console.log('check ')
    if (isUserExist && isUserExist[0]) {
      try {
        existingRSVP = await getRSVPUser(data.user_id);
      } catch (error: any) {
        console.log('err get existing rsvp ', error);
      }
    }
    
  }
  
  console.log('existing rsvp ', existingRSVP);

  if (existingRSVP && existingRSVP.length != 0 && existingRSVP[0] && existingRSVP[0].id) {
    console.log('try update existing rsvp');
    Object.assign(body, {id: existingRSVP[0].id, date_modified: DateTime.utc().toISO()});
    column.push('date_modified');
    console.log('check body ', body, id)
    try {
      const result = await sql`
        UPDATE ${ sql(tRSVP) }
        SET   ${ sql(body as any, column) }
        WHERE id = ${ body.id }`
        // VALUES (${ id }, ${ data.name }, ${ data.attendance }, ${ data.email }, ${ data.is_attend == true || data.is_attend == 'true' ? true : false }, ${ data.phone })
        // RETURNING *`;
      console.log(result);
      return c.json({message: "Success update RSVP"}, 201);
    } catch (error: any) {
      console.log('err update RSVP ', error)
      return c.json({ error: error.message }, 500);
    }
  } else {
    if (data.user_id && (!isUserExist || isUserExist.length == 0 || !isUserExist[0])) {
      isUserExist = await insertUser(data.user_id, data.name, data.email, data.phone, false);
    }
    column.push('date_created');
    try {
      const result = await sql`
        INSERT INTO ${ sql(tRSVP) }
          (${ sql(column) })
        VALUES (${ id }, ${ data.name }, ${ data.attendance }, ${ data.email }, ${ data.is_attend == true || data.is_attend == 'true' ? true : false }, ${ data.phone }, ${ isUserExist && data.user_id ? data.user_id : null}, ${ data.relation ? data.relation : null }, ${ DateTime.utc().toISO() })
        RETURNING *`;
      console.log(result);
      return c.json({message: "Success submit RSVP"}, 201);
    } catch (error: any) {
      console.log('err submit RSVP ', error)
      return c.json({ error: error.message }, 500);
    }
  }
});

export default app;