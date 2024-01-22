// pages/add/add.ts
import { OtpRepository } from '../../utils/otp-repository'
import { KeyUriFormat } from '../../utils/otpauth'

Page({
    data: {
        issuer:'',
        secret:'',
        accountname:'',
        period:30,
        digits: 6,
        algorithm: 'SHA1',
        type: 'totp',
        digitsIndex: 0,
        digitsList: [6,8],
        algorithmIndex: 0,
        algorithmList: ['SHA1','SHA256','SHA512','MD5'],
        typeIndex: 0,
        typeList: ['totp','hotp']
    },
    bindDigitsChange(e: any) {
        const index = e.detail.value;
        let digitsList = this.data.digitsList;
        this.setData({
            digitsIndex: index,
            digits: digitsList[index]
        })
    },
    bindAlgorithmChange(e: any) {
        const index = e.detail.value;
        let algorithmList = this.data.algorithmList;
        this.setData({
            algorithmIndex: index,
            algorithm: algorithmList[index]
        })
    },
    bindTypeChange(e: any) {
        const index = e.detail.value;
        let typeList = this.data.typeList;
        this.setData({
            typeIndex: index,
            type: typeList[index]
        })
    },
    formSubmit(e: any){
        const formData = e.detail.value;
        // 检查必填字段
        if (!formData.issuer || !formData.secret || !formData.accountname) {
            wx.showToast({
            title: '请填写必填项',
            icon: 'none',
            duration: 2000
            });
            return;
        }
        if (formData.secret.length < 16) {
            wx.showToast({
                title: '无效的密钥',
                icon: 'none',
                duration: 2000
                });
            return;
          }
        if (
            !/^[a-z2-7]+=*$/i.test(formData.secret) &&
            !/^[0-9a-f]+$/i.test(formData.secret)
        ) {
            wx.showToast({
                title: '无效的密钥',
                icon: 'none',
                duration: 2000
                });
            return;
        }
        const label = formData.issuer + ":" + formData.accountname;
        const code:JSON = {
            type: formData.type,
            label: label,
            secret: formData.secret,
            issuer: formData.issuer,
            algorithm: formData.algorithm,
            digits: formData.digits,
            counter: 0,
            period: formData.period
        }
        const keyUriFormat = KeyUriFormat.fromJson(code);
        let otpAuthURI = keyUriFormat.toUri();
        code.uri = otpAuthURI;
        OtpRepository.save(code);

        wx.navigateTo({
            url: '../index/index'
        });
    }
})