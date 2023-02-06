// components/timesSelectView/timesSelectView.ts
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    pShow:Boolean,     //展示OTA升级界面
    pStatus:Number,    //0:输入次数 1:MTU数值
    pTestNumber:Number,//测试次数
    pMtuNumer:Number,  //Mtu大小

  },

  /**
   * 组件的初始数据
   */
  data: {
    mTestNumber:0,
    mMtuNumber:0,
    
    sl_min: 23,  // 最小限制 
    sl_max: 512,   // 最大限制
  },
  observers:{
    'pTestNumber,pMtuNumer':function(n_pTestNumber,n_pMtuNumer){
      this.setData({
         mTestNumber:n_pTestNumber,
         mMtuNumber:n_pMtuNumer
      })
    }

  },
  /**
   * 组件的方法列表
   */
  methods: {
    onInputTestNumber(e: { detail: { value: any } }){
      console.log(e.detail.value)
      this.setData({
        mTestNumber:e.detail.value
      })
    },

    onSliderChanged(e:any){
      console.log(e.detail.value)
      this.setData({
        mMtuNumber:e.detail.value
      })
    },
    onSliderchanging(e:any){
      //console.log(e.detail.value)
      this.setData({
        mMtuNumber:e.detail.value
      })
    },

    onInputBack(){
      this.setData({
        mTestNumber:0
      })
    },
    onInputCancel(){
      this.triggerEvent('InputCancel',this.properties.pStatus)
    },
    onInputConfirm(){
      if(this.properties.pStatus == 0){
        const newLocal_0 = this.data.mTestNumber
        this.triggerEvent('InputTestNumber',newLocal_0)
      }else{
        const newLocal_1 = this.data.mMtuNumber
        this.triggerEvent('InputMtuNumber',newLocal_1)
      }
    },


  }
})
