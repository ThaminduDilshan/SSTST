'''
SINCE TESTING PROCESS RARRIED OUT ON A LOCAL MACHINE, RESOURCE AND THREAD COUNT HAS BEEN DECREASED
THREADS = 10
OBJECT DETECTOR RESOURCES = 5
PREDICTOR RESOURCES = 5

'''

import os
import unittest
from base64 import b64encode
import main
import json
from flask import request


class MainTestCase(unittest.TestCase):

    def setUp(self):
        main.app.testing = True
        self.app = main.app.test_client()
        with main.app.app_context():
            main.loadGraphModels()
            main.create_threads()
            main.create_cleaner()


    # check whether setup creates expected no of resources
    def test_a_resource_creation(self):
        self.assertEqual(main.obj_detection_res.qsize(), 5)       # 20
        self.assertEqual(main.predictor_res.qsize(), 5)     # 20
        
        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []
    

    # check whether setup creates expected number of worker threads
    def test_b_thread_creation(self):
        self.assertEqual(len(main.threads), 10)     # 50
        
        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []


    # check whether locks will be created
    def test_c_lock_creation(self):
        self.assertTrue(main.obj_detLock != None)
        self.assertTrue(main.predLock != None)
        self.assertTrue(main.taskLock != None)
        self.assertTrue(main.pro_data_lock != None)
        
        
        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []


if __name__ == '__main__':
    unittest.main()