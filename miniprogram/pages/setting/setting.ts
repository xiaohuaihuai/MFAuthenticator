// setting.ts
import { KeyUriFormat, OtpRepository } from '../../utils/otpUtils'
import qrcode from "qrcode-generator";

Page({
    data: {
        qrfade: '',
        qrcodeBgImgUrl: ''
    },
    onLoad() {
        
    },
    export() {
        this.setData({
            qrfade: 'qrfadein'
        })

        const codes = OtpRepository.listAll();
        const uriArray = codes.map(item => item.uri);
        const uris = uriArray.join(',');

        const qr = qrcode(0, "L");
        qr.addData(encodeURIComponent(uris));
        qr.make();
        const qrcodeBgImgUrl = qr.createDataURL(4, 4);
        this.setData({
            qrcodeBgImgUrl: qrcodeBgImgUrl
        })
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
    import() {
        wx.scanCode({
            scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
            success(res) {
                const uris = decodeURIComponent(res.result);
                const uriArray = uris.split(',');
                for (const uri of uriArray) {
                    const keyUri = KeyUriFormat.fromUri(uri);
                    let code = keyUri.toJson();
                    code.uri = uri;
                    OtpRepository.save(code);
                }
                wx.navigateTo({
                    url: '../index/index'
                });
            },
            fail(err) {
                console.log('scanCode fail: ', err)
            }
        })
    },
    goToSourcecodePage() {
        wx.navigateTo({
            url: '../setting/sourcecode'
        });
    }
})
