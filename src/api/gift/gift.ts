import { Hono } from 'hono';
import { generateCustomId, sql, tWeddingGift } from '../../helper/utility.js';
import type { WeddingGift } from '../../model/data.js';
import { getFileName, uploadFile } from '../r2-cloudflare/r2-cloudflare.js';
import { DateTime } from 'luxon';

const app = new Hono();

app.post("/submit-wedding-gift", async (c) => {
  const data: WeddingGift = await c.req.parseBody() as any;
  const id = generateCustomId();
  const column = ['id', 'name', 'account_name', 'account_number', 'amount', 'notes', 'bank_recipient', 'receipt_proof', 'date_created', 'date_modified'];
  console.log('request data ', data);
  if (!data.name || (!data.account_name || typeof data.amount == 'undefined')) {
    return c.json({message: !data.name ? 'Name is required' : !data.account_name ? 'Account Owner Name cannot be empty' : typeof data.amount == 'undefined' ? 'Amount cannot be empty' : 'Invalid Request'}, 400);
  }

  if (typeof data.receipt_proof == 'undefined' || !data.receipt_proof.name) {
    return c.json({message: 'Transfer Proof is required'}, 400);
  }

  const body = {
    id,
    name: data.name,
    account_name: data.account_name,
    account_number: data.account_number ? data.account_number : null,
    amount: data.amount,
    notes: data.notes ? data.notes : null,
    bank_recipient: data.bank_recipient ? data.bank_recipient : null,
    receipt_proof: '',
    date_created: DateTime.utc().toISO(),
    date_modified: null
  }

  const fileName = new Date().getTime() + '';
  const folderName = 'wedding/gift/proof';

  try {
    const uploadPromises = await uploadFile(data.receipt_proof, folderName,  fileName);
    console.log('result upload proof gift ', uploadPromises);

    body['receipt_proof'] = `${folderName}/${getFileName(data.receipt_proof, fileName)}`;
  } catch (error) {
    console.log('err upload proof gift ', error)
    return c.json({message: 'Failed upload Transfer Proof'}, 500);
  }

  console.log('check body ', body);

  try {
    const result = await sql`
      INSERT INTO ${ sql(tWeddingGift) }
      ${ sql(body as any, column) }
      RETURNING *`;
    console.log(result);
    return c.json({message: "Success submit Wedding Gift"}, 201);
  } catch (error: any) {
    console.log('err submit Wedding Gift ', error)
    return c.json({ error: error.message }, 500);
  }
  
});

export default app;