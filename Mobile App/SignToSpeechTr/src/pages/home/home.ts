import { Component, Injectable, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { MediaCapture, CaptureVideoOptions, MediaFile } from '@ionic-native/media-capture';
import { VideoEditor, CreateThumbnailOptions } from '@ionic-native/video-editor';
// import { File } from '@ionic-native/file/ngx';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
@Injectable()
export class HomePage {
  
  @ViewChild('myvideo') myvideo: any;
  // mediaFiles = [];
  // videoFile: any;
  videoURL: any;
  pathToBeFramed: any;
  videoDuration: any;

  constructor(public navCtrl: NavController, private mediaCapture: MediaCapture,
    private videoEditor: VideoEditor, // private file: File
  ) {

  }

  captureVideo() {
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

  getDurationandFrame(event) {
    this.videoDuration = event.target.duration;

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
      }).catch(err=>{
        console.log("ERROR ERROR", err)
      });
    }
  }

  uploadImage() {

  }

  // textToSpeech(text:string) {
  //   this.tts.speak(text).then(() => console.log('Success'))
  //       .catch((reason: any) => console.log(reason));
  // }

}
