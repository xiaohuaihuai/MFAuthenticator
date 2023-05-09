import CryptoJS from 'crypto-js';

class KeyUtils {
    public static dec2hex(s: number): string {
      return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
    }

    public static leftpad(str: string, len: number, pad: string): string {
        if (len + 1 >= str.length) {
          str = new Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
    }

    public static base32tohex(base32: string): string {
        const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        let hex = "";
        let padding = 0;
    
        for (let i = 0; i < base32.length; i++) {
          if (base32.charAt(i) === "=") {
            bits += "00000";
            padding++;
          } else {
            const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += this.leftpad(val.toString(2), 5, "0");
          }
        }
    
        for (let i = 0; i + 4 <= bits.length; i += 4) {
          const chunk = bits.substr(i, 4);
          hex = hex + Number(`0b${chunk}`).toString(16);
        }
    
        // if (hex.length % 2 && hex[hex.length - 1] === '0') {
        //   hex = hex.substr(0, hex.length - 1);
        // }
        switch (padding) {
          case 0:
            break;
          case 6:
            hex = hex.substr(0, hex.length - 8);
            break;
          case 4:
            hex = hex.substr(0, hex.length - 6);
            break;
          case 3:
            hex = hex.substr(0, hex.length - 4);
            break;
          case 1:
            hex = hex.substr(0, hex.length - 2);
            break;
          default:
            throw new Error("Invalid Base32 string");
        }
    
        return hex;
    }
}

export const generateOTP = (secret: string, algorithm: string = 'SHA1') => {
    const key = KeyUtils.base32tohex(secret); // 将密钥转换成Base32格式
  
    const counter = Math.floor(new Date().getTime() / 1000 / 30); // 时间戳，以30秒为时间窗口
    const time = KeyUtils.leftpad(KeyUtils.dec2hex(counter), 16, "0");

    // 根据算法名称选择相应的哈希算法
    let hash;
    if (algorithm === 'SHA256') {
      hash = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(time), CryptoJS.enc.Hex.parse(key));
    } else if (algorithm === 'SHA512') {
      hash = CryptoJS.HmacSHA512(CryptoJS.enc.Hex.parse(time), CryptoJS.enc.Hex.parse(key));
    } else {
      hash = CryptoJS.HmacSHA1(CryptoJS.enc.Hex.parse(time), CryptoJS.enc.Hex.parse(key));
    }
  
    const hex = hash.toString(CryptoJS.enc.Hex);
    const offset = parseInt(hex.charAt(hex.length - 1), 16);
    const binary =((parseInt(hex.substr(offset * 2, 8), 16) & 0x7fffffff) + "").substr(-6) +"";// 取哈希值的前6位作为验证码
    const code = binary.padStart(6, "0");//不足6位左边补0
    return code;
}