import moment from 'moment';

export class OtpRepository {

    public static save(code: JSON) {
        const time = moment().format('YYYYMMDDHHmmssSSS');
        code.id = time;
        code.code = "";

        let codes = wx.getStorageSync('codes') || []
        codes.unshift(code)
        wx.setStorageSync('codes', codes)
    }

    public static listAll(): Array<JSON> {
        let codes = wx.getStorageSync('codes') || []
        return codes;
    }

    public static listByType(type: string): Array<JSON> {
        let codes = wx.getStorageSync('codes') || []
        if(this.isNotEmptyString(type)){
            codes = codes.filter((item) => item.type == type);
        }
        return codes;
    }

    public static listByUri(uri: string): Array<JSON> {
        let codes = wx.getStorageSync('codes') || []
        if(this.isNotEmptyString(uri)){
            codes = codes.filter((item) => item.uri.indexOf(uri) == -1);
        }
        return codes;
    }

    public static isNotEmptyString(str: string): boolean{
        return str !== null && str !== undefined && str.trim() !== '';
    }

    public static updateByIds(codes: Array<JSON>) {
        for (const code of codes){
            this.updateById(code);
        }
    }

    public static updateById(code: JSON) {
        let codes = wx.getStorageSync('codes') || []
        let newCodes = codes.map((item) => {
            if (item.id === code.id) {
                code.code = "";
                return code;
            } else {
                item.code = "";
                return item;
            }
        });
        wx.setStorageSync('codes', newCodes)
    }

    public static removeById(id: string) {
        let codes = wx.getStorageSync('codes') || []
        const newCodes = codes.filter((item) => item.id !== id);
        wx.setStorageSync('codes', newCodes)
    }
}
