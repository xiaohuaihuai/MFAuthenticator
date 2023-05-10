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

export class KeyUriFormat {
    type: string;
    label: string;
    secret: string;
    issuer: string;
    algorithm: string;
    digits: number;
    counter: number;
    period: number;

    constructor(type: string = 'totp', label: string,
        secret: string, issuer: string, algorithm: string = 'SHA1',
        digits: number = 6, counter: number, period: number) {
        this.type = type;
        this.label = label;
        this.secret = secret;
        this.issuer = issuer;
        this.algorithm = algorithm;
        this.digits = digits;
        this.counter = counter;
        this.period = period;
    }

    static fromUri(uri: string): KeyUriFormat {
        // 从uri中解析出各个参数，并创建KeyUriFormat对象返回
        uri = decodeURIComponent(uri); // 'otpauth://totp/UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'
        uri = uri.replace('otpauth://', '');// 'totp/UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'
        var uriSplit = uri.split('/');
        const type = uriSplit[0]; // 'totp'
        const labelAndParameters = uriSplit[1]; // 'UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'

        const labelAndParametersSplit = labelAndParameters.split('?');
        const label = labelAndParametersSplit[0]; // 'UPMS:yangqiuhua'

        const queryString = labelAndParametersSplit[1];
        const params = {};
        if (queryString) {
            const queryArray = queryString.split("&");
            queryArray.forEach((item) => {
                const [key, value] = item.split("=");
                params[key] = value;
            });
        }

        const secret = params.secret ?? '';
        const issuer = params.issuer ?? '';
        const algorithm = params.algorithm ?? 'SHA1';
        const digits = Number(params.digits ?? 6);
        const counter = Number(params.counter ?? 0);
        const period = Number(params.period ?? 30);
        return new KeyUriFormat(type, label, secret, issuer, algorithm, digits, counter, period);
    }

    toUri(): string {
        const query: Record<string, string> = {
            secret: this.secret,
            issuer: this.issuer,
            algorithm: this.algorithm,
            digits: String(this.digits),
            counter: String(this.counter),
            period: String(this.period)
        };

        const parameters = Object.keys(query)
            .map(key => `${key}=${encodeURIComponent(query[key])}`)
            .join('&');

        return `otpauth://${this.type}/${this.label}?${parameters}`;
    }
}

export class OtpGenerator {
    private keyUri: KeyUriFormat;

    constructor(keyUri: KeyUriFormat) {
        this.keyUri = keyUri;
    }

    public generateOTP(): string {
        let counter = Math.floor(new Date().getTime() / 1000 / this.keyUri.period); // timeCounter 时间戳，以30秒为时间窗口
        if (this.keyUri.type === 'hotp') {
            counter = this.keyUri.counter; // eventCounter
        }

        const message = CryptoJS.enc.Hex.parse(KeyUtils.leftpad(KeyUtils.dec2hex(counter), 16, "0"));
        const key = CryptoJS.enc.Hex.parse(KeyUtils.base32tohex(this.keyUri.secret)); // 将密钥转换成Base32格式

        let hmac;
        if (this.keyUri.algorithm === 'SHA256') {
            hmac = CryptoJS.HmacSHA256(message, key);
        } else if (this.keyUri.algorithm === 'SHA512') {
            hmac = CryptoJS.HmacSHA512(message, key);
        } else {
            hmac = CryptoJS.HmacSHA1(message, key);
        }

        const code = this.truncate(hmac);
        return this.padCode(code);
    }

    private padCode(code: string): string {
        while (code.length < this.keyUri.digits) {
            code = '0' + code;
        }
        return code;
    }

    private truncate(hmac: CryptoJS.lib.WordArray): string {
        const hex = hmac.toString(CryptoJS.enc.Hex);
        const offset = parseInt(hex.charAt(hex.length - 1), 16);
        const binary = ((parseInt(hex.substr(offset * 2, 8), 16) & 0x7fffffff) + "").substr(-this.keyUri.digits) + "";
        return binary;
    }
}

export const generateOTP = (type: string = 'totp', label: string,
    secret: string, issuer: string, algorithm: string = 'SHA1',
    digits: number = 6, counter: number = 0, period: number = 30) => {
    return new OtpGenerator(new KeyUriFormat(type, label, secret, issuer, algorithm, digits, counter, period)).generateOTP();
}
