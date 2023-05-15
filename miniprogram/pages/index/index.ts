// index.ts
import { KeyUriFormat } from '../../utils/otpUtils'
import moment from 'moment';

// 获取应用实例
// const app = getApp<IAppOption>()

Page({
    data: {
        isEditing: false,
        codes: [

        ],
        counter: 0,
        qrfade: '',
        qrcodeBgImgUrl: '',
        userInfo: {},
        hasUserInfo: false,
        canIUse: wx.canIUse('button.open-type.getUserInfo'),
        canIUseGetUserProfile: false,
        canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName') // 如需尝试获取用户信息可改为false
    },
    onLoad() {
        // @ts-ignore
        if (wx.getUserProfile) {
            this.setData({
                canIUseGetUserProfile: true
            })
        }
        let codes = wx.getStorageSync('codes') || []
        this.setData({
            codes: codes
        })
        this.autoRefreshCodes()
        this.autoRefreshCounter()
    },
    // 事件处理函数
    goToSettingPage() {
        wx.navigateTo({
            url: '../setting/setting',
        })
    },
    handleEdit() {
        this.setData({
            isEditing: true
        })
    },
    confirmEdit() {
        wx.setStorageSync('codes', this.data.codes)
        this.setData({
            isEditing: false
        })
    },
    onIssuerChange(e: any) {
        const index = e.currentTarget.dataset.index;
        const value = e.detail.value;
        console.log('onIssuerChange', index, value);

        let codes = this.data.codes;
        let newCodes = codes.map((item) => {
            if (item.index === index) {
                item.issuer = value;
                return item;
            } else {
                return item;
            }
        });
        this.setData({
            codes: newCodes
        })
        this.refreshCodes();
    },
    onLabelChange(e: any) {
        const index = e.currentTarget.dataset.index;
        const value = e.detail.value;
        console.log('onLabelChange', index, value);

        let codes = this.data.codes;
        let newCodes = codes.map((item) => {
            if (item.index === index) {
                item.label = value;
                return item;
            } else {
                return item;
            }
        });
        this.setData({
            codes: newCodes
        })
        this.refreshCodes();
    },
    deleteCode(e: any) {
        const index = e.currentTarget.dataset.index;
        let codes = wx.getStorageSync('codes')
        const newCodes = codes.filter((item: { index: any; }) => item.index !== index);
        wx.setStorageSync('codes', newCodes)
        this.setData({
            codes: newCodes
        })
        this.refreshCodes();
    },
    scanCode() {
        const _this = this
        wx.scanCode({
            scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
            success(res) {
                let codes = _this.data.codes || []

                const uri = decodeURIComponent(res.result);
                const keyUri = KeyUriFormat.fromUri(uri); // 'otpauth://totp/UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'
                const code = keyUri.toJson();
                var time = moment().format('YYYYMMDDHHmmssSSS');
                code.index = time;
                code.uri = uri, 
                code.code = "";

                codes.unshift(code)
                wx.setStorageSync('codes', codes)
                _this.setData({
                    codes: codes
                })
                _this.refreshCodes();
            },
            fail(err) {
                console.log('scanCode fail: ', err)
            }
        })
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
        })
        const qrcodeurl = e.currentTarget.dataset.qrcodeurl;
        this.setData({
            // qrcodeBgImgUrl: 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=L|0&chl=' + encodeURIComponent(qrcodeurl)
            qrcodeBgImgUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrcodeurl)
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
    autoRefreshCounter() {
        const now = new Date() // 获取当前时间
        const seconds = now.getSeconds() // 获取当前秒数
        let counter = 30 - seconds % 30;
        if (counter === 30) counter = 0; // 计数器从0开始

        this.setData({
            counter: counter
        })
        setTimeout(this.autoRefreshCounter, 1000);
    },
    autoRefreshCodes() {
        var _this = this;
        var now = new Date();
        var seconds = now.getSeconds();
        var delay = (30 - seconds % 30) * 1000; // 延时到下一个30秒

        _this.refreshCodes();
        setTimeout(function () {
            setInterval(_this.refreshCodes, 30000); // 每隔30秒调用函数
        }, delay);
    },
    refreshCodes() {
        // 展示本地存储能力
        const codes = this.data.codes;
        for (let index in codes) {
            const codeItem = codes[index];
            const keyUri = KeyUriFormat.fromJson(codeItem);
            const code = keyUri.generateOTP();
            const key = 'codes[' + index + '].code'
            this.setData({
                [key]: code
            })
        }
    },
    getUserProfile() {
        // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
        wx.getUserProfile({
            desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
            success: (res) => {
                console.log(res)
                this.setData({
                    userInfo: res.userInfo,
                    hasUserInfo: true
                })
            }
        })
    },
    getUserInfo(e: any) {
        // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
        console.log(e)
        this.setData({
            userInfo: e.detail.userInfo,
            hasUserInfo: true
        })
    }
})
