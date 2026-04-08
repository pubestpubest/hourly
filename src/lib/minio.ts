import * as Minio from 'minio'
import { Readable } from 'stream'

let _client: Minio.Client | null = null

function getClient(): Minio.Client {
  if (!_client) {
    _client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }
  return _client
}

const BUCKET = () => process.env.MINIO_BUCKET || 'hourly-photos'

export async function uploadImage(
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await getClient().putObject(BUCKET(), objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  })
}

export async function getImageStream(objectName: string): Promise<Readable> {
  return getClient().getObject(BUCKET(), objectName)
}

export async function deleteImage(objectName: string): Promise<void> {
  await getClient().removeObject(BUCKET(), objectName)
}
