// components/otaProgressView.ts
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    pShow:Boolean,     //展示OTA升级界面
    pValue:Number,        //进度
    pNumber:Number,       //完成次数
    pTimes:Number,        //测试总次数
    pOtaFile:String,      //OTA文件名
    pFailReason:String,   //失败原因 
    pOtaResult:Number,    //0:成功 1:失败
    pStatus:Number        //0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败
  },

  /**
   * 组件的初始数据
   */
  data: {
    otaBgHeight:400
  },
  observers:{
    'pTimes,pStatus':function(n_pTimes, n_pStatus){
        if(n_pTimes > 1){
          if(n_pStatus > 2){
            this.setData({ otaBgHeight:500 })
          }else{
            this.setData({ otaBgHeight:400 })
          }
        }else{
          if(n_pStatus > 2){
            this.setData({ otaBgHeight:370 })
          }else{
            this.setData({ otaBgHeight:270 })
          }
        }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onOtaViewConfirm(){
      this.triggerEvent('OnConfirm')
    }
  }
})
