import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { MediaCapture } from '@ionic-native/media-capture';
import { VideoEditor } from '@ionic-native/video-editor';
import { File } from '@ionic-native/file/ngx';
import { IonicStorageModule } from '@ionic/storage';
import { TextToSpeech } from '@ionic-native/text-to-speech';
import { FileTransfer } from '@ionic-native/file-transfer/ngx';
import { UniqueDeviceID } from '@ionic-native/unique-device-id';
import { Toast } from '@ionic-native/toast';
import { Base64 } from '@ionic-native/base64';
import { HttpModule } from '@angular/http';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';

@NgModule({
  declarations: [
    MyApp,
    HomePage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
    HttpModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    MediaCapture,
    VideoEditor,
    FileTransfer,
    File,
    TextToSpeech,
    UniqueDeviceID,
    Toast,
    Base64,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
