const TAG = "晶一对讲机"

  function formatLog( msg) {
    let date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    const mill = date.getMilliseconds()
  
    let timeString = `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second,mill].map(formatNumber).join(':')}`

  	return timeString + ":" + TAG + "-->" + msg;
  }
  const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : `0${n}`
  }
  
  export function log( msg) {
  	console.log(formatLog( msg));
  }


 
