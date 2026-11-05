Component({
  data: {
    selected: 0,
    enable:true,
    "color": "#808080",
    "selectedColor": "#398BFF",
    list:[{
      "pagePath": "pages/pageConnect/pageConnect",
      "text": "连接",
      "iconPath": "/images/tab_icon_bt_nol.png",
      "selectedIconPath": "/images/tab_icon_bt_sel.png"
    },
    {
      "pagePath": "pages/pageUpdate/pageUpdate",
      "text": "升级",
      "iconPath": "/images/tab_icon_update_nol.png",
      "selectedIconPath": "/images/tab_icon_update_sel.png"
    },
    {
      "pagePath": "pages/pageSetting/pageSetting",
      "text": "设置",
      "iconPath": "/images/tab_icon_settle_nol.png",
      "selectedIconPath": "/images/tab_icon_settle_sel.png"
    }]
  },
  attached() {
  },
  methods: {
    switchTab(e) {
      if(!this.data.enable)return
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url:"../../"+url})
      this.setData({
        selected: data.index
      })
    }
  }
})