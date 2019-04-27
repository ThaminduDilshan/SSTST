import { Component, Injectable, ViewChild } from '@angular/core';
import { NavController, LoadingController, Loading } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { MediaCapture, CaptureVideoOptions, MediaFile } from '@ionic-native/media-capture';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { UniqueDeviceID } from '@ionic-native/unique-device-id';
import { Toast } from '@ionic-native/toast';
import { Base64 } from '@ionic-native/base64';
import { Http, Headers, RequestOptions } from '@angular/http';
import { TextToSpeech } from '@ionic-native/text-to-speech';
import { Camera } from '@ionic-native/camera';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
@Injectable()
export class HomePage {
  private client_id: string;
  
  @ViewChild('myvideo') myvideo: any;
  videoURL: any;
  pathToBeFramed: any;
  videoDuration: number = 1;
  noOfFrames: number = 0;
  thumbnailPath: string = null;
  isVideoSelected: boolean = false;
  
  frame_requests = [];     // sent image_names will be here [image_name, no of retries]
  predictions = [];       // received predictions will be here
  pred_text_all = '';     // final text will be here
  pred_voice_all = '';     // final voice script will be here

  constructor(public navCtrl: NavController, private mediaCapture: MediaCapture,
    private videoEditor: VideoEditor, private uniqueDeviceID: UniqueDeviceID,
    private toast: Toast, private base64: Base64, private http: Http, private tts: TextToSpeech,
    private camera: Camera, private loadingCtrl: LoadingController
  ) {

  }

  ionViewDidLoad() {
    this.uniqueDeviceID.get().then( (uuid) => {         // get an id to uniquely identify client in the server
      console.log("Client ID : ", uuid);
      this.client_id = uuid;
    }).catch( (err) => {
      console.log("Client ID Error : ", err);
    });

  }


