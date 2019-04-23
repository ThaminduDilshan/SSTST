import { Component, Injectable, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { MediaCapture, CaptureVideoOptions, MediaFile } from '@ionic-native/media-capture';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { UniqueDeviceID } from '@ionic-native/unique-device-id';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { File } from '@ionic-native/file/ngx';
import { Toast } from '@ionic-native/toast';
import { Base64 } from '@ionic-native/base64';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/observable';
import { of } from 'rxjs/observable/of';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';


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
  videoDuration: any;
  noOfFrames: number = 0;
  thumbnailPath: string = null;
  isVideoSelected: boolean = false;
  
  frame_requests: string [] = [];     // sent image_names will be here

  constructor(public navCtrl: NavController, private mediaCapture: MediaCapture,
    private videoEditor: VideoEditor, private uniqueDeviceID: UniqueDeviceID,
    private fileTransfer: FileTransfer, private file: File, private toast: Toast,
    private base64: Base64, private http: Http
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
    console.log("[INFO] called getDurationandFrame()");
      for(var i=0; i<=Number(this.videoDuration); i++) {
        console.log("[INFO] called getDurationandFrame() : for : " + i);
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
          console.log("[INFO] called getDurationandFrame() : thumbnail : " + i);
            console.log('Thumbnail result: ' + res);
            this.thumbnailPath = res;
        }).catch(err=>{
          console.log("Framing Error", err)
        });
  
        this.noOfFrames += 1;
  
      }
  
  }


  async getExecute(event) {
    console.log("[INFO] called getExecute()");
    this.isVideoSelected = true;
    this.videoDuration = event.target.duration;
    this.noOfFrames = 0;

    this.getDurationandFrame();
    // load controller -> processing
    console.log("[INFO] inside getExecute() : wait begins");
    await this.delay( Number(this.videoDuration) * 70 );   // 70 ms wait for 1s, 4.2s wait for 1 min
    console.log("[INFO] inside getExecute() : wait over");
    this.readImages();
    console.log("[INFO] inside getExecute() : after readImages()");
    // load controller -> dismiss()
    
  }


  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }


  async uploadImage_Json(image, image_name) {
    console.log("uploadImage_Json : check 01 : ", image_name);
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


  async readFile(filepath, filename) {
    console.log("[INFO] called readFile()");

    return new Promise(async resolve => {
      console.log("[INFO] called readFile() : inside Promise");
      this.base64.encodeFile(filepath+'/'+filename+'.jpg').then(async (base64String: string) => {
        let imageSrc = [ base64String.split(",")[1] , filename];
        resolve(imageSrc);
      });
    });

    
  }
  

  async readImages() {
    console.log("[INFO] called readImages()");
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
      console.log("[INFO] called readImages() : for : "+i);
      var img_name = 'capture' + i;

      var result;
      this.readFile(path, img_name).then(async res => {
        result = res[0];
        var res_img_name = res[1];
        console.log("IMAGE BASE 64 (inside)", result[0]);
        if(result===undefined) {
          console.log("undefined")
        } else {
          await this.uploadImage_Json(result, res_img_name);
        }
        
      });
    }

    return await true;

  }





  // textToSpeech(text:string) {
  //   this.tts.speak(text).then(() => console.log('Success'))
  //       .catch((reason: any) => console.log(reason));
  // }
  

}
