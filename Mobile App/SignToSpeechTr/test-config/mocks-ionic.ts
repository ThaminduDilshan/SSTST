import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Observable, BehaviorSubject } from 'rxjs';
import { Network } from '@ionic-native/network';
import { Injectable } from '@angular/core';
import { Http } from '@angular/http';


export class PlatformMock {
  public ready(): Promise<string> {
    return new Promise((resolve) => {
      resolve('READY');
    });
  }

  public getQueryParam() {
    return true;
  }

  public registerBackButtonAction(fn: Function, priority?: number): Function {
    return (() => true);
  }

  public hasFocus(ele: HTMLElement): boolean {
    return true;
  }

  public doc(): HTMLDocument {
    return document;
  }

  public is(): boolean {
    return true;
  }

  public getElementComputedStyle(container: any): any {
    return {
      paddingLeft: '10',
      paddingTop: '10',
      paddingRight: '10',
      paddingBottom: '10',
    };
  }

  public onResize(callback: any) {
    return callback;
  }

  public registerListener(ele: any, eventName: string, callback: any): Function {
    return (() => true);
  }

  public win(): Window {
    return window;
  }

  public raf(callback: any): number {
    return 1;
  }

  public timeout(callback: any, timer: number): any {
    return setTimeout(callback, timer);
  }

  public cancelTimeout(id: any) {
    // do nothing
  }

  public getActiveElement(): any {
    return document['activeElement'];
  }
}

export class StatusBarMock extends StatusBar {
  styleDefault() {
    return;
  }
}

export class SplashScreenMock extends SplashScreen {
  hide() {
    return;
  }
}

export class NavMock {
 
  public pop(): any {
    return new Promise(function(resolve: Function): void {
      resolve();
    });
  }
 
  public push(): any {
    return new Promise(function(resolve: Function): void {
      resolve();
    });
  }
 
  public getActive(): any {
    return {
      'instance': {
        'model': 'something',
      },
    };
  }
 
  public setRoot(): any {
    return true;
  }

  public registerChildNav(nav: any): void {
    return ;
  }

}

export class DeepLinkerMock {

}

export class MediaCaptureMock {

}

export class VideoEditorMock {

}

export class UniqueDeviceIDMock {
  
  public get(): any {
    return new Promise((resolve, reject) => {
      resolve('testing-id');
    });
  }
}

export class ToastMock {
  public show(message, duration, location) {
    return new BehaviorSubject({toast: 'show'});
  }

}

export class Base64Mock {
  public encodeFile(path): any {
    return new Promise((resolve, reject) => {
      resolve('testing-id,testing-data');
    });
  }

}

export class HttpMock{
  public post(url: string, body: any, options?: any) {
    return new BehaviorSubject({
      'toPromise': new Promise( (resolve, reject) => { resolve('received:image_test') } )
    });
  }

}

export class HeadersMock {

}

export class RequestOptionsMock {

}

export class TextToSpeechMock {

}

export class CameraMock {

}

export class LoadingMock {
  public create( {} ) {
    return new LoadingMock();
  }

  public present() {
  }

  public dismiss() {
  }

  public dismissAll() {

  }

}