  captureVideo() {                                    // capture a new video using device camera
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
      // video.play();
      
    }, (err) => {
      console.log("ERROR", "error capturing video");
    });
  }


  loadFromGallery() {                 // select video from gallery
    var options = {
      quality: 50,
      destinationType: (<any>window).Camera.DestinationType.FILE_URI,
      sourceType: (<any>window).Camera.PictureSourceType.PHOTOLIBRARY,
      mediaType: (<any>window).Camera.MediaType.VIDEO
    }

    this.camera.getPicture(options).then( (res) => {
      console.log(res);

      this.pathToBeFramed = res;
      this.videoURL = res;
      let video = this.myvideo.nativeElement;
      video.src =  this.videoURL;
      video.play();

     }, (err) => {
      console.log("ERROR", "error loading video");
     });

  }


  async getFramed() {                                  // devide video into frames
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
        console.log("Framing Error", err);
        this.presentToast('Video framing error', '3000');
      });
      this.noOfFrames += 1;
    }
  
  }


  async getExecute(event) {                 // calls this function when a video get selected
    this.isVideoSelected = true;
    this.videoDuration = Number(event.target.duration);
    this.noOfFrames = 0;

    let loading = this.loadingCtrl.create({
      spinner: 'bubbles',
      content: 'Processing video...'
    });
    loading.present();

    this.getFramed();             // execute video framing function
    await this.delay( Number(this.videoDuration) * 70 );   // 70 ms wait for 1s, 4.2s wait for 1 min
    loading.dismiss();

    this.readImages();        // execute image upload function
    
  }


  async uploadImage_Json(image, image_name, loading) {               // upload given image (base64) to server

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
            this.frame_requests.push( [response[1].toString(), 0] );        // [image_name, retries]
            if(Number(this.frame_requests.length) == Number(this.noOfFrames)) {
              loading.dismiss();
            }
          }
          resolve(res.json);
        }
      ).catch(
        (err) => {
          console.log('API Error : ', JSON.stringify(err));
          loading.dismiss();
          reject(err.json());
        }
      );
    });

  }


  async readFile(filepath, filename) {          // read content on an image in base64 format
    return new Promise(async (resolve, reject) => {
      this.base64.encodeFile(filepath+'/'+filename+'.jpg').then(async (base64String: string) => {
        let imageSrc = [ base64String.split(",")[1] , filename];
        resolve(imageSrc);
      }).catch( err=>{
        reject("Error");
      });
    });
    
  }
  

  async readImages() {              // read every framed image and upload to server (function calling only)
    let loading = this.loadingCtrl.create({
      spinner: 'bubbles',
      content: 'Uploading to server...'
    });
    loading.present();
    
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
      this.readFile(path, img_name).then(async res => {       // read and get content
        result = res[0];
        var res_img_name = res[1];
        if(result===undefined) {
          console.log("undefined");
        } else {
          await this.uploadImage_Json(result, res_img_name, loading).then(res=>{       // send to server
            console.log("i = " + i + "  |  frames = " + this.noOfFrames);
          }).catch(async err => {
            console.log("API Error :: 1");
            this.presentToast('Server not responding', '3000');
          });
        }
        
      }).catch(async err => {
        console.log("API Error :: 1");
        this.presentToast('Base64 reading error', '3000');
      });
    }
    
  }


  async sendPredRequests(image_name) {      // send given prediction request to the server
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


  async requestPredictions() {          // request all predictions from the server and add result to array
    return new Promise(async (resolve, reject) => {
      if(this.videoDuration < this.noOfFrames) {
        this.predictions = [];
        this.pred_text_all = '';
        this.pred_voice_all = '';

        while(true) {
          if(this.frame_requests.length != 0) {               // while no more requests left
            var ele = this.frame_requests.shift();
            if(ele[1] < 6) {     // maximum 6 request send to the server, have sent less than 6
              var waittime = Number(ele[1]);
              if(ele[1] < 4) {    // if haven't attempted 4 times, wait only 1s
                waittime = 1;
              }
              if(waittime != 0) {     // wait (1s x retries)
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
                this.presentToast('Server not responding', '3000');
              });
            }else {       // maximum no of retries have sent
              this.predictions.push( [ele[0], 'none'] );
            }
          } else{         // no more requests left
            resolve(true);
            break;
          }
        }
      } else {      // not framed yet
        reject(false);
      }
    });
    
  }


  async evaluate() {            // request result from the server and produce output
    if( Number(this.frame_requests.length) != Number(0)) {
      let loading = this.loadingCtrl.create({
        spinner: 'bubbles',
        content: 'Translating Video...'
      });
      loading.present();

      this.requestPredictions().then(async res => {
        if(res) {
          await this.delay(1000);
          console.log("=== Result ===", this.predictions);

          // make final text by comparing each result
          var pred1, pred2, pred3;
          var i = 0;
          while( i < this.noOfFrames-2 ) {
            pred1 = await this.getPred( 'capture' + String(i) );
            pred2 = await this.getPred( 'capture' + String(i+1) );
            pred3 = await this.getPred( 'capture' + String(i+2) );

            if(pred1=='undefined') {
              i += 1;
            }else if(pred1!='none') {
              if( String(pred1).includes('_') ) {                   // possible dynamic sign
                await this.getIfDynamic(pred1, pred2, pred3).then(async res => {        // check if dynamic
                  if( String(res).includes("_") ) {     // if dynamic
                    this.pred_text_all += String(res).split('_')[0] + " ";
                    i += 3;    // skip iterator for pred2, pred3
                  } else {      // not dynamic
                    this.pred_text_all += String(res) + " ";
                    i += 1;
                  }
                });

              } else {      // static sign
                this.pred_text_all += String(pred1) + " ";
                i += 1;
              }
            } else {        // pred1 is none
              i += 1;
            }

          }

          console.log("FINAL TEXT : ", this.pred_text_all);     // text generation finished
          loading.dismiss();

          let loading1 = this.loadingCtrl.create({
            spinner: 'bubbles',
            content: 'Generating audio...'
          });
          loading1.present();

          await this.getVoiceScript().then(async res => {         // call request voice script function
            this.pred_voice_all = String(res);
            loading1.dismissAll();
          }).catch(err => {
            loading1.dismissAll();
            this.presentToast('Audio request error', '3000');
          });

        }
      }).catch(err => {
        loading.dismissAll();
        this.presentToast('Server request error', '3000');
      });

    } else {
      this.presentToast('Video has already translated', '2000');
    }

  }


  async getIfDynamic(pred1, pred2, pred3) {              // check whether the given set form a dynamic sign
    return new Promise(async (resolve,reject) => {
      if( String(pred1).includes('&') ) {          // if contains '&'  represent more than one sign
        var arr = String(pred1).split('&');
        var static_part = '';

        arr.forEach(ele => {          // for each sign
          if( ele.includes('_') ) {       // dynamic possibility
            if(pred2!=undefined && pred3!=undefined) {
              if( String(pred2).includes( ele.split('_')[0] ) ) {
                if( String(pred3).includes( ele.split('_')[0] ) ) {      // it's dynamic
                  resolve(ele);
                  return;
                }
              }
            }
          } else {      // static part in the text
            static_part = ele;
          }
        });

        if(static_part != '') {      // not dynamic sign. it's static
          resolve(static_part);
          return;
        }

      } else {          // string doesn't contains '&' (only dynamic possibility)
        if( String(pred1).includes('_') ) {
          if(pred2!=undefined && pred3!=undefined) {
            if( String(pred2).includes( String(pred1).split('_')[0] ) ) {
              if( String(pred3).includes( String(pred1).split('_')[0] ) ) {      // it's dynamic
                resolve(String(pred1));
                return;
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


  async getVoiceScript() {          // request voice script from the server
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


  playVoice() {           // play audio if script is defined
    if( this.pred_voice_all != '' ) {
      this.tts.speak(this.pred_voice_all).then(() => {
        console.log('Success');
      }).catch((reason: any) => {
        console.log(reason);
      });
    } else {
      this.presentToast('No audio', '2000');
    }
    
  }

  
  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  presentToast(message: string, duration: string) {               // present a toast message
    this.toast.show(message, duration, 'bottom').subscribe(
      toast => { console.log(toast); }
    );
  }

}
