import { crc32 } from 'node:zlib';

export interface ZipEntry {
  path: string;
  contents: Buffer;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const UTF8_NAME_FLAG = 0x0800;
const STORED_METHOD = 0;
const DOS_EPOCH_TIME = 0;
const DOS_EPOCH_DATE = 0x0021;

export function buildZip(entries: ZipEntry[]): Buffer {
  const files: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path, 'utf8');
    const checksum = crc32(entry.contents);
    const size = entry.contents.length;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0);
    header.writeUInt16LE(ZIP_VERSION, 4);
    header.writeUInt16LE(UTF8_NAME_FLAG, 6);
    header.writeUInt16LE(STORED_METHOD, 8);
    header.writeUInt16LE(DOS_EPOCH_TIME, 10);
    header.writeUInt16LE(DOS_EPOCH_DATE, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(size, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(name.length, 26);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(CENTRAL_HEADER_SIGNATURE, 0);
    record.writeUInt16LE(ZIP_VERSION, 4);
    record.writeUInt16LE(ZIP_VERSION, 6);
    record.writeUInt16LE(UTF8_NAME_FLAG, 8);
    record.writeUInt16LE(STORED_METHOD, 10);
    record.writeUInt16LE(DOS_EPOCH_TIME, 12);
    record.writeUInt16LE(DOS_EPOCH_DATE, 14);
    record.writeUInt32LE(checksum, 16);
    record.writeUInt32LE(size, 20);
    record.writeUInt32LE(size, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);

    files.push(header, name, entry.contents);
    directory.push(record, name);
    offset += header.length + name.length + size;
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, directoryBytes, end]);
}
