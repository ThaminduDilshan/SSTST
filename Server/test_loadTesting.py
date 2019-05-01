from locust import HttpLocust, TaskSet, task
from base64 import b64encode
import json

req_data = None

class WebsiteTasks(TaskSet):
    # def on_start(self):
        
    
    @task
    def predict(self):
        # load image data and prepare json
        fo = open('images/image4.jpg', 'rb')
        raw_img = fo.read()
        fo.close()
        base64_img = b64encode(raw_img)

        req_data = {
            "client_id": "clt_test_load",
            "image": base64_img.decode('utf-8'),
            "image_name": "frame_test_load"
        }

        self.client.post(
            "/predict",
            data = json.dumps(req_data),
            headers = {'content-type': 'application/json'}
        )


    # @task
    # def check(self):
    #     self.client.post(
    #         "/check",
    #         data = json.dumps( {"client_id": "clt_test_load","image_name": "frame_test_load"} ),
    #         headers = {'content-type': 'application/json'}
    #         )


class WebsiteUser(HttpLocust):
    task_set = WebsiteTasks
    min_wait = 5000
    max_wait = 10000



'''
TO RUN
    locust -f test_loadTesting.py --host http://35.243.251.84:5000

'''

