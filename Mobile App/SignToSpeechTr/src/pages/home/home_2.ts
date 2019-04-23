import { Component, Injectable, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { MediaCapture, CaptureVideoOptions, MediaFile } from '@ionic-native/media-capture';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
import { UniqueDeviceID } from '@ionic-native/unique-device-id/ngx';
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
  // thumbnailPath: Observable<{}>;
  isVideoSelected: boolean = false;

  constructor(public navCtrl: NavController, private mediaCapture: MediaCapture,
    private videoEditor: VideoEditor, private uniqueDeviceID: UniqueDeviceID,
    private fileTransfer: FileTransfer, private file: File, private toast: Toast,
    private base64: Base64, private http: Http
  ) {

  }

  ionViewDidLoad() {
    this.isVideoSelected = false;

    /*
          PLEASE CHECK IF THIS IS ONE TIME ID OR UNIQUE FOR DEVICE
    */

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


  // getDurationandFrame(event) {                                  // get duration and devide video into frames
  //   this.isVideoSelected = true;
  //   this.videoDuration = event.target.duration;
  //   this.noOfFrames = 0;

  //   (async () => {
  //     for(var i=0; i<=Number(this.videoDuration); i++) {
  //       await this.delay(300);

  //       var option: CreateThumbnailOptions = {
  //         fileUri: this.pathToBeFramed,
  //         outputFileName: 'capture'+i,
  //         atTime: i,        // frame-rate (1 s)
  //         // width: 320,
  //         // height: 480,
  //         quality: 100
  //       };
        
  //       console.log("framing at "+i+"s");
        
  //       this.videoEditor.createThumbnail(option).then(res=>{
  //           console.log('Thumbnail result: ' + (this.thumbnailPath = res));
  //       }).catch(err=>{
  //         console.log("Framing Error", err)
  //       });
  
  //       this.noOfFrames += 1;
  
  //     }
  //   })();


    // (async ()=> {
    //   while(true) {
    //     if(this.thumbnailPath === null) {
    //       await this.delay(100);
    //     } else {
    //       this.readImages();
    //       // call the function to read images
    //       console.log('Thumbnail path 2 : ', this.thumbnailPath);
    //       break;
    //     }
    //   }
    // })();


    // async this.delay(1000);

    
    // // method

  // }


  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  getDurationandFrame() {                                  // get duration and devide video into frames

    return new Promise((resolve, reject) => {
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
        
        this.videoEditor.createThumbnail(option).then(res=>{
            console.log('Thumbnail result: ' + res);
            this.thumbnailPath = res;
            // var base64 = this.readFile();
        }).catch(err=>{
          console.log("Framing Error", err)
        });
  
        this.noOfFrames += 1;
  
      }

      resolve();

    });
  
  }


  getExecute(event) {
    this.isVideoSelected = true;
    this.videoDuration = event.target.duration;
    this.noOfFrames = 0;

    this.getDurationandFrame().then(res => {
      this.readImages();
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////


  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }


  

  uploadImage_Json(image, image_name) {
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

    return new Promise((resolve, reject) => {
      this.http.post('http://35.243.251.84:5000/predict', data, options).toPromise().then(
        (res) => {
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




  readFile(filepath, filename) {
    return new Promise((resolve, reject) => {
      this.base64.encodeFile(filepath+'/'+filename+'.jpg').then((base64String: string) => {
        let imageSrc = base64String.split(",");
        console.log("---Splitted image string 1 ----", imageSrc[1]);
        return imageSrc[1];
      });
    });

    
  }
  


  // getPathandName(txt:string) {
  //     var arr = txt.split('/');
  //     var filename = arr.pop();
      
  //     var path = '';
  //     for(var i=1; i<arr.length; i++) {
  //       path = path + '/' + arr[i];
  //     }
  //     path = path + '/';
  
  //     console.log('name : ', filename);
  //     return {path, filename};
    
  // }


  readImages() {
    return new Promise((resolve, reject) => {

      // get thubnail path
      var arr = String(this.thumbnailPath).split('/');
      arr.pop();
      var path = '';
      for(var i=1; i<arr.length; i++) {
        path = path + '/' + arr[i];
      }
      path = path + '/';

      // path shoud get using above way. But unfortunately thumbnailPath variable ended up being undefined.
      // So have to hard code it
      // var path = '/storage/emulated/0/Android/data/io.ionic.starter/files/files/videos';

      // read content on each image
      for(var i=0; i<this.noOfFrames; i++) {
        var img_name = 'capture' + i;

        this.readFile(path, img_name).then(res => {
          ///
          console.log("IMAGE BASE 64", res);
        });
        // this.uploadImage_Json(img_base64, img_name);
        break;   // only for test
      }
      
      resolve();
    });

      // no of frames
      // framed path
      // iterate through each image and read

    // get thubnail path
    // var arr = String(this.thumbnailPath).split('/');
    // arr.pop();
    // var path = '';
    // for(var i=1; i<arr.length; i++) {
    //   path = path + '/' + arr[i];
    // }
    // path = path + '/';

    // path shoud get using above way. But unfortunately thumbnailPath variable ended up being undefined.
    // So have to hard code it
    // var path = '/storage/emulated/0/Android/data/io.ionic.starter/files/files/videos';

    // // read content on each image
    // for(var i=0; i<this.noOfFrames; i++) {
    //   var img_name = 'capture' + i;
    //   var img_base64 = this.readFile(path, img_name);
    //   console.log("IMAGE BASE 64", img_base64);
    //   // this.uploadImage_Json(img_base64, img_name);
    //   break;   // only for test
    // }
    

  }


  // textToSpeech(text:string) {
  //   this.tts.speak(text).then(() => console.log('Success'))
  //       .catch((reason: any) => console.log(reason));
  // }



  translate() {
    if(!this.isVideoSelected) {       // check if a video is selected
      this.toast.show('Please select a video', '3000', 'bottom').subscribe(
        toast => console.log(toast)
      );
    } else {        // if a video selected
      (async () => {
        while(true) {
          if(this.thumbnailPath === null) {       // wait if thumbnail path haven't set yet
            await this.delay(200);
          } else {                    // execute if thumbnail path is set
            this.toast.show(this.thumbnailPath, '3000', 'top').subscribe(
              toast => console.log(toast)
            );

            this.readImages();

            break;
          }
        }
      })();
    }
  }

}
