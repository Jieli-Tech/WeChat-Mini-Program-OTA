Component({
  data: {
    selected: 0,
    enable:true,
    "color": "#808080",
    "selectedColor": "#398BFF",
    list:[{
      "pagePath": "pages/pageConnect/pageConnect",
      "text": "连接",
      "iconPath": "/images/tab_icon_bt_nol@2x.png",
      "selectedIconPath": "/images/tab_icon_bt_sel@2x.png"
    },
    {
      "pagePath": "pages/pageUpdate/pageUpdate",
      "text": "升级",
      "iconPath": "/images/tab_icon_update_nol@2x.png",
      "selectedIconPath": "/images/tab_icon_update_sel@2x.png"
    },
    {
      "pagePath": "pages/pageSetting/pageSetting",
      "text": "设置",
      "iconPath": "/images/tab_icon_settle_nol@2x.png",
      "selectedIconPath": "/images/tab_icon_settle_sel@2x.png"
    }]
  },
  attached() {
  },
  methods: {
    switchTab(e) {
      if(!this.data.enable)return
      const data = e.currentTarget.dataset
      const url = data.path
      console.log("switchTab: " + url);
      wx.switchTab({url:"../../"+url})
      this.setData({
        selected: data.index
      })
    }
  }
})