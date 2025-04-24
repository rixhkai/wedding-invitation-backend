import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Hono } from 'hono';
import * as mime from 'mime-types';
import { streamToString } from '../../helper/utility.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const app = new Hono();

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadFile = async (file: any, folder?: string, fileName?: string) => {
  const name = getFileName(file, fileName);
  const mimetype = file.mimetype ?? file.type;
  const body = file.buffer ?? Buffer.from(await (file as File).arrayBuffer());
  console.log('name file ', name );
  const params = {
    Bucket: BUCKET_NAME,
    Key: folder ? `${folder}/${name}` : name,
    Body: body,
    ContentType: mimetype,
    // ContentLength: file.size
  };

  if (body.length) {
    Object.assign(params, {ContentLength: body.length});
  }
    
  const command = new PutObjectCommand(params);
  return s3.send(command);
}

// Custom file name without extension
export const getFileName = (file: any, customFileName?: string) => {
  let name = customFileName ?? file.originalname ?? file.name;
  const mimetype = file.mimetype ?? file.type;
  const extension = mime.extension(mimetype);
  if (customFileName) {
    name = customFileName + (extension ? `.${extension}` : '');
  }
  return name;
}

// expired in seconds
const getPresignedURL = (bucket: string, key: string, expiresIn: number = 3600 * 24 * 7) => {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

// 1. Create a file inside a folder
app.post("/create-file", async (c) => {
  const { folder, fileName, content }: any = await c.req.parseBody();
  console.log('check folder file name content ', folder, fileName, content, JSON.stringify(content).length)
  const isFileUpload = typeof content == 'string' || !content.type ? false : true;
  console.log('is file upload ', isFileUpload);

  if (isFileUpload) {
    try {
      const uploadPromises = uploadFile(content, folder, fileName)
      const name = getFileName(content, fileName);
      console.log('before upload promise ', name);
      await uploadPromises;
      console.log('after upload promise ', name);
      return c.json({
          message: "Files uploaded successfully",
          fileName: name,
      }, 201);
    } catch (error: any) {
      console.log('err create file ', error)
      return c.json({ error: error.message }, 500);
    }

  } else {
    const params = {
      Bucket: BUCKET_NAME,
      Key: folder ? `${folder}/${fileName}` : fileName,
      Body: JSON.stringify(content),
      ContentType: "application/json",
      // ContentLength: JSON.stringify(content).length
  };

    try {
      const command = new PutObjectCommand(params);
      console.log('after command ')
      await s3.send(command);
      console.log('after send file ');
      return c.json({ message: "File created successfully" }, 201);
    } catch (error: any) {
      console.log('err create file ', error)
      return c.json({ error: error.message }, 500);
    }
  }
  
});

// 2. Delete a file inside a folder
app.delete("/delete-file", async (c, next) => {
  const { folder, fileName }: any = c.req.parseBody();

  const params = {
      Bucket: BUCKET_NAME,
      Key: `${folder}/${fileName}`,
  };

  try {
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
      return c.json({ message: "File deleted successfully" }, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 3. Update a file inside a folder (overwrite)
app.put("/update-file", async (c, res) => {
  const { folder, fileName, content }: any = c.req.parseBody();

  const params = {
      Bucket: BUCKET_NAME,
      Key: `${folder}/${fileName}`,
      Body: JSON.stringify(content),
      ContentType: "application/json",
  };

  try {
      const command = new PutObjectCommand(params);
      await s3.send(command);
      return c.json({ message: "File updated successfully" }, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 4. Read a file inside a folder
app.get("/read-file", async (c, res) => {
  const { folder, fileName } = c.req.query();
  console.log('check filename ', fileName)

  const params = {
      Bucket: BUCKET_NAME,
      Key: folder ? `${folder}${fileName ? '/' + fileName : ''}` : fileName,
  };

  try {
      const command = new GetObjectCommand(params);
      const data = await s3.send(command);
      console.log('check result data read file ', data, command);
      if (data.ContentType && data.ContentType == 'application/json') {
        
      } else {
        const presignedURL = await getPresignedURL(BUCKET_NAME!, params.Key);
        return c.json({url: presignedURL}, 200);
      }
      const content = await streamToString(data.Body);
      return c.json({content: JSON.parse(content)}, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 5. List files inside a folder
app.get("/list-files", async (c, res) => {
  const { folder } = c.req.query();

  const params = {
      Bucket: BUCKET_NAME,
      Prefix: `${folder}/`,
  };

  try {
      const command = new ListObjectsV2Command(params);
      const data = await s3.send(command);

      const files = data.Contents?.map((item: any) => item.Key) || [];
      return c.json(files, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 6. List all folders
app.get("/list-folders", async (c, res) => {
  const params = {
      Bucket: BUCKET_NAME,
      Delimiter: "/",
  };

  try {
      const command = new ListObjectsV2Command(params);
      const data = await s3.send(command);

      const folders =
          data.CommonPrefixes?.map((prefix: any) => prefix.Prefix) || [];
      return c.json(folders, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 7. Duplicate a folder
app.post("/duplicate-folder", async (c, res) => {
  const { sourceFolder, targetFolder }: any = c.req.parseBody();

  const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: `${sourceFolder}/`,
  };

  try {
      // List all objects in the source folder
      const listCommand = new ListObjectsV2Command(listParams);
      const listData = await s3.send(listCommand);

      if (!listData.Contents || listData.Contents.length === 0) {
          return c.json({ message: "Source folder is empty or not found" }, 404);
      }

      // Copy each object to the target folder
      const copyPromises = listData.Contents.map(async (item: any) => {
          const copyParams = {
              Bucket: BUCKET_NAME,
              CopySource: `${BUCKET_NAME}/${item.Key}`,
              Key: item.Key.replace(sourceFolder, targetFolder),
          };
          const copyCommand = new PutObjectCommand(copyParams);
          return s3.send(copyCommand);
      });

      await Promise.all(copyPromises);
      return c.json({ message: "Folder duplicated successfully" }, 201);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 8. Rename a folder
app.put("/rename-folder", async (c, res) => {
  const { sourceFolder, targetFolder }: any = c.req.parseBody();

  const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: `${sourceFolder}/`,
  };

  try {
      // List all objects in the source folder
      const listCommand = new ListObjectsV2Command(listParams);
      const listData = await s3.send(listCommand);

      if (!listData.Contents || listData.Contents.length === 0) {
          return c.json({ message: "Source folder is empty or not found" }, 404);
      }

      // Copy each object to the target folder and delete original
      const copyAndDeletePromises = listData.Contents.map(async (item: any) => {
          const newKey = item.Key.replace(sourceFolder, targetFolder);

          // Copy object to new location
          const copyParams = {
              Bucket: BUCKET_NAME,
              CopySource: `${BUCKET_NAME}/${item.Key}`,
              Key: newKey,
          };
          const copyCommand = new PutObjectCommand(copyParams);
          await s3.send(copyCommand);

          // Delete original object
          const deleteParams = {
              Bucket: BUCKET_NAME,
              Key: item.Key,
          };
          const deleteCommand = new DeleteObjectCommand(deleteParams);
          return s3.send(deleteCommand);
      });

      await Promise.all(copyAndDeletePromises);
      return c.json({ message: "Folder renamed successfully" }, 200);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 9. Upload media file without multer
app.post("/upload-files", async (c, next) => {
  const { folder, files }: any = c.req.parseBody();
  console.log('check req files ', c.req, files);

  if (!files || files.length === 0) {
      return c.json({ message: "No files uploaded" }, 400);
  }

  return c.json({data: files, folder}, 200);

  try {
      const uploadPromises = files.map((file: any) => {
          const params = {
              Bucket: BUCKET_NAME,
              Key: `${folder}/${file.originalname}`,
              Body: file.buffer,
              ContentType: file.mimetype,
          };

          const command = new PutObjectCommand(params);
          return s3.send(command);
      });

      await Promise.all(uploadPromises);
      return c.json({
          message: "Files uploaded successfully",
          fileNames: files.map((file: any) => file.originalname),
      }, 201);
  } catch (error: any) {
      return c.json({ error: error.message }, 500);
  }
});

// 9. Upload media file (error transfer-encoding multer hono upload.array)
// app.post("/upload-files", upload.array("files", 10), async (c, next) => {
//   const { folder, files }: any = c.req.parseBody();
//   console.log('check req files ', c.req, files);

//   if (!files || files.length === 0) {
//       return c.json({ message: "No files uploaded" }, 400);
//   }

//   try {
//       const uploadPromises = files.map((file: any) => {
//           const params = {
//               Bucket: BUCKET_NAME,
//               Key: `${folder}/${file.originalname}`,
//               Body: file.buffer,
//               ContentType: file.mimetype,
//           };

//           const command = new PutObjectCommand(params);
//           return s3.send(command);
//       });

//       await Promise.all(uploadPromises);
//       return c.json({
//           message: "Files uploaded successfully",
//           fileNames: files.map((file: any) => file.originalname),
//       }, 201);
//   } catch (error: any) {
//       return c.json({ error: error.message }, 500);
//   }
// });

export default app;