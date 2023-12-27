import CryptoJS from 'crypto-js';
import { KeyUriFormat } from './otpauth';

function wordArrayToByteArray(wordArray: CryptoJS.lib.WordArray) {
  const byteArray: number[] = [];
  for (let i = 0; i < wordArray.words.length; ++i) {
    const word = wordArray.words[i];
    for (let j = 3; j >= 0; --j) {
      byteArray.push((word >> (8 * j)) & 0xff);
    }
  }
  byteArray.length = wordArray.sigBytes;
  return byteArray;
}

function subByteArray(bytes: number[], start: number, length: number) {
    const subBytes: number[] = [];
    for (let i = 0; i < length; i++) {
      subBytes.push(bytes[start + i]);
    }
    return subBytes;
}

function byteArrayToBase32(bytes: number[]) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const len = bytes.length;
    let result = "";
    let high = 0,
      low = 0,
      sh = 0,
      hasDataInLow = false;
    for (let i = 0; i < len; i += 5) {
      hasDataInLow = true;
      high = 0xf8 & bytes[i];
      result += chars.charAt(high >> 3);
      low = 0x07 & bytes[i];
      sh = 2;
  
      if (i + 1 < len) {
        high = 0xc0 & bytes[i + 1];
        result += chars.charAt((low << 2) + (high >> 6));
        result += chars.charAt((0x3e & bytes[i + 1]) >> 1);
        low = bytes[i + 1] & 0x01;
        sh = 4;
      }
  
      if (i + 2 < len) {
        high = 0xf0 & bytes[i + 2];
        result += chars.charAt((low << 4) + (high >> 4));
        low = 0x0f & bytes[i + 2];
        sh = 1;
      }
  
      if (i + 3 < len) {
        high = 0x80 & bytes[i + 3];
        result += chars.charAt((low << 1) + (high >> 7));
        result += chars.charAt((0x7c & bytes[i + 3]) >> 2);
        low = 0x03 & bytes[i + 3];
        sh = 3;
      }
  
      if (i + 4 < len) {
        hasDataInLow = false;
        high = 0xe0 & bytes[i + 4];
        result += chars.charAt((low << 3) + (high >> 5));
        result += chars.charAt(0x1f & bytes[i + 4]);
        low = 0;
        sh = 0;
      }
    }
  
    if (hasDataInLow) {
      result += chars.charAt(low << sh);
    }
  
    const padlen = 8 - (result.length % 8);
    return result + (padlen < 8 ? Array(padlen + 1).join("=") : "");
}

function byteArrayToString(bytes: number[]) {
  return String.fromCharCode.apply(null, bytes);
}

function toOTPAuthURIs(migrationUri: string) {
  if (!migrationUri.startsWith("otpauth-migration:")) {
    return [];
  }
  const base64Data = decodeURIComponent(migrationUri.split("data=")[1]);
  const wordArrayData = CryptoJS.enc.Base64.parse(base64Data);
  const byteData = wordArrayToByteArray(wordArrayData);
  const lines: string[] = [];
  let offset = 0;
  while (offset < byteData.length) {
    if (byteData[offset] !== 10) {
      break;
    }
    const lineLength = byteData[offset + 1];
    const secretStart = offset + 4;
    const secretLength = byteData[offset + 3];
    const secretBytes = subByteArray(byteData, secretStart, secretLength);
    const secret = byteArrayToBase32(secretBytes);
    const accountStart = secretStart + secretLength + 2;
    const accountLength = byteData[secretStart + secretLength + 1];
    const accountBytes = subByteArray(byteData, accountStart, accountLength);
    const account = byteArrayToString(accountBytes);
    const isserStart = accountStart + accountLength + 2;
    const isserLength = byteData[accountStart + accountLength + 1];
    const issuerBytes = subByteArray(byteData, isserStart, isserLength);
    const issuer = byteArrayToString(issuerBytes);
    const algorithm = ["SHA1", "SHA1", "SHA256", "SHA512", "MD5"][
      byteData[isserStart + isserLength + 1]
    ];
    const digits = [6, 6, 8][byteData[isserStart + isserLength + 3]];
    const type = ["totp", "hotp", "totp"][
      byteData[isserStart + isserLength + 5]
    ];
    let line = `otpauth://${type}/${account}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}`;
    if (type === "hotp") {
      let counter = 0;
      if (isserStart + isserLength + 7 <= lineLength) {
        counter = byteData[isserStart + isserLength + 7];
      }
      line += `&counter=${counter}`;
    }
    lines.push(line);
    offset += lineLength + 2;
  }
  return lines;
}

