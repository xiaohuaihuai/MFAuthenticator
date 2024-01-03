import CryptoJS from 'crypto-js';
import { KeyUriFormat } from './otpauth';
import { Payload } from './migration';

function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const byteArray = new Uint8Array(wordArray.words.length * 4);
  
    let offset = 0;
    for (let i = 0; i < wordArray.words.length; i++) {
      const word = wordArray.words[i];
      byteArray[offset++] = (word >> 24) & 0xFF;
      byteArray[offset++] = (word >> 16) & 0xFF;
      byteArray[offset++] = (word >> 8) & 0xFF;
      byteArray[offset++] = word & 0xFF;
    }
  
    return byteArray;
}

const base32Encode = (data: Uint8Array) => {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let base32 = "";
  
    let i = 0;
    let value = 0;
    let digit = 0;
    while (i < data.length) {
      value = (value << 8) | data[i++];
      digit += 8;
      while (digit >= 5) {
        base32 += base32chars[(value >>> (digit - 5)) & 31];
        digit -= 5;
      }
    }
  
    if (digit > 0) {
      base32 += base32chars[(value << (5 - digit)) & 31];
    }
  
    return base32;
};

function otpParameterToLine(otpParameter: Payload.OtpParameters): string {
    const label = otpParameter.name;
    const issuer = otpParameter.issuer;
    const secret = base32Encode(otpParameter.secret);
    const algorithm = ["SHA1", "SHA1", "SHA256", "SHA512", "MD5"][otpParameter.algorithm];
    const digits = [6, 6, 8][otpParameter.digits];
    const type = ["totp", "hotp", "totp"][otpParameter.type];
    let line = `otpauth://${type}/${label}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}`;
    if (type === "hotp") {
        const counter = otpParameter.counter ?? 0;
        line += `&counter=${counter}`;
    }
    return line;
}

function toOTPAuthURIs(migrationUri: string) {
  if (!migrationUri.startsWith("otpauth-migration:")) {
    return [];
  }
  const base64Data = decodeURIComponent(migrationUri.split("data=")[1]);
  const wordArrayData = CryptoJS.enc.Base64.parse(base64Data);
  const uint8Array = wordArrayToUint8Array(wordArrayData);
  // Deserialize from binary
  const payload:Payload = Payload.deserializeBinary(uint8Array);
  const lines = payload.otp_parameters.map(otpParameterToLine);
  return lines;
}

function toOTPAuthMigrationURI(lines: string[]) {
    const iOtpParameters = lines.map(lineToOtpParameter);

    const payload = Payload.fromObject({
        otp_parameters: iOtpParameters,
        version: 1,
        batch_size: 1,
        batch_index: 0,
        batch_id: undefined
    });

    // Serialize to binary
    const byteData: Uint8Array = payload.serializeBinary();

    const wordArray = uint8ArrayToWordArray(byteData);

    // Base64 encode the byte data
    const base64Data = CryptoJS.enc.Base64.stringify(wordArray);

    // Construct the otpauth-migration URL
    const migrationUrl = `otpauth-migration://offline?data=${encodeURIComponent(base64Data)}`;

    return migrationUrl;
}

function lineToOtpParameter(line: string): Payload.OtpParameters {
    const keyUri = KeyUriFormat.fromUri(line);

    const algorithm = algorithmMap[keyUri.algorithm] ?? 1;
    const digits = digitsMap[keyUri.digits] ?? 1;
    const type = typeMap[keyUri.type] ?? 2;
    const counter = keyUri.counter ?? 0;

    return Payload.OtpParameters.fromObject({
        secret: base32Decode(keyUri.secret),
        name: keyUri.label,
        issuer: keyUri.issuer,
        algorithm: algorithm,
        digits: digits,
        type: type,
        counter: counter
    });
}

function base32Decode(secret: string): Uint8Array {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  
    let bits = 0;
    let value = 0;
    let index = 0;
    const result = new Uint8Array(Math.ceil((secret.length * 5) / 8));
  
    for (let i = 0; i < secret.length; i++) {
      const v = base32chars.indexOf(secret[i].toUpperCase());
      if (v < 0) {
        continue;
      }
  
      value = (value << 5) | v;
      bits += 5;
  
      if (bits >= 8) {
        result[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
  
    return result;
}

function uint8ArrayToWordArray(uint8Array: Uint8Array): CryptoJS.lib.WordArray {
    const words = [];
    for (let i = 0; i < uint8Array.length; i += 4) {
        words.push(
        (uint8Array[i] << 24) |
        (uint8Array[i + 1] << 16) |
        (uint8Array[i + 2] << 8) |
        uint8Array[i + 3]
        );
    }
    return CryptoJS.lib.WordArray.create(words, uint8Array.length);
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

export {toOTPAuthURIs, toOTPAuthMigrationURI};