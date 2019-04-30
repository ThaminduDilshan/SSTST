import { async, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { IonicModule, Platform, NavController, NavParams } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { PlatformMock, StatusBarMock, SplashScreenMock, NavMock } from '../../../test-config/mocks-ionic';
import { HelpPage } from './help';
import { By } from '@angular/platform-browser';


describe('Help Page', () => {
    let fixture;
    let component;
    let de: DebugElement;
    let el: HTMLElement;

    // setup the environment
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [HelpPage],
            imports: [
                IonicModule.forRoot(HelpPage)
            ],
            providers: [
                { provide: StatusBar, useClass: StatusBarMock },
                { provide: SplashScreen, useClass: SplashScreenMock },
                { provide: Platform, useClass: PlatformMock },
                { provide: NavController, useClass: NavMock },
                { provide: NavParams, useClass: NavMock }
            ]
        })
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HelpPage);
        component = fixture.componentInstance;
    });

    // page component should be created
    it('should be created', () => {
        expect(component instanceof HelpPage).toBe(true)
    });

    // logo image should be displayed
    it('image should be displayed', () => {
        de = fixture.debugElement.query(By.css('img'));
        el = de.nativeElement;
        expect(el instanceof Image).toBe(true);
    });


});
