"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var t=[17,34,51,51,34,17],e=[6,119,95,135,145,141,212,35,0,93,241,216,207,12,20,43],a=[[119,241,86,36,126,71,27,134,189,112,142,30,59,115,22,3],[100,172,40,90,201,179,55,197,10,16,183,163,186,177,151,70],[61,5,220,102,110,246,154,248,13,88,149,103,198,170,171,236],[160,104,155,150,212,235,191,67,73,54,233,106,137,216,195,138],[148,99,153,188,123,190,193,34,187,92,113,213,31,146,87,93],[143,68,65,29,81,230,64,23,251,253,25,50,52,184,97,42],[202,35,111,218,57,247,162,1,127,214,49,231,222,128,4,221],[44,89,130,175,168,224,15,205,161,18,62,48,209,28,208,58],[51,114,46,79,144,2,19,6,117,206,135,194,239,178,173,125],[56,21,225,82,159,122,108,47,39,196,226,129,169,207,141,192],[215,223,255,96,118,20,140,94,85,9,228,8,199,66,32,252],[210,80,145,217,76,98,158,232,185,166,249,26,0,33,11,250],[53,156,78,75,105,72,203,14,200,164,91,234,132,7,180,24],[244,174,107,219,167,204,63,139,74,12,60,37,229,84,77,69],[131,237,17,240,176,83,147,242,116,38,181,157,109,124,243,45],[241,86,36,126,71,27,134,189,112,142,30,59,115,22,3,182],[172,40,90,201,179,55,197,10,16,183,163,186,177,151,70,136]],s=[1,45,226,147,190,69,21,174,120,3,135,164,184,56,207,63,8,103,9,148,235,38,168,107,189,24,52,27,187,191,114,247,64,53,72,156,81,47,59,85,227,192,159,216,211,243,141,177,255,167,62,220,134,119,215,166,17,251,244,186,146,145,100,131,241,51,239,218,44,181,178,43,136,209,153,203,140,132,29,20,129,151,113,202,95,163,139,87,60,130,196,82,92,28,232,160,4,180,133,74,246,19,84,182,223,12,26,142,222,224,57,252,32,155,36,78,169,152,158,171,242,96,208,108,234,250,199,217,0,212,31,110,67,188,236,83,137,254,122,93,73,201,50,194,249,154,248,109,22,219,89,150,68,233,205,230,70,66,143,10,193,204,185,101,176,210,198,172,30,65,98,41,46,14,116,80,2,90,195,37,123,138,42,91,240,6,13,71,111,112,157,126,16,206,18,39,213,76,79,214,121,48,104,54,117,125,228,237,128,106,144,55,162,94,118,170,197,127,61,175,165,229,25,97,253,77,124,183,11,238,173,75,34,245,231,115,35,33,200,5,225,102,221,179,88,105,99,86,15,161,49,149,23,7,58,40],i=[128,0,176,9,96,239,185,253,16,18,159,228,105,186,173,248,192,56,194,101,79,6,148,252,25,222,106,27,93,78,168,130,112,237,232,236,114,179,21,195,255,171,182,71,68,1,172,37,201,250,142,65,26,33,203,211,13,110,254,38,88,218,50,15,32,169,157,132,152,5,156,187,34,140,99,231,197,225,115,198,175,36,91,135,102,39,247,87,244,150,177,183,92,139,213,84,121,223,170,246,62,163,241,17,202,245,209,23,123,147,131,188,189,82,30,235,174,204,214,53,8,200,138,180,226,205,191,217,208,80,89,63,77,98,52,10,72,136,181,86,76,46,107,158,210,61,60,3,19,251,151,81,117,74,145,113,35,190,118,42,95,249,212,85,11,220,55,49,22,116,215,119,167,230,7,219,164,47,70,243,97,69,103,227,12,162,59,28,133,24,4,29,41,160,143,178,90,216,166,126,238,141,83,75,161,154,193,14,122,73,165,44,129,196,199,54,43,127,67,149,51,242,108,104,109,240,2,40,206,221,155,234,94,153,124,20,134,207,229,66,184,64,120,45,58,233,100,31,146,144,125,57,111,224,137,48];function r(t){for(var e,a=0,s=0;s<8;s++)e=(t[a]<<1)+t[a+1]&255,t[a+1]=t[a]+t[a+1]&255,t[a]=e,a+=2}function h(t){for(var e=new Array,a=0;a<16;a++)e[a]=t[a];t[0]=e[8],t[1]=e[11],t[2]=e[12],t[3]=e[15],t[4]=e[2],t[5]=e[1],t[6]=e[6],t[7]=e[5],t[8]=e[10],t[9]=e[9],t[10]=e[14],t[11]=e[13],t[12]=e[0],t[13]=e[7],t[14]=e[4],t[15]=e[3]}function n(t){for(var e,a=0;a<17;a++)e=t[a]>>>5&255,t[a]=t[a]<<3&255,t[a]=t[a]+e&255}function c(t,e){for(var s,i=new Array,r=new Array,h=0;h<17;h++)for(var c=0;c<16;c++)e[h][c]=0;i[16]=0;for(h=0;h<16;h++)i[h]=t[h],i[16]=i[16]^i[h];for(h=0;h<16;h++)e[0][h]=i[h],r[h]=i[h];r[16]=i[16];for(h=0;h<16;h++){n(r),s=h+1;for(c=0;c<16;c++)e[h+1][c]=r[s]+a[h+1][15-c]&255,++s>16&&(s=0)}}function u(t,e,a){for(var n,c=e,u=0;u<16;u++)switch(u){case 0:case 3:case 4:case 7:case 8:case 11:case 12:case 15:c[u]=255&(c[u]^a[2*t][u]);break;default:c[u]=c[u]+a[2*t][u]&255}(n=c)[0]=s[n[0]],n[3]=s[n[3]],n[4]=s[n[4]],n[7]=s[n[7]],n[8]=s[n[8]],n[11]=s[n[11]],n[12]=s[n[12]],n[15]=s[n[15]],n[1]=i[n[1]],n[2]=i[n[2]],n[5]=i[n[5]],n[6]=i[n[6]],n[9]=i[n[9]],n[10]=i[n[10]],n[13]=i[n[13]],n[14]=i[n[14]];for(u=0;u<16;u++)switch(u){case 0:case 3:case 4:case 7:case 8:case 11:case 12:case 15:c[u]=c[u]+a[2*t+1][u]&255;break;default:c[u]=255&(c[u]^a[2*t+1][u])}r(c),h(c),r(c),h(c),r(c),h(c),r(c)}function o(t,e,a){for(var s=new Array,i=0;i<16;i++)s[i]=t[i];for(var r=0;r<8;r++){if(2==r&&a)for(var h=0;h<16;h++)switch(h){case 0:case 3:case 4:case 7:case 8:case 11:case 12:case 15:t[h]=255&(s[h]^t[h]);break;default:t[h]=s[h]+t[h]&255}u(r,t,e)}for(h=0;h<16;h++)switch(h){case 0:case 3:case 4:case 7:case 8:case 11:case 12:case 15:t[h]=255&(t[h]^e[16][h]);break;default:t[h]=t[h]+e[16][h]&255}}function f(a){var s=new Array,i=new Uint8Array(17);i[0]=1,function(t,e,a,s,i){for(var r=new Array,h=new Array,n=0,u=s-1,f=new Array,l=0;l<17;l++)f[l]=new Array;for(var d=0;d<16;d++)r[d]=t[n],++n>u&&(n=0);for(d=0;d<16;d++)i[d]=e[d];for(c(a,f),o(i,f,0),d=0;d<16;d++)i[d]=i[d]^e[d],i[d]=i[d]+r[d]&255;h[0]=a[0]+233&255,h[1]=229^a[1],h[2]=a[2]+223&255,h[3]=193^a[3],h[4]=a[4]+179&255,h[5]=167^a[5],h[6]=a[6]+149&255,h[7]=131^a[7],h[8]=233^a[8],h[9]=a[9]+229&255,h[10]=223^a[10],h[11]=a[11]+193&255,h[12]=179^a[12],h[13]=a[13]+167&255,h[14]=149^a[14],h[15]=a[15]+131&255,c(h,f),o(i,f,1)}(t,a,e,6,s);for(var r=1;r<i.byteLength;r++)i[r]=s[r-1];return i}exports.Auth=class{constructor(){this.authing=!1,this.authed=!1,this.authDeviceId=null,this.timeoutTaskId=-1,this.authTime=0,this.callback=null}startAuth(t,e){this.authDeviceId=t,this.callback=e,this.authed=!1,this.authing=!0;let a=new Uint8Array(17),s=new Array(a.byteLength);for(let t=1;t<a.byteLength;t++)a[t]=Math.round(255*Math.random()),s[t-1]=a[t];f(s),this._writeAuthData(a.buffer)}handlerAuth(t,e){if(this.authing&&t!=this.authDeviceId)return;let a=new DataView(e);if(0==a.getUint8(0)){this._stopTimeoutTask();let t=new Array(a.byteLength);for(let e=1;e<t.length;e++)t[e-1]=a.getUint8(e);let e=f(t);this._writeAuthData(e.buffer)}else if(1==a.getUint8(0)&&17==a.byteLength){this._stopTimeoutTask();let t=new Uint8Array(5);t[0]=2,t[1]=112,t[2]=97,t[3]=115,t[4]=115,this._writeAuthData(t.buffer)}else 2==a.getUint8(0)&&5==a.byteLength&&(this._stopTimeoutTask(),!function(t){let e=[2,112,97,115,115],a=new DataView(t);for(let t=0;t<a.byteLength;t++){let s=a.getUint8(t);if(e[t]!=s)return!1}return!0}(e)?this._onAuthFailed(this.authDeviceId):(this._onAuthSuccess(this.authDeviceId),this.authed=!0))}_writeAuthData(t){this.authDeviceId&&(this.callback?.onSendData(this.authDeviceId,t),this._startTimeoutTask())}_stopTimeoutTask(){clearTimeout(this.timeoutTaskId)}_startTimeoutTask(){this.timeoutTaskId=setTimeout((()=>{this._onAuthFailed(this.authDeviceId)}),5e3)}_onAuthSuccess(t){this.authing=!1,null!=t&&this.callback?.onAuthSuccess(t)}_onAuthFailed(t){this.authing=!1,null!=t&&this.callback?.onAuthFailed(t)}};
//# sourceMappingURL=jl_auth_2.0.0.js.map
