// index.ts
import { OtpRepository } from '../../utils/otp-repository'
import { KeyUriFormat } from '../../utils/otpauth'
import * as URI from "../../utils/otpauth-migration";
import qrcode from "qrcode-generator";

// 获取应用实例
// const app = getApp<IAppOption>()

Page({
    data: {
        isEditing: false,
        codes: [

        ],
        qrfade: '',
        qrcodeBgImgUrl: ''
    },
    onLoad() {
        this.refreshPage();
    },
    refreshPage(){
        const codes = OtpRepository.listAll();
        this.setData({codes: codes});

        let totpCodes = OtpRepository.listByType('totp');
        // 根据 period 字段进行分组
        const groupedTotpCodes = totpCodes.reduce((result, item) => {
            const period = item.period;
            if (!result[period]) {
                result[period] = [];
            }
            result[period].push(item);
            return result;
        }, {});
        Object.entries(groupedTotpCodes).forEach(([period, codes]) => {
            this.loopRefreshTotpCodes(codes, period);
            this.loopRefreshTotpCounters(codes, period);
        });
    },
    goToSettingPage() {
        wx.navigateTo({
            url: '../setting/setting',
        })
    },
    scanCode() {
        const _this = this
        wx.scanCode({
            scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
            success(res) {
                const uri = decodeURIComponent(res.result);
                if (uri.startsWith("otpauth-migration:")) {
                    console.log("scanCode otpauth-migration:{}",uri)
                    const otpAuthURIs = URI.toOTPAuthURIs(uri);
                    console.log("scanCode otpAuthURIs:{}",otpAuthURIs)
                    for (const otpAuthURI of otpAuthURIs) {
                        const keyUri = KeyUriFormat.fromUri(otpAuthURI);
                        let code = keyUri.toJson();
                        code.uri = otpAuthURI;
                        OtpRepository.save(code);
                    }
                } 
                if (uri.startsWith("otpauth:"))  {
                    const keyUri = KeyUriFormat.fromUri(uri);
                    let code = keyUri.toJson();
                    code.uri = uri;
                    OtpRepository.save(code);
                }
                _this.refreshPage();
            },
            fail(err) {
                console.log('scanCode fail: ', err)
            }
        })
    },
    handleEdit() {
        this.setData({
            isEditing: true
        })
    },
    onIssuerChange(e: any) {
        const id = e.currentTarget.dataset.id;
        const value = e.detail.value;
        console.log('onIssuerChange', id, value);

        let codes = this.data.codes;
        let newCodes = codes.map((item) => {
            if (item.id === id) {
                item.issuer = value;
                return item;
            } else {
                return item;
            }
        });
        this.setData({
            codes: newCodes
        })
    },
    onLabelChange(e: any) {
        const id = e.currentTarget.dataset.id;
        const value = e.detail.value;
        console.log('onLabelChange', id, value);

        let codes = this.data.codes;
        let newCodes = codes.map((item) => {
            if (item.id === id) {
                item.label = value;
                return item;
            } else {
                return item;
            }
        });
        this.setData({
            codes: newCodes
        })
    },
    onCounterChange(e: any) {
        const id = e.currentTarget.dataset.id;
        const value = e.detail.value;
        console.log('onCounterChange', id, value);

        let codes = this.data.codes;
        let newCodes = codes.map((item) => {
            if (item.id === id) {
                item.counter = value;
                return item;
            } else {
                return item;
            }
        });
        this.setData({
            codes: newCodes
        })
    },
    completeEdit() {
        OtpRepository.updateByIds(this.data.codes);
        this.setData({
            isEditing: false
        })
    },
    deleteCode(e: any) {
        const id = e.currentTarget.dataset.id;
        OtpRepository.removeById(id);
        this.refreshPage();
    },
    onCopyTap(e: any) {
        var textToCopy = e.currentTarget.dataset.code;
        console.log('code:', textToCopy)
        wx.setClipboardData({
            data: textToCopy,
            success: function () {
                wx.showToast({
                    title: '复制成功',
                    icon: 'success',
                    duration: 1000
                });
            }
        });
    },
    showQR(e: any) {
        this.setData({
            qrfade: 'qrfadein'
        });
        const qrcodeurl = e.currentTarget.dataset.qrcodeurl;
        // this.setData({
        //     // qrcodeBgImgUrl: 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=L|0&chl=' + encodeURIComponent(qrcodeurl)
        //     qrcodeBgImgUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrcodeurl)
        // })
        const qr = qrcode(0, "L");
        qr.addData(encodeURIComponent(qrcodeurl));
        qr.make();
        const qrcodeBgImgUrl = qr.createDataURL(5);
        this.setData({
            qrcodeBgImgUrl: qrcodeBgImgUrl
        });
    },
    hideQR() {
        var _this = this;
        this.setData({
            qrfade: 'qrfadeout'
        })
        setTimeout(() => {
            _this.setData({
                qrfade: ''
            })
        }, 200);
    },
    async loopRefreshTotpCounters(codes: Array<JSON>, period: number) {
        var _this = this;
        var now = new Date();
        var seconds = now.getSeconds();
        let counter = period - seconds % period;
        if (counter === period) counter = 0; // 计数器从0开始

        let newCodes = codes.map((item) => {
            item.counter = counter;
            return item;
        });
        _this.refreshCounters(newCodes);
        setTimeout(() =>  {
            _this.loopRefreshTotpCounters(codes, period);
        }, 1000);
    },
    async loopRefreshTotpCodes(codes: Array<JSON>, period: number) {
        var _this = this;
        var now = new Date();
        var seconds = now.getSeconds();
        var delay = (period - seconds % period) * 1000; // 延时到下一个period(30)秒

        _this.refreshCodes(codes);

        setTimeout(() =>  {
            setInterval(() => {
                _this.loopRefreshTotpCodes(codes, period);
            }, period * 1000); // 每隔period(30)秒调用函数
        }, delay);
    },
    async refreshCodes(targetCodes: Array<JSON>) {
        for (const targetCode of targetCodes) {
            this.refreshCode(targetCode);
        }
    },
    async refreshCode(targetCode: JSON) {
        const codes = this.data.codes;
        for (let index in codes) {
            const codeItem = codes[index];
            if (targetCode.id == codeItem.id) {
                const keyUri = KeyUriFormat.fromJson(codeItem);
                const codeValue = keyUri.generateOTP();
                const codeKey = 'codes[' + index + '].code'
                this.setData({[codeKey]: codeValue});
            }
        }
    },
    async refreshCounters(targetCodes: Array<JSON>) {
        for (const targetCode of targetCodes) {
            this.refreshCounter(targetCode);
        }
    },
    async refreshCounter(targetCode: JSON) {
        const codes = this.data.codes;
        for (let index in codes) {
            const codeItem = codes[index];
            if (targetCode.id == codeItem.id) {
                const counterKey = 'codes[' + index + '].counter'
                this.setData({[counterKey]: targetCode.counter});
            }
        }
    },
    onRefreshCodeTap(e: any) {
        const code = e.currentTarget.dataset.code;
        code.counter++;
        this.refreshCode(code);
        this.refreshCounter(code);
        OtpRepository.updateById(code);
    }
})
