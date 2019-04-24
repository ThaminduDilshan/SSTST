import { Component, Injectable, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { MediaCapture, CaptureVideoOptions, MediaFile } from '@ionic-native/media-capture';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { UniqueDeviceID } from '@ionic-native/unique-device-id';
import { Toast } from '@ionic-native/toast';
import { Base64 } from '@ionic-native/base64';
import { Http, Headers, RequestOptions } from '@angular/http';
import { TextToSpeech } from '@ionic-native/text-to-speech';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
@Injectable()
export class HomePage {
  private client_id: string;
  
  @ViewChild('myvideo') myvideo: any;
  // mediaFiles = [];
  // videoFile: any;
  videoURL: any;
  pathToBeFramed: any;
  videoDuration: number = 1;
  noOfFrames: number = 0;
  thumbnailPath: string = null;
  isVideoSelected: boolean = false;
  
  frame_requests = [];     // sent image_names will be here
  predictions = [];       // received predictions will be here
  pred_text_all = '';     // final text will be here
  pred_voice_all = '';     // final voice script will be here

  constructor(public navCtrl: NavController, private mediaCapture: MediaCapture,
    private videoEditor: VideoEditor, private uniqueDeviceID: UniqueDeviceID,
    private toast: Toast, private base64: Base64, private http: Http, private tts: TextToSpeech
  ) {

  }

  ionViewDidLoad() {
    // get an id to uniquely identify client in the server
    this.uniqueDeviceID.get().then( (uuid) => {
      console.log("Client ID : ", uuid);
      this.client_id = uuid;
    }).catch( (err) => {
      console.log("Client ID Error : ", err);
    });

  }


  captureVideo() {                                              // capture new video using device camera
    let options: CaptureVideoOptions = {
      limit: 1,
      duration: 120   // not supported yet
    }
    this.mediaCapture.captureVideo(options).then((res: MediaFile[]) => {

      this.pathToBeFramed = res[0].fullPath;
      let videoData = JSON.stringify(res);
      let res1 = JSON.parse(videoData);
      this.videoURL = res1[0]['fullPath'];
      
      let video = this.myvideo.nativeElement;
      video.src =  this.videoURL;
      video.play();
      
    }, (err) => {
      console.log("ERROR", "error selecting video");
    });
  }


  async getDurationandFrame() {                                  // get duration and devide video into frames
    this.frame_requests = [];

    for(var i=0; i<=Number(this.videoDuration); i++) {
      var option: CreateThumbnailOptions = {
        fileUri: this.pathToBeFramed,
        outputFileName: 'capture'+i,
        atTime: i,        // frame-rate (1 s)
        // width: 320,
        // height: 480,
        quality: 100
      };
      
      console.log("framing at "+i+"s");
      
      this.videoEditor.createThumbnail(option).then(async res=>{
        this.thumbnailPath = res;
      }).catch(err=>{
        console.log("Framing Error", err)
      });

      this.noOfFrames += 1;

    }
  
  }


  async getExecute(event) {
    this.isVideoSelected = true;
    this.videoDuration = Number(event.target.duration);
    this.noOfFrames = 0;

    this.getDurationandFrame();
    // load controller -> processing
    await this.delay( Number(this.videoDuration) * 70 );   // 70 ms wait for 1s, 4.2s wait for 1 min
    this.readImages();
    // load controller -> dismiss()
    
  }


  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }


  async uploadImage_Json(image, image_name) {
    let headers = new Headers(
      { 'Content-Type' : 'application/json' }
    );

    let data = JSON.stringify(
      {
        client_id: this.client_id,
        image: image,
        image_name: image_name
      }
    );

    let options = new RequestOptions({headers: headers});

    return new Promise(async (resolve, reject) => {
      this.http.post('http://35.243.251.84:5000/predict', data, options).toPromise().then(
        async (res) => {
          var response = res.json().split(':');
          console.log("RESPONSE : ", response);
          if( response[0].toString() == 'received' ) {
            this.frame_requests.push( [response[1].toString(), 0] )        // [image_name, retries]
          }
          resolve(res.json());
        }
      ).catch(
        (err) => {
          console.log('API Error : ', JSON.stringify(err));
          reject(err.json());
        }
      );
    });

  }


  async readFile(filepath, filename) {

    return new Promise(async resolve => {
      this.base64.encodeFile(filepath+'/'+filename+'.jpg').then(async (base64String: string) => {
        let imageSrc = [ base64String.split(",")[1] , filename];
        resolve(imageSrc);
      });
    });

    
  }
  

  async readImages() {
      // get thubnail path
      var arr = String(this.thumbnailPath).split('/');
      arr.pop();
      var path = '';
      for(var i=1; i<arr.length; i++) {
        path = path + '/' + arr[i];
      }
      path = path + '/';

      // read content on each image
      for(var i=0; i<this.noOfFrames; i++) {
        var img_name = 'capture' + i;

        var result;
        this.readFile(path, img_name).then(async res => {
          result = res[0];
          var res_img_name = res[1];
          if(result===undefined) {
            console.log("undefined")
          } else {
            await this.uploadImage_Json(result, res_img_name).then(res=>{
              
            }).catch(async err => {
              console.log("API Error :: 1");
              this.toast.show(`Server not responding`, '3000', 'bottom').subscribe(
                toast => { console.log(toast); }
              );
            });
          }
          
        });
      }
    
  }


  async sendPredRequests(image_name) {      // send given prediction request to server
    let headers = new Headers(
      { 'Content-Type' : 'application/json' }
    );

    let data = JSON.stringify(
      {
        client_id: this.client_id,
        image_name: image_name
      }
    );

    let options = new RequestOptions({headers: headers});

    return new Promise(async (resolve, reject) => {
      this.http.post('http://35.243.251.84:5000/check', data, options).toPromise().then(
        async (res) => {
          console.log('API Response : ', res.json());
          resolve(res.json());
        }
      ).catch(
        (err) => {
          console.log('API Error : ', JSON.stringify(err));
          reject(err.json());
        }
      );
    });

  }


  async requestPredictions() {
    return new Promise(async (resolve, reject) => {
      if(this.videoDuration < this.noOfFrames) {
        this.predictions = [];
        this.pred_text_all = '';
        this.pred_voice_all = '';

        while(true) {
          if(this.frame_requests.length != 0) {               // [image_name, retries]
            var ele = this.frame_requests.shift();
            if(ele[1] < 6) {     // maximum 6 request send to the server
              var waittime = Number(ele[1]);
              if(ele[1] < 4) {    // if haven't attempted 4 times, wait only 1s
                waittime = 1;
              }
              if(waittime != 0) {     // wait (1 x retries) s
                await this.delay(waittime * 1000);
              }
              this.sendPredRequests(ele[0]).then(async res => {
                if(res.toString()=='wait') {      // If server haven't processed yet
                  this.frame_requests.push( [ele[0], ele[1]+1] );
                }else if(res.toString()=='none') {        //prediction accuracy < 50
                  this.predictions.push( res );
                }
                else{
                  this.predictions.push( res );       // [image_name, prediction]
                }
              }).catch(async err => {
                console.log("API Error :: 2");
                this.toast.show(`Server not responding`, '3000', 'bottom').subscribe(
                  toast => { console.log(toast); }
                );
              });
            }else {
              this.predictions.push( [ele[0], 'none'] );
            }
  
          } else{

            resolve(true);
            break;
          }
        }
  
      } else {
        reject(false);
      }

    });
    
  }


  async evaluate() {
    this.requestPredictions().then(async res => {
      if(res) {
        await this.delay(1000);
        console.log("=== @@@@@@@@@@@ ===", this.predictions);

        var pred1, pred2, pred3;
        var i = 0;
        while( i < this.noOfFrames-2 ) {
          console.log("[INFO] : for : " + String(i) );
          pred1 = await this.getPred( 'capture' + String(i) );
          pred2 = await this.getPred( 'capture' + String(i+1) );
          pred3 = await this.getPred( 'capture' + String(i+2) );

          if(pred1=='undefined') {
            i += 1;
            // continue;
          }else if(pred1!='none') {
            if( String(pred1).includes('_') ) {      // dynamic sign
              // var dyn_res = this.getIfDynamic(pred1, pred2, pred3);
              await this.getIfDynamic(pred1, pred2, pred3).then(async res => {
                if( String(res).includes("_") ) {     // if dynamic
                  this.pred_text_all += String(res).split('_')[0] + " ";
                  i += 3;
                } else {      // not dynamic
                  this.pred_text_all += String(res) + " ";
                  i += 1;
                }
              });

            } else {      // static sign
              this.pred_text_all += String(pred1) + " ";
              i += 1;
            }
          } else {
            i += 1;
          }

        }

        console.log("FINAL TEXT : ", this.pred_text_all);

        await this.getVoiceScript().then(async res => {
          this.pred_voice_all = String(res);
        });

      }
    });
  }

  async getIfDynamic(pred1, pred2, pred3) {              // check for dynamic sign
    return new Promise(async (resolve,reject) => {
      if( String(pred1).includes('&') ) {          // if contains '&'
        var arr = String(pred1).split('&');
        var static_part = '';

        arr.forEach(ele => {
          if( ele.includes('_') ) {
            if(pred2!=undefined && pred3!=undefined) {
              if( String(pred2).includes( ele.split('_')[0] ) ) {
                if( String(pred3).includes( ele.split('_')[0] ) ) {      // it's dynamic
                  resolve(ele);
                  return;
                  // return ele.split('_')[0];
                }
              }
            }
          } else {
            static_part = ele;
          }
        });

        if(static_part != '') {      // not dynamic
          resolve(static_part);
          return;
          // return static_part;
        }

      } else {          // string doesn't contains '&' (only dynamic possibility)
        if( String(pred1).includes('_') ) {
          if(pred2!=undefined && pred3!=undefined) {
            if( String(pred2).includes( String(pred1).split('_')[0] ) ) {
              if( String(pred3).includes( String(pred1).split('_')[0] ) ) {      // it's dynamic
                resolve(String(pred1));
                return;
                // return String(pred1).split('_')[0];
              }
            }
          }

        }
      }
    });

  }


  async getPred(searchkey:string) {       // get given element from the prediction list
    for(var i=0; i<this.predictions.length; i++) {
      if( searchkey == (this.predictions[i])[0] ) {
        return(this.predictions[i][1]);
      }
    }
    
  }


  async getVoiceScript() {          // get voice script from the server
      let headers = new Headers(
        { 'Content-Type' : 'application/json' }
      );
  
      let data = JSON.stringify(
        {
          client_id: this.client_id,
          text: this.pred_text_all
        }
      );
  
      let options = new RequestOptions({headers: headers});
  
      return new Promise(async (resolve, reject) => {
        this.http.post('http://35.243.251.84:5000/voice', data, options).toPromise().then(
          async (res) => {
            console.log('API Voice Response : ', res.json());
            resolve(res.json());
          }
        ).catch(
          (err) => {
            console.log('API Error : ', JSON.stringify(err));
            reject(err.json());
          }
        );
      });

  }


  playVoice() {           // play audio if script defined
    if( this.pred_voice_all != '' ) {
      this.tts.speak(this.pred_voice_all).then(() => {
        console.log('Success');
      }).catch((reason: any) => {
        console.log(reason);
      });
    }
    
  }

}
