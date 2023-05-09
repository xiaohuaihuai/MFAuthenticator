// index.ts
import { generateOTP } from '../../utils/otpUtils'

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
  handleEdit(){
    this.setData({
        isEditing: !this.data.isEditing
      })
  },
  deleteCode(e: any){
    const index = e.currentTarget.dataset.index;
    let codes = wx.getStorageSync('codes')
    const newCodes = codes.filter((item: { index: any; }) => item.index !== index);
    wx.setStorageSync('codes', newCodes)
    this.setData({
        codes: newCodes
      })
    this.refreshCodes();
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs',
    })
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
  scanCode() {
    const _this = this
    wx.scanCode({
      scanType: ['barCode', 'qrCode', 'datamatrix', 'pdf417'],
      success(res) {
        let codes = _this.data.codes || []

        const url = decodeURIComponent(res.result); // 'otpauth://totp/UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'
        const path = url.split('/').pop(); // 'UPMS:yangqiuhua?secret=ELEUOFYQHZNTDOWK&issuer=UPMS'
        const pathWithoutParams = path.split('?')[0]; // 'UPMS:yangqiuhua'
        
        const queryString = url.split("?")[1];
        const params = {};
        if (queryString) {
        const queryArray = queryString.split("&");
        queryArray.forEach((item) => {
            const [key, value] = item.split("=");
            params[key] = value;
        });
        }

        var secret = params.secret;
        var issuer = params.issuer;
        var username = pathWithoutParams;
        if (pathWithoutParams.indexOf(':') != -1) {
            issuer = pathWithoutParams.split(':')[0];
            username = pathWithoutParams.split(':')[1];
        }
        const code = {
            "index" : codes.length,
            "issuer": issuer,
            "username": username,
            "code": "",
            "secret": secret,
            "url": url
        }
        
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
      success: function() {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1000
        });
      }
    });
  },
  showQR(e: any) {
    var _this = this;
    this.setData({
        qrfade: 'qrfadein'
    })
    const qrcodeurl = e.currentTarget.dataset.qrcodeurl;
    this.setData({
        qrcodeBgImgUrl: 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=L|0&chl='+encodeURIComponent(qrcodeurl)
    })
  },
  hideQR(){
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
    let count = 30 - seconds % 30;
    if (count === 30) count = 0; // 计数器从0开始
    this.setData({
        counter : count
    })
    setTimeout(this.autoRefreshCounter, 1000);
  },
  autoRefreshCodes() {
    var _this = this;
    _this.refreshCodes(); // 首次调用函数
    var now = new Date();
    var seconds = now.getSeconds();
    var delay = (30 - seconds % 30) * 1000; // 延时到下一个30秒
    setTimeout(function() {
        _this.refreshCodes();
      setInterval(_this.refreshCodes, 30000); // 每隔30秒调用函数
    }, delay);
  },
  refreshCodes(){
    // 展示本地存储能力
    const codes = this.data.codes;
    for (let index in codes) {
        const codeItem = codes[index];
        const code = generateOTP(codeItem.secret);
        const key = 'codes['+index+'].code'
        this.setData({
            [key] : code
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
