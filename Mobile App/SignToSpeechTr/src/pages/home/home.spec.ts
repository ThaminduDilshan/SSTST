import { async, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { IonicModule, Platform, NavController, NavParams } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { 
    PlatformMock, StatusBarMock, SplashScreenMock, NavMock, 
    MediaCaptureMock, VideoEditorMock, UniqueDeviceIDMock, ToastMock, Base64Mock,
    HttpMock, HeadersMock, RequestOptionsMock, TextToSpeechMock, CameraMock
} from '../../../test-config/mocks-ionic';
import { HomePage } from './home';
import { MediaCapture } from '@ionic-native/media-capture';
import { VideoEditor } from '@ionic-native/video-editor';
import { UniqueDeviceID } from '@ionic-native/unique-device-id';
import { Toast } from '@ionic-native/toast';
import { Base64 } from '@ionic-native/base64';
import { Http, Headers, RequestOptions } from '@angular/http';
import { TextToSpeech } from '@ionic-native/text-to-speech';
import { Camera } from '@ionic-native/camera';
import { Network } from '@ionic-native/network';
import { BehaviorSubject } from 'rxjs';
import { By } from '@angular/platform-browser';


const NetworkStub = {
    type: 'wifi',
    onConnect:() => new BehaviorSubject({ net: 'connect' }),
    onDisconnect:() => new BehaviorSubject({ net: 'disconnect' })
}


describe('Home Page', () => {
    let fixture;
    let component;
    let de: DebugElement;
    let el: HTMLElement;

    // setup the environment
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [HomePage],
            imports: [
                IonicModule.forRoot(HomePage)
            ],
            providers: [
                { provide: StatusBar, useClass: StatusBarMock },
                { provide: SplashScreen, useClass: SplashScreenMock },
                { provide: Platform, useClass: PlatformMock },
                { provide: NavController, useClass: NavMock },
                { provide: NavParams, useClass: NavMock },
                { provide: MediaCapture, useClass: MediaCaptureMock },
                { provide: VideoEditor, useClass: VideoEditorMock },
                { provide: UniqueDeviceID, useClass: UniqueDeviceIDMock },
                { provide: Toast, useClass: ToastMock },
                { provide: Base64, useClass: Base64Mock },
                { provide: Http, useClass: HttpMock },
                { provide: Headers, useClass: HeadersMock },
                { provide: RequestOptions, useClass: RequestOptionsMock },
                { provide: TextToSpeech, useClass: TextToSpeechMock },
                { provide: Camera, useClass: CameraMock },
                { provide: Network, useValue: NetworkStub }
            ]
        })
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HomePage);
        component = fixture.componentInstance;
    });

    // page component should be created
    it('should be created', () => {
        expect(component instanceof HomePage).toBe(true)
    });

    // variables should be defined with initial states
    it('variables should be defined with null value', () => {
        expect(component['myvideo']).toBeDefined();
        expect(component['videoURL']).toBeUndefined();
        expect(component['pathToBeFramed']).toBeUndefined();
        expect(component['videoDuration']).toEqual(1);
        expect(component['thumbnailPath']).toBeNull();
        expect(component['isVideoSelected']).toBe(false);
        expect(component['previousNetStatus']).toBeUndefined();
        expect(component['frame_requests']).toEqual([]);
        expect(component['predictions']).toEqual([]);
        expect(component['pred_text_all']).toEqual('');
        expect(component['pred_voice_all']).toEqual('');
        expect(component['pred_sn_txt']).toEqual('');
    });

    // should get the unique device id at loading point
    it('should have the unique device id defined', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        expect(component['client_id']).toBeDefined();
    }));

    // should define previousNetStatus at loading point
    it('should have the previous net status defined', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        expect(component['previousNetStatus']).toBeDefined();
    }));

    // should have offline bar hidden when a network is been connected
    it('offline bar should be hidden when a network has been connected', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        let de = fixture.debugElement.query(By.css('div[class="netbar"]'));
        expect(de).toBeNull();
    }));

    // should have offline bar displayed when the network is disconnected
    it('offline bar should be displyed when the network disconnect', fakeAsync(() => {
        component.ionViewDidLoad();
        component['previousNetStatus'] = false;
        flushMicrotasks();
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.netbar')).nativeElement;
        expect(el).toBeDefined();
    }));

    // should have logo image displayed when prediction text is null
    it('should have logo image displayed when prediction text is null', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['pred_text_all'] = '';
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.logo_img')).nativeElement;
        expect(el).toBeTruthy();
    }));

    // should have logo image hidden when prediction text is not null
    it('should have logo image hidden when prediction text is not null', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['pred_text_all'] = 'testing text';
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.logo_img'));
        expect(el).toBeFalsy();
    }));

    // evaluate button should be disabled when a video not selected
    it('evaluate button should be disabled when a video not selected', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['noOfFrames'] = 0;
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.but_tr')).nativeElement;
        expect(el.disabled).toBeTruthy();
    }));
    
    // evaluate button should be enabled when video is selected
    it('evaluate button should be enabled when a video is selected', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['noOfFrames'] = 5;
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.but_tr')).nativeElement;
        expect(el.disabled).toBeFalsy();
    }));

    // voice button should be disabled if text is null
    it('voice button should be disabled if text is null', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['pred_voice_all'] = '';
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.voice_btn')).nativeElement;
        expect(el.disabled).toBeTruthy();
    }));
    
    // voice button should be enabled if text is not null
    it('voice button should be enabled if text is not null', fakeAsync(() => {
        component.ionViewDidLoad();
        flushMicrotasks();
        component['pred_voice_all'] = 'test voice';
        fixture.detectChanges();
        let el = fixture.debugElement.query(By.css('.voice_btn')).nativeElement;
        expect(el.disabled).toBeFalsy();
    }));

    // 



});
