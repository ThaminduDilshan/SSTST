'''
SINCE TESTING PROCESS RARRIED OUT ON A LOCAL MACHINE, RESOURCE AND THREAD COUNT HAS BEEN DECREASED
THREADS = 10
OBJECT DETECTOR RESOURCES = 5
PREDICTOR RESOURCES = 5

'''

import os
import unittest
from base64 import b64encode
import json
from flask import request
import time
import main_old as main
# import main


class MainTestCase(unittest.TestCase):

    def setUp(self):
        main.app.testing = True
        self.app = main.app.test_client()
        with main.app.app_context():
            main.loadGraphModels()
            main.create_threads()
            main.create_cleaner()


    # predict request 1
    def test_a_predict_return(self):
        for i in range(1, 5, 1):
            main.tasks.queue.clear()
            main.processed_data.clear()
    
            fo = open('img_test/img{}.jpg'.format(i), 'rb')
            raw_img = fo.read()
            fo.close()
            base64_img = b64encode(raw_img)

            req_data = {
                "client_id": "clt_test",
                "image": base64_img.decode('utf-8'),
                "image_name": "frame_{}".format(i)
            }

            rv = self.app.post('/predict', data = json.dumps(req_data), follow_redirects = True)
            time.sleep(7)

        self.assertEqual(len(main.processed_data), i)

        
        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []






if __name__ == '__main__':
    unittest.main()