function toOTPAuthMigrationURI(lines: string[]) {
    const byteData = linesToByteArray(lines);

    const wordArray = byteArrayToWordArray(byteData);
    // Base64 encode the byte data
    const base64Data = CryptoJS.enc.Base64.stringify(wordArray);

    // Construct the otpauth-migration URL
    const migrationUrl = `otpauth-migration://offline?data=${encodeURIComponent(base64Data)}`;

    return migrationUrl;
}

const algorithmMap: { [key: string]: number } = {
    "SHA1": 1,
    "SHA256": 2,
    "SHA512": 3,
    "MD5": 4
};

const digitsMap: { [key: string]: number } = {
    "6": 1,
    "8": 2
};

const typeMap: { [key: string]: number } = {
    "hotp": 1,
    "totp": 2
};

function linesToByteArray(lines: string[]) {
    const byteData: number[] = [];
    for (const line of lines) {
      const keyUri = KeyUriFormat.fromUri(line);
  
        // 将各个部分转换为字节表示
        const secretBytes = base32ToByteArray(keyUri.secret);
        const labelBytes = stringToByteArray(keyUri.label);
        const issuerBytes = stringToByteArray(keyUri.issuer);
        const algorithm = algorithmMap[keyUri.algorithm] ?? 1;
        const digits = digitsMap[keyUri.digits] ?? 1;
        const type = typeMap[keyUri.type] ?? 2;
        const counter = keyUri.counter ?? 1;

        // Add the length of the current line to the byte data
        // separator 初始值为10，每次递增8
        let lineLength = 1 + 1 + secretBytes.length // separator, secret length, secret
                            + 1 + 1 + labelBytes.length // separator, label length, label
                            + 1 + 1 + issuerBytes.length // separator, issuer length, issuer
                            + 1 + 1 // separator, algorithm
                            + 1 + 1 // separator, digits
                            + 1 + 1 ; // separator, type
        if (keyUri.type === 'hotp') {
            lineLength = lineLength + 1 + 1; // separator, counter
        }

        // Append newline character to the byte data
        byteData.push(10);
        byteData.push(lineLength);

        // 将各个部分的字节表示添加到结果字节数组
        let initData = 10;
        byteData.push(initData);
        byteData.push(secretBytes.length, ...secretBytes);

        initData = initData + 8;
        byteData.push(initData);
        byteData.push(labelBytes.length, ...labelBytes);

        initData = initData + 8;
        byteData.push(initData);
        byteData.push(issuerBytes.length, ...issuerBytes);

        initData = initData + 8;
        byteData.push(initData);
        byteData.push(algorithm);

        initData = initData + 8;
        byteData.push(initData);
        byteData.push(digits);

        initData = initData + 8;
        byteData.push(initData);
        byteData.push(type);
        
        if (keyUri.type === 'hotp') {
            initData = initData + 8;
            byteData.push(initData);
            byteData.push(counter);
        }
    }
    return byteData;
}

function base32ToByteArray(base32String: string): number[] {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bits = 5;
    let bitsCount = 0;
    let bitsBuffer = 0;
    const result: number[] = [];

    for (let i = 0; i < base32String.length; i++) {
        const char = base32String.charAt(i).toUpperCase();
        const charValue = chars.indexOf(char);

        if (charValue === -1) {
            throw new Error('Invalid character in Base32 string');
        }

        bitsBuffer = (bitsBuffer << bits) | charValue;
        bitsCount += bits;

        if (bitsCount >= 8) {
            bitsCount -= 8;
            const byte = (bitsBuffer >> bitsCount) & 0xFF;
            result.push(byte);
        }
    }

    return result;
}

function stringToByteArray(str: string) {
    const byteArray: number[] = [];
    for (let i = 0; i < str.length; ++i) {
        byteArray.push(str.charCodeAt(i));
    }
    return byteArray;
}

function byteArrayToWordArray(byteArray: number[]): CryptoJS.lib.WordArray {
    const words: number[] = [];
    for (let i = 0; i < byteArray.length; i += 4) {
        let word = 0;
        for (let j = 0; j < 4; j++) {
            if (i + j < byteArray.length) {
                word = (word << 8) | byteArray[i + j];
            }
        }
        words.push(word);
    }
    return CryptoJS.lib.WordArray.create(words, byteArray.length);
}

export {toOTPAuthURIs, toOTPAuthMigrationURI};