import postgres from "postgres";

export const generateCustomId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12).padStart(12, '0');
}

export const sql = postgres({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT!,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  transform: {
    undefined: null
  }
});

export const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
export const tRSVP = `${DB_SCHEMA}.T_RSVP`;
export const tWeddingGift = `${DB_SCHEMA}.T_Wedding_Gift`;
export const tUser = `${DB_SCHEMA}.T_User`;
export const tComments = `${DB_SCHEMA}.T_Comments`;


// insert user to database
export const insertUser = async (user_id: string, name: string, email?: string, phone?: string, is_invited: boolean = true) => {
  const column = ['id', 'name', 'email', 'phone', 'is_invited'];
  const id = user_id ?? generateCustomId();
  try {
    const result = await sql`
      INSERT INTO ${ sql(tUser) }
       (${ sql(column) })
      VALUES (${ id }, ${ name }, ${ email ?? null }, ${ phone ?? null }, ${ is_invited == true || ''+is_invited == 'true' ? true : false })
      RETURNING *`;
    console.log('result insert user ', result);
    return result;
  } catch (error: any) {
    console.log('err insert user ', error)
    return {error};
  }
}

// get user info from database
export const getUserInfo = async (user_id: string) => {
  try {
    const result = await sql`
      SELECT * FROM ${ sql(tUser) }
      WHERE id = ${ user_id }`
    console.log('result get user info ', result);
    return result;
  } catch (error: any) {
    console.log('err get user ', error)
    return null;
  }
}

// get rsvp info by user_id from database
export const getRSVPUser = async (user_id: string) => {
  try {
    const result = await sql`
    SELECT id, email, phone, is_attend, attendance FROM ${ sql(tRSVP) }
    WHERE user_id = ${ user_id }`
    console.log('result get rsvp user ', result);
    return result;
  } catch (error: any) {
    console.log('err get rsvp user ', error)
    return null;
  }
}

// Helper to convert S3 streams to strings
export const streamToString = async (stream: any) => {
  const chunks = [];
  for await (const chunk of stream) {
      chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

export const parseJSON = async (stringify: string) => {
  try {
    const parse = JSON.parse(stringify);
    return parse;
  } catch (error) {
    return stringify;
  }
}