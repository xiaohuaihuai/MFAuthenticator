// setting.ts
import { OtpRepository } from '../../utils/otp-repository'
import { KeyUriFormat } from '../../utils/otpauth'
import * as URI from "../../utils/otpauth-migration";
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
        const otpAuthMigrationURI = URI.toOTPAuthMigrationURI(uriArray);
        console.log("export otpauth-migration:{}", otpAuthMigrationURI)

        /**
            qrcode(typeNumber, errorCorrectionLevel) 
            Param	Type	Description
            typeNumber	number	Type number (1 ~ 40), or 0 for auto detection.
            errorCorrectionLevel	string	Error correction level ('L', 'M', 'Q', 'H')
         */
        const qr = qrcode(0, "L");
        qr.addData(otpAuthMigrationURI);
        qr.make();
        /**
            createDataURL(cellSize, margin)
            Param	Type	Description
            cellSize	number	default: 2
            margin	number	default: cellSize * 4
         */
        const qrcodeBgImgUrl = qr.createDataURL(3, 12);
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
                const uri = decodeURIComponent(res.result);
                if (uri.startsWith("otpauth-migration:")) {
                    console.log("import otpauth-migration:{}", uri)
                    const otpAuthURIs = URI.toOTPAuthURIs(uri);
                    console.log("import otpAuthURIs:{}",otpAuthURIs)
                    for (const otpAuthURI of otpAuthURIs) {
                        const keyUri = KeyUriFormat.fromUri(otpAuthURI);
                        let code = keyUri.toJson();
                        code.uri = otpAuthURI;
                        OtpRepository.save(code);
                    }
                }
                if (uri.startsWith("otpauth:")) {
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
