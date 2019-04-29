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
import main


class MainTestCase(unittest.TestCase):

    def setUp(self):
        main.app.testing = True
        self.app = main.app.test_client()
        with main.app.app_context():
            main.loadGraphModels()
            main.create_threads()
            main.create_cleaner()


    # check whether predict request returns valid result
    def test_a_predict_return(self):
        fo = open('images/image4.jpg', 'rb')
        raw_img = fo.read()
        fo.close()
        base64_img = b64encode(raw_img)

        req_data = {
            "client_id": "clt_test",
            "image": base64_img.decode('utf-8'),
            "image_name": "frame_test"
        }

        rv = self.app.post('/predict', data = json.dumps(req_data), follow_redirects = True)
        assert b'received' in rv.data

        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []


    # check whether result request returns valid result for processed data
    def test_b_result_return_processed(self):
        rv = self.app.post('/check', data = '{"client_id": "clt_test","image_name": "frame_test"}', follow_redirects=True)
        assert b'["frame_test","three & thirteen_2"]' in rv.data

        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []


    # check whether result request returns valid result for unprocessed data
    def test_c_result_return_unprocessed(self):
        rv = self.app.post('/check', data = '{"client_id": "clt_test","image_name": "frame_test2"}', follow_redirects=True)
        assert b'wait' in rv.data

        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []

    
    # check whether voice request returns valid result              // SINHALA TEXT CANNOT BE CHECKED WITH PYTHON //
    # def test_d_voice_return(self):
    #     rv = self.app.post('voice', data = '{"client_id": "clt_test", "text": "one two ten thirteen who why fifty"}', follow_redirects=True)
    #     # assert b'["ehhka dhehhkah dhahaya dahathunna kawthah aehyi phaanahah", "එක දෙක දහය දහතුන කවුද ඇයි පනහ"]' in rv.data

    #     main.obj_detection_res.queue.clear()
    #     main.predictor_res.queue.clear()
    #     main.threads = []


    # check whether prediction requests added to task queue
    def test_e_task_queue(self):
        # remove threads so processing won't happen
        main.threads = []

        # send two requests to server
        fo = open('images/image4.jpg', 'rb')
        raw_img = fo.read()
        fo.close()
        base64_img = b64encode(raw_img)

        req_data = {
            "client_id": "clt_test",
            "image": base64_img.decode('utf-8'),
            "image_name": "frame_test"
        }

        self.app.post('/predict', data = json.dumps(req_data), follow_redirects = True)
        self.app.post('/predict', data = json.dumps(req_data), follow_redirects = True)
        
        # check whether tasks queue has two elements
        self.assertEqual(main.tasks.qsize(), 2)

        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()

    
    # check whether prediction result will be removed from array, after requesting it
    def test_f_processed_data(self):
        # empty tasks queue and prediction results
        main.tasks.queue.clear()
        main.processed_data.clear()

        # send data request
        fo = open('images/image4.jpg', 'rb')
        raw_img = fo.read()
        fo.close()
        base64_img = b64encode(raw_img)

        req_data = {
            "client_id": "clt_test_f",
            "image": base64_img.decode('utf-8'),
            "image_name": "frame_test_f"
        }

        self.app.post('/predict', data = json.dumps(req_data), follow_redirects = True)

        # wait some time for processing to happen
        time.sleep(7)

        # check prediction result array has the processed data
        self.assertEqual(len(main.processed_data), 1)

        main.obj_detection_res.queue.clear()
        main.predictor_res.queue.clear()
        main.threads = []



if __name__ == '__main__':
    unittest.main()