// Pure TypeScript SHA-256 and Stream Cipher for cross-platform encryption/decryption

export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  let hash = [] as number[];
  const k = [] as number[];
  let primeCounter = 0;

  const isComposite = {} as any;
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) {
    ascii += '\x00';
  }
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4 * 8);
  }
  words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
  words[words[lengthProperty]] = (asciiLength * 8) | 0;
  
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      let wItem = w[i];
      if (i >= 16) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) + k[i] + wItem) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Convert string to bytes
function stringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

// Convert bytes to string
function bytesToString(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

// Convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

// Key-stream derivation based on password stretching via SHA-256
function deriveKeyStream(password: string, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  let blockHex = sha256(password);
  let offset = 0;

  while (offset < length) {
    // Generate next block
    blockHex = sha256(password + blockHex);
    const blockBytes = hexToBytes(blockHex);
    for (let i = 0; i < 32 && offset < length; i++) {
      stream[offset++] = blockBytes[i];
    }
  }
  return stream;
}

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToBase64Url(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  const l = bytes.length;
  while (i < l) {
    const b1 = bytes[i++];
    const b2 = i < l ? bytes[i++] : NaN;
    const b3 = i < l ? bytes[i++] : NaN;
    
    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;
    
    result += base64Chars[enc1] + base64Chars[enc2];
    if (enc3 !== 64) result += base64Chars[enc3];
    if (enc4 !== 64) result += base64Chars[enc4];
  }
  return result;
}

function base64UrlToBytes(base64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < base64Chars.length; i++) {
    lookup[base64Chars.charCodeAt(i)] = i;
  }
  
  let len = Math.floor((base64.length * 3) / 4);
  const bytes = new Uint8Array(len);
  
  let i = 0;
  let p = 0;
  const l = base64.length;
  while (i < l) {
    const enc1 = lookup[base64.charCodeAt(i++)];
    const enc2 = lookup[base64.charCodeAt(i++)];
    const enc3 = i < l ? lookup[base64.charCodeAt(i++)] : 64;
    const enc4 = i < l ? lookup[base64.charCodeAt(i++)] : 64;
    
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64) {
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
      if (enc4 !== 64) {
        bytes[p++] = ((enc3 & 3) << 6) | enc4;
      }
    }
  }
  return bytes.slice(0, p);
}

// Encrypt plaintext using password (returning Base64url)
export function encrypt(plaintext: string, password: string): string {
  const plainBytes = stringToBytes(plaintext);
  const stream = deriveKeyStream(password, plainBytes.length);
  const cipherBytes = new Uint8Array(plainBytes.length);
  
  for (let i = 0; i < plainBytes.length; i++) {
    cipherBytes[i] = plainBytes[i] ^ stream[i];
  }
  return bytesToBase64Url(cipherBytes);
}

// Decrypt ciphertext (supporting both legacy Hex and Base64url) using password
export function decrypt(ciphertext: string, password: string): string {
  let cipherBytes: Uint8Array;
  // If it's a valid hex string, decrypt as hex for backward compatibility
  if (/^[0-9a-fA-F]+$/.test(ciphertext)) {
    cipherBytes = hexToBytes(ciphertext);
  } else {
    cipherBytes = base64UrlToBytes(ciphertext);
  }

  const stream = deriveKeyStream(password, cipherBytes.length);
  const plainBytes = new Uint8Array(cipherBytes.length);
  
  for (let i = 0; i < cipherBytes.length; i++) {
    plainBytes[i] = cipherBytes[i] ^ stream[i];
  }
  return bytesToString(plainBytes);
}
