import { Hono } from 'hono';
import { generateCustomId, getRSVPUser, getUserInfo, insertUser, parseJSON, sql, tComments, tRSVP, tUser } from '../../helper/utility.js';
import type { Comment, rsvp, User } from '../../model/data.js';
import { DateTime } from 'luxon';
import { createNodeWebSocket } from '@hono/node-ws';
import { wss } from '../../index.js';

const app = new Hono();



app.get("/", async (c) => {
  const { page, sort, q } = await c.req.query() as any;
  const fetchPage = typeof page != 'undefined' ? +page : 1;
  const sorting = typeof sort != 'undefined' && (sort == 'desc' || sort == 'asc') ? sort : 'desc';
  if (q && typeof q != 'string') {
    return c.json({message: 'Query Field is Invalid'}, 400);
  }
  console.log('check sorting ', sorting);
  const maxPerPage = 7;
  const offset = (fetchPage * maxPerPage) - maxPerPage;
  console.log('offset ', offset)
  try {
    const count = await sql`
      SELECT COUNT(id) FROM ${ sql(tComments) }
      ${ q ? sql`WHERE comment LIKE ${ '%'+ q + '%' }` : sql`` }
    `
    const totalPage = Math.ceil(count[0].count/maxPerPage);
    const result: Comment[] = await sql`
      SELECT * FROM ${ sql(tComments) }
      ${ q ? sql`WHERE comment LIKE ${ '%'+ q + '%' }` : sql`` }
      order by date_created ${ sorting == 'asc' ? sql`asc` : sql`desc` }
      LIMIT ${ maxPerPage }
      OFFSET ${ offset }`
    console.log('result get Comments List ', result, count);
    const user: User[] = [];
    loop1:
    for (let item of result) {
      if (item.user_id) {
        if (user.length != 0) {
          let ind = 0;
          for (let sub of user) {
            if (item.user_id == sub.id) {
              item['user'] = sub;
              continue loop1;
            }
  
            else if (ind+1 == user.length) {
              const res = await getUserInfo(item.user_id);
              if (res && res[0]) {
                user.push(res[0] as User);
                item['user'] = res[0] as User;
              }
            }
            ind++;
          }
        } else {
          const res = await getUserInfo(item.user_id);
          if (res && res[0]) {
            user.push(res[0] as User);
            item['user'] = res[0] as User;
          }
        }
      }
    }
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
    console.log('err Get Comments List ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

app.post("/submit", async (c) => {
  const data: Comment = await c.req.parseBody() as any;
  const id = generateCustomId();
  const column = ['id', 'comment', 'user_id', 'date_created', 'date_modified'];
  console.log('request data ', data, parseJSON(data as any));
  if (!data.comment) {
    return c.json({message: 'Invalid Request'}, 400);
  }

  const body = {
    id,
    comment: data.comment,
    user_id: data.user_id ? data.user_id : null,
    date_created: DateTime.utc().toISO(),
    date_modified: null
  }

  try {
    const result = await sql`
      INSERT INTO ${ sql(tComments) }
      ${ sql(body as any, column) }
      RETURNING *`;
    console.log(result);
    if (body.user_id) {
      const res = await getUserInfo(body.user_id);
      if (res && res[0]) {
        result[0]['user'] = res[0];
      }
    }
    wss.clients.forEach((ws) => {
      ws.send(JSON.stringify({data: result[0]}));
    })
    return c.json({message: "Success submit comment", data: result[0]}, 201);
  } catch (error: any) {
    console.log('err submit comment ', error)
    return c.json({ error: error.message }, 500);
  }
});

export default app